import { redirect } from "next/navigation";
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
    <div className="min-h-full bg-white">
      <div className="border-b border-zinc-200 px-6 py-4">
        <h1 className="text-[15px] font-medium text-zinc-900">General Settings</h1>
      </div>

      <div className="px-6 py-6">
        <section className="max-w-lg">
          <h2 className="text-[14px] font-semibold text-zinc-900">Support Inbox</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-700">
            This email is used across the app (public track page, inbound ticket routing,
            and login support references).
          </p>
          <div className="mt-5">
            <SupportEmailForm initialEmail={supportEmail} />
          </div>
        </section>
      </div>
    </div>
  );
}
