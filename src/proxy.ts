import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "brainhire_token";

async function verifySessionCookie(token: string | undefined): Promise<{ role?: string; sub?: string } | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "dev-only-insecure-secret-change-me-32chars"
    );
    const { payload } = await jwtVerify(token, secret);
    return {
      role: typeof payload.role === "string" ? payload.role : undefined,
      sub: typeof payload.sub === "string" ? payload.sub : undefined,
    };
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionCookie(token);
  const path = req.nextUrl.pathname;

  const protectedPaths = [
    "/dashboard",
    "/candidate-dashboard",
    "/applicants",
    "/screening",
    "/notifications",
    "/settings",
  ];
  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Recruiter-only routes
  if (
    (path.startsWith("/dashboard") ||
      path.startsWith("/applicants") ||
      path.startsWith("/screening")) &&
    session?.role !== "Recruiter"
  ) {
    return NextResponse.redirect(new URL("/candidate-dashboard", req.url));
  }

  // Candidate-only routes
  if (path.startsWith("/candidate-dashboard") && session?.role !== "Candidate") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/candidate-dashboard/:path*",
    "/applicants/:path*",
    "/screening/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
