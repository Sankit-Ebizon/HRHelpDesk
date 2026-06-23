"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { updateUser } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import {
  getRoleLabel,
  USER_STATUS_LABELS,
  type Profile,
  type RoleDefinition,
} from "@/types";

interface Department {
  id: string;
  name: string;
}

interface UserDetailViewProps {
  user: Profile & { last_login_at?: string | null };
  departments: Department[];
  roles: RoleDefinition[];
  roleLabels: Record<string, string>;
  canEdit: boolean;
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-zinc-100 py-4 sm:grid-cols-[220px_1fr] sm:gap-8">
      <span className="text-[13px] text-zinc-500">{label}</span>
      <div className="min-w-0 text-[13px] text-zinc-900">{children}</div>
    </div>
  );
}

function UnderlineInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full max-w-md border-0 border-b border-zinc-300 bg-transparent px-0 py-1.5 text-[13px] text-zinc-900",
        "outline-none placeholder:text-zinc-400 focus:border-[#1a73b5]",
        "disabled:cursor-not-allowed disabled:text-zinc-600",
        className
      )}
      {...props}
    />
  );
}

function formatLastLogin(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd/MM/yyyy hh:mm a");
  } catch {
    return "—";
  }
}

function formatCreatedAt(value: string) {
  try {
    return format(parseISO(value), "dd/MM/yyyy hh:mm a");
  } catch {
    return "—";
  }
}

export function UserDetailView({
  user,
  departments,
  roles,
  roleLabels,
  canEdit,
}: UserDetailViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(user.status === "active");
  const [role, setRole] = useState(user.role);
  const [departmentId, setDepartmentId] = useState(user.department_id || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("is_active", isActive ? "true" : "false");
      formData.set("current_status", user.status);
      formData.set("role", role);
      if (departmentId) formData.set("department_id", departmentId);

      const result = await runWithLoading(() => updateUser(user.id, formData));

      if (result?.error) {
        setError(result.error);
        return;
      }

      toast({ title: "User updated", variant: "success" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-full bg-white">
      <div className="flex items-center border-b border-zinc-200 px-5 py-2.5">
        <Link
          href="/users"
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-800 hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
          Users
        </Link>
      </div>

      <div className="px-6 py-8 sm:px-8">
        <h1 className="mb-8 text-[17px] font-normal text-zinc-800">
          Customer Information
        </h1>

        {error && (
          <p className="mb-4 max-w-3xl rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="max-w-3xl">
          <section>
            <h2 className="mb-1 text-[14px] font-semibold text-zinc-900">General</h2>
            <div className="divide-y divide-zinc-100">
              <FieldRow label="User Name">
                <UnderlineInput
                  name="full_name"
                  defaultValue={user.full_name}
                  required
                  disabled={!canEdit}
                />
              </FieldRow>

              <FieldRow label="Email">
                <UnderlineInput name="email" defaultValue={user.email} disabled readOnly />
              </FieldRow>

              <FieldRow label="Active">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={!canEdit || user.status === "rejected"}
                    className="h-4 w-4 rounded border-zinc-300 accent-[#1a73b5] disabled:cursor-not-allowed"
                  />
                  <span className="text-[13px] text-zinc-700">
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </label>
              </FieldRow>

              <FieldRow label="Status">
                <span className="text-zinc-700">{USER_STATUS_LABELS[user.status]}</span>
              </FieldRow>

              <FieldRow label="Role">
                {canEdit ? (
                  <div className="relative max-w-md">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full appearance-none border-0 border-b border-zinc-300 bg-transparent py-1.5 pr-8 text-[13px] text-zinc-900 outline-none focus:border-[#1a73b5]"
                    >
                      {roles.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  </div>
                ) : (
                  <span>{getRoleLabel(user.role, roleLabels)}</span>
                )}
              </FieldRow>

              <FieldRow label="Last Log in">
                <span className="text-zinc-700">{formatLastLogin(user.last_login_at)}</span>
              </FieldRow>

              <FieldRow label="Created">
                <span className="text-zinc-700">{formatCreatedAt(user.created_at)}</span>
              </FieldRow>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-1 text-[14px] font-semibold text-zinc-900">Department</h2>
            <p className="mb-3 text-[12px] leading-relaxed text-zinc-600">
              Select the department this user belongs to for ticket routing and team
              organization.
            </p>
            <div className="divide-y divide-zinc-100">
              <FieldRow label="Department">
                {canEdit ? (
                  <div className="relative max-w-md">
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className={cn(
                        "w-full appearance-none border-0 border-b border-zinc-300 bg-transparent py-1.5 pr-8 text-[13px] outline-none focus:border-[#1a73b5]",
                        departmentId ? "text-zinc-900" : "text-zinc-500"
                      )}
                    >
                      <option value="">None</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  </div>
                ) : (
                  <span>{user.department?.name || "—"}</span>
                )}
              </FieldRow>
            </div>
          </section>

          {canEdit && (
            <div className="mt-10 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-8 items-center rounded-sm bg-[#1a73b5] px-5 text-[13px] font-medium text-white hover:bg-[#155a8a] disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <Link
                href="/users"
                className="inline-flex h-8 items-center rounded-sm border border-zinc-300 bg-white px-5 text-[13px] font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Cancel
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
