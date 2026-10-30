import { NextRequest, NextResponse } from "next/server";
import { createFloor, deleteFloors } from "@/lib/store";
import {
  assertCafeMatch,
  requireStaffSession,
  scopedCafeId,
} from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireStaffSession(req, {
    roles: ["merchant", "cashier", "admin"],
  });
  if (gate instanceof NextResponse) return gate;

  const body = await req.json();
  if (!body.cafeId || !body.name || !body.zoneType || !body.level) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "cafeId, name, zoneType and level are required",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  const cafeId = Number(body.cafeId);
  const denied = assertCafeMatch(gate.user, cafeId);
  if (denied) return denied;

  const floor = await createFloor({
    cafeId,
    name: String(body.name),
    zoneType: body.zoneType,
    level: Number(body.level),
    canvasWidth: body.canvasWidth ? Number(body.canvasWidth) : undefined,
    canvasHeight: body.canvasHeight ? Number(body.canvasHeight) : undefined,
  });
  return NextResponse.json(floor);
}

// DELETE ?cafeId=&level= — remove a whole building level (every zone on it,
// with their tables). Refused while someone is booked or seated there.
export async function DELETE(req: NextRequest) {
  const gate = await requireStaffSession(req, {
    roles: ["merchant", "cashier", "admin"],
  });
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const cafeId = Number(url.searchParams.get("cafeId"));
  const level = Number(url.searchParams.get("level"));
  if (!cafeId || !Number.isFinite(level)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "cafeId and level are required",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  const denied = assertCafeMatch(gate.user, cafeId);
  if (denied) return denied;

  try {
    const result = await deleteFloors(
      { cafeId, level },
      scopedCafeId(gate.user),
    );
    if (!result) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Floor level not found",
            status: 404,
          },
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    const map: Record<string, [number, string]> = {
      HAS_ACTIVE_RESERVATIONS: [
        409,
        "Lantai ini masih punya reservasi aktif. Selesaikan atau batalkan reservasinya dulu.",
      ],
      TABLE_OCCUPIED: [
        409,
        "Masih ada meja yang sedang ditempati di lantai ini.",
      ],
      FORBIDDEN: [403, "This floor belongs to another cafe."],
    };
    const hit = map[message];
    if (hit)
      return NextResponse.json(
        { error: { code: message, message: hit[1], status: hit[0] } },
        { status: hit[0] },
      );
    throw e;
  }
}
