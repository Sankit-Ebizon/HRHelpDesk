"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveNotificationPreferences } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const notificationTypes = [
  { type: "ticket_created", label: "Ticket Created", description: "When a new ticket is created" },
  { type: "ticket_assigned", label: "Ticket Assigned", description: "When a ticket is assigned to you" },
  { type: "ticket_reply", label: "Ticket Reply", description: "When someone replies to a ticket" },
  { type: "status_changed", label: "Status Changed", description: "When ticket status is updated" },
  { type: "ticket_closed", label: "Ticket Closed", description: "When a ticket is closed" },
  { type: "due_date_reminder", label: "Due Date Reminder", description: "Reminder before ticket due date" },
];

interface NotificationPrefsFormProps {
  saved: { type: string; email_enabled: boolean; in_app_enabled: boolean }[];
}

export function NotificationPrefsForm({ saved }: NotificationPrefsFormProps) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(
    notificationTypes.map((n) => {
      const existing = saved.find((s) => s.type === n.type);
      return {
        type: n.type,
        email_enabled: existing?.email_enabled ?? true,
        in_app_enabled: existing?.in_app_enabled ?? true,
      };
    })
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updatePref(type: string, field: "email_enabled" | "in_app_enabled", value: boolean) {
    setPrefs((prev) =>
      prev.map((p) => (p.type === type ? { ...p, [field]: value } : p))
    );
  }

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    await runWithLoading(async () => {
      await saveNotificationPreferences(prefs);
      setMessage("Preferences saved.");
      router.refresh();
    });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.includes("saved") ? "success" : "destructive"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {notificationTypes.map((n) => {
        const pref = prefs.find((p) => p.type === n.type)!;
        return (
          <Card key={n.type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{n.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{n.description}</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pref.email_enabled}
                    onChange={(e) => updatePref(n.type, "email_enabled", e.target.checked)}
                    className="h-4 w-4 rounded accent-indigo-500"
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pref.in_app_enabled}
                    onChange={(e) => updatePref(n.type, "in_app_enabled", e.target.checked)}
                    className="h-4 w-4 rounded accent-indigo-500"
                  />
                  In-app
                </label>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
}
