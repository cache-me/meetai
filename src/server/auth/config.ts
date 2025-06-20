import { env } from "@/lib/env";
import { User } from "@prisma/client";
import { type NextAuthConfig } from "next-auth";

// We split the config that are required by middleware to check if the user is authorized to access the route
// This has to be done as node specific APIs like crypto are not available in the middleware
//
// Read: https://authjs.dev/guides/edge-compatibility#split-config

export const authConfig = {
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const protectedRoutes = [
        /^\/dashboard(\/.*)?$/, // Match everything under /dashboard
      ];

      // Only allow access to protected routes for authenticated admin users
      const isRouteProtected = protectedRoutes.some((route) =>
        route.test(request.nextUrl.pathname)
      );
      if (isRouteProtected) {
        return auth?.user.role === "ADMIN" || auth?.user.role === "USER";
      }

      return true;
    },
    jwt({ user, token }) {
      if (user) {
        token.name = user.name!;
        token.role = user.role;
        token.mobileNumber = (user as User).mobileNumber;
      }
      return token;
    },
    session({ token, session }) {
      if (token.role) {
        session.user.id = token.sub!;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.mobileNumber = token.mobileNumber as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
  },
  secret: env.AUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;
