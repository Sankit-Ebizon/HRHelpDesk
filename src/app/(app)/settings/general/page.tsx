import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/sidebar";
import { PageContent } from "@/components/layout/page-content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { getSupportEmail } from "@/lib/queries";
import { SupportEmailForm } from "@/components/settings/support-email-form";

export default async function GeneralSettingsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "settings", "read")) redirect("/dashboard");
  if (!canAccess(ctx.permissions, "settings", "edit")) redirect("/dashboard");

  const supportEmail = await getSupportEmail();

  return (
    <>
      <AppHeader title="General Settings" profile={ctx.profile} />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Support Inbox</CardTitle>
            <CardDescription>
              This email is used across the app (public track page, inbound ticket routing, and login support references).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupportEmailForm initialEmail={supportEmail} />
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
