"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, Loader2 } from "lucide-react";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get("email") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await requestPasswordReset(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess("Password reset link sent. Check your email to set a new password.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-mesh">
      <Card className="w-full max-w-md shadow-glass">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <Command className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>
            Enter your work email and we&apos;ll send you a link to set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={defaultEmail}
                placeholder="you@company.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
