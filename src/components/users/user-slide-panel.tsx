"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown } from "lucide-react";
import { inviteUser, updateUser } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import { USER_STATUS_LABELS, type Profile, type RoleDefinition } from "@/types";

interface Department {
  id: string;
  name: string;
}

interface UserSlidePanelProps {
  open: boolean;
  user: Profile | null;
  departments: Department[];
  roles: RoleDefinition[];
  onClose: () => void;
}

function FieldLabel({
  htmlFor,
  required,
  accent,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-[13px]",
        accent || required ? "text-red-600" : "text-zinc-800"
      )}
    >
      {children}
    </label>
  );
}

export function UserSlidePanel({
  open,
  user,
  departments,
  roles,
  onClose,
}: UserSlidePanelProps) {
  const router = useRouter();
  const isEdit = Boolean(user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(user?.role || roles[0]?.role || "hr_agent");
  const [departmentId, setDepartmentId] = useState(user?.department_id || "");
  const [status, setStatus] = useState(user?.status || "active");

  useEffect(() => {
    if (open) {
      setRole(user?.role || roles[0]?.role || "hr_agent");
      setDepartmentId(user?.department_id || "");
      setStatus(user?.status || "active");
      setError(null);
    }
  }, [open, user, roles]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("role", role);
    if (departmentId) formData.set("department_id", departmentId);
    if (isEdit) formData.set("status", status);

    const result = await runWithLoading(() =>
      isEdit && user
        ? updateUser(user.id, formData)
        : inviteUser(formData)
    );

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    toast({
      title: isEdit ? "User updated" : "Invitation sent",
      variant: "success",
    });
    setLoading(false);
    onClose();
    router.refresh();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/15" onClick={onClose} aria-hidden />
      <aside
        className="fixed right-0 top-[var(--top-nav-height,48px)] z-50 flex h-[calc(100vh-var(--top-nav-height,48px))] w-full max-w-[420px] flex-col border-l border-zinc-200 bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.08)]"
        aria-label={isEdit ? "Edit user" : "Invite user"}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-zinc-900">
            {isEdit ? "Edit User" : "Invite User"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {error && (
              <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </p>
            )}

            <div className="space-y-5">
              <div>
                <FieldLabel htmlFor="user-name" required accent>
                  Full Name
                </FieldLabel>
                <input
                  id="user-name"
                  name="full_name"
                  required
                  defaultValue={user?.full_name || ""}
                  placeholder="Enter full name"
                  className={cn(
                    "mt-1.5 w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-2 text-[13px] text-zinc-900",
                    "outline-none placeholder:text-zinc-500 focus:border-[#1a73b5]"
                  )}
                />
              </div>

              {!isEdit && (
                <div>
                  <FieldLabel htmlFor="user-email" required accent>
                    Email
                  </FieldLabel>
                  <input
                    id="user-email"
                    name="email"
                    type="email"
                    required
                    placeholder="user@company.com"
                    className={cn(
                      "mt-1.5 w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-2 text-[13px] text-zinc-900",
                      "outline-none placeholder:text-zinc-500 focus:border-[#1a73b5]"
                    )}
                  />
                </div>
              )}

              {isEdit && (
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <p className="mt-1.5 text-[13px] font-medium text-zinc-900">{user?.email}</p>
                </div>
              )}

              <div className="rounded border border-zinc-200 bg-zinc-50/80 p-4">
                <FieldLabel accent required>
                  Role
                </FieldLabel>
                <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">
                  Determines what modules and actions this user can access.
                </p>
                <div className="relative mt-3">
                  <select
                    id="user-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full appearance-none rounded-sm border border-zinc-300 bg-white px-3 py-2 pr-8 text-[13px] text-zinc-900 outline-none focus:border-[#1a73b5] focus:ring-1 focus:ring-[#1a73b5]/20"
                  >
                    {roles.map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                </div>
              </div>

              <div className="rounded border border-zinc-200 bg-zinc-50/80 p-4">
                <FieldLabel>Department</FieldLabel>
                <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">
                  Optional. Assigns the user to a support department.
                </p>
                <div className="relative mt-3">
                  <select
                    id="user-department"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className={cn(
                      "w-full appearance-none rounded-sm border border-zinc-300 bg-white px-3 py-2 pr-8 text-[13px] text-zinc-900 outline-none focus:border-[#1a73b5] focus:ring-1 focus:ring-[#1a73b5]/20",
                      !departmentId && "text-zinc-500"
                    )}
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                </div>
              </div>

              {isEdit && (
                <div className="rounded border border-zinc-200 bg-zinc-50/80 p-4">
                  <FieldLabel accent>Status</FieldLabel>
                  <div className="relative mt-3">
                    <select
                      id="user-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Profile["status"])}
                      className="w-full appearance-none rounded-sm border border-zinc-300 bg-white px-3 py-2 pr-8 text-[13px] text-zinc-900 outline-none focus:border-[#1a73b5] focus:ring-1 focus:ring-[#1a73b5]/20"
                    >
                      {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-8 items-center rounded-sm bg-[#1a73b5] px-5 text-[13px] font-medium text-white hover:bg-[#155a8a] disabled:opacity-60"
              >
                {loading ? "Saving..." : isEdit ? "Save" : "Send Invite"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 items-center rounded-sm border border-zinc-300 bg-white px-5 text-[13px] font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}
