import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const path = req.nextUrl.pathname;

    const protectedRoutes = ["/feed", "/Chat", "/create", "/Notification", "/search", "/teenarena", "/schoolCompetitions", "/friends", "/Updateuser", "/User", "/ViewFriends", "/community"];
    const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route) || path === "/");

    if (isProtectedRoute) {
        // Continue to protected route
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
    "/community/:path*"
  ],
};
