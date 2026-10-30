import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { SessionPayload } from "@/lib/session";

const SESSION_COOKIE_NAME = "homecheck_session";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "La variable d'environnement JWT_SECRET est manquante. Définissez-la dans .env.local (voir .env.example).",
    );
  }

  return new TextEncoder().encode(secret);
}

// Protected route configurations
const roleRoutePrefixes: Record<string, string[]> = {
  "/dashboard/tenant": ["TENANT", "ADMIN"],
  "/dashboard/owner": ["OWNER", "ADMIN"],
  "/dashboard/technician": ["TECHNICIAN", "ADMIN"],
  "/dashboard/admin": ["ADMIN"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let session: SessionPayload | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      session = payload as unknown as SessionPayload;
    } catch {
      // Invalid or expired token
    }
  }

  // If user is already logged in, redirect away from /login and /signup
  if (session && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protected paths check
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/budget");

  if (isProtectedPath) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based authorization
    for (const [prefix, allowedRoles] of Object.entries(roleRoutePrefixes)) {
      if (pathname.startsWith(prefix)) {
        const userRole = session.activeRole || session.roles?.[0];
        if (!userRole || !allowedRoles.includes(userRole)) {
          // Unauthorized for this role -> redirect to home or general dashboard
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/budget/:path*",
    "/login",
    "/signup",
  ],
};
