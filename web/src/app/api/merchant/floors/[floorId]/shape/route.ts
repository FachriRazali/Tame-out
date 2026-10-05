import { NextRequest, NextResponse } from "next/server";
import { updateFloorShape } from "@/lib/store";
import { requireStaffSession, scopedCafeId } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// PATCH { outlinePoints: [[x,y], ...] | null } — persists a floor's custom
// room outline (L-shape, plus-shape, freeform, ...). null resets it back to
// a plain rectangle. Separate from PUT .../layout, which only touches tables.
export async function PATCH(req: NextRequest, { params }: { params: { floorId: string } }) {
  const gate = await requireStaffSession(req, { roles: ["merchant", "cashier", "admin"] });
  if (gate instanceof NextResponse) return gate;

  const body = await req.json();
  const points = body.outlinePoints;
  if (points !== null && (!Array.isArray(points) || points.some((p: any) => !Array.isArray(p) || p.length !== 2))) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "outlinePoints must be an array of [x,y] pairs, or null.", status: 400 } },
      { status: 400 }
    );
  }
  if (Array.isArray(points) && points.length > 0 && points.length < 3) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "A room outline needs at least 3 points.", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const floorId = Number(params.floorId);
    const result = await updateFloorShape(floorId, points && points.length > 0 ? points : null, scopedCafeId(gate.user));
    if (!result) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Floor not found", status: 404 } }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "This floor belongs to another cafe.", status: 403 } },
        { status: 403 }
      );
    }
    throw e;
  }
}
