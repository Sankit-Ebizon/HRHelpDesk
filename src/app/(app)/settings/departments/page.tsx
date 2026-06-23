import Link from "next/link";
import { getDepartments } from "@/lib/queries";
import { NewDepartmentButton } from "@/components/settings/new-department-button";
import { DepartmentActions } from "@/components/settings/department-actions";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Building2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import Image from "next/image";
import type { Department } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function formatSetupDate(date: string) {
  return format(parseISO(date), "dd MMM hh:mm a");
}

function DepartmentAvatar({ department }: { department: Department }) {
  if (department.logo_url) {
    return (
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
        <Image
          src={department.logo_url}
          alt={`${department.name} logo`}
          fill
          className="object-cover"
          sizes="32px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef6fc] text-[#1a73b5]">
      <Building2 className="h-4 w-4" />
    </div>
  );
}

export default async function DepartmentsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "departments", "read")) redirect("/dashboard");

  const canCreate = canAccess(ctx.permissions, "departments", "create");
  const canEdit = canAccess(ctx.permissions, "departments", "edit");
  const canDelete = canAccess(ctx.permissions, "departments", "delete");
  const [departments] = await Promise.all([getDepartments()]);
  const showActions = canEdit || canDelete;

  return (
    <div className="min-h-full bg-white">
      <SettingsDetailHeader
        category="Organization"
        title="Departments"
        breadcrumbLabel="Departments"
        description="Departments in HR Helpdesk help you organize support teams, route tickets, and assign ownership. Create departments for HR, Payroll, Benefits, and other functions your employees reach out to."
        actions={canCreate ? <NewDepartmentButton /> : undefined}
      />

      <div className="px-6 py-2 sm:px-8">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Department Name
              </th>
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Description
              </th>
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Associate Agent
              </th>
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                State
              </th>
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Created By
              </th>
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Created Time
              </th>
              {showActions && (
                <th className="py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td
                  colSpan={showActions ? 7 : 6}
                  className="py-10 text-center text-zinc-500"
                >
                  No departments yet.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2.5">
                      <DepartmentAvatar department={dept} />
                      <Link
                        href={`/settings/departments/${dept.id}`}
                        className="font-medium text-zinc-900 hover:text-[#1a73b5] hover:underline"
                      >
                        {dept.name}
                      </Link>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-zinc-600">
                    {dept.description || "—"}
                  </td>
                  <td className="py-4 pr-4 text-zinc-600">
                    {dept.associate_agent ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-[#1a73b5] text-[10px] text-white">
                            {getInitials(dept.associate_agent.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{dept.associate_agent.full_name}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        dept.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      )}
                    >
                      {dept.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-zinc-600">
                    {dept.created_by_profile ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-zinc-200 text-[10px] text-zinc-700">
                            {getInitials(dept.created_by_profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{dept.created_by_profile.full_name}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-4 pr-4 text-zinc-600">
                    {formatSetupDate(dept.created_at)}
                  </td>
                  {showActions && (
                    <td className="py-4 text-right">
                      <DepartmentActions
                        department={dept}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
