import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createTRPCContext } from "./context";

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;
export const router = t.router;

export const protectedProcedure = t.procedure.use(async function isAuthed({
  ctx,
  next,
}) {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async function isAdmin({
  ctx,
  next,
}) {
  if (!ctx.session?.user?.role || ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to perform this action",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
    },
  });
});
