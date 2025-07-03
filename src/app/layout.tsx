import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Mono } from "next/font/google";
import colors from "tailwindcss/colors";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TRPCProvider } from "@/client/trpc/provider";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Portfolio Website",
  description: "Personal Portfolio Website",
};

export const viewport: Viewport = {
  themeColor: colors.zinc["950"],
};

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "700"],
});
const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(sans.variable, mono.variable, "bg-background")}
    >
      <body
        suppressHydrationWarning
        className="overflow-x-hidden bg-background"
      >
        <TRPCProvider>
          {children}
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  );
}
