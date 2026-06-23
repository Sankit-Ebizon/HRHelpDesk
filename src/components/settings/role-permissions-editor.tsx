"use client";

import { useRouter } from "next/navigation";
import { updateRolePermission, updateRoleReportSection } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { ALL_REPORT_SECTIONS } from "@/lib/reports/sections";
import { ZohoToggle } from "@/components/ui/zoho-toggle";
import type { RolePermission, RoleReportSection } from "@/types";

const ACTIONS = [
  { key: "can_read", label: "Read" },
  { key: "can_create", label: "Create" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
] as const;

type PermissionField = (typeof ACTIONS)[number]["key"];

const PERMISSION_SECTIONS = [
  {
    title: "Core Modules",
    slugs: ["tickets", "contacts", "time_logs"],
  },
  {
    title: "Organization",
    slugs: ["departments", "categories"],
  },
  {
    title: "Administration",
    slugs: ["users", "reports", "settings"],
  },
];

interface RolePermissionsEditorProps {
  role: string;
  permissions: RolePermission[];
  reportSections: RoleReportSection[];
  isAdmin: boolean;
  isSystemAdmin?: boolean;
}

export function RolePermissionsEditor({
  role,
  permissions,
  reportSections,
  isAdmin,
  isSystemAdmin = role === "administrator",
}: RolePermissionsEditorProps) {
  const router = useRouter();
  const readOnly = !isAdmin || isSystemAdmin;

  async function toggle(permissionId: string, field: PermissionField, current: boolean) {
    if (readOnly) return;

    let nextValue = !current;

    await runWithLoading(async () => {
      await updateRolePermission(permissionId, field, nextValue, role);

      if (field === "can_read" && !nextValue) {
        const perm = permissions.find((entry) => entry.id === permissionId);
        if (!perm) return;
        if (perm.can_create) await updateRolePermission(permissionId, "can_create", false, role);
        if (perm.can_edit) await updateRolePermission(permissionId, "can_edit", false, role);
        if (perm.can_delete) await updateRolePermission(permissionId, "can_delete", false, role);
      }

      if (field !== "can_read" && nextValue) {
        const perm = permissions.find((entry) => entry.id === permissionId);
        if (perm && !perm.can_read) {
          await updateRolePermission(permissionId, "can_read", true, role);
        }
      }

      router.refresh();
    });
  }

  async function toggleReportSection(sectionId: string, current: boolean) {
    if (readOnly) return;

    await runWithLoading(async () => {
      await updateRoleReportSection(sectionId, !current, role);
      router.refresh();
    });
  }

  function isReportSectionVisible(sectionId: string): boolean {
    const entry = reportSections.find((section) => section.section_id === sectionId);
    return entry ? entry.can_view : true;
  }

  return (
    <div className="space-y-8 px-6 py-6 sm:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
      {PERMISSION_SECTIONS.map((section) => (
        <section key={section.title} className="min-w-0">
          <h2 className="mb-3 border-b border-zinc-200 bg-[#f5f7f9] px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-[#0091FF]">
            {section.title}
          </h2>
          <div className="space-y-4">
            {section.slugs.map((slug) => {
              const perm = permissions.find((entry) => entry.module?.slug === slug);
              if (!perm) return null;

              return (
                <div key={slug} className="rounded border border-zinc-200 bg-white">
                  <div className="border-b border-zinc-100 px-3 py-2.5">
                    <p className="text-[13px] font-semibold text-zinc-900">{perm.module?.name}</p>
                    {perm.module?.slug && (
                      <p className="mt-0.5 text-[12px] text-zinc-500">
                        Control access to {perm.module.name.toLowerCase()}.
                      </p>
                    )}
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {ACTIONS.map((action) => (
                      <div
                        key={action.key}
                        className="flex items-center justify-between px-3 py-2.5"
                      >
                        <span className="text-[13px] text-zinc-700">{action.label}</span>
                        <ZohoToggle
                          id={`${role}-${slug}-${action.key}`}
                          label={`${perm.module?.name} ${action.label}`}
                          checked={perm[action.key]}
                          disabled={readOnly}
                          onChange={() => toggle(perm.id, action.key, perm[action.key])}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      </div>

      <section className="min-w-0">
        <h2 className="mb-3 border-b border-zinc-200 bg-[#f5f7f9] px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-[#0091FF]">
          Report Sections
        </h2>
        <p className="mb-4 text-[12px] text-zinc-500">
          Choose which report tabs are visible on the Reports page for this profile.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_REPORT_SECTIONS.map((section) => {
            const visible = isReportSectionVisible(section.id);
            return (
              <div
                key={section.id}
                className="flex items-center justify-between rounded border border-zinc-200 bg-white px-3 py-2.5"
              >
                <span className="text-[13px] text-zinc-700">{section.label}</span>
                <ZohoToggle
                  id={`${role}-report-${section.id}`}
                  label={`${section.label} visible`}
                  checked={visible}
                  disabled={readOnly}
                  onChange={() => toggleReportSection(section.id, visible)}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
