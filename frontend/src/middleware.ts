import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || "your-secret-key-change-in-production"
);

interface JWTPayload {
  sub: string;
  role: "admin" | "staff";
  exp: number;
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/player"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Get the token from cookie
  const token = request.cookies.get("access_token")?.value;

  // If accessing a public route
  if (isPublicRoute) {
    // If logged in and trying to access login, redirect to appropriate dashboard
    if (token && pathname === "/login") {
      const payload = await verifyToken(token);
      if (payload) {
        const redirectUrl =
          payload.role === "admin" ? "/admin/dashboard" : "/staff/devices";
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected routes require authentication
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the token
  const payload = await verifyToken(token);
  if (!payload) {
    // Invalid or expired token
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access_token");
    return response;
  }

  // Role-based access control
  const isAdminRoute = pathname.startsWith("/admin");
  const isStaffRoute = pathname.startsWith("/staff");

  if (isAdminRoute && payload.role !== "admin") {
    // Non-admin trying to access admin routes
    return NextResponse.redirect(new URL("/staff/devices", request.url));
  }

  // Root path redirect based on role
  if (pathname === "/") {
    const redirectUrl =
      payload.role === "admin" ? "/admin/dashboard" : "/staff/devices";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
  ],
};
