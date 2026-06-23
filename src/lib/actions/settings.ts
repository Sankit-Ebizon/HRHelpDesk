"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { requirePermission, requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendEmailNotification } from "@/lib/email";
import { buildInviteEmailHtml, cleanupUserForReinvite, createInviteToken } from "@/lib/invite";
import type { UserRole } from "@/types";

export async function inviteUser(formData: FormData) {
  const profile = await requireAuth();
  if (profile.role !== "administrator") {
    return { error: "Only administrators can invite users" };
  }
  const admin = createServiceClient();

  const email = formData.get("email") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as UserRole;
  const departmentId = (formData.get("department_id") as string) || null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const cleanup = await cleanupUserForReinvite(admin, email);
  if (cleanup.error) return { error: cleanup.error };

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName, role },
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    const message =
      error.message ||
      (error as { code?: string }).code ||
      "Failed to create invitation. Check Supabase configuration.";
    return { error: message };
  }

  const userId = data.user?.id;

  if (!userId) {
    return { error: "Failed to generate invitation link." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      department_id: departmentId,
      status: "invited",
    })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  const token = createInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await admin.from("invite_tokens").delete().eq("user_id", userId);
  const { error: tokenError } = await admin.from("invite_tokens").insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });

  if (tokenError) return { error: tokenError.message };

  const acceptUrl = `${appUrl}/invite/accept?token=${token}`;
  const rejectUrl = `${appUrl}/invite/reject?token=${token}`;
  const emailResult = await sendEmailNotification({
    to: email,
    subject: "You're invited to HR Helpdesk",
    html: buildInviteEmailHtml({
      fullName,
      acceptUrl,
      rejectUrl,
      inviterName: profile.full_name,
      role,
    }),
  });

  if (!emailResult.ok) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("profiles").delete().eq("id", userId);
    return {
      error:
        emailResult.error ||
        "Invitation created but email could not be sent. For localhost, use EMAIL_FROM=onboarding@resend.dev and invite your Resend account email.",
    };
  }

  revalidatePath("/users");
  return { success: true };
}

export async function updateUser(userId: string, formData: FormData) {
  const profile = await requireAuth();
  if (profile.role !== "administrator") {
    return { error: "Only administrators can edit users" };
  }
  const supabase = await createClient();

  const isActive = formData.get("is_active") === "true";
  const currentStatus = formData.get("current_status") as string;
  let status = (formData.get("status") as string) || currentStatus;
  if (isActive) {
    status = "active";
  } else if (currentStatus === "active" || currentStatus === "invited") {
    status = "inactive";
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: formData.get("full_name") as string,
      role: formData.get("role") as UserRole,
      department_id: (formData.get("department_id") as string) || null,
      status,
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  revalidatePath("/ticket-owners");
  return { success: true };
}

export async function deactivateUser(userId: string) {
  const profile = await requireAuth();
  if (profile.role !== "administrator") {
    return { error: "Only administrators can deactivate users" };
  }
  if (profile.id === userId) {
    return { error: "You cannot deactivate your own account" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "inactive" })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/users");
  revalidatePath("/ticket-owners");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const profile = await requireAuth();
  if (profile.role !== "administrator") {
    return { error: "Only administrators can delete users" };
  }
  if (profile.id === userId) {
    return { error: "You cannot delete your own account" };
  }

  const admin = createServiceClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return { error: "User not found" };

  if (target.role === "administrator" && target.status === "active") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "administrator")
      .eq("status", "active");

    if ((count ?? 0) <= 1) {
      return { error: "Cannot delete the only active administrator" };
    }
  }

  await admin.from("invite_tokens").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/users");
  revalidatePath("/ticket-owners");
  return { success: true };
}

