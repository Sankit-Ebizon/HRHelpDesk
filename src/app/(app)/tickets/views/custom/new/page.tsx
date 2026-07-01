import { redirect } from "next/navigation";
import { CustomViewForm } from "@/components/tickets/custom-view-form";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { filtersFromSearchParams } from "@/lib/ticket-url";
import { getCategories, getDepartments, getHRAgents } from "@/lib/queries";
import type { TicketView } from "@/types";

interface PageProps {
  searchParams: Promise<{
    view?: TicketView;
    status?: string;
    owner_id?: string;
    category_id?: string;
    department_id?: string;
    priority?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  }>;
}

export default async function CreateCustomViewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "tickets", "read")) redirect("/dashboard");

  const { view, filters } = filtersFromSearchParams(params);
  const [agents, categories, departments] = await Promise.all([
    getHRAgents(),
    getCategories(),
    getDepartments(),
  ]);

  return (
    <CustomViewForm
      mode="create"
      initialBaseView={view}
      initialFilters={filters}
      agents={agents}
      categories={categories.map((item) => ({ id: item.id, name: item.name }))}
      departments={departments.map((item) => ({ id: item.id, name: item.name }))}
      cancelHref="/tickets?list=1"
    />
  );
}
