import { AppHeader } from "@/components/layout/sidebar";
import { PageContent } from "@/components/layout/page-content";
import { ReportDetailView } from "@/components/reports/report-detail-view";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess, getScheduledReportPermissions } from "@/lib/auth";
import {
  getHRAgents,
  getCategories,
  getDepartments,
  getRecipientEmailOptions,
  getVisibleReportSectionsForRole,
} from "@/lib/queries";
import { REPORT_DEFINITIONS } from "@/lib/reports/types";
import { isReportType } from "@/lib/reports/sections";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ type: string }>;
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { type } = await params;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "reports", "read")) redirect("/dashboard");
  if (!isReportType(type)) notFound();

  const visibleSections = await getVisibleReportSectionsForRole(ctx.profile.role);
  if (!visibleSections.includes(type)) notFound();

  const report = REPORT_DEFINITIONS.find((item) => item.id === type)!;
  const schedulePermissions = getScheduledReportPermissions(ctx.permissions);
  const [agents, categories, departments, recipientOptions] = await Promise.all([
    getHRAgents(),
    getCategories(),
    getDepartments(),
    schedulePermissions.canCreate ? getRecipientEmailOptions() : Promise.resolve([]),
  ]);

  return (
    <>
      <AppHeader title="Reports" profile={ctx.profile} />
      <PageContent>
        <ReportDetailView
          report={report}
          agents={agents}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          canSchedule={schedulePermissions.canCreate}
          recipientOptions={recipientOptions}
        />
      </PageContent>
    </>
  );
}
