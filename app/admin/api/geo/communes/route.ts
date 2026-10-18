import { NextRequest, NextResponse } from "next/server";
import { searchCommunes } from "@/src/corpus/geo";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const communes = await searchCommunes(query);
  return NextResponse.json({ communes });
}
