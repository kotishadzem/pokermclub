import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const roleRoutes: Record<string, string[]> = {
  ADMIN: ["/admin"],
  PITBOSS: ["/pitboss", "/players"],
  CASHIER: ["/cashier", "/players"],
  DEALER: ["/dealer"],
};

const roleDashboard: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  PITBOSS: "/pitboss/floor-plan",
  CASHIER: "/cashier/dashboard",
  DEALER: "/dealer/table",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Get JWT token (works in Edge runtime)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not authenticated → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role as string;

  // Root redirect to role dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL(roleDashboard[role] || "/login", req.url));
  }

  // Admin can access everything
  if (role === "ADMIN") return NextResponse.next();

  // Check role-based access
  const allowedPrefixes = roleRoutes[role] || [];
  const hasAccess = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!hasAccess) {
    return NextResponse.redirect(new URL(roleDashboard[role] || "/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
