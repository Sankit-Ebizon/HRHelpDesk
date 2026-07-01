"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { updateOwnProfile } from "@/lib/actions/profile";
import { runWithLoading } from "@/lib/loading-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getInitials } from "@/lib/utils";
import type { Profile } from "@/types";

interface EditProfileDialogProps {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ profile, open, onOpenChange }: EditProfileDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setPreviewUrl(null);
      setRemoveAvatar(false);
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, profile.id]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayAvatarUrl =
    previewUrl || (!removeAvatar && profile.avatar_url ? profile.avatar_url : null);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError("Image must be 1MB or smaller.");
      return;
    }

    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveAvatar(false);
    setError(null);
  }

  function handleRemoveAvatar() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAvatarFile(null);
    setRemoveAvatar(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (avatarFile) formData.set("avatar", avatarFile);
    if (removeAvatar) formData.set("remove_avatar", "true");

    const result = await runWithLoading(() => updateOwnProfile(formData));
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <Label>Profile image</Label>
            <div className="flex items-center gap-4">
              {displayAvatarUrl ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-border/50">
                  <Image
                    src={displayAvatarUrl}
                    alt={`${profile.full_name} avatar`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : (
                <Avatar className="h-16 w-16 ring-2 ring-border/50">
                  <AvatarFallback className="bg-indigo-500 text-base text-white">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {displayAvatarUrl ? "Change image" : "Upload image"}
                </Button>
                {(displayAvatarUrl || profile.avatar_url) && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or GIF up to 1MB.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name}
              required
              maxLength={120}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