export async function updateRoleReportSection(
  sectionId: string,
  value: boolean,
  role: string
) {
  const profile = await requireAuth();
  if (profile.role !== "administrator") {
    return { error: "Only administrators can edit permissions" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("role_report_sections")
    .select("id")
    .eq("role", role)
    .eq("section_id", sectionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("role_report_sections")
      .update({ can_view: value })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("role_report_sections").insert({
      role,
      section_id: sectionId,
      can_view: value,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/settings/permissions");
  revalidatePath(`/settings/permissions/${role}`);
  revalidatePath("/reports");
  return { success: true };
}

export async function updateRolePermission(
  permissionId: string,
  field: "can_read" | "can_create" | "can_edit" | "can_delete",
  value: boolean,
  role?: string
) {
  const profile = await requireAuth();
  if (profile.role !== "administrator") {
    return { error: "Only administrators can edit permissions" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("role_permissions")
    .update({ [field]: value })
    .eq("id", permissionId);

  if (error) return { error: error.message };
  revalidatePath("/settings/permissions");
  if (role) revalidatePath(`/settings/permissions/${role}`);
  return { success: true };
}

export async function createUserRole(formData: FormData) {
  const profile = await requireAuth();
  if (profile.role !== "administrator") {
    return { error: "Only administrators can create profiles" };
  }

  const roleKey = (formData.get("role_key") as string || "").trim().toLowerCase();
  const roleLabel = (formData.get("role_label") as string || "").trim();
  const cloneFrom = (formData.get("clone_from") as string || "hr_agent").trim().toLowerCase();

  if (!roleKey || !roleLabel) {
    return { error: "Profile key and name are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_user_role", {
    role_key: roleKey,
    role_label: roleLabel,
    clone_from: cloneFrom,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/permissions");
  revalidatePath(`/settings/permissions/${roleKey}`);
  return { success: true, role: roleKey };
}

export async function saveSupportEmail(formData: FormData) {
  const profile = await requireAuth();
  if (profile.role !== "administrator") {
    return { error: "Only administrators can update support email" };
  }

  const supportEmail = (formData.get("support_email") as string || "").trim().toLowerCase();
  if (!supportEmail) return { error: "Support email is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: "support_email", value: supportEmail, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/settings/general");
  revalidatePath("/track");
  revalidatePath("/login");
  return { success: true };
}

const MAX_SUBCATEGORY_IMAGE_BYTES = 1024 * 1024;

async function uploadSubcategoryImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subcategoryId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  if (file.size > MAX_SUBCATEGORY_IMAGE_BYTES) {
    return { error: "Image must be 1MB or smaller." };
  }

  const filePath = `${subcategoryId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from("subcategory-images")
    .upload(filePath, file);

  if (uploadError) return { error: uploadError.message };

  const { data: publicUrl } = supabase.storage
    .from("subcategory-images")
    .getPublicUrl(filePath);

  return { url: publicUrl.publicUrl };
}

export async function createSubcategory(formData: FormData) {
  const { profile } = await requirePermission("categories", "create");
  const supabase = await createClient();

  const basePayload = {
    category_id: formData.get("category_id") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
  };

  let { data, error } = await supabase
    .from("subcategories")
    .insert({ ...basePayload, created_by: profile.id })
    .select("id")
    .single();

  if (error?.message?.includes("column")) {
    ({ data, error } = await supabase
      .from("subcategories")
      .insert(basePayload)
      .select("id")
      .single());
  }

  if (error) return { error: error.message };

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0 && data) {
    const uploaded = await uploadSubcategoryImage(supabase, data.id, imageFile);
    if (uploaded.error) return { error: uploaded.error };
    if (uploaded.url) {
      const { error: imageError } = await supabase
        .from("subcategories")
        .update({ image_url: uploaded.url })
        .eq("id", data.id);
      if (imageError && !imageError.message.includes("column")) {
        return { error: imageError.message };
      }
    }
  }

  revalidatePath("/settings/subcategories");
  revalidatePath("/settings/categories");
  return { success: true };
}

export async function updateSubcategory(subcategoryId: string, formData: FormData) {
  await requirePermission("categories", "edit");
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    category_id: formData.get("category_id") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
  };

  if (formData.get("remove_image") === "true") {
    updates.image_url = null;
  }

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const uploaded = await uploadSubcategoryImage(supabase, subcategoryId, imageFile);
    if (uploaded.error) return { error: uploaded.error };
    if (uploaded.url) updates.image_url = uploaded.url;
  }

  const { error } = await supabase
    .from("subcategories")
    .update(updates)
    .eq("id", subcategoryId);

  if (error) return { error: error.message };
  revalidatePath("/settings/subcategories");
  revalidatePath("/settings/categories");
  return { success: true };
}

export async function toggleSubcategoryStatus(subcategoryId: string, isActive: boolean) {
  await requirePermission("categories", "edit");
  const supabase = await createClient();

  const { error } = await supabase
    .from("subcategories")
    .update({ is_active: isActive })
    .eq("id", subcategoryId);

  if (error) return { error: error.message };
  revalidatePath("/settings/subcategories");
  revalidatePath("/settings/categories");
  return { success: true };
}

export async function deleteSubcategory(subcategoryId: string) {
  await requirePermission("categories", "delete");
  const supabase = await createClient();

  const { count: ticketCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("subcategory_id", subcategoryId);

  if (ticketCount && ticketCount > 0) {
    return {
      error: `This sub-category is linked to ${ticketCount} ticket(s). Turn it off using the toggle instead of deleting.`,
    };
  }

  const { error } = await supabase
    .from("subcategories")
    .delete()
    .eq("id", subcategoryId);

  if (error) return { error: error.message };
  revalidatePath("/settings/subcategories");
  revalidatePath("/settings/categories");
  return { success: true };
}

export async function saveNotificationPreferences(
  preferences: { type: string; email_enabled: boolean; in_app_enabled: boolean }[]
): Promise<{ success: true } | { error: string }> {
  const profile = await requireAuth();
  const supabase = await createClient();

  for (const pref of preferences) {
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: profile.id,
        type: pref.type,
        email_enabled: pref.email_enabled,
        in_app_enabled: pref.in_app_enabled,
      },
      { onConflict: "user_id,type" }
    );

    if (error) return { error: error.message };
  }

  revalidatePath("/settings/notifications");
  return { success: true };
}

export async function saveCustomReport(formData: FormData) {
  await requirePermission("reports", "create");
  const profile = await requireAuth();
  const supabase = await createClient();

  const reportId = formData.get("report_id") as string | null;
  const payload = {
    name: formData.get("name") as string,
    user_id: profile.id,
    report_type: formData.get("report_type") as string,
    selected_fields: JSON.parse(formData.get("selected_fields") as string),
    filters: JSON.parse(formData.get("filters") as string || "{}"),
    chart_type: formData.get("chart_type") as string,
    updated_at: new Date().toISOString(),
  };

  if (reportId) {
    const { error } = await supabase.from("saved_reports").update(payload).eq("id", reportId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("saved_reports").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/reports");
  return { success: true };
}

export async function deleteCustomReport(reportId: string) {
  await requirePermission("reports", "delete");
  const supabase = await createClient();
  const { error } = await supabase.from("saved_reports").delete().eq("id", reportId);
  if (error) return { error: error.message };
  revalidatePath("/reports");
  return { success: true };
}

export async function runCustomReportAction(
  reportType: string,
  selectedFields: string[],
  filters: Record<string, string>
) {
  await requirePermission("reports", "read");
  const { runCustomReport } = await import("@/lib/queries");
  return runCustomReport(reportType, selectedFields, filters);
}
