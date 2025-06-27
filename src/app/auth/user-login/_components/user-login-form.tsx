"use client";

import { useState } from "react";
import InitiateLoginForm from "./initiate-login-form";
import OTPVerificationForm from "./otp-verify-form";

enum UserLoginStage {
  INITIATELOGIN,
  VERIFYOTP,
}

export default function UserLoginContainer() {
  const [stage, setStage] = useState<UserLoginStage>(
    UserLoginStage.INITIATELOGIN
  );
  const [loginData, setLoginData] = useState<{
    userId: string;
    mobileNumber: string;
  } | null>(null);

  const handleStageChange = (
    newStage: UserLoginStage,
    data?: { userId: string; mobileNumber: string }
  ) => {
    if (data) {
      setLoginData(data);
    }
    setStage(newStage);
  };

  return (
    <div className="content-center px-4 py-6 sm:px-6 sm:py-8 lg:min-h-screen lg:w-full lg:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-lg">
        {stage === UserLoginStage.INITIATELOGIN ? (
          <InitiateLoginForm
            onSuccess={(data) =>
              handleStageChange(UserLoginStage.VERIFYOTP, data)
            }
          />
        ) : null}

        {stage === UserLoginStage.VERIFYOTP && loginData ? (
          <OTPVerificationForm
            mobileNumber={loginData.mobileNumber}
            onSuccess={() => {
              window.location.href = "/";
            }}
            onBack={() => handleStageChange(UserLoginStage.INITIATELOGIN)}
          />
        ) : null}
      </div>
    </div>
  );
}
