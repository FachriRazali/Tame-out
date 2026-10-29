import { NextRequest, NextResponse } from "next/server";
import { posReserveTable } from "@/lib/store";
import { requireStaffSession, scopedCafeId } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// POST { guestName, guestWhatsapp?, partySize, slotMinutes, startTime? }
// Lets a cashier/merchant/admin (or super_admin) reserve a table that is
// currently "available" for a guest, straight from the POS.
export async function POST(
  req: NextRequest,
  { params }: { params: { tableId: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["cashier", "merchant", "admin"],
  });
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => ({}));
  const guestName = String(body.guestName ?? "").trim();
  const partySize = Number(body.partySize);
  const slotMinutes = Number(body.slotMinutes ?? 90);
  if (
    !guestName ||
    !Number.isInteger(partySize) ||
    partySize < 1 ||
    !Number.isInteger(slotMinutes) ||
    slotMinutes < 15 ||
    slotMinutes > 480
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Guest name, party size and a valid duration are required.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await posReserveTable(
      Number(params.tableId),
      {
        guestName,
        guestWhatsapp: body.guestWhatsapp
          ? String(body.guestWhatsapp).trim()
          : undefined,
        partySize,
        slotMinutes,
        startTime: body.startTime ? String(body.startTime) : undefined,
      },
      {
        authorizedCafeId: scopedCafeId(gate.user),
        cashierUserId: gate.user.id,
      },
    );
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Table not found."],
      FORBIDDEN: [403, "This table belongs to another cafe."],
      TABLE_NOT_AVAILABLE: [409, "This table is no longer available."],
      TABLE_ALREADY_RESERVED: [
        409,
        "This table already has a reservation in that time slot.",
      ],
      PARTY_TOO_LARGE: [400, "The party is larger than this table's capacity."],
      INVALID_TIME: [400, "The reservation time is not valid."],
    };
    const [status, friendly] = map[message] ?? [
      500,
      "Could not reserve this table.",
    ];
    return NextResponse.json(
      { error: { code: message, message: friendly, status } },
      { status },
    );
  }
}
