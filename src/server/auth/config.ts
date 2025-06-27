import { env } from "@/lib/env";
import { UserRole, type User } from "@prisma/client";
import { type NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Define protected routes patterns
      const protectedRoutes = [
        /^\/dashboard(\/.*)?$/, // Admin/User dashboard
        /^\/profile(\/.*)?$/, // User profile pages
        /^\/settings(\/.*)?$/, // Settings pages
      ];

      // Define admin-only routes
      const adminRoutes = [
        /^\/admin(\/.*)?$/, // Admin-only routes
        /^\/dashboard\/admin(\/.*)?$/, // Admin dashboard sections
      ];

      // Check if route requires authentication
      const isProtectedRoute = protectedRoutes.some((route) =>
        route.test(pathname)
      );

      // Check if route requires admin access
      const isAdminRoute = adminRoutes.some((route) => route.test(pathname));

      // Allow access to public routes
      if (!isProtectedRoute && !isAdminRoute) {
        return true;
      }

      // Require authentication for protected routes
      if (!auth?.user) {
        return false;
      }

      // Check admin access for admin routes
      if (isAdminRoute) {
        return (
          auth.user.role === UserRole.ADMIN ||
          auth.user.role === UserRole.SUPER_ADMIN
        );
      }

      // Allow access to protected routes for authenticated users
      if (isProtectedRoute) {
        return (
          auth.user.role === UserRole.USER ||
          auth.user.role === UserRole.ADMIN ||
          auth.user.role === UserRole.SUPER_ADMIN
        );
      }

      return true;
    },
    jwt({ user, token }) {
      if (user) {
        token.name = user.name || "";
        token.role = user.role;
        token.mobileNumber = (user as User).mobileNumber;
        token.id = user.id ?? "";
      }
      return token;
    },
    session({ token, session }) {
      if (token.sub && token.role) {
        session.user.id = token.sub;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.mobileNumber = token.mobileNumber as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 60 * 60 * 24, // 24 hours
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/auth/error",
  },
  secret: env.AUTH_SECRET,
  trustHost: true,
  debug: env.NODE_ENV === "development",
} satisfies NextAuthConfig;
