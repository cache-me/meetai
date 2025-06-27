"use client";

import { useSearchParams } from "next/navigation";
import { BaseButton } from "@/components/ui/button";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="text-muted-foreground mb-4">
          {error === "Configuration"
            ? "There was a configuration error. Please try again."
            : "An authentication error occurred."}
        </p>
        <BaseButton asChild>
          <Link href="/auth/user-login">Try Again</Link>
        </BaseButton>
      </div>
    </div>
  );
}
