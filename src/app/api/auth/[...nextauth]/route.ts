import { env } from "@/lib/env";
import { handlers } from "@/server/auth";
import { NextRequest } from "next/server";

// Read: https://github.com/nextauthjs/next-auth/issues/10928#issuecomment-2144241314
function reqWithTrustedOrigin(req: NextRequest): NextRequest {
  if (!env.AUTH_TRUST_HOST) {
    return req;
  }

  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host");
  if (!proto || !host) {
    console.warn("Missing x-forwarded-proto or x-forwarded-host headers.");
    return req;
  }

  const incomingOrigin = `${proto}://${host}`;
  const { href, origin } = req.nextUrl;

  return new NextRequest(href.replace(origin, incomingOrigin), req);
}

export const GET = (req: NextRequest) => {
  return handlers.GET(reqWithTrustedOrigin(req));
};

export const POST = (req: NextRequest) => {
  return handlers.POST(reqWithTrustedOrigin(req));
};
