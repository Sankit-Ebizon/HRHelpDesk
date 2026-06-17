"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runWithLoading } from "@/lib/loading-store";
import { saveSupportEmail } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SupportEmailFormProps {
  initialEmail: string;
}

export function SupportEmailForm({ initialEmail }: SupportEmailFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("support_email", email);
    const result = await runWithLoading(() => saveSupportEmail(formData));

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess("Support email updated successfully.");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="support_email">Support Email</Label>
        <Input
          id="support_email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="support@company.com"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
