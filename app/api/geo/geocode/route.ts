import { NextRequest, NextResponse } from "next/server";
import { geocodePlace } from "@/src/corpus/geo";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const commune = request.nextUrl.searchParams.get("commune") ?? "";

  if (!name.trim() || !commune.trim()) {
    return NextResponse.json({ result: null });
  }

  const result = await geocodePlace(name, commune);
  return NextResponse.json({ result });
}
