import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getVerifiedSession } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// Who is signed in? The answer is re-checked against the database, so a
// deactivated account, or one whose password was reset, immediately counts as
// signed out — and its stale cookie is cleared.
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const user = await getVerifiedSession(req);
    const res = NextResponse.json({ user }, { headers });
    if (!user && (await getSession(req))) {
      res.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
    }
    return res;
  } catch (e) {
    console.error("session check failed", e);
    return NextResponse.json({ user: null }, { headers });
  }
}
