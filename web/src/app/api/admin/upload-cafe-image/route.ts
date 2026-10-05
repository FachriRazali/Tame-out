import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireSuperAdmin } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// Cover photos only — no PDF here (that's menu-document's job).
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — a cover photo, not a media library

// Uploads a cafe's cover photo *before* the cafe itself exists yet (the admin
// "new cafe" form has no cafeId to key the file on), so the filename is keyed
// on a random id instead. Returns the URL to include as coverImageUrl in the
// POST /api/admin/cafes body right after.
export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "file is required",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      {
        error: {
          code: "UNSUPPORTED_TYPE",
          message: "Only PNG, JPG or WEBP images are accepted.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: "TOO_LARGE",
          message: "Image is larger than 8MB.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const filename = `cafe-${randomUUID()}.${ext}`;
  // Deliberately NOT under public/ — Next.js snapshots that folder's file
  // list once at server boot, so a file written there mid-process 404s until
  // the next restart. Serving through our own route (see
  // ../../uploads/cafes/[filename]/route.ts) stays live immediately.
  const dir = path.join(process.cwd(), "uploads", "cafes");
  await mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  const url = `/api/uploads/cafes/${filename}`;
  return NextResponse.json({ url });
}
