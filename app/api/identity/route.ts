import { NextResponse, type NextRequest } from "next/server";
import { IdentityInput, switchIdentity } from "@/lib/domain";
import type { Sandbox } from "@/lib/sandbox";
import { loadSandbox, sandboxCookie } from "@/lib/server/session";
import { isSameOrigin } from "@/lib/server/origin";

export const dynamic = "force-dynamic";

function landingFor(sb: Sandbox): string {
  switch (sb.as) {
    case "newcomer":
      if (!sb.self) return "/join";
      return sb.ov[sb.self.id]?.sub ? "/members" : "/join/verify";
    case "member":
      return "/members";
    case "moderator":
    case "admin":
      return "/moderate";
    default:
      return "/";
  }
}

/** Demo identity switch. A plain form post, so it also works without JavaScript and from curl. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "cross_origin" }, { status: 403 });
  const form = await request.formData();
  const parsed = IdentityInput.safeParse(form.get("as"));
  if (!parsed.success) return NextResponse.json({ error: "unknown_identity" }, { status: 400 });
  const next = switchIdentity(await loadSandbox(), parsed.data);
  const response = new NextResponse(null, { status: 303, headers: { Location: landingFor(next) } });
  response.cookies.set(await sandboxCookie(next));
  return response;
}
