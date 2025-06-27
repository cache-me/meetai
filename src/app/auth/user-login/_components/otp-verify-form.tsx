// "use client";
// import { trpc } from "@/client/trpc/client";
// import { Button } from "@/components/ui/button";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormMessage,
// } from "@/components/ui/form";
// import { verifyLoginOTPInput } from "@/server/api/router/user/user.input";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { ArrowLeftIcon, MessageSquareText } from "lucide-react";
// import { useRef, useState } from "react";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { useToast } from "@/hooks/use-toast";
// import { signIn } from "next-auth/react";
// import SecureOtpInput from "@/components/secure-otp-input";

// export default function OTPVerificationForm({
//   mobileNumber,
//   onSuccess,
//   onBack,
// }: {
//   mobileNumber: string;
//   onSuccess: (isRegistered: boolean) => void;
//   onBack: () => void;
// }) {
//   const { toast } = useToast();
//   const [resend, setResend] = useState(0);
//   const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   const form = useForm<z.infer<typeof verifyLoginOTPInput>>({
//     resolver: zodResolver(verifyLoginOTPInput),
//     defaultValues: {
//       mobileNumber,
//       otp: "",
//     },
//   });

//   const initiateLoginMutation = trpc.user.initiateLogin.useMutation({
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "OTP sent successfully",
//         variant: "success",
//       });
//       startResend();
//     },
//     onError: (error) => {
//       toast({
//         title: "Error",
//         description: error.message || "Something went wrong",
//         variant: "destructive",
//       });
//     },
//   });

//   const verifyOTPMutation = trpc.user.verifyLoginOTP.useMutation({
//     onSuccess: async (data) => {
//       if (data.success) {
//         const result = await signIn("user-login", {
//           mobileNumber,
//           otp: form.getValues("otp"),
//           redirect: false,
//         });

//         if (result?.error) {
//           toast({
//             title: "Error",
//             description: "Login failed",
//             variant: "destructive",
//           });
//         } else {
//           toast({
//             title: "Success",
//             description: "OTP verified successfully",
//             variant: "success",
//           });
//           if (resendTimerRef.current) {
//             clearInterval(resendTimerRef.current);
//           }
//           onSuccess(data.success);
//         }
//       }
//     },
//     onError: (error) => {
//       toast({
//         title: "Error",
//         description: error.message || "Invalid OTP",
//         variant: "destructive",
//       });
//       form.setError("otp", {
//         type: "manual",
//         message: error.message,
//       });
//     },
//   });

//   const startResend = () => {
//     if (resendTimerRef.current) {
//       clearInterval(resendTimerRef.current);
//     }

//     setResend(60);

//     resendTimerRef.current = setInterval(() => {
//       setResend((prev) => {
//         if (prev <= 1) {
//           if (resendTimerRef.current) {
//             clearInterval(resendTimerRef.current);
//           }
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//   };

//   const onSubmit = (values: z.infer<typeof verifyLoginOTPInput>) => {
//     verifyOTPMutation.mutate(values);
//   };

//   const handleResendOTP = () => {
//     if (resend > 0) return;

//     initiateLoginMutation.mutate({
//       mobileNumber,
//     });
//   };

//   return (
//     <div className="space-y-8">
//       <div className="flex flex-col">
//         <div className="text-2xl font-semibold">Verify OTP</div>
//         <div className="text-primary">
//           We sent a code to +91{mobileNumber.slice(-4).padStart(10, "*")}
//         </div>
//       </div>

//       <Form {...form}>
//         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//           <FormField
//             control={form.control}
//             name="otp"
//             render={({ field }) => (
//               <FormItem className="mb-4">
//                 <FormControl>
//                   <SecureOtpInput
//                     maxLength={6}
//                     {...field}
//                     onChange={(value) => {
//                       field.onChange(value);
//                       form.clearErrors("otp");
//                     }}
//                   />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <Button
//             type="submit"
//             className="h-10 w-full text-sm sm:h-12 sm:text-base"
//             loading={verifyOTPMutation.isPending}
//             disabled={!form.watch("otp") || verifyOTPMutation.isPending}
//           >
//             Login
//           </Button>

