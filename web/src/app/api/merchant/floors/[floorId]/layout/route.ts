import { NextRequest, NextResponse } from "next/server";
import { saveFloorLayout, updateFloorShape } from "@/lib/store";
import { TableShape } from "@/lib/types";
import { requireStaffSession, scopedCafeId } from "@/lib/staffAuth";

interface LayoutTableInput {
  tableCode: string;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  hasPowerOutlet?: boolean;
  powerOutletCount?: number;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { floorId: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["merchant", "cashier", "admin"],
  });
  if (gate instanceof NextResponse) return gate;

  const floorId = Number(params.floorId);
  const body = (await req.json()) as {
    tables: LayoutTableInput[];
    outlinePoints?: [number, number][] | null;
  };

  try {
    const floor = await saveFloorLayout(
      floorId,
      body.tables.map((t) => ({
        tableCode: t.tableCode,
        shape: t.shape,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        rotation: t.rotation,
        capacity: t.capacity,
        hasPowerOutlet: t.hasPowerOutlet,
        powerOutletCount: t.powerOutletCount,
      })),
      scopedCafeId(gate.user),
    );

    if (!floor) {
      return NextResponse.json(
        {
          error: { code: "NOT_FOUND", message: "Floor not found", status: 404 },
        },
        { status: 404 },
      );
    }
    // Optional: the builder can send the room outline together with the layout
    // (fallback for when the dedicated /shape request can't get through).
    // undefined = leave the outline alone, null/[] = reset to a plain rectangle.
    let outlinePoints: [number, number][] | null | undefined;
    if (body.outlinePoints !== undefined) {
      const pts = body.outlinePoints;
      const valid =
        pts === null ||
        (Array.isArray(pts) &&
          pts.every((p) => Array.isArray(p) && p.length === 2) &&
          (pts.length === 0 || pts.length >= 3));
      if (!valid) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_BODY",
              message: "outlinePoints must be null or at least 3 [x,y] pairs.",
              status: 400,
            },
          },
          { status: 400 },
        );
      }
      const saved = await updateFloorShape(
        floorId,
        pts && pts.length > 0 ? pts : null,
        scopedCafeId(gate.user),
      );
      outlinePoints = saved?.outlinePoints ?? null;
    }
    return NextResponse.json({
      floorId: floor.id,
      tables: floor.tables,
      outlinePoints,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    if (message === "FORBIDDEN") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "This floor belongs to another cafe.",
            status: 403,
          },
        },
        { status: 403 },
      );
    }
    throw e;
  }
}
