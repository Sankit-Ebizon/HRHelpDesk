"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createUserRole } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RoleDefinition } from "@/types";

interface NewProfileButtonProps {
  roles: RoleDefinition[];
}

export function NewProfileButton({ roles }: NewProfileButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneFrom, setCloneFrom] = useState("hr_agent");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("clone_from", cloneFrom);

    const result = await runWithLoading(() => createUserRole(formData));
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    toast({ title: "Profile created", variant: "success" });
    setOpen(false);
    setLoading(false);
    router.push(`/settings/permissions/${result.role}`);
    router.refresh();
  }

  return (
    <>
      {/* <Button className="zoho-btn-primary h-8 px-4" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Profile
      </Button> */}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Profile</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role_key">Profile Key</Label>
              <Input
                id="role_key"
                name="role_key"
                placeholder="e.g. supervisor"
                pattern="[a-z][a-z0-9_]*"
                required
              />
              <p className="text-xs text-zinc-500">Lowercase letters, numbers, and underscores only.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_label">Profile Name</Label>
              <Input id="role_label" name="role_label" placeholder="e.g. Supervisor" required />
            </div>

            <div className="space-y-2">
              <Label>Clone permissions from</Label>
              <Select value={cloneFrom} onValueChange={setCloneFrom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.role} value={role.role}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="zoho-btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
