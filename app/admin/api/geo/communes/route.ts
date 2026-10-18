import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/src/admin/assert-admin";
import { searchCommunes } from "@/src/corpus/geo";

export async function GET(request: NextRequest) {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const communes = await searchCommunes(query);
  return NextResponse.json({ communes });
}
