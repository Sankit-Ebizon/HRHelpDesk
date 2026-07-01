"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

const MAX_AVATAR_BYTES = 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function uploadProfileAvatar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Image must be 1MB or smaller." };
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, WebP, or GIF image." };
  }

  const filePath = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from("profile-avatars")
    .upload(filePath, file);

  if (uploadError) return { error: uploadError.message };

  const { data: publicUrl } = supabase.storage
    .from("profile-avatars")
    .getPublicUrl(filePath);

  return { url: publicUrl.publicUrl };
}

export async function updateOwnProfile(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const fullName = (formData.get("full_name") as string)?.trim();
  if (!fullName) {
    return { error: "Name is required." };
  }

  const updates: { full_name: string; avatar_url?: string | null } = {
    full_name: fullName,
  };

  const avatarFile = formData.get("avatar") as File | null;
  if (avatarFile && avatarFile.size > 0) {
    const uploaded = await uploadProfileAvatar(supabase, profile.id, avatarFile);
    if (uploaded.error) return { error: uploaded.error };
    if (uploaded.url) updates.avatar_url = uploaded.url;
  } else if (formData.get("remove_avatar") === "true") {
    updates.avatar_url = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profile.id);

  if (error) return { error: error.message };

  await supabase.auth.updateUser({
    data: { full_name: fullName },
  });

  revalidatePath("/", "layout");
  return { success: true };
}
