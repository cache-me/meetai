import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../ui/input-otp";

type SecureOtpInputProps = Omit<
  React.ComponentPropsWithoutRef<typeof InputOTP>,
  "render"
> & {
  /**
   * How many slots should be there in single group?
   */
  slotInSingleGroup?: number;
  /**
   * If there are input inputs which always needs to be displayed
   */
  insecureIndexes?: number[];
};

export default function SecureOtpInput({
  maxLength,
  className,
  style,
  slotInSingleGroup = maxLength,
  insecureIndexes = [],
  ...inputOTPProps
}: SecureOtpInputProps) {
  const [isPasswordType, setIsPasswordType] = useState(true);

  const groupsToRender = useMemo(() => {
    const groups: Array<number[]> = [];
    const indexes = Array.from({ length: maxLength }).map((_, i) => i);

    for (let i = 0; i < maxLength; i += slotInSingleGroup) {
      groups.push(indexes.slice(i, i + slotInSingleGroup));
    }

    return groups;
  }, [maxLength, slotInSingleGroup]);

  return (
    <div className={cn("flex items-center gap-4", className)} style={style}>
      <InputOTP maxLength={maxLength} {...inputOTPProps}>
        {groupsToRender.map((slots, groupIndex) => (
          <Fragment key={groupIndex}>
            <InputOTPGroup>
              {slots.map((slotIndex) => (
                <InputOTPSlot
                  key={slotIndex}
                  className="h-10 text-sm sm:h-12 sm:text-base"
                  inputType={
                    insecureIndexes.includes(slotIndex) || !isPasswordType
                      ? undefined
                      : "password"
                  }
                  index={slotIndex}
                />
              ))}
            </InputOTPGroup>

            {groupIndex < groupsToRender.length - 1 ? (
              <InputOTPSeparator />
            ) : null}
          </Fragment>
        ))}
      </InputOTP>

      <Button
        type="button"
        variant="outline"
        className="h-10 text-sm sm:h-12 sm:text-base"
        icon={isPasswordType ? <EyeIcon /> : <EyeOffIcon />}
        onClick={() => {
          setIsPasswordType((prev) => !prev);
        }}
      />
    </div>
  );
}
