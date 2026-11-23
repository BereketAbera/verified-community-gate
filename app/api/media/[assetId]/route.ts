import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { LINK_FAILURE_MESSAGES, verifyMediaLink } from "@/lib/media-signing";
import { getGate } from "@/lib/server/gate";
import { mediaSigningSecret } from "@/lib/server/secrets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Outside public/: nothing in this folder has a static URL. It is bundled with this
// route through outputFileTracingIncludes in next.config.ts.
const MEDIA_ROOT = path.join(process.cwd(), "private-media");
const CONTENT_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".mp4": "video/mp4" };

const BASE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Robots-Tag": "noindex",
};

function deny(status: 403 | 404, error: string, message: string) {
  return NextResponse.json({ error, message }, { status, headers: BASE_HEADERS });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const gate = await getGate();

  // #region route
  // 1. Signature: issued by this server, for this asset, to this viewer, still in date.
  const check = verifyMediaLink(
    { assetId, exp: request.nextUrl.searchParams.get("exp"), sig: request.nextUrl.searchParams.get("sig") },
    gate.viewerKey,
    mediaSigningSecret(),
  );
  if (!check.ok) return deny(403, check.reason, LINK_FAILURE_MESSAGES[check.reason]);

  // 2. Policy, asked again at request time: since the link was issued the owner may
  //    have been suspended, made the file private or blocked this viewer.
  const asset = gate.policy.getAccessibleAsset(gate.viewer, assetId);
  if (!asset) return deny(404, "not_found", "Not found.");
  // #endregion

  const filePath = path.join(MEDIA_ROOT, asset.file);
  if (!filePath.startsWith(MEDIA_ROOT + path.sep)) return deny(404, "not_found", "Not found.");
  const data = new Uint8Array(await readFile(filePath));
  const size = data.byteLength;
  const headers = {
    ...BASE_HEADERS,
    "Content-Type": CONTENT_TYPES[path.extname(asset.file)] ?? "application/octet-stream",
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
  };

  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    let start = match && match[1] !== "" ? Number(match[1]) : NaN;
    let end = match && match[2] !== "" ? Number(match[2]) : NaN;
    if (match && match[1] === "" && match[2] !== "") {
      start = Math.max(0, size - Number(match[2])); // suffix range: last N bytes
      end = size - 1;
    } else if (Number.isNaN(end)) {
      end = size - 1;
    }
    end = Math.min(end, size - 1);
    if (!match || Number.isNaN(start) || start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    return new NextResponse(data.subarray(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new NextResponse(data, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
}
