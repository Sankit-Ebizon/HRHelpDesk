import Link from "next/link";
import { AppHeader } from "@/components/layout/sidebar";
import { PageContent } from "@/components/layout/page-content";
import { ScheduledReportsView } from "@/components/reports/scheduled-reports-view";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { getScheduledReportsAction } from "@/lib/actions/scheduled-reports";
import { canAccess, getScheduledReportPermissions } from "@/lib/auth";
import { getRecipientEmailOptions } from "@/lib/queries";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ReportSchedulesPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "reports", "read")) redirect("/dashboard");

  const schedulePermissions = getScheduledReportPermissions(ctx.permissions);
  if (!schedulePermissions.canView) redirect("/reports");

  const [schedules, recipientOptions] = await Promise.all([
    getScheduledReportsAction(),
    getRecipientEmailOptions(),
  ]);

  return (
    <>
      <AppHeader title="Reports" profile={ctx.profile} />
      <PageContent className="space-y-6">
        <div className="space-y-4">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1a73b5] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Reports
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Scheduled Reports</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage recurring report delivery to email recipients.
            </p>
          </div>
        </div>

        <ScheduledReportsView
          schedules={schedules}
          permissions={schedulePermissions}
          recipientOptions={recipientOptions}
        />
      </PageContent>
    </>
  );
}
