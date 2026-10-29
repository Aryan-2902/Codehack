import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Optimistic redirect only. Pages and Route Handlers re-check the session and
// the user's role against the database, so this is a convenience, not the guard.
async function isSignedIn(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = await isSignedIn(request);

  if (AUTH_PAGES.includes(pathname)) {
    return signedIn
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }
  if (!signedIn) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/dashboard/:path*", "/profile/:path*", "/people/:path*", "/resources/:path*", "/bookings/:path*", "/review/:path*", "/incidents/:path*", "/notifications/:path*"],
};
