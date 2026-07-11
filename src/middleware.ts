import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Decodes a JWT token payload in pure JavaScript without using Node.js Buffer,
 * making it fully compatible with the Next.js Edge Runtime.
 */
function decodeJwt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("sb-access-token")?.value;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com";

  let userEmail = null;
  if (token) {
    const payload = decodeJwt(token);
    userEmail = payload?.email;
  }

  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin") && !isLoginPage;

  if (isAdminPath) {
    // If not authenticated or not the authorized admin email, redirect to login page
    if (!token || userEmail !== adminEmail) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      
      // Clear token cookie if it is invalid/unauthorized
      const response = NextResponse.redirect(url);
      if (token && userEmail !== adminEmail) {
        response.cookies.delete("sb-access-token");
      }
      return response;
    }
  }

  if (isLoginPage) {
    // If already logged in as authorized admin, redirect to admin dashboard
    if (token && userEmail === adminEmail) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
