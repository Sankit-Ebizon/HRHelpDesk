"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ChevronDown, Info, Pencil } from "lucide-react";
import { updateDepartment } from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type { Category, Department, Profile } from "@/types";

interface Agent {
  id: string;
  full_name: string;
  email: string;
}

type DetailTab = "categories" | "agents";

interface DepartmentDetailViewProps {
  department: Department;
  agents: Agent[];
  members: Pick<Profile, "id" | "full_name" | "email" | "role" | "status">[];
  categories: Pick<Category, "id" | "name" | "description" | "is_active">[];
  canEdit: boolean;
}

function UnderlineInput({
  id,
  name,
  required,
  className,
  defaultValue,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      id={id}
      name={name}
      required={required}
      defaultValue={defaultValue}
      className={cn(
        "w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-2 text-sm text-zinc-900",
        "outline-none transition-colors placeholder:text-zinc-400",
        "focus:border-[#1a73b5] focus:ring-0",
        className
      )}
      {...props}
    />
  );
}

function FieldLabel({
  htmlFor,
  required,
  active,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-[13px]",
        required || active ? "text-red-500" : "text-zinc-500"
      )}
    >
      {children}
    </label>
  );
}

function ZohoToggle({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 rounded-full transition-colors",
        checked ? "bg-[#3dcc7e]" : "bg-zinc-300",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[17px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}

function formatDetailDate(date: string) {
  return format(parseISO(date), "dd MMM yyyy hh:mm a");
}

function creatorFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function formatCreatedByLine(
  createdAt: string,
  creator?: { full_name: string } | null
) {
  const date = formatDetailDate(createdAt);
  if (creator?.full_name) {
    return `Created by ${creatorFirstName(creator.full_name)} on ${date}`;
  }
  return `Created on ${date}`;
}

function DepartmentLogo({ department }: { department: Department }) {
  if (department.logo_url) {
    return (
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-[#d9edf7]">
        <Image
          src={department.logo_url}
          alt={`${department.name} logo`}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sm bg-[#d9edf7] text-lg font-medium text-[#3a8fb7]">
      {getInitials(department.name)}
    </div>
  );
}

function SubNavItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full py-2 pl-5 pr-4 text-left text-[13px] transition-colors",
        active ? "font-medium text-[#1a73b5]" : "text-zinc-600 hover:text-zinc-900"
      )}
    >
      {children}
      {active && (
        <span className="absolute right-0 top-1 bottom-1 w-[3px] rounded-l bg-[#1a73b5]" />
      )}
    </button>
  );
}

function ConfigRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[220px_1fr] sm:gap-8">
      <span className="text-[13px] text-zinc-500">{label}</span>
      <div className="text-[13px] text-zinc-900">{children}</div>
    </div>
  );
}

