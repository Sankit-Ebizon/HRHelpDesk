import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { getSupportEmail } from "@/lib/queries";

export default async function LoginPage() {
  const supportEmail = await getSupportEmail();
  return (
    <Suspense>
      <LoginForm supportEmail={supportEmail} />
    </Suspense>
  );
}