//           <div className="flex justify-between">
//             <Button
//               variant="outline"
//               size="sm"
//               icon={<ArrowLeftIcon />}
//               disabled={verifyOTPMutation.isPending}
//               onClick={() => {
//                 if (resendTimerRef.current) {
//                   clearInterval(resendTimerRef.current);
//                 }
//                 onBack();
//               }}
//               className="text-xs text-primary sm:text-sm"
//             >
//               Back
//             </Button>
//             <div className="flex items-center justify-center">
//               <Button
//                 type="button"
//                 variant="link"
//                 icon={<MessageSquareText />}
//                 onClick={handleResendOTP}
//                 disabled={
//                   resend > 0 ||
//                   initiateLoginMutation.isPending ||
//                   initiateLoginMutation.status === "error"
//                 }
//                 loading={initiateLoginMutation.isPending}
//               >
//                 {resend > 0 ? `Resend OTP in ${resend}s` : "Click to resend"}
//               </Button>
//             </div>
//           </div>
//         </form>
//       </Form>
//     </div>
//   );
// }

"use client";
import { trpc } from "@/client/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { verifyLoginOTPInput } from "@/server/api/router/user/user.input";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, MessageSquareText } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { signIn } from "next-auth/react";
import SecureOtpInput from "@/components/secure-otp-input";

export default function OTPVerificationForm({
  mobileNumber,
  onSuccess,
  onBack,
}: {
  mobileNumber: string;
  onSuccess: (isRegistered: boolean) => void;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [resend, setResend] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const form = useForm<z.infer<typeof verifyLoginOTPInput>>({
    resolver: zodResolver(verifyLoginOTPInput),
    defaultValues: {
      mobileNumber,
      otp: "",
    },
  });

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
      }
    };
  }, []);

  const initiateLoginMutation = trpc.user.initiateLogin.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "OTP sent successfully",
        variant: "success",
      });
      startResend();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const startResend = () => {
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
    }

    setResend(60);

    resendTimerRef.current = setInterval(() => {
      setResend((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onSubmit = async (values: z.infer<typeof verifyLoginOTPInput>) => {
    try {
      console.log("Attempting login with:", {
        mobileNumber: values.mobileNumber,
        otp: values.otp,
      });

      const result = await signIn("user-login", {
        mobileNumber: values.mobileNumber,
        otp: values.otp,
        redirect: false,
      });

      console.log("SignIn result:", result);

      if (result?.error) {
        console.error("SignIn error:", result.error);

        let errorMessage = "Login failed";

        // Map error codes to user-friendly messages
        switch (result.error) {
          case "invalid_credentials":
            errorMessage = "Invalid OTP. Please try again.";
            break;
          case "account_not_found":
            errorMessage = "Account not found. Please register first.";
            break;
          case "account_inactive":
            errorMessage = "Your account is inactive. Please contact support.";
            break;
          case "expired_otp":
            errorMessage = "OTP has expired. Please request a new one.";
            break;
          default:
            errorMessage = result.error;
        }

        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });

        form.setError("otp", {
          type: "manual",
          message: errorMessage,
        });
      } else if (result?.ok) {
        toast({
          title: "Success",
          description: "Login successful",
          variant: "success",
        });

        if (resendTimerRef.current) {
          clearInterval(resendTimerRef.current);
        }

        onSuccess(true);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResendOTP = () => {
    if (resend > 0) return;

    initiateLoginMutation.mutate({
      mobileNumber,
    });
  };

  const handleBack = () => {
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
    }
    onBack();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col">
        <div className="text-2xl font-semibold">Verify OTP</div>
        <div className="text-primary">
          We sent a code to +91{mobileNumber.slice(-4).padStart(10, "*")}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormControl>
                  <SecureOtpInput
                    maxLength={6}
                    {...field}
                    onChange={(value) => {
                      field.onChange(value);
                      form.clearErrors("otp");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="h-10 w-full text-sm sm:h-12 sm:text-base"
            disabled={!form.watch("otp") || form.watch("otp").length !== 6}
            loading={form.formState.isSubmitting}
          >
            Login
          </Button>

          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeftIcon />}
              onClick={handleBack}
              className="text-xs text-primary sm:text-sm"
            >
              Back
            </Button>
            <div className="flex items-center justify-center">
              <Button
                type="button"
                variant="link"
                icon={<MessageSquareText />}
                onClick={handleResendOTP}
                disabled={resend > 0 || initiateLoginMutation.isPending}
                loading={initiateLoginMutation.isPending}
              >
                {resend > 0 ? `Resend OTP in ${resend}s` : "Click to resend"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
