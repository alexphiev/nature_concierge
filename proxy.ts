import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const config = {
  matcher: "/admin/:path*",
};

function isValidPassword(provided: string | null): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !provided) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export function proxy(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (isValidPassword(password)) {
      const response = NextResponse.next();
      response.headers.set("X-Robots-Tag", "noindex");
      return response;
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}
