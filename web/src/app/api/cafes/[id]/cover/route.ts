import { NextRequest, NextResponse } from "next/server";
import { updateCafeCover } from "@/lib/store";
import { assertCafeMatch, requireStaffSession } from "@/lib/staffAuth";
import { isValidDataImage } from "@/lib/imageUrl";

export const dynamic = "force-dynamic";

// PUT { coverImageUrl: "data:image/...;base64,..." | null } — lets the cafe's
// own staff (cashier / merchant / admin) or the super admin change the cover
// photo. null removes it. (/api/admin/cafes/:id does the same for super admin.)
export async function PUT(
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
  const url = body.coverImageUrl;
  if (url !== null && !isValidDataImage(url)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message:
            "The cover must be a PNG, JPG or WEBP image (under ~4MB), or null.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  const found = await updateCafeCover(cafeId, url);
  if (!found)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Cafe not found.", status: 404 } },
      { status: 404 },
    );
  return NextResponse.json({ ok: true });
}
