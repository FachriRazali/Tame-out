import { NextRequest, NextResponse } from "next/server";
import { listReservationsForUser } from "@/lib/store";
import { getVerifiedSession } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// GET /api/reservations/mine — the signed-in person's own reservations
// ("Riwayat reservasi saya"). The user id always comes from the verified
// session, never from the request, so there's no way to ask for someone else's.
export async function GET(req: NextRequest) {
  const user = await getVerifiedSession(req);
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Please sign in to see your reservations.",
          status: 401,
        },
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const data = await listReservationsForUser(user.id);
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
