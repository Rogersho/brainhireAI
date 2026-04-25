import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const path = req.nextUrl.pathname;

  // Not logged in — redirect to login for protected routes
  const protectedPaths = ["/dashboard", "/candidate-dashboard", "/applicants", "/screening"];
  const isProtected = protectedPaths.some(p => path.startsWith(p));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Recruiter-only routes
  if (
    (path.startsWith("/dashboard") ||
      path.startsWith("/applicants") ||
      path.startsWith("/screening")) &&
    token?.role !== "Recruiter"
  ) {
    return NextResponse.redirect(new URL("/candidate-dashboard", req.url));
  }

  // Candidate-only routes
  if (path.startsWith("/candidate-dashboard") && token?.role !== "Candidate") {
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
  ],
};
