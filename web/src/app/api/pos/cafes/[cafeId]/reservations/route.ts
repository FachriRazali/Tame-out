import { NextRequest, NextResponse } from "next/server";
import { listReservationsForCafe } from "@/lib/store";
import { assertCafeMatch, requireStaffSession } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// GET /api/pos/cafes/:cafeId/reservations?from=<ISO>&to=<ISO>
//
// The cashier's reservation history: every reservation of THIS cafe whose slot
// starts in [from, to). The browser sends the start and end of the day it is
// looking at (its own local day), so "today" means today where the cafe is.
// Staff of another cafe get 403; the list carries guest names and WhatsApp
// numbers, so it is staff-only.
export async function GET(
  req: NextRequest,
  { params }: { params: { cafeId: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["cashier", "merchant", "admin"],
  });
  if (gate instanceof NextResponse) return gate;
  const cafeId = Number(params.cafeId);
  const denied = assertCafeMatch(gate.user, cafeId);
  if (denied) return denied;

  const from = new Date(req.nextUrl.searchParams.get("from") ?? "");
  const to = new Date(req.nextUrl.searchParams.get("to") ?? "");
  const spanMs = to.getTime() - from.getTime();
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    spanMs <= 0 ||
    spanMs > 32 * 24 * 3600_000
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_RANGE",
          message: "Give a valid from/to range of at most 31 days.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  const data = await listReservationsForCafe(cafeId, from, to);
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
