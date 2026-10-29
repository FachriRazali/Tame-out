import { NextRequest, NextResponse } from "next/server";
import {
  updateCafeCover,
  updateCafeRanking,
  updateCafeStatus,
} from "@/lib/store";
import { requireSuperAdmin } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// PATCH — super admin only. Accepts any of:
//   { isActive }                      → activate / deactivate the cafe
//   { popularityScore }               → the number the "popularity" sort ranks by
//   { isBoosted, boostTagline? }      → pin / unpin the cafe in the landing page's
//                                       featured carousel
//   { coverImageUrl }                 → replace the cover photo (data: URL / http(s) URL),
//                                       or null to remove it
export async function PATCH(
  req: NextRequest,
  { params }: { params: { cafeId: string } },
) {
  const gate = await requireSuperAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const cafeId = Number(params.cafeId);
  const body = await req.json().catch(() => ({}));
  const hasStatus = typeof body.isActive === "boolean";
  const hasScore = body.popularityScore !== undefined;
  const hasBoost = typeof body.isBoosted === "boolean";
  const hasTagline = body.boostTagline !== undefined;
  const hasCover = body.coverImageUrl !== undefined;

  if (!hasStatus && !hasScore && !hasBoost && !hasTagline && !hasCover) {
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

  let popularityScore: number | undefined;
  if (hasScore) {
    popularityScore = Number(body.popularityScore);
    // popularity_score is NUMERIC(6,2) — keep it inside what the column holds.
    if (
      !Number.isFinite(popularityScore) ||
      popularityScore < 0 ||
      popularityScore > 9999
    ) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_BODY",
            message: "popularityScore must be a number between 0 and 9999.",
            status: 400,
          },
        },
        { status: 400 },
      );
    }
    popularityScore = Math.round(popularityScore * 100) / 100;
  }

  if (hasCover) {
    const url = body.coverImageUrl;
    // Accept: null (remove), a base64 image data URL (png/jpeg/webp), or an http(s) URL.
    // ~5.5M chars of base64 is ~4MB of image — more than the app ever sends after
    // client-side downscaling, and still under what the DB column can hold.
    const okData =
      typeof url === "string" &&
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url) &&
      url.length <= 5_500_000;
    const okHttp =
      typeof url === "string" &&
      /^https?:\/\/\S+$/.test(url) &&
      url.length <= 2000;
    if (url !== null && !okData && !okHttp) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_BODY",
            message:
              "Cover image must be a PNG, JPG or WEBP photo (under ~4MB).",
            status: 400,
          },
        },
        { status: 400 },
      );
    }
    const found = await updateCafeCover(cafeId, url);
    if (!found) {
      return NextResponse.json(
        {
          error: { code: "NOT_FOUND", message: "Cafe not found.", status: 404 },
        },
        { status: 404 },
      );
    }
  }
  if (hasStatus) await updateCafeStatus(cafeId, body.isActive);
  if (hasScore || hasBoost || hasTagline) {
    const found = await updateCafeRanking(cafeId, {
      popularityScore,
      isBoosted: hasBoost ? body.isBoosted : undefined,
      boostTagline: hasTagline
        ? String(body.boostTagline).slice(0, 140)
        : undefined,
    });
    if (!found) {
      return NextResponse.json(
        {
          error: { code: "NOT_FOUND", message: "Cafe not found.", status: 404 },
        },
        { status: 404 },
      );
    }
  }
  return NextResponse.json({ ok: true });
}
