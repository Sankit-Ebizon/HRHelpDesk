"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCategory, deleteCategory } from "@/lib/actions/tickets";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/types";
import { Pencil, Trash2 } from "lucide-react";

interface CategoryActionsProps {
  category: Category;
  departments: { id: string; name: string }[];
  canEdit: boolean;
  canDelete: boolean;
}

export function CategoryActions({
  category,
  departments,
  canEdit,
  canDelete,
}: CategoryActionsProps) {
  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {canEdit && <EditCategoryButton category={category} departments={departments} />}
      {canDelete && <DeleteCategoryButton category={category} />}
    </div>
  );
}

function EditCategoryButton({
  category,
  departments,
}: {
  category: Category;
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState(category.department_id || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("department_id", departmentId);
    const result = await runWithLoading(() => updateCategory(category.id, formData));
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      toast({ title: "Category updated", variant: "success" });
      router.refresh();
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Edit category">
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-cat-name-${category.id}`}>Name</Label>
              <Input
                id={`edit-cat-name-${category.id}`}
                name="name"
                defaultValue={category.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-cat-description-${category.id}`}>Description</Label>
              <Textarea
                id={`edit-cat-description-${category.id}`}
                name="description"
                defaultValue={category.description || ""}
                placeholder="Optional description"
                rows={2}
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

function DeleteCategoryButton({ category }: { category: Category }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await runWithLoading(() => deleteCategory(category.id));
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      toast({ title: "Category deleted", variant: "success" });
      router.refresh();
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Delete category"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{category.name}</strong>? Its sub-categories
            will also be hidden.
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
