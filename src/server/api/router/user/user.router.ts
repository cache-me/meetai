import { protectedProcedure, publicProcedure, router } from "../../trpc";
import {
  initiateLoginInput,
  verifyLoginOTPInput,
  registrationInput,
  updateProfileInput,
  updatePasswordInput,
  mobileNumberInput,
} from "./user.input";
import { userService } from "./user.service";

export const userRouter = router({
  me: protectedProcedure.query(({ ctx: { session } }) =>
    userService.getMe(session)
  ),

  register: publicProcedure
    .input(registrationInput)
    .mutation(({ input }) => userService.createUser(input)),

  isUserRegistered: publicProcedure
    .input(mobileNumberInput)
    .query(({ input }) => userService.isUserRegistered(input)),

  initiateLogin: publicProcedure
    .input(initiateLoginInput)
    .mutation(({ input }) => userService.initiateLogin(input)),

  verifyLoginOTP: publicProcedure
    .input(verifyLoginOTPInput)
    .mutation(({ input }) => userService.verifyLoginOTP(input)),

  updateProfile: protectedProcedure
    .input(updateProfileInput)
    .mutation(({ input, ctx: { session } }) =>
      userService.updateProfile(session.user.id, input)
    ),

  updatePassword: protectedProcedure
    .input(updatePasswordInput)
    .mutation(({ input, ctx: { session } }) =>
      userService.updatePassword(session.user.id, input)
    ),

  deactivateAccount: protectedProcedure.mutation(({ ctx: { session } }) =>
    userService.deactivateUser(session.user.id)
  ),
});
