import { NextRequest, NextResponse } from "next/server";
import { listCafes } from "@/lib/store";
import { PriceBucket } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = sp.get("lat") ? Number(sp.get("lat")) : undefined;
  const lng = sp.get("lng") ? Number(sp.get("lng")) : undefined;
  const districtId = sp.get("district_id") ? Number(sp.get("district_id")) : undefined;
  const priceTiers = sp.getAll("price_tier");
  const priceBuckets = sp.getAll("price_bucket") as PriceBucket[];
  const sort = (sp.get("sort") as "popularity" | "distance" | "availability" | "newest" | "rating" | null) ?? undefined;
  const availability = (sp.get("availability") as "green" | "yellow" | "red" | "any" | null) ?? undefined;
  const q = sp.get("q") ?? undefined;

  const data = await listCafes({
    lat,
    lng,
    districtId,
    priceTiers: priceTiers.length ? priceTiers : undefined,
    priceBuckets: priceBuckets.length ? priceBuckets : undefined,
    sort,
    availability,
    q
  });
  return NextResponse.json({ data, total: data.length });
}
