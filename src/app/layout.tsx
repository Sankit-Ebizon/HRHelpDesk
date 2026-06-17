import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { RouteLoadingOverlay } from "@/components/ui/route-loading-overlay";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
          <RouteLoadingOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
