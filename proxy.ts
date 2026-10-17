import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorization } from "@/src/admin/basic-auth";

export const config = {
  matcher: "/admin/:path*",
};

export function proxy(request: NextRequest) {
  if (isAdminAuthorization(request.headers.get("authorization"))) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}
