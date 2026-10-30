import { NextRequest, NextResponse } from "next/server";
import { posListFloors, posListTables } from "@/lib/store";
import { assertCafeMatch, requireStaffSession } from "@/lib/staffAuth";

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
  const [tables, floors] = await Promise.all([
    posListTables(cafeId),
    posListFloors(cafeId),
  ]);
  return NextResponse.json({ data: tables, floors });
}
