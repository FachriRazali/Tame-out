import { NextResponse } from "next/server";
import { getDistricts } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  // Districts almost never change — cache at the CDN for an hour.
  return NextResponse.json(
    { data: await getDistricts() },
    {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
