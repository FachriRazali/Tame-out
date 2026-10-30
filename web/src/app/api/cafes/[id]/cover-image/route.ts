import { NextRequest, NextResponse } from "next/server";
import { getCafeCoverRaw } from "@/lib/store";
import { decodeDataImage, isValidHttpImage } from "@/lib/imageUrl";

export const dynamic = "force-dynamic";

// Public — serves a cafe's cover photo as a real image. Covers are stored as
// base64 data: URLs; decoding them here (instead of embedding them in the cafe
// list JSON) keeps /api/cafes small, and lets the browser/CDN cache each photo.
// The ?v= token in the URL (see coverUrlFor in store.ts) changes whenever the
// photo is replaced, so a versioned URL can safely be cached "forever".
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0)
    return new NextResponse(null, { status: 404 });

  const raw = await getCafeCoverRaw(id);
  if (!raw) return new NextResponse(null, { status: 404 });

  const versioned = req.nextUrl.searchParams.has("v");
  const cacheControl = versioned
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300, stale-while-revalidate=86400";

  const decoded = decodeDataImage(raw);
  if (decoded) {
    return new NextResponse(new Uint8Array(decoded.bytes), {
      headers: {
        "Content-Type": decoded.mime,
        "Content-Length": String(decoded.bytes.length),
        "Cache-Control": cacheControl,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  // A plain http(s) cover (e.g. a hosted photo): hand the browser over to it.
  if (isValidHttpImage(raw)) {
    return NextResponse.redirect(raw, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }
  return new NextResponse(null, { status: 404 });
}
