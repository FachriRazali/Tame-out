import { NextRequest, NextResponse } from "next/server";
import { deleteFloors, updateFloorMeta } from "@/lib/store";
import { requireStaffSession, scopedCafeId } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

const ZONE_TYPES = ["indoor", "outdoor", "smoking"] as const;

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message, status } }, { status });
}

// PATCH { name?, zoneType? } — rename a zone / change its type.
// (PUT and POST are aliases: some networks and browser extensions drop PATCH.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { floorId: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["merchant", "cashier", "admin"],
  });
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => ({}));
  const patch: { name?: string; zoneType?: (typeof ZONE_TYPES)[number] } = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return fail(400, "INVALID_BODY", "Zone name can't be empty.");
    if (name.length > 40)
      return fail(
        400,
        "INVALID_BODY",
        "Zone name is limited to 40 characters.",
      );
    patch.name = name;
  }
  if (body.zoneType !== undefined) {
    if (!ZONE_TYPES.includes(body.zoneType))
      return fail(
        400,
        "INVALID_BODY",
        "zoneType must be indoor, outdoor or smoking.",
      );
    patch.zoneType = body.zoneType;
  }
  if (patch.name === undefined && patch.zoneType === undefined)
    return fail(400, "INVALID_BODY", "Nothing to update.");

  try {
    const floor = await updateFloorMeta(
      Number(params.floorId),
      patch,
      scopedCafeId(gate.user),
    );
    if (!floor) return fail(404, "NOT_FOUND", "Floor not found");
    return NextResponse.json(floor);
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN")
      return fail(403, "FORBIDDEN", "This zone belongs to another cafe.");
    throw e;
  }
}
export const PUT = PATCH;
export const POST = PATCH;

// DELETE — remove this zone and its tables. Refused while someone is booked
// or seated at one of its tables.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { floorId: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["merchant", "cashier", "admin"],
  });
  if (gate instanceof NextResponse) return gate;
  try {
    const result = await deleteFloors(
      { floorId: Number(params.floorId) },
      scopedCafeId(gate.user),
    );
    if (!result) return fail(404, "NOT_FOUND", "Floor not found");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    if (message === "FORBIDDEN")
      return fail(403, "FORBIDDEN", "This zone belongs to another cafe.");
    if (message === "HAS_ACTIVE_RESERVATIONS")
      return fail(
        409,
        message,
        "Zona ini masih punya reservasi aktif. Selesaikan atau batalkan reservasinya dulu.",
      );
    if (message === "TABLE_OCCUPIED")
      return fail(
        409,
        message,
        "Masih ada meja yang sedang ditempati di zona ini.",
      );
    throw e;
  }
}
