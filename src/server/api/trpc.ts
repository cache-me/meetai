import { UserRole } from "@prisma/client";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createTRPCContext } from "./context";

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const { role } = ctx.session.user;
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

const enforceUserIsSuperAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (ctx.session.user.role !== UserRole.SUPER_ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Super admin access required",
    });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

const enforceUserOwnershipOrAdmin = t.middleware(({ ctx, next, input }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const { role, id: userId } = ctx.session.user;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

  if (typeof input === "object" && input !== null && "userId" in input) {
    const targetUserId = (input as { userId: string }).userId;
    if (!isAdmin && userId !== targetUserId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied",
      });
    }
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      isAdmin,
    },
  });
});

export const protectedProcedure = publicProcedure.use(enforceUserIsAuthed);
export const adminProcedure = publicProcedure.use(enforceUserIsAdmin);
export const superAdminProcedure = publicProcedure.use(enforceUserIsSuperAdmin);
export const ownershipProcedure = publicProcedure.use(
  enforceUserOwnershipOrAdmin
);

export const router = t.router;
export const middleware = t.middleware;
