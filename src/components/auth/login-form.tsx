"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { Loader2, Command } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { HRDashboardIllustration } from "@/components/illustrations/hr-dashboard-hero";
import { ThemeToggle } from "@/components/theme-toggle";

interface LoginFormProps {
  supportEmail: string;
}

export function LoginForm({ supportEmail }: LoginFormProps) {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const defaultEmail = searchParams.get("email") || "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!message) return;
    toast({ variant: "success", title: "Almost there", description: message, durationMs: 5000 });
  }, [message]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
        toast({ variant: "error", title: "Login failed", description: result.error });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex gradient-mesh noise-overlay">
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Command className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-foreground">HR Helpdesk</p>
            <p className="text-2xs text-muted-foreground">Ebizon Digital</p>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            <span className="gradient-text">Enterprise HR</span>
            <br />
            <span className="text-foreground">support, reimagined</span>
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
            Resolve employee requests faster with a modern helpdesk built for HR teams who demand excellence.
          </p>
          <div className="mt-10">
            <HRDashboardIllustration className="w-full max-w-lg opacity-90" />
          </div>
        </div>

        <p className="text-2xs text-muted-foreground/60">© {new Date().getFullYear()} Ebizon Digital. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md shadow-glass animate-slide-up">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <Command className="h-5 w-5 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
            <CardDescription>Sign in to your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert variant="success" className="mb-5">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form action={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={defaultEmail}
                  placeholder="you@company.com"
                  readOnly={!!defaultEmail}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href={`/forgot-password${defaultEmail ? `?email=${encodeURIComponent(defaultEmail)}` : ""}`}
                    className="text-xs font-medium text-primary hover:text-primary/80"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" name="password" type="password" required placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Continue to dashboard"
                )}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Employee?{" "}
              <Link href="/track" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Track your ticket
              </Link>
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Need help?{" "}
              <a className="text-primary hover:text-primary/80" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