export function DepartmentDetailView({
  department,
  agents,
  members,
  categories,
  canEdit,
}: DepartmentDetailViewProps) {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<DetailTab>("categories");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDisplayInHelpCenter, setEditDisplayInHelpCenter] = useState(
    department.display_in_help_center ?? true
  );
  const [associateAgentId, setAssociateAgentId] = useState(
    department.associate_agent_id || ""
  );

  useEffect(() => {
    setAssociateAgentId(department.associate_agent_id || "");
  }, [department.associate_agent_id, department.updated_at]);

  const displayName =
    department.help_center_display_name?.trim() || department.name;

  function openEditDialog() {
    setEditDisplayInHelpCenter(department.display_in_help_center ?? true);
    setError(null);
    setEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set(
      "display_in_help_center",
      editDisplayInHelpCenter ? "true" : "false"
    );
    const result = await runWithLoading(() =>
      updateDepartment(department.id, formData)
    );
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    toast({ title: "Department updated", variant: "success" });
    setLoading(false);
    setEditOpen(false);
    router.refresh();
  }

  async function handleAgentsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("name", department.name);
    formData.set("description", department.description || "");
    formData.set(
      "help_center_display_name",
      department.help_center_display_name || ""
    );
    formData.set(
      "display_in_help_center",
      department.display_in_help_center ? "true" : "false"
    );
    formData.set("associate_agent_id", associateAgentId);
    const result = await runWithLoading(() =>
      updateDepartment(department.id, formData)
    );
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    toast({ title: "Agent settings updated", variant: "success" });
    setLoading(false);
    router.refresh();
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("name", department.name);
    formData.set("description", department.description || "");
    formData.append("logo", file);
    const result = await runWithLoading(() =>
      updateDepartment(department.id, formData)
    );
    if (result.error) {
      setError(result.error);
    } else {
      toast({ title: "Logo updated", variant: "success" });
      router.refresh();
    }
    setLoading(false);
  }

  const selectedAgent = agents.find((a) => a.id === associateAgentId);

  return (
    <div className="relative min-h-full bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-2.5">
        <Link
          href="/settings/departments"
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-800 hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
          Department
        </Link>
        <button
          type="button"
          className="rounded border border-zinc-300 p-1 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
          aria-label="Department information"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Identity hero */}
      <div className="border-b border-zinc-200 px-8 py-7">
        <div className="flex gap-5">
          <div className="shrink-0">
            <DepartmentLogo department={department} />
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="mt-2 block text-[12px] text-[#1a73b5] hover:underline"
                >
                  Change logo
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[22px] font-normal leading-tight text-zinc-900">
                {department.name}
                <span className="ml-1.5 text-[15px] font-normal text-zinc-400">
                  ( {displayName} )
                </span>
              </h1>
              {canEdit && (
                <button
                  type="button"
                  onClick={openEditDialog}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  aria-label="Edit department"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <p className="mt-1.5 text-[13px] text-zinc-400">
              {department.description || "No Description"}
            </p>
            <p className="mt-2 text-[12px] text-zinc-400">
              {formatCreatedByLine(
                department.created_at,
                department.created_by_profile
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-nav + content */}
      <div className="flex min-h-[420px]">
        <aside className="w-[168px] shrink-0 border-r border-zinc-200 py-5">
          <p className="px-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Channels
          </p>
          <SubNavItem
            active={tab === "categories"}
            onClick={() => setTab("categories")}
          >
            Categories
          </SubNavItem>

          <p className="px-5 pb-1.5 pt-6 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Agents
          </p>
          <SubNavItem active={tab === "agents"} onClick={() => setTab("agents")}>
            Agents
          </SubNavItem>
        </aside>

        <main className="flex-1 px-10 py-8">
          {error && !editOpen && (
            <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {tab === "categories" && (
            <div className="max-w-3xl space-y-8">
              <section>
                <h2 className="mb-5 text-[13px] font-semibold text-zinc-800">
                  Help Center
                </h2>
                <div className="space-y-4">
                  <ConfigRow label="Display Name">
                    {department.help_center_display_name || department.name}
                  </ConfigRow>
                  <ConfigRow label="Visible in Help Center">
                    {department.display_in_help_center ? "Yes" : "No"}
                  </ConfigRow>
                </div>
              </section>

              <section className="border-t border-zinc-100 pt-8">
                <h2 className="mb-5 text-[13px] font-semibold text-zinc-800">
                  Ticket Categories
                </h2>
                {categories.length === 0 ? (
                  <p className="text-[13px] text-zinc-500">
                    No categories linked to this department.{" "}
                    <Link
                      href="/settings/categories"
                      className="text-[#1a73b5] hover:underline"
                    >
                      Manage categories
                    </Link>
                  </p>
                ) : (
                  <div className="space-y-4">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="border-b border-zinc-100 pb-4 last:border-0"
                      >
                        <p className="text-[13px] font-medium text-zinc-900">
                          {category.name}
                        </p>
                        {category.description && (
                          <p className="mt-0.5 text-[13px] text-zinc-500">
                            {category.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "agents" && (
            <form onSubmit={handleAgentsSubmit} className="max-w-3xl space-y-8">
              <section>
                <h2 className="mb-5 text-[13px] font-semibold text-zinc-800">
                  Associate Agent
                </h2>
                <div className="space-y-4">
                  <ConfigRow label="Default Owner">
                    {canEdit ? (
                      <div className="relative max-w-sm">
                        <select
                          id="associate_agent_id"
                          value={associateAgentId}
                          onChange={(e) => setAssociateAgentId(e.target.value)}
                          className={cn(
                            "w-full appearance-none border-0 border-b border-zinc-300 bg-transparent py-1.5 pr-6 text-[13px] text-zinc-900",
                            "outline-none focus:border-[#1a73b5] focus:ring-0"
                          )}
                        >
                          <option value="">Select an agent</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.full_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                      </div>
                    ) : selectedAgent ? (
                      selectedAgent.full_name
                    ) : (
                      "—"
                    )}
                  </ConfigRow>
                  {selectedAgent && (
                    <ConfigRow label="Email">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-[#1a73b5] text-[10px] text-white">
                            {getInitials(selectedAgent.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedAgent.email}</span>
                      </div>
                    </ConfigRow>
                  )}
                </div>
                {canEdit && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex h-8 items-center rounded bg-[#1a73b5] px-4 text-[13px] font-medium text-white hover:bg-[#155a8a] disabled:opacity-60"
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </section>

              <section className="border-t border-zinc-100 pt-8">
                <h2 className="mb-5 text-[13px] font-semibold text-zinc-800">
                  Department Members
                </h2>
                {members.length === 0 ? (
                  <p className="text-[13px] text-zinc-500">
                    No members in this department.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 py-3 first:pt-0"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-zinc-200 text-[10px] text-zinc-700">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-zinc-900">
                            {member.full_name}
                          </p>
                          <p className="text-[12px] text-zinc-500">{member.email}</p>
                        </div>
                        <span className="text-[12px] capitalize text-zinc-400">
                          {member.role.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </form>
          )}
        </main>
      </div>

      {/* Zoho-style edit modal */}
      {editOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setEditOpen(false)}
            aria-hidden
          />
          <div className="fixed left-1/2 top-[16%] z-50 w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 rounded-sm border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
            <form
              key={department.updated_at}
              onSubmit={handleEditSubmit}
              className="px-7 py-6"
            >
              {error && (
                <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
                  {error}
                </p>
              )}

              <div className="space-y-5">
                <div>
                  <FieldLabel htmlFor="edit-name" required active>
                    Department Name
                  </FieldLabel>
                  <UnderlineInput
                    id="edit-name"
                    name="name"
                    defaultValue={department.name}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="edit-help-center-display-name">
                    Display Name in Help Center
                  </FieldLabel>
                  <UnderlineInput
                    id="edit-help-center-display-name"
                    name="help_center_display_name"
                    defaultValue={department.help_center_display_name || ""}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="edit-description">Description</FieldLabel>
                  <textarea
                    id="edit-description"
                    name="description"
                    rows={3}
                    defaultValue={department.description || ""}
                    className={cn(
                      "mt-1 w-full resize-none border-0 border-b border-zinc-300 bg-transparent px-0 py-2 text-[13px] text-zinc-900",
                      "outline-none focus:border-[#1a73b5] focus:ring-0"
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[13px] text-zinc-500">
                    Display in Help Center
                  </span>
                  <ZohoToggle
                    id="edit-display-in-help-center"
                    checked={editDisplayInHelpCenter}
                    onChange={setEditDisplayInHelpCenter}
                  />
                </div>
              </div>

              <div className="mt-7 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-8 items-center rounded-sm bg-[#1a73b5] px-5 text-[13px] font-medium text-white hover:bg-[#155a8a] disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="inline-flex h-8 items-center rounded-sm border border-zinc-300 bg-white px-5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
