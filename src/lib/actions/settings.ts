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

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: formData.get("full_name") as string,
      role: formData.get("role") as UserRole,
      department_id: (formData.get("department_id") as string) || null,
      status: formData.get("status") as string,
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/users");
  revalidatePath("/ticket-owners");
  return { success: true };
}

export async function updateRolePermission(
  permissionId: string,
  field: "can_read" | "can_create" | "can_edit" | "can_delete",
  value: boolean
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
  return { success: true };
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

export async function createSubcategory(formData: FormData) {
  await requirePermission("categories", "create");
  const supabase = await createClient();

  const { error } = await supabase.from("subcategories").insert({
    category_id: formData.get("category_id") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/settings/subcategories");
  revalidatePath("/settings/categories");
  return { success: true };
}

export async function updateSubcategory(subcategoryId: string, formData: FormData) {
  await requirePermission("categories", "edit");
  const supabase = await createClient();

  const { error } = await supabase
    .from("subcategories")
    .update({
      category_id: formData.get("category_id") as string,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
    })
    .eq("id", subcategoryId);

  if (error) return { error: error.message };
  revalidatePath("/settings/subcategories");
  revalidatePath("/settings/categories");
  return { success: true };
}

export async function deleteSubcategory(subcategoryId: string) {
  await requirePermission("categories", "delete");
  const supabase = await createClient();

  const { error } = await supabase
    .from("subcategories")
    .update({ is_active: false })
    .eq("id", subcategoryId);

  if (error) return { error: error.message };
  revalidatePath("/settings/subcategories");
  revalidatePath("/settings/categories");
  return { success: true };
}

export async function saveNotificationPreferences(
  preferences: { type: string; email_enabled: boolean; in_app_enabled: boolean }[]
) {
  const profile = await requireAuth();
  const supabase = await createClient();

  for (const pref of preferences) {
    await supabase.from("notification_preferences").upsert(
      {
        user_id: profile.id,
        type: pref.type,
        email_enabled: pref.email_enabled,
        in_app_enabled: pref.in_app_enabled,
      },
      { onConflict: "user_id,type" }
    );
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
