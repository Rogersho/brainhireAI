import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "brainhire_token";

const HIRING_ROLES = new Set(["Admin", "HRManager", "HiringManager"]);
const INTERNAL_ROLES = new Set(["Admin", "HRManager", "HiringManager", "Employee"]);
const HR_ROLES = new Set(["Admin", "HRManager"]);

async function verifySessionCookie(
  token: string | undefined
): Promise<{ role?: string; sub?: string } | null> {
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
    "/interviews",
    "/offers",
    "/employees",
    "/org-chart",
    "/onboarding",
    "/organization",
    "/attendance",
    "/leave",
    "/notifications",
    "/settings",
  ];
  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  const role = session?.role || "";

  if (path.startsWith("/candidate-dashboard") && role !== "Candidate") {
    return NextResponse.redirect(
      new URL(role === "Employee" ? "/attendance" : "/dashboard", req.url)
    );
  }

  if (
    (path.startsWith("/dashboard") ||
      path.startsWith("/applicants") ||
      path.startsWith("/screening") ||
      path.startsWith("/interviews")) &&
    !HIRING_ROLES.has(role)
  ) {
    return NextResponse.redirect(
      new URL(role === "Employee" ? "/attendance" : "/candidate-dashboard", req.url)
    );
  }

  if (
    (path.startsWith("/organization") ||
      path.startsWith("/onboarding") ||
      path.startsWith("/offers")) &&
    !HR_ROLES.has(role)
  ) {
    return NextResponse.redirect(
      new URL(INTERNAL_ROLES.has(role) ? "/attendance" : "/candidate-dashboard", req.url)
    );
  }

  if (
    (path.startsWith("/employees") ||
      path.startsWith("/org-chart") ||
      path.startsWith("/attendance") ||
      path.startsWith("/leave")) &&
    !INTERNAL_ROLES.has(role)
  ) {
    return NextResponse.redirect(new URL("/candidate-dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/candidate-dashboard/:path*",
    "/applicants/:path*",
    "/screening/:path*",
    "/interviews/:path*",
    "/offers/:path*",
    "/employees/:path*",
    "/org-chart/:path*",
    "/onboarding/:path*",
    "/organization/:path*",
    "/attendance/:path*",
    "/leave/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
