import { getHRAgents } from "@/lib/queries";
import { NewDepartmentForm } from "@/components/settings/new-department-form";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewDepartmentPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "departments", "create")) redirect("/settings/departments");

  const agents = await getHRAgents();

  return (
    <div className="min-h-[calc(100vh-var(--top-nav-height,48px))] bg-white">
      <NewDepartmentForm agents={agents} />
    </div>
  );
}
