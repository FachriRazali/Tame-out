import { NextRequest, NextResponse } from "next/server";
import { getNotificationLogs } from "@/lib/store";
import { requireStaffSession, scopedCafeId } from "@/lib/staffAuth";

// This route reads mutable state (grows on every payment confirmation / POS
// check-in), so it must never be statically cached.
export const dynamic = "force-dynamic";

// Notification log — STAFF ONLY. It contains guests' phone numbers and
// booking codes, so it is never public. Cafe staff (cashier / merchant /
// admin) only ever see their own cafe's notifications; the super admin sees
// the whole platform, or one cafe with ?cafeId=.
export async function GET(req: NextRequest) {
  const gate = await requireStaffSession(req, {
    roles: ["cashier", "merchant", "admin"],
  });
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit")) || 30;
  const requestedCafe = Number(url.searchParams.get("cafeId")) || undefined;
  const cafeId = scopedCafeId(gate.user) ?? requestedCafe;

  const data = await getNotificationLogs(limit, cafeId);
  return NextResponse.json({ data });
}
