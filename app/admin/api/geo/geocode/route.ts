import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/src/admin/assert-admin";
import { geocodePlace } from "@/src/corpus/geo";

export async function GET(request: NextRequest) {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const commune = request.nextUrl.searchParams.get("commune") ?? "";

  if (!name.trim() || !commune.trim()) {
    return NextResponse.json({ result: null });
  }

  const result = await geocodePlace(name, commune);
  return NextResponse.json({ result });
}
