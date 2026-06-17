"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDepartment, deleteDepartment } from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Department } from "@/types";
import { Pencil, Trash2 } from "lucide-react";

interface DepartmentActionsProps {
  department: Department;
  canEdit: boolean;
  canDelete: boolean;
}

export function DepartmentActions({ department, canEdit, canDelete }: DepartmentActionsProps) {
  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {canEdit && <EditDepartmentButton department={department} />}
      {canDelete && <DeleteDepartmentButton department={department} />}
    </div>
  );
}

function EditDepartmentButton({ department }: { department: Department }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await runWithLoading(() =>
      updateDepartment(department.id, new FormData(e.currentTarget))
    );
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      toast({ title: "Department updated", variant: "success" });
      router.refresh();
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Edit department">
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit department</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${department.id}`}>Name</Label>
              <Input
                id={`edit-name-${department.id}`}
                name="name"
                defaultValue={department.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-description-${department.id}`}>Description</Label>
              <Textarea
                id={`edit-description-${department.id}`}
                name="description"
                defaultValue={department.description || ""}
                placeholder="Optional description"
                rows={3}
                className="min-h-[80px]"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteDepartmentButton({ department }: { department: Department }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await runWithLoading(() => deleteDepartment(department.id));
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      toast({ title: "Department deleted", variant: "success" });
      router.refresh();
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Delete department"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete department</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{department.name}</strong>? This action cannot
            be undone.
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
