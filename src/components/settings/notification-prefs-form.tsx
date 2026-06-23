"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Mail } from "lucide-react";
import { saveNotificationPreferences } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

interface NotificationPref {
  type: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

interface NotificationPrefsFormProps {
  saved: NotificationPref[];
}

const notificationSections = [
  {
    title: "Ticket Notifications",
    items: [
      { type: "ticket_created", label: "Receiving a new ticket" },
      { type: "ticket_closed", label: "Closing a ticket" },
      { type: "status_changed", label: "Changing ticket status" },
      { type: "due_date_reminder", label: "Due date reminder" },
    ],
  },
  {
    title: "Agent Notifications",
    items: [
      { type: "ticket_assigned", label: "Assigning a ticket" },
      { type: "ticket_reply", label: "Receiving a ticket reply" },
    ],
  },
];

const allNotificationTypes = notificationSections.flatMap((section) => section.items);

function ZohoToggle({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 rounded-full transition-colors",
        checked ? "bg-[#3dcc7e]" : "bg-zinc-300"
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

function NotificationRulesTable({
  prefs,
  onUpdate,
}: {
  prefs: NotificationPref[];
  onUpdate: (type: string, field: "email_enabled" | "in_app_enabled", value: boolean) => void;
}) {
  return (
    <div className="max-w-3xl">
      <div className="flex items-end pb-1">
        <div className="min-w-0 flex-1" />
        <div className="flex w-28 shrink-0 justify-center text-zinc-500" title="Email">
          <Mail className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div className="flex w-28 shrink-0 justify-center text-zinc-500" title="In-app">
          <Bell className="h-4 w-4" strokeWidth={1.5} />
        </div>
      </div>

      {notificationSections.map((section, index) => (
        <section key={section.title} className={cn(index > 0 && "mt-6")}>
          <h2 className="zoho-section-title mb-2 select-none">
            {section.title}
          </h2>
          <div>
            {section.items.map((item) => {
              const pref = prefs.find((p) => p.type === item.type)!;
              return (
                <div
                  key={item.type}
                  className="flex items-center border-b border-zinc-100 py-3.5 last:border-0"
                >
                  <span className="min-w-0 flex-1 pr-4 text-[13px] text-zinc-800">
                    {item.label}
                  </span>
                  <div className="flex w-28 shrink-0 justify-center">
                    <ZohoToggle
                      id={`${item.type}-email`}
                      label={`Email for ${item.label}`}
                      checked={pref.email_enabled}
                      onChange={(value) => onUpdate(item.type, "email_enabled", value)}
                    />
                  </div>
                  <div className="flex w-28 shrink-0 justify-center">
                    <ZohoToggle
                      id={`${item.type}-in-app`}
                      label={`In-app for ${item.label}`}
                      checked={pref.in_app_enabled}
                      onChange={(value) => onUpdate(item.type, "in_app_enabled", value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function NotificationPrefsForm({ saved }: NotificationPrefsFormProps) {
  const router = useRouter();
  const initialPrefs = useMemo(
    () =>
      allNotificationTypes.map((n) => {
        const existing = saved.find((s) => s.type === n.type);
        return {
          type: n.type,
          email_enabled: existing?.email_enabled ?? true,
          in_app_enabled: existing?.in_app_enabled ?? true,
        };
      }),
    [saved]
  );

  const [prefs, setPrefs] = useState(initialPrefs);
  const [loading, setLoading] = useState(false);

  function updatePref(type: string, field: "email_enabled" | "in_app_enabled", value: boolean) {
    setPrefs((prev) =>
      prev.map((p) => (p.type === type ? { ...p, [field]: value } : p))
    );
  }

  async function handleSave() {
    setLoading(true);
    const result = await runWithLoading(() => saveNotificationPreferences(prefs));
    if (result && "error" in result) {
      toast({ title: result.error, variant: "error" });
    } else {
      toast({ title: "Notification rules saved", variant: "success" });
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div>
      <NotificationRulesTable prefs={prefs} onUpdate={updatePref} />

      <div className="mt-8 max-w-3xl">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="inline-flex h-8 items-center rounded-sm bg-[#1a73b5] px-5 text-[13px] font-medium text-white hover:bg-[#155a8a] disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
