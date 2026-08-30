import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { createProxyHandler } from "@/lib/server-handlers";

export const proxy = createProxyHandler<NextRequest>({
  getSessionCookie,
  redirect: NextResponse.redirect,
  next: NextResponse.next,
});

export const config = {
  matcher: [
    "/artifact/admin/:path*",
    "/rubgram/admin/:path*",
    "/tl/:path*/:path*/admin",
    "/admin/:path*",
  ], // Specify the routes the middleware applies to
};
