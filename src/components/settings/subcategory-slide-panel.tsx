"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, ChevronDown, ImageIcon } from "lucide-react";
import { createSubcategory, updateSubcategory } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import type { Subcategory } from "@/types";

interface CategoryOption {
  id: string;
  name: string;
}

interface SubcategorySlidePanelProps {
  open: boolean;
  subcategory: Subcategory | null;
  categories: CategoryOption[];
  canDelete?: boolean;
  onDelete?: (subcategory: Subcategory) => void;
  onClose: () => void;
}

function FieldLabel({
  htmlFor,
  required,
  accent,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-[13px]",
        accent || required ? "text-red-600" : "text-zinc-800"
      )}
    >
      {children}
    </label>
  );
}

export function SubcategorySlidePanel({
  open,
  subcategory,
  categories,
  canDelete,
  onDelete,
  onClose,
}: SubcategorySlidePanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(subcategory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(subcategory?.category_id || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setCategoryId(subcategory?.category_id || "");
      setError(null);
      setPreviewUrl(null);
      setRemoveImage(false);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, subcategory]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayImageUrl =
    previewUrl || (!removeImage && subcategory?.image_url ? subcategory.image_url : null);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError("Image must be 1MB or smaller.");
      return;
    }

    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
    setError(null);
  }

  function handleRemoveImage() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageFile(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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
    if (imageFile) formData.set("image", imageFile);
    if (removeImage) formData.set("remove_image", "true");

    const result = await runWithLoading(() =>
      isEdit && subcategory
        ? updateSubcategory(subcategory.id, formData)
        : createSubcategory(formData)
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    toast({
      title: isEdit ? "Sub-category updated" : "Sub-category added",
      variant: "success",
    });
    setLoading(false);
    onClose();
    router.refresh();
  }

  if (!open) return null;

  const subcategoryName = subcategory?.name || "Sub-category";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/15"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-[var(--top-nav-height,48px)] z-50 flex h-[calc(100vh-var(--top-nav-height,48px))] w-full max-w-[420px] flex-col border-l border-zinc-200 bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.08)]"
        aria-label={isEdit ? "Edit sub-category" : "Add sub-category"}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-zinc-900">
            {isEdit ? "Edit Sub-category" : "Add Sub-category"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {error && (
              <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </p>
            )}

            <div className="space-y-5">
              <div>
                <FieldLabel accent>Display Picture</FieldLabel>
                <div className="mt-2 flex items-start gap-3">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                    {displayImageUrl ? (
                      <Image
                        src={displayImageUrl}
                        alt={`${subcategoryName} image`}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized={displayImageUrl.startsWith("blob:")}
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[13px] font-medium text-[#1a73b5] hover:underline"
                      >
                        Upload
                      </button>
                      {displayImageUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-[13px] font-medium text-zinc-700 hover:text-zinc-900"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
                      File format can be JPG, PNG, SVG, or GIF. File size can be a
                      maximum of 1MB.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml,image/gif,image/webp"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="sub-name" required accent>
                  Name
                </FieldLabel>
                <input
                  id="sub-name"
                  name="name"
                  required
                  defaultValue={subcategory?.name || ""}
                  placeholder="Enter sub-category name"
                  className={cn(
                    "mt-1.5 w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-2 text-[13px] text-zinc-900",
                    "outline-none placeholder:text-zinc-500 focus:border-[#1a73b5]"
                  )}
                />
              </div>

              <div>
                <FieldLabel htmlFor="sub-description">Description</FieldLabel>
                <textarea
                  id="sub-description"
                  name="description"
                  rows={3}
                  defaultValue={subcategory?.description || ""}
                  placeholder="Add description here"
                  className={cn(
                    "mt-1.5 w-full resize-none border-0 border-b border-zinc-300 bg-transparent px-0 py-2 text-[13px] text-zinc-900",
                    "outline-none placeholder:text-zinc-500 focus:border-[#1a73b5]"
                  )}
                />
              </div>

              <div className="rounded border border-zinc-200 bg-zinc-50/80 p-4">
                <FieldLabel accent required>
                  Parent Category
                </FieldLabel>
                <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">
                  Select the category this sub-category belongs to. Tickets use
                  sub-categories for finer routing within a category.
                </p>
                <div className="relative mt-3">
                  <select
                    id="sub-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className={cn(
                      "w-full appearance-none rounded-sm border border-zinc-300 bg-white px-3 py-2 pr-8 text-[13px] text-zinc-900",
                      "outline-none focus:border-[#1a73b5] focus:ring-1 focus:ring-[#1a73b5]/20",
                      !categoryId && "text-zinc-500"
                    )}
                  >
                    <option value="">Choose a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                </div>
              </div>

              {isEdit && subcategory?.created_by_profile && (
                <div>
                  <FieldLabel>Created By</FieldLabel>
                  <p className="mt-1.5 text-[13px] font-medium text-zinc-900">
                    {subcategory.created_by_profile.full_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-200 px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-8 items-center rounded-sm bg-[#1a73b5] px-5 text-[13px] font-medium text-white hover:bg-[#155a8a] disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 items-center rounded-sm border border-zinc-300 bg-white px-5 text-[13px] font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
              {isEdit && canDelete && subcategory && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(subcategory)}
                  className="text-[13px] font-medium text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}
