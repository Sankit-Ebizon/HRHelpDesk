"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { updateTicket } from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { formatDate, getInitials } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "@/types";

interface TicketPropertiesPanelProps {
  ticket: Ticket;
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string; subcategories?: { id: string; name: string }[] }[];
}

interface TicketPatchSnapshot {
  subject: string;
  description: string;
  contact_name: string;
  contact_email: string;
  contact_details: string;
  department_id: string;
  category_id: string;
  subcategory_id: string;
  priority: TicketPriority;
  status: TicketStatus;
  owner_id: string;
  due_date: string;
}

function snapshotFromTicket(ticket: Ticket): TicketPatchSnapshot {
  return {
    subject: ticket.subject,
    description: ticket.description,
    contact_name: ticket.contact_name,
    contact_email: ticket.contact_email,
    contact_details: ticket.contact_details || "",
    department_id: ticket.department_id || "",
    category_id: ticket.category_id || "",
    subcategory_id: ticket.subcategory_id || "",
    priority: ticket.priority,
    status: ticket.status,
    owner_id: ticket.owner_id || "",
    due_date: ticket.due_date?.split("T")[0] || "",
  };
}

function buildFormDataFromSnapshot(
  snapshot: TicketPatchSnapshot,
  overrides: Partial<TicketPatchSnapshot>
): FormData {
  const next = { ...snapshot, ...overrides };
  const fd = new FormData();
  fd.set("subject", next.subject);
  fd.set("description", next.description);
  fd.set("contact_name", next.contact_name);
  fd.set("contact_email", next.contact_email);
  fd.set("contact_details", next.contact_details);
  fd.set("department_id", next.department_id);
  fd.set("category_id", next.category_id);
  fd.set("subcategory_id", next.subcategory_id);
  fd.set("priority", next.priority);
  fd.set("status", next.status);
  fd.set("owner_id", next.owner_id);
  fd.set("due_date", next.due_date);
  return fd;
}

function PropertySection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 bg-[#f5f7f9] px-3 py-2 text-left text-[12px] font-bold uppercase tracking-wide text-[#0091FF]"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </button>
      {open && <div className="space-y-3 px-3 py-3">{children}</div>}
    </section>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#444]">{label}</p>
      <div className="text-[13px] font-medium text-[#222]">{children}</div>
    </div>
  );
}

export function TicketPropertiesPanel({ ticket, agents, categories }: TicketPropertiesPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<TicketPatchSnapshot>(() => snapshotFromTicket(ticket));
  const snapshotRef = useRef(snapshot);
  const selectedCategory = categories.find((category) => category.id === snapshot.category_id);

  useEffect(() => {
    const next = snapshotFromTicket(ticket);
    setSnapshot(next);
    snapshotRef.current = next;
  }, [ticket]);

  async function patch(overrides: Partial<TicketPatchSnapshot>) {
    const nextSnapshot = { ...snapshotRef.current, ...overrides };
    setSnapshot(nextSnapshot);
    snapshotRef.current = nextSnapshot;
    setLoading(true);
    try {
      const result = await runWithLoading(() =>
        updateTicket(ticket.id, buildFormDataFromSnapshot(snapshotRef.current, {}))
      );
      if (result?.error) {
        const rollback = snapshotFromTicket(ticket);
        setSnapshot(rollback);
        snapshotRef.current = rollback;
        toast({ title: result.error, variant: "error" });
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="hidden h-full w-[280px] shrink-0 flex-col overflow-y-auto border-r border-border bg-white lg:flex">
      <PropertySection title="Contact Info">
        <PropertyRow label="Name">
          <span className="font-medium">{ticket.contact_name}</span>
        </PropertyRow>
        <PropertyRow label="Email">
          <a href={`mailto:${ticket.contact_email}`} className="text-[#1a73b5] hover:underline">
            {ticket.contact_email}
          </a>
        </PropertyRow>
        {ticket.contact_details && (
          <PropertyRow label="Details">
            <span className="whitespace-pre-wrap">{ticket.contact_details}</span>
          </PropertyRow>
        )}
        {ticket.department && (
          <PropertyRow label="Department">
            <span>{ticket.department.name}</span>
          </PropertyRow>
        )}
      </PropertySection>

      <PropertySection title="Key Information">
        <PropertyRow label="Ticket Owner">
          <Select
            value={snapshot.owner_id || "unassigned"}
            onValueChange={(v) => patch({ owner_id: v === "unassigned" ? "" : v })}
            disabled={loading}
          >
            <SelectTrigger className="h-8 text-[13px] text-[#222]">
              <SelectValue placeholder="Unassigned">
                {ticket.owner ? (
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8eef5] text-[10px] font-medium">
                      {getInitials(ticket.owner.full_name).charAt(0)}
                    </span>
                    {ticket.owner.full_name}
                  </span>
                ) : (
                  "Unassigned"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Status">
          <Select
            value={snapshot.status}
            onValueChange={(v) => patch({ status: v as TicketStatus })}
            disabled={loading}
          >
            <SelectTrigger className="h-8 text-[13px] text-[#222]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Due Date">
          <Input
            type="date"
            className="h-8 text-[13px] text-[#222]"
            value={snapshot.due_date}
            onChange={(e) => patch({ due_date: e.target.value || "" })}
            disabled={loading}
          />
        </PropertyRow>

        <PropertyRow label="Priority">
          <Select
            value={snapshot.priority}
            onValueChange={(v) => patch({ priority: v as TicketPriority })}
            disabled={loading}
          >
            <SelectTrigger className="h-8 text-[13px] text-[#222]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TICKET_PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>
      </PropertySection>

      <PropertySection title="Ticket Information">
        <PropertyRow label="Ticket ID">
          <span className="font-mono font-medium">{ticket.ticket_number}</span>
        </PropertyRow>
        <PropertyRow label="Category">
          <Select
            value={snapshot.category_id || "none"}
            onValueChange={(v) =>
              patch({
                category_id: v === "none" ? "" : v,
                // Prevent stale sub-category when category changes.
                subcategory_id: "",
              })
            }
            disabled={loading}
          >
            <SelectTrigger className="h-8 text-[13px] text-[#222]">
              <SelectValue placeholder="Uncategorized" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>
        <PropertyRow label="Sub-category">
          <Select
            value={snapshot.subcategory_id || "none"}
            onValueChange={(v) => patch({ subcategory_id: v === "none" ? "" : v })}
            disabled={loading || !selectedCategory?.subcategories?.length}
          >
            <SelectTrigger className="h-8 text-[13px] text-[#222]">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {(selectedCategory?.subcategories || []).map((subcategory) => (
                <SelectItem key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>
        <PropertyRow label="Created">
          <span>{formatDate(ticket.created_at)}</span>
        </PropertyRow>
        <PropertyRow label="Modified">
          <span>{formatDate(ticket.updated_at)}</span>
        </PropertyRow>
      </PropertySection>
    </aside>
  );
}
