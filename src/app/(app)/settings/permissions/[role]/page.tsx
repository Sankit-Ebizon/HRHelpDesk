import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";
import { RolePermissionsEditor } from "@/components/settings/role-permissions-editor";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { getRoleByKey, getRolePermissionsByRole, getRoleReportSectionsByRole } from "@/lib/queries";
import { canAccess } from "@/lib/auth";
import type { RolePermission } from "@/types";

const PROFILE_DESCRIPTIONS: Record<string, string> = {
  administrator: "Set the privileges for administrators.",
  hr_manager: "Set the privileges for HR managers.",
  hr_agent: "Set the privileges for HR agents.",
};

interface PageProps {
  params: Promise<{ role: string }>;
}

export default async function RolePermissionsPage({ params }: PageProps) {
  const { role } = await params;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "settings", "read")) redirect("/dashboard");
  if (!canAccess(ctx.permissions, "settings", "edit")) redirect("/dashboard");

  const roleDefinition = await getRoleByKey(role);
  if (!roleDefinition) notFound();

  const permissions = (await getRolePermissionsByRole(role)) as RolePermission[];
  const reportSections = await getRoleReportSectionsByRole(role);
  const isAdmin = ctx.profile.role === "administrator";
  const description =
    PROFILE_DESCRIPTIONS[role] ?? `Set the privileges for ${roleDefinition.label.toLowerCase()}.`;

  return (
    <div className="min-h-full bg-white">
      <div className="border-b border-zinc-200 px-6 py-3 sm:px-8">
        <Link
          href="/settings/permissions"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1a73b5] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Profiles
        </Link>
      </div>

      <SettingsDetailHeader
        category="User Management"
        title={roleDefinition.label}
        breadcrumbLabel="Profiles"
        description={description}
      />

      {role === "administrator" && (
        <p className="border-b border-zinc-200 px-6 py-3 text-[13px] text-zinc-600 sm:px-8">
          Administrator permissions are locked and cannot be changed.
        </p>
      )}

      {!isAdmin && (
        <p className="border-b border-zinc-200 px-6 py-3 text-[13px] text-zinc-600 sm:px-8">
          View only — contact an administrator to change permissions.
        </p>
      )}

      <RolePermissionsEditor
        role={role}
        permissions={permissions}
        reportSections={reportSections}
        isAdmin={isAdmin}
        isSystemAdmin={role === "administrator"}
      />
    </div>
  );
}
