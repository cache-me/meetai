import { Session } from "next-auth";
import { auth } from "../auth";

export type CreateContextOptions = {
  session: Session | null;
};

export async function createTRPCContext(): Promise<CreateContextOptions> {
  const session = await auth();
  return {
    session,
  };
}
