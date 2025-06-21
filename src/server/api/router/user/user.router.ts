import { protectedProcedure, publicProcedure, router } from "../../trpc";
import {
  initiateLoginInput,
  mobileNumberInput,
  registrationInput,
  verifyOTPInput,
} from "./user.input";
import {
  getMe,
  initiateLogin,
  isUserRegistered,
  verifyLoginOTP,
  createNewUser,
} from "./user.service";

export const userRouter = router({
  me: protectedProcedure.query(({ ctx: { session } }) => getMe(session)),
  initiateLogin: publicProcedure
    .input(initiateLoginInput)
    .mutation(async ({ input }) => initiateLogin(input)),

  verifyLoginOTP: publicProcedure
    .input(verifyOTPInput)
    .mutation(async ({ input }) => verifyLoginOTP(input)),

  isUserRegistered: publicProcedure
    .input(mobileNumberInput)
    .query(async ({ input }) => isUserRegistered(input)),

  createUser: publicProcedure
    .input(registrationInput)
    .mutation(async ({ input }) => createNewUser(input)),
});
