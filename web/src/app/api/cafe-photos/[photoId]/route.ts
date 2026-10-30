import { NextRequest, NextResponse } from "next/server";
import {
  deleteCafePhoto,
  getCafePhotoRow,
  setCafeCoverFromPhoto,
  updateCafePhotoCaption,
} from "@/lib/store";
import { assertCafeMatch, requireStaffSession } from "@/lib/staffAuth";
import { decodeDataImage } from "@/lib/imageUrl";

export const dynamic = "force-dynamic";

// GET — public. Serves one gallery photo as a real image file (decoded from the
// stored base64), so <img src="/api/cafe-photos/12"> works and the browser can
// cache it. A photo's bytes never change (editing = delete + re-add), so it is
// safe to cache for a year.
export async function GET(
  _req: NextRequest,
  { params }: { params: { photoId: string } },
) {
  const row = await getCafePhotoRow(Number(params.photoId));
  if (!row) return new NextResponse("Not found", { status: 404 });
  if (/^https?:\/\//.test(row.imageUrl))
    return NextResponse.redirect(row.imageUrl);
  const decoded = decodeDataImage(row.imageUrl);
  if (!decoded) return new NextResponse("Bad image", { status: 422 });
  return new NextResponse(new Uint8Array(decoded.bytes), {
    headers: {
      "Content-Type": decoded.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

// Shared by PATCH/DELETE: staff session + the photo must belong to the
// session's own cafe (super admin: any cafe).
async function authorize(req: NextRequest, photoId: number) {
  const gate = await requireStaffSession(req, {
    roles: ["cashier", "merchant", "admin"],
  });
  if (gate instanceof NextResponse) return gate;
  const row = await getCafePhotoRow(photoId);
  if (!row)
    return NextResponse.json(
      {
        error: { code: "NOT_FOUND", message: "Photo not found.", status: 404 },
      },
      { status: 404 },
    );
  const denied = assertCafeMatch(gate.user, row.cafeId);
  if (denied) return denied;
  return { row };
}

// PATCH { caption?: string, setCover?: true }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { photoId: string } },
) {
  const photoId = Number(params.photoId);
  const auth = await authorize(req, photoId);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  if (body.caption === undefined && body.setCover !== true) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Nothing to update.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  if (body.caption !== undefined)
    await updateCafePhotoCaption(photoId, String(body.caption));
  if (body.setCover === true) await setCafeCoverFromPhoto(photoId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { photoId: string } },
) {
  const photoId = Number(params.photoId);
  const auth = await authorize(req, photoId);
  if (auth instanceof NextResponse) return auth;
  await deleteCafePhoto(photoId);
  return NextResponse.json({ ok: true });
}
