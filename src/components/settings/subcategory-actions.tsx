"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSubcategory, deleteSubcategory } from "@/lib/actions/settings";
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
import type { Subcategory } from "@/types";
import { Pencil, Trash2 } from "lucide-react";

interface SubcategoryActionsProps {
  subcategory: Subcategory & { category?: { id: string; name: string } | null };
  categories: { id: string; name: string }[];
  canEdit: boolean;
  canDelete: boolean;
}

export function SubcategoryActions({
  subcategory,
  categories,
  canEdit,
  canDelete,
}: SubcategoryActionsProps) {
  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {canEdit && (
        <EditSubcategoryButton subcategory={subcategory} categories={categories} />
      )}
      {canDelete && <DeleteSubcategoryButton subcategory={subcategory} />}
    </div>
  );
}

function EditSubcategoryButton({
  subcategory,
  categories,
}: {
  subcategory: Subcategory & { category?: { id: string; name: string } | null };
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(subcategory.category_id);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!categoryId) {
      setError("Please select a parent category");
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("category_id", categoryId);
    const result = await runWithLoading(() => updateSubcategory(subcategory.id, formData));
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      toast({ title: "Sub-category updated", variant: "success" });
      router.refresh();
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Edit sub-category"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit sub-category</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Parent category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-sub-name-${subcategory.id}`}>Name</Label>
              <Input
                id={`edit-sub-name-${subcategory.id}`}
                name="name"
                defaultValue={subcategory.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-sub-description-${subcategory.id}`}>Description</Label>
              <Textarea
                id={`edit-sub-description-${subcategory.id}`}
                name="description"
                defaultValue={subcategory.description || ""}
                placeholder="Optional description"
                rows={2}
                className="min-h-[60px]"
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

function DeleteSubcategoryButton({
  subcategory,
}: {
  subcategory: Subcategory & { category?: { id: string; name: string } | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await runWithLoading(() => deleteSubcategory(subcategory.id));
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      toast({ title: "Sub-category deleted", variant: "success" });
      router.refresh();
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Delete sub-category"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete sub-category</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{subcategory.name}</strong>?
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
