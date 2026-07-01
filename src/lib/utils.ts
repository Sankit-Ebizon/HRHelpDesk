import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, pattern = "dd-MMM-yyyy") {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd-MMM-yyyy HH:mm");
}

export function formatTicketListDate(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM hh:mm a");
}

export function formatRelative(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const minutes = hhmmToMinutes(trimmed);
    return minutes > 0 ? minutes : null;
  }
  const decimalMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/i);
  if (decimalMatch) {
    const minutes = Math.round(parseFloat(decimalMatch[1]) * 60);
    return minutes > 0 ? minutes : null;
  }
  return null;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    open: "bg-blue-500/15 text-blue-700 ring-1 ring-inset ring-blue-500/25",
    in_progress: "bg-amber-500/15 text-amber-700 ring-1 ring-inset ring-amber-500/25",
    on_hold: "bg-violet-500/15 text-violet-700 ring-1 ring-inset ring-violet-500/25",
    closed: "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/25",
    reopened: "bg-orange-500/15 text-orange-700 ring-1 ring-inset ring-orange-500/25",
  };
  return colors[status] || "bg-muted text-muted-foreground ring-1 ring-inset ring-border";
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: "bg-slate-500/15 text-slate-600 ring-1 ring-inset ring-slate-500/25",
    medium: "bg-indigo-500/15 text-indigo-700 ring-1 ring-inset ring-indigo-500/25",
    high: "bg-orange-500/15 text-orange-700 ring-1 ring-inset ring-orange-500/25",
    urgent: "bg-red-500/15 text-red-700 ring-1 ring-inset ring-red-500/25",
  };
  return colors[priority] || "bg-muted text-muted-foreground ring-1 ring-inset ring-border";
}

export function decodeHtmlEntities(text: string): string {
  let decoded = text;
  for (let i = 0; i < 4; i += 1) {
    const next = decoded
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&");
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Plain text for previews — strips tags then decodes entities like &lt;email&gt;. */
export function htmlToPlainText(value: string): string {
  return decodeHtmlEntities(stripHtmlTags(value));
}

export function sanitizeRichTextHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
