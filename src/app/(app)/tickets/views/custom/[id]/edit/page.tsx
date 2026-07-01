import { notFound, redirect } from "next/navigation";
import { CustomViewForm } from "@/components/tickets/custom-view-form";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { buildCustomViewUrl } from "@/lib/ticket-url";
import { getCategories, getDepartments, getHRAgents, getSavedTicketViewById } from "@/lib/queries";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomViewPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "tickets", "read")) redirect("/dashboard");

  const view = await getSavedTicketViewById(id);
  if (!view) notFound();

  const [agents, categories, departments] = await Promise.all([
    getHRAgents(),
    getCategories(),
    getDepartments(),
  ]);

  return (
    <CustomViewForm
      mode="edit"
      view={view}
      agents={agents}
      categories={categories.map((item) => ({ id: item.id, name: item.name }))}
      departments={departments.map((item) => ({ id: item.id, name: item.name }))}
      cancelHref={buildCustomViewUrl(view.id, view.base_view, view.filters)}
    />
  );
}
