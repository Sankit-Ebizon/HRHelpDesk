import { notFound, redirect } from "next/navigation";
import { DepartmentDetailView } from "@/components/settings/department-detail-view";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import {
  getCategoriesByDepartment,
  getDepartmentById,
  getDepartmentMembers,
  getHRAgents,
} from "@/lib/queries";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "departments", "read")) redirect("/dashboard");

  const department = await getDepartmentById(id);
  if (!department) notFound();

  const canEdit = canAccess(ctx.permissions, "departments", "edit");
  const [agents, members, categories] = await Promise.all([
    getHRAgents(),
    getDepartmentMembers(id),
    getCategoriesByDepartment(id),
  ]);

  return (
    <DepartmentDetailView
      department={department}
      agents={agents}
      members={members}
      categories={categories}
      canEdit={canEdit}
    />
  );
}
