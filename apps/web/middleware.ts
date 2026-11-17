import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@notes/shared";

/**
 * Returns the HMAC secret derived from JWT_SECRET for Edge runtime.
 */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "fallback_secret_must_be_at_least_32_characters_long";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, Next internal files, public auth routes, fonts, and images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/mobile-login" ||
    pathname === "/favicon.ico" ||
    /\.(ttf|woff|woff2|otf|eot|png|jpg|jpeg|svg|webp|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Extract token from Cookie or Authorization header
  let token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  // 3. Verify token if present
  let sessionPayload: { userId: string; role: "user" | "admin"; identifier: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret(), {
        algorithms: ["HS256"],
      });
      if (
        typeof payload.userId === "string" &&
        (payload.role === "user" || payload.role === "admin") &&
        typeof payload.identifier === "string"
      ) {
        sessionPayload = {
          userId: payload.userId,
          role: payload.role,
          identifier: payload.identifier,
        };
      }
    } catch {
      sessionPayload = null;
    }
  }

  // 4. Handle unauthenticated requests
  if (!sessionPayload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
    // Redirect web pages to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Admin role check for /admin and /api/admin/*
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (sessionPayload.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "Forbidden. Admin access required." },
          { status: 403 }
        );
      }
      return new NextResponse("Access Denied: Admin role required.", { status: 403 });
    }
  }

  // 6. Forward headers to downstream Route Handlers / Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", sessionPayload.userId);
  requestHeaders.set("x-user-role", sessionPayload.role);
  requestHeaders.set("x-user-identifier", sessionPayload.identifier);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
