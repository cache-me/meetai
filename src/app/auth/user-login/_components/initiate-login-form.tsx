"use client";

import { trpc } from "@/client/trpc/client";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { initiateLoginInput } from "@/server/api/router/user/user.input";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface InitiateLoginFormProps {
  onSuccess: (data: { userId: string; mobileNumber: string }) => void;
}

export default function InitiateLoginForm({
  onSuccess,
}: InitiateLoginFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof initiateLoginInput>>({
    resolver: zodResolver(initiateLoginInput),
    defaultValues: {
      mobileNumber: "",
    },
  });

  const initiateLoginMutation = trpc.user.initiateLogin.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "OTP sent successfully",
        variant: "success",
      });
      onSuccess({
        userId: data.user.id,
        mobileNumber: form.getValues("mobileNumber"),
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof initiateLoginInput>) => {
    initiateLoginMutation.mutate(values);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold">Login or sign up to continue</h1>
        <p className="text-muted-foreground">
          Enter your mobile number to get started. We will send you a one-time
          password (OTP) to verify your account.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <div className="flex h-12 items-center rounded-l-md border bg-muted px-3 text-sm">
                      +91
                    </div>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="Enter your mobile number"
                      maxLength={10}
                      className="h-12 rounded-l-none"
                      autoComplete="tel"
                      disabled={initiateLoginMutation.isPending}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="h-12 w-full"
            disabled={
              !form.formState.isValid || initiateLoginMutation.isPending
            }
            loading={initiateLoginMutation.isPending}
          >
            Get OTP
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm">
        <Link
          href="/auth/user-login"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "text-sm text-muted-foreground hover:text-primary"
          )}
        >
          Having trouble logging in? Get Help
        </Link>
      </div>
    </div>
  );
}
