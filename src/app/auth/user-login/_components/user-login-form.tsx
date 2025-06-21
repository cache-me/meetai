"use client";

import { useState } from "react";
import { match } from "ts-pattern";
import InitiateLoginForm from "./initiate-login-form";
import RegistrationForm from "./registration-form";
import { trpc } from "@/client/trpc/client";
import OTPVerificationForm from "./otp-verify-form";
import { User } from "@prisma/client";

enum UserLoginStage {
  INITIATELOGIN,
  VERIFYOTP,
  REGISTRATION,
}

export default function UserLoginContainer() {
  const [stage, setStage] = useState<UserLoginStage>(
    UserLoginStage.INITIATELOGIN
  );
  const [loginData, setLoginData] = useState<{
    userFound: boolean;
    mobileNumber: string;
    user: User;
  } | null>(null);

  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  const isNumberInUse = trpc.user.isUserRegistered.useQuery(
    { mobileNumber: loginData?.mobileNumber ?? "" },
    { enabled: !!loginData }
  );

  if (isNumberInUse.data !== undefined && isRegistered !== isNumberInUse.data) {
    setIsRegistered(isNumberInUse.data);
  }

  const handleStageChange = (
    newStage: UserLoginStage,
    data?: { userFound: boolean; mobileNumber: string; user: User }
  ) => {
    if (data) {
      setLoginData(data);
    }
    setStage(newStage);
  };

  return (
    <div className="content-center px-4 py-6 sm:px-6 sm:py-8 lg:min-h-screen lg:w-full lg:px-8">
      <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-lg">
        {match({ stage, isRegistered })
          .with({ stage: UserLoginStage.INITIATELOGIN }, () => (
            <InitiateLoginForm
              onSuccess={(data) => {
                if (data?.userFound) {
                  handleStageChange(UserLoginStage.VERIFYOTP, data);
                } else {
                  handleStageChange(UserLoginStage.REGISTRATION);
                }
              }}
            />
          ))
          .with({ stage: UserLoginStage.VERIFYOTP, isRegistered: true }, () => (
            <OTPVerificationForm
              mobileNumber={loginData ? loginData.mobileNumber : ""}
              onSuccess={() => {
                window.location.href = "/dashboard/guest-house";
              }}
              onBack={() => handleStageChange(UserLoginStage.INITIATELOGIN)}
            />
          ))
          .with({ stage: UserLoginStage.REGISTRATION }, () => (
            <RegistrationForm
              onSuccess={() => handleStageChange(UserLoginStage.INITIATELOGIN)}
            />
          ))
          .otherwise(() => null)}
      </div>
    </div>
  );
}
