import type { Metadata } from "next";
import { Suspense } from "react";
import { Lato } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { RouteLoadingOverlay } from "@/components/ui/route-loading-overlay";
import { ThemeProvider } from "@/components/theme-provider";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HR Helpdesk | Ebizon Digital",
  description: "HR Helpdesk application for managing employee support tickets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={lato.variable} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
          <Suspense fallback={null}>
            <RouteLoadingOverlay />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
