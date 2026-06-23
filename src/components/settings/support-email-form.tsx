"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runWithLoading } from "@/lib/loading-store";
import { saveSupportEmail } from "@/lib/actions/settings";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

interface SupportEmailFormProps {
  initialEmail: string;
}

export function SupportEmailForm({ initialEmail }: SupportEmailFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("support_email", email);
    const result = await runWithLoading(() => saveSupportEmail(formData));

    if (result?.error) {
      setError(result.error);
    } else {
      toast({ title: "Support email updated", variant: "success" });
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="support_email" className="text-[13px] text-red-600">
          Support Email
        </label>
        <input
          id="support_email"
          name="support_email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="support@company.com"
          required
          className={cn(
            "mt-1.5 w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-2 text-[13px] text-zinc-900",
            "outline-none placeholder:text-zinc-500 focus:border-[#1a73b5]"
          )}
        />
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-8 items-center rounded-sm bg-[#1a73b5] px-5 text-[13px] font-medium text-white hover:bg-[#155a8a] disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
