import { NextRequest, NextResponse } from "next/server";
import { addCafePhoto, listCafePhotos, MAX_PHOTOS_PER_CAFE } from "@/lib/store";
import { assertCafeMatch, requireStaffSession } from "@/lib/staffAuth";
import { isValidDataImage } from "@/lib/imageUrl";

export const dynamic = "force-dynamic";

// GET — public. The gallery of room / interior photos shown on the cafe page.
// Returns ids + captions only; each image is loaded from /api/cafe-photos/:id.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const data = await listCafePhotos(Number(params.id));
  return NextResponse.json({ data, max: MAX_PHOTOS_PER_CAFE });
}

// POST { imageUrl: "data:image/...;base64,...", caption? } — cafe staff
// (merchant / cashier / admin of THIS cafe) or super admin.
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
  if (!isValidDataImage(body.imageUrl)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "The photo must be a PNG, JPG or WEBP image (under ~4MB).",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  try {
    const photo = await addCafePhoto(
      cafeId,
      body.imageUrl,
      String(body.caption ?? ""),
      gate.user.id,
    );
    return NextResponse.json({ data: photo }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    const map: Record<string, [number, string]> = {
      PHOTO_LIMIT: [
        409,
        `Maksimal ${MAX_PHOTOS_PER_CAFE} foto per cafe. Hapus salah satu dulu.`,
      ],
      PHOTOS_NOT_MIGRATED: [
        503,
        "Tabel foto belum dibuat di database. Jalankan file migrasi cafe-photos dulu.",
      ],
      NOT_FOUND: [404, "Cafe not found."],
    };
    const [status, friendly] = map[message] ?? [
      500,
      "Could not save this photo.",
    ];
    return NextResponse.json(
      { error: { code: message, message: friendly, status } },
      { status },
    );
  }
}
