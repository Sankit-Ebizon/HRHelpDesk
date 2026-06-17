"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteUser } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type RoleDefinition } from "@/types";
import { UserPlus } from "lucide-react";

interface InviteUserFormProps {
  departments: { id: string; name: string }[];
  roles: RoleDefinition[];
}

export function InviteUserForm({ departments, roles }: InviteUserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    const result = await runWithLoading(() => inviteUser(formData));
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite HR User
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-700">Invitation email sent. User will appear as Invited until they accept.</div>}
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input name="full_name" required placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input name="email" type="email" required placeholder="jane@ebizondigital.com" />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select name="role" defaultValue={roles[0]?.role || "hr_agent"} required>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.role} value={role.role}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select name="department_id">
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send Invite"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
