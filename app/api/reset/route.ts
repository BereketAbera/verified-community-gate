import { NextResponse, type NextRequest } from "next/server";
import { SANDBOX_COOKIE } from "@/lib/server/session";
import { isSameOrigin } from "@/lib/server/origin";

export const dynamic = "force-dynamic";

/** Drops this visitor's sandbox: back to the seed data, signed out. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "cross_origin" }, { status: 403 });
  const response = new NextResponse(null, { status: 303, headers: { Location: "/?reset=1" } });
  response.cookies.delete(SANDBOX_COOKIE);
  return response;
}
