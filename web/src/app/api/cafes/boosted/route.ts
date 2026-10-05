import { NextResponse } from "next/server";
import { getBoostedCafes } from "@/lib/store";

export const dynamic = "force-dynamic";

// Public — feeds the landing page's ads carousel, above the sort/filter bar.
export async function GET() {
  const data = await getBoostedCafes();
  return NextResponse.json({ data });
}
