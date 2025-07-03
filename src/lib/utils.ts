import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AxiosError } from "axios";
import { TRPCClientError } from "@trpc/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(
  error: unknown,
  defaultMessage = "Something went wrong. Please try again."
) {
  let message = defaultMessage;

  if (error instanceof AxiosError) {
    message = error.response?.data?.message;
  } else if (error instanceof TRPCClientError) {
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return message;
}

export const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};
