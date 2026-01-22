import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_token";

// Routes that don't require authentication
const publicAdminRoutes = ["/admin/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except login)
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow public admin routes
  if (publicAdminRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Check for admin token cookie (full verification done server-side)
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
