import { NextRequest, NextResponse } from "next/server";
import { deleteMenuItem, updateMenuItem } from "@/lib/store";
import { assertCafeMatch, requireStaffSession } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["cashier", "merchant", "admin"],
  });
  if (gate instanceof NextResponse) return gate;
  const cafeId = Number(params.id);
  const denied = assertCafeMatch(gate.user, cafeId);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  if (body.name !== undefined && !String(body.name).trim()) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Item name can't be empty.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  if (
    body.price !== undefined &&
    (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Price must be a number of 0 or more.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  const item = await updateMenuItem(Number(params.itemId), cafeId, {
    name: body.name !== undefined ? String(body.name).trim() : undefined,
    description:
      body.description !== undefined ? String(body.description) : undefined,
    price: body.price !== undefined ? Number(body.price) : undefined,
    category:
      body.category !== undefined
        ? String(body.category).trim() || undefined
        : undefined,
    imageUrl: body.imageUrl,
    isAvailable: body.isAvailable,
  });
  if (!item) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Menu item not found",
          status: 404,
        },
      },
      { status: 404 },
    );
  }
  return NextResponse.json(item);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["cashier", "merchant", "admin"],
  });
  if (gate instanceof NextResponse) return gate;
  const cafeId = Number(params.id);
  const denied = assertCafeMatch(gate.user, cafeId);
  if (denied) return denied;

  const ok = await deleteMenuItem(Number(params.itemId), cafeId);
  if (!ok) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Menu item not found",
          status: 404,
        },
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
