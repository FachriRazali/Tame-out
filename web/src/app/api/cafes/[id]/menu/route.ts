import { NextRequest, NextResponse } from "next/server";
import { createMenuItem, getMenuItems } from "@/lib/store";
import { assertCafeMatch, requireStaffSession } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const items = await getMenuItems(Number(params.id));
  return NextResponse.json({ data: items });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["cashier", "merchant", "admin"],
  });
  if (gate instanceof NextResponse) return gate;
  const cafeId = Number(params.id);
  const denied = assertCafeMatch(gate.user, cafeId);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  if (
    !String(body.name ?? "").trim() ||
    body.price === undefined ||
    !Number.isFinite(Number(body.price)) ||
    Number(body.price) < 0
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "A name and a valid price are required.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  const item = await createMenuItem({
    cafeId,
    name: String(body.name).trim(),
    description: body.description ? String(body.description) : undefined,
    price: Number(body.price),
    category:
      body.category && String(body.category).trim()
        ? String(body.category).trim()
        : "Food",
    imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
    isAvailable: body.isAvailable ?? true,
  });
  return NextResponse.json(item);
}
