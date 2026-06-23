"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { createDepartment } from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, cn } from "@/lib/utils";

interface Agent {
  id: string;
  full_name: string;
  email: string;
}

interface NewDepartmentFormProps {
  agents: Agent[];
}

function UnderlineInput({
  id,
  name,
  required,
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      id={id}
      name={name}
      required={required}
      className={cn(
        "w-full border-0 border-b-2 border-zinc-200 bg-transparent px-0 py-2.5 text-sm text-zinc-900",
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
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm", required ? "text-red-500" : "text-zinc-500")}
    >
      {children}
    </label>
  );
}

export function NewDepartmentForm({ agents }: NewDepartmentFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayInHelpCenter, setDisplayInHelpCenter] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [logoName, setLogoName] = useState<string | null>(null);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("display_in_help_center", displayInHelpCenter ? "true" : "false");
    if (selectedAgentId) {
      formData.set("associate_agent_id", selectedAgentId);
    }

    const result = await runWithLoading(() => createDepartment(formData));
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    toast({ title: "Department created", variant: "success" });
    router.push("/settings/departments");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-[calc(100vh-var(--top-nav-height,48px))] flex-col bg-white">
      <div className="border-b border-zinc-200 px-6 py-4 sm:px-8">
        <h1 className="text-base font-normal text-zinc-900">New Department</h1>
      </div>

      <div className="flex-1 px-6 py-2 sm:px-8 sm:py-4">
        {error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="max-w-3xl space-y-0">
          <div className="border-b border-zinc-100 py-5">
            <FieldLabel htmlFor="name" required>
              Department Name
            </FieldLabel>
            <UnderlineInput id="name" name="name" required autoFocus />
          </div>

          <div className="border-b border-zinc-100 py-5">
            <FieldLabel htmlFor="help_center_display_name">
              Display Name in Help Center
            </FieldLabel>
            <UnderlineInput id="help_center_display_name" name="help_center_display_name" />
          </div>

          <div className="border-b border-zinc-100 py-5">
            <div className="flex items-center justify-between gap-4">
              <FieldLabel htmlFor="logo">Logo</FieldLabel>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-[#1a73b5] hover:underline"
              >
                Upload
              </button>
            </div>
            <input
              ref={fileInputRef}
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setLogoName(e.target.files?.[0]?.name ?? null)}
            />
            {logoName && (
              <p className="mt-2 text-xs text-zinc-500">{logoName}</p>
            )}
            <div className="mt-2 border-b-2 border-zinc-200" />
          </div>

          <div className="border-b border-zinc-100 py-5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={displayInHelpCenter}
                onChange={(e) => setDisplayInHelpCenter(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-[#1a73b5] focus:ring-[#1a73b5]"
              />
              <span className="text-sm text-zinc-500">Display in Help Center</span>
            </label>
          </div>

          <div className="border-b border-zinc-100 py-5">
            <FieldLabel htmlFor="associate_agent_id">Associate Agent</FieldLabel>
            <div className="relative mt-2">
              <select
                id="associate_agent_id"
                name="associate_agent_id"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className={cn(
                  "w-full appearance-none border-0 border-b-2 border-zinc-200 bg-transparent py-2.5 pr-8 text-sm text-zinc-900",
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
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>
            {selectedAgent && (
              <div className="mt-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-[#1a73b5] text-xs text-white">
                    {getInitials(selectedAgent.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          <div className="py-5">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <textarea
              id="description"
              name="description"
              rows={4}
              className={cn(
                "mt-2 w-full resize-y border-0 border-b-2 border-zinc-200 bg-transparent px-0 py-2.5 text-sm text-zinc-900",
                "outline-none transition-colors placeholder:text-zinc-400",
                "focus:border-[#1a73b5] focus:ring-0"
              )}
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 items-center rounded bg-[#1a73b5] px-5 text-sm font-medium text-white transition-colors hover:bg-[#155a8a] disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Department"}
          </button>
          <Link
            href="/settings/departments"
            className="inline-flex h-9 items-center rounded border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
