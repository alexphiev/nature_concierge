import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

function isValidToken(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_TOKEN;
  if (!expected || !provided) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const slug = body?.slug;

  if (typeof slug !== "string" || slug.length === 0) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  revalidatePath(`/places/${slug}`, "page");

  return NextResponse.json({ revalidated: true, slug });
}
