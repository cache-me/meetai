"use client";

import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LottieRenderer } from "@/components/lottie-render/lottie";
import lottieAnimationSrc from "../../../media/assets/register.json";

const getWelcomeMessage = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning! Welcome back";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon! Welcome back";
  } else if (hour >= 17 && hour < 22) {
    return "Good evening! Welcome back";
  } else {
    return "Working late? Welcome back";
  }
};

const validationSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function AdminLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const adminLoginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof validationSchema>) => {
      const result = await signIn("admin-login", {
        email: data.email,
        password: data.password,
        redirectTo: "/dashboard",
      });
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logged in successfully!",
        variant: "success",
      });
      router.push("/dashboard");
    },

    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="content-center px-4 py-6 sm:px-6 sm:py-8 lg:min-h-screen lg:w-full lg:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-lg">
        <div className="space-y-8">
          <div className="flex items-start justify-center gap-4">
            <LottieRenderer
              src={lottieAnimationSrc}
              className="absolute inset-0"
              style={{ width: "13%", height: "13%" }}
              autoplay={true}
              loop={true}
              speed={1}
              priority={true}
              fallback={
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-4xl mb-4">🎨</div>
                    <div className="text-lg">Welcome</div>
                    <div className="text-sm opacity-80">
                      Animation loading...
                    </div>
                  </div>
                </div>
              }
            />
            <div className="text-start font-medium text-6xl">Meet AI</div>
          </div>
          <div className="space-y-2 text-start">
            <p className="text-lg font-medium text-primary">
              {getWelcomeMessage()}
            </p>
          </div>
          <div>
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((data) =>
                  adminLoginMutation.mutate(data)
                )}
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Email ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            required
                            className="h-12 text-sm"
                            placeholder="Enter your user ID"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            required
                            className="h-12 text-sm"
                            placeholder="Enter your password"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-end">
                    <Button
                      variant="link"
                      className="text-sm text-primary hover:text-primary"
                    >
                      Forgot password?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full text-sm"
                    disabled={adminLoginMutation.isPending}
                    loading={adminLoginMutation.isPending}
                  >
                    {adminLoginMutation.isPending ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
