import { AppHeader } from "@/components/layout/sidebar";
import { PageContent } from "@/components/layout/page-content";
import { CustomReportDetailView } from "@/components/reports/custom-report-detail-view";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess, getScheduledReportPermissions } from "@/lib/auth";
import {
  getHRAgents,
  getCategories,
  getDepartments,
  getRecipientEmailOptions,
  getVisibleReportSectionsForRole,
} from "@/lib/queries";
import { CUSTOM_REPORT_SECTION } from "@/lib/reports/sections";
import { notFound, redirect } from "next/navigation";

export default async function CustomReportPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "reports", "read")) redirect("/dashboard");

  const visibleSections = await getVisibleReportSectionsForRole(ctx.profile.role);
  if (!visibleSections.includes(CUSTOM_REPORT_SECTION)) notFound();

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
        <CustomReportDetailView
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
