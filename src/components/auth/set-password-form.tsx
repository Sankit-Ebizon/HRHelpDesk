"use client";

import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export function SetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <ResetPasswordForm
      email={email}
      title="Set your password"
      description="Create a password to complete your HR Helpdesk account setup."
      successMessage="Password set successfully. Sign in with your new password."
    />
  );
}
