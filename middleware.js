import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const path = req.nextUrl.pathname;

    // Head Admin routes
    if (path.startsWith("/head-admin") && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Admin Panel routes
    if (path.startsWith("/admin-panel") && token?.role !== "ADMIN") {
        if(token?.role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/head-admin", req.url));
        if(token?.role === "SUB_ADMIN") return NextResponse.redirect(new URL("/sub-admin-panel", req.url));
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Sub-Admin routes
    if (path.startsWith("/sub-admin-panel") && token?.role !== "SUB_ADMIN") {
        if(token?.role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/head-admin", req.url));
        if(token?.role === "ADMIN") return NextResponse.redirect(new URL("/admin-panel", req.url));
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // General protected routes for verified users
    const protectedRoutes = ["/feed", "/Chat", "/create", "/Notification", "/search", "/teenarena", "/schoolCompetitions", "/friends", "/Updateuser", "/User", "/ViewFriends"];
    const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route) || path === "/");

    if (isProtectedRoute) {
        // Handle deleted users from JWT hook
        if (token?.status === "deleted") {
            return NextResponse.redirect(new URL("/login?error=deleted", req.url));
        }

        // Only allow Verified USERS
        if (token?.status !== "verified") {
            // Unverified user trying to access main app
            // Redirect to a pending screen or back to login with a message
            return NextResponse.redirect(new URL("/login?error=unverified", req.url));
        }
        
        // Admins shouldn't be browsing the user feed, redirect to their dashboards
        if(token?.role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/head-admin", req.url));
        if(token?.role === "ADMIN") return NextResponse.redirect(new URL("/admin-panel", req.url));
        if(token?.role === "SUB_ADMIN") return NextResponse.redirect(new URL("/sub-admin-panel", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/feed/:path*",
    "/Chat/:path*",
    "/create/:path*",
    "/Notification/:path*",
    "/search/:path*",
    "/teenarena/:path*",
    "/schoolCompetitions/:path*",
    "/friends/:path*",
    "/Updateuser/:path*",
    "/User/:path*",
    "/ViewFriends/:path*",
    "/head-admin/:path*",
    "/admin-panel/:path*",
    "/sub-admin-panel/:path*"
  ],
};
