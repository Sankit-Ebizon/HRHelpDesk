"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { createNotification, sendEmailNotification } from "@/lib/notifications";
import type { DraftMetadata, TicketPriority, TicketStatus } from "@/types";
import { parseTimeInput, sanitizeRichTextHtml, stripHtmlTags } from "@/lib/utils";
import { resolveTicketOwner } from "@/lib/department-routing";
import { prepareOutboundEmailHtml } from "@/lib/email-outbound";

export async function createTicket(formData: FormData) {
  const { profile } = await requirePermission("tickets", "create");
  const supabase = await createClient();

  const contactEmail = formData.get("contact_email") as string;
  let contactId = formData.get("contact_id") as string | null;

  if (!contactId) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("email", contactEmail)
      .single();

    if (existing) {
      contactId = existing.id;
    } else {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          full_name: formData.get("contact_name") as string,
          email: contactEmail,
          phone: (formData.get("contact_details") as string) || null,
        })
        .select("id")
        .single();
      contactId = newContact?.id || null;
    }
  }

  const departmentId = (formData.get("department_id") as string) || null;
  const categoryId = (formData.get("category_id") as string) || null;
  const explicitOwnerId = (formData.get("owner_id") as string) || null;
  const ownerId = explicitOwnerId || profile.id;

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      subject: formData.get("subject") as string,
      description: formData.get("description") as string,
      contact_id: contactId,
      contact_name: formData.get("contact_name") as string,
      contact_email: contactEmail,
      contact_details: (formData.get("contact_details") as string) || null,
      department_id: departmentId,
      category_id: categoryId,
      subcategory_id: (formData.get("subcategory_id") as string) || null,
      priority: (formData.get("priority") as TicketPriority) || "medium",
      owner_id: ownerId,
      due_date: (formData.get("due_date") as string) || null,
      created_by: profile.id,
    })
    .select("*, ticket_number")
    .single();

  if (error) return { error: error.message };

  await createNotification({
    type: "ticket_created",
    ticketId: data.id,
    title: `New Ticket: ${data.ticket_number}`,
    message: `${data.subject} — created by ${profile.full_name}`,
    excludeUserId: profile.id,
  });

  if (data.owner_id) {
    await createNotification({
      type: "ticket_assigned",
      ticketId: data.id,
      title: `Ticket Assigned: ${data.ticket_number}`,
      message: `You have been assigned ticket: ${data.subject}`,
      targetUserId: data.owner_id,
    });
  }

  revalidatePath("/tickets");
  return { success: true, ticket: data };
}

export async function updateTicket(ticketId: string, formData: FormData) {
  await requirePermission("tickets", "edit");
  const supabase = await createClient();

  const oldTicket = await supabase.from("tickets").select("*").eq("id", ticketId).single();
  const newStatus = formData.get("status") as TicketStatus | null;
  const departmentId = (formData.get("department_id") as string) || null;
  const categoryId = (formData.get("category_id") as string) || null;
  const explicitOwnerId = (formData.get("owner_id") as string) || null;
  const newOwnerId = await resolveTicketOwner(supabase, {
    departmentId,
    categoryId,
    explicitOwnerId,
  });

  const updates: Record<string, unknown> = {
    subject: formData.get("subject") as string,
    description: formData.get("description") as string,
    contact_name: formData.get("contact_name") as string,
    contact_email: formData.get("contact_email") as string,
    contact_details: (formData.get("contact_details") as string) || null,
    department_id: departmentId,
    category_id: categoryId,
    subcategory_id: (formData.get("subcategory_id") as string) || null,
    priority: formData.get("priority") as TicketPriority,
    status: newStatus,
    owner_id: newOwnerId,
    due_date: (formData.get("due_date") as string) || null,
  };

  if (newStatus === "closed" && oldTicket.data?.status !== "closed") {
    updates.closed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("tickets").update(updates).eq("id", ticketId);
  if (error) return { error: error.message };

  if (newOwnerId && newOwnerId !== oldTicket.data?.owner_id) {
    await createNotification({
      type: "ticket_assigned",
      ticketId,
      title: `Ticket Assigned: ${oldTicket.data?.ticket_number}`,
      message: `You have been assigned: ${updates.subject}`,
      targetUserId: newOwnerId,
    });
  }

  if (newStatus && newStatus !== oldTicket.data?.status) {
    await createNotification({
      type: newStatus === "closed" ? "ticket_closed" : "status_changed",
      ticketId,
      title: `Status Updated: ${oldTicket.data?.ticket_number}`,
      message: `Status changed to ${newStatus}`,
    });

    if (oldTicket.data?.contact_email) {
      await sendEmailNotification({
        to: oldTicket.data.contact_email,
        subject: `Ticket ${oldTicket.data.ticket_number} - Status Updated`,
        html: `<p>Your ticket <strong>${oldTicket.data.ticket_number}</strong> status has been updated to <strong>${newStatus}</strong>.</p>`,
      });
    }
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function deleteTicket(ticketId: string) {
  await requirePermission("tickets", "delete");
  const supabase = await createClient();

  const { data: attachments } = await supabase
    .from("ticket_attachments")
    .select("file_path")
    .eq("ticket_id", ticketId);

  if (attachments?.length) {
    await supabase.storage
      .from("ticket-attachments")
      .remove(attachments.map((a) => a.file_path));
  }

  const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
  if (error) return { error: error.message };

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addComment(
  ticketId: string,
  content: string,
  commentType: "reply" | "internal",
  options?: {
    cc?: string[];
    bcc?: string[];
    to?: string[];
    subject?: string;
  }
) {
  const { profile } = await requirePermission("tickets", "edit");
  const supabase = await createClient();
  const safeHtml = sanitizeRichTextHtml(content);
  const plainText = stripHtmlTags(safeHtml);
  if (!plainText.trim()) return { error: "Comment cannot be empty" };

  const { error } = await supabase.from("ticket_comments").insert({
    ticket_id: ticketId,
    author_id: profile.id,
    author_name: profile.full_name,
    author_email: profile.email,
    content: safeHtml,
    comment_type: commentType,
  });

  if (error) return { error: error.message };

  const { data: ticket } = await supabase
    .from("tickets")
    .select("ticket_number, subject, contact_email, owner_id")
    .eq("id", ticketId)
    .single();

  if (commentType === "reply" && ticket) {
    const prepared = await prepareOutboundEmailHtml(supabase, safeHtml, ticketId);
    const recipients = options?.to?.filter(Boolean) ?? [ticket.contact_email].filter(Boolean);
    for (const to of recipients) {
      await sendEmailNotification({
        to,
        subject: options?.subject || `Re: ${ticket.ticket_number} - ${ticket.subject}`,
        html: `<p>${profile.full_name} replied to your ticket:</p><blockquote>${prepared.html}</blockquote>`,
        cc: options?.cc?.filter(Boolean),
        bcc: options?.bcc?.filter(Boolean),
        inlineAttachments: prepared.inlineAttachments,
      });
    }
  }

  await createNotification({
    type: commentType === "internal" ? "ticket_internal" : "ticket_reply",
    ticketId,
    title: `New ${commentType === "internal" ? "Internal Note" : "Reply"}: ${ticket?.ticket_number}`,
    message: plainText.slice(0, 100),
    excludeUserId: profile.id,
    targetUserId: ticket?.owner_id || undefined,
    emailEnabled: commentType !== "internal",
  });

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}

export async function saveCommentDraft(
  ticketId: string,
  content: string,
  metadata: DraftMetadata,
  draftId?: string
) {
  const { profile } = await requirePermission("tickets", "edit");
  const supabase = await createClient();
  const safeHtml = sanitizeRichTextHtml(content);
  const plainText = stripHtmlTags(safeHtml);
  if (!plainText.trim()) return { error: "Draft cannot be empty" };

  const payload = {
    content: safeHtml,
    draft_metadata: metadata,
    updated_at: new Date().toISOString(),
  };

  if (draftId) {
    const { data: existing } = await supabase
      .from("ticket_comments")
      .select("id, author_id, comment_type")
      .eq("id", draftId)
      .single();

    if (!existing || existing.comment_type !== "draft") return { error: "Draft not found." };
    if (existing.author_id !== profile.id && !["administrator", "hr_manager"].includes(profile.role)) {
      return { error: "You do not have permission to edit this draft." };
    }

    const { error } = await supabase.from("ticket_comments").update(payload).eq("id", draftId);
    if (error) return { error: error.message };
    revalidatePath(`/tickets/${ticketId}`);
    return { success: true, draftId };
  }

  const { data: existingDraft } = await supabase
    .from("ticket_comments")
    .select("id")
    .eq("ticket_id", ticketId)
    .eq("author_id", profile.id)
    .eq("comment_type", "draft")
    .maybeSingle();

  if (existingDraft) {
    const { error } = await supabase
      .from("ticket_comments")
      .update(payload)
      .eq("id", existingDraft.id);
    if (error) return { error: error.message };
    revalidatePath(`/tickets/${ticketId}`);
    return { success: true, draftId: existingDraft.id };
  }

  const { data: inserted, error } = await supabase
    .from("ticket_comments")
    .insert({
      ticket_id: ticketId,
      author_id: profile.id,
      author_name: profile.full_name,
      author_email: profile.email,
      content: safeHtml,
      comment_type: "draft",
      draft_metadata: metadata,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/tickets/${ticketId}`);
  return { success: true, draftId: inserted.id };
}

export async function deleteCommentDraft(draftId: string) {
  const { profile } = await requirePermission("tickets", "edit");
  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("ticket_comments")
    .select("id, ticket_id, author_id, comment_type")
    .eq("id", draftId)
    .single();

  if (!draft || draft.comment_type !== "draft") return { error: "Draft not found." };

  const canDelete =
    draft.author_id === profile.id ||
    ["administrator", "hr_manager"].includes(profile.role);

  if (!canDelete) return { error: "You do not have permission to discard this draft." };

  await supabase.from("ticket_attachments").delete().eq("comment_id", draftId);
  const { error } = await supabase.from("ticket_comments").delete().eq("id", draftId);
  if (error) return { error: error.message };

  revalidatePath(`/tickets/${draft.ticket_id}`);
  return { success: true };
}

export async function sendCommentDraft(draftId: string) {
  const { profile } = await requirePermission("tickets", "edit");
  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("ticket_comments")
    .select("id, ticket_id, author_id, content, draft_metadata, comment_type")
    .eq("id", draftId)
    .single();

  if (!draft || draft.comment_type !== "draft") return { error: "Draft not found." };

  const canSend =
    draft.author_id === profile.id ||
    ["administrator", "hr_manager"].includes(profile.role);

  if (!canSend) return { error: "You do not have permission to send this draft." };

  const metadata = draft.draft_metadata as DraftMetadata | null;
  const { data: ticket } = await supabase
    .from("tickets")
    .select("ticket_number, subject, contact_email, owner_id")
    .eq("id", draft.ticket_id)
    .single();

  if (!ticket) return { error: "Ticket not found." };

  const safeHtml = draft.content;
  const plainText = stripHtmlTags(safeHtml);
  const isForward = metadata?.mode === "forward";
  const prepared = await prepareOutboundEmailHtml(supabase, safeHtml, draft.ticket_id);
  const toRecipients =
    metadata?.to?.map((r) => r.email).filter(Boolean) ??
    (isForward ? [] : [ticket.contact_email]);
  const cc = metadata?.cc?.map((r) => r.email).filter(Boolean) ?? [];
  const bcc = metadata?.bcc?.map((r) => r.email).filter(Boolean) ?? [];

  if (toRecipients.length === 0) return { error: "Add at least one recipient before sending." };

  const { data: reply, error: insertError } = await supabase
    .from("ticket_comments")
    .insert({
      ticket_id: draft.ticket_id,
      author_id: profile.id,
      author_name: profile.full_name,
      author_email: profile.email,
      content: safeHtml,
      comment_type: "reply",
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  await supabase
    .from("ticket_attachments")
    .update({ comment_id: reply.id })
    .eq("comment_id", draftId);

  await supabase.from("ticket_comments").delete().eq("id", draftId);

  const subject =
    metadata?.subject ||
    (isForward
      ? `Fwd: ${ticket.ticket_number} - ${ticket.subject}`
      : `Re: ${ticket.ticket_number} - ${ticket.subject}`);

  for (const to of toRecipients) {
    await sendEmailNotification({
      to,
      subject,
      html: isForward
        ? prepared.html
        : `<p>${profile.full_name} replied to your ticket:</p><blockquote>${prepared.html}</blockquote>`,
      cc,
      bcc,
      inlineAttachments: prepared.inlineAttachments,
    });
  }

  await createNotification({
    type: "ticket_reply",
    ticketId: draft.ticket_id,
    title: `New ${isForward ? "Forward" : "Reply"}: ${ticket.ticket_number}`,
    message: plainText.slice(0, 100),
    excludeUserId: profile.id,
    targetUserId: ticket.owner_id || undefined,
  });

  revalidatePath(`/tickets/${draft.ticket_id}`);
  return { success: true };
}

export async function deleteComment(commentId: string) {
  const { profile } = await requirePermission("tickets", "edit");
  const supabase = await createClient();

  const { data: comment } = await supabase
    .from("ticket_comments")
    .select("id, ticket_id, author_id, comment_type")
    .eq("id", commentId)
    .single();

  if (!comment) return { error: "Comment not found." };
  if (comment.comment_type !== "internal" && comment.comment_type !== "draft") {
    return { error: "Only internal comments or drafts can be deleted." };
  }

  const canDelete =
    comment.author_id === profile.id ||
    ["administrator", "hr_manager"].includes(profile.role);

  if (!canDelete) return { error: "You do not have permission to delete this comment." };

  const { error } = await supabase.from("ticket_comments").delete().eq("id", commentId);
  if (error) return { error: error.message };

  revalidatePath(`/tickets/${comment.ticket_id}`);
  return { success: true };
}

export async function updateInternalComment(commentId: string, content: string) {
  const { profile } = await requirePermission("tickets", "edit");
  const supabase = await createClient();
  const safeHtml = sanitizeRichTextHtml(content);
  const plainText = stripHtmlTags(safeHtml);
  if (!plainText.trim()) return { error: "Comment cannot be empty." };

  const { data: comment } = await supabase
    .from("ticket_comments")
    .select("id, ticket_id, author_id, comment_type")
    .eq("id", commentId)
    .single();

  if (!comment) return { error: "Comment not found." };
  if (comment.comment_type !== "internal") {
    return { error: "Only internal comments can be edited." };
  }

  const canEdit =
    comment.author_id === profile.id ||
    ["administrator", "hr_manager"].includes(profile.role);

  if (!canEdit) return { error: "You do not have permission to edit this comment." };

  const { error } = await supabase
    .from("ticket_comments")
    .update({ content: safeHtml })
    .eq("id", commentId);

  if (error) return { error: error.message };

  revalidatePath(`/tickets/${comment.ticket_id}`);
  return { success: true };
}

export async function addTimeLog(ticketId: string, formData: FormData) {
  const { profile } = await requirePermission("time_logs", "create");
  const supabase = await createClient();

  const timeSpent = formData.get("time_spent") as string;
  const minutes = parseTimeInput(timeSpent);
  if (!minutes) return { error: "Invalid time format. Use HH:MM format." };

  const description = formData.get("description") as string;
  if (!description?.trim()) return { error: "Description is required." };

  const logDate = formData.get("log_date") as string;
  if (new Date(logDate) > new Date()) {
    return { error: "Log date cannot be in the future." };
  }

  const { error } = await supabase.from("time_logs").insert({
    ticket_id: ticketId,
    user_id: profile.id,
    log_date: logDate,
    time_spent_minutes: minutes,
    description: description.trim(),
  });

  if (error) return { error: error.message };

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}

export async function updateTimeLog(timeLogId: string, formData: FormData) {
  const { profile } = await requirePermission("time_logs", "edit");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("time_logs")
    .select("user_id, ticket_id")
    .eq("id", timeLogId)
    .single();

  if (!existing) return { error: "Time log not found." };
  if (existing.user_id !== profile.id && profile.role === "hr_agent") {
    return { error: "You can only edit your own time logs." };
  }

  const timeSpent = formData.get("time_spent") as string;
  const minutes = parseTimeInput(timeSpent);
  if (!minutes) return { error: "Invalid time format." };

  const { error } = await supabase
    .from("time_logs")
    .update({
      log_date: formData.get("log_date") as string,
      time_spent_minutes: minutes,
      description: (formData.get("description") as string).trim(),
    })
    .eq("id", timeLogId);

  if (error) return { error: error.message };

  revalidatePath(`/tickets/${existing.ticket_id}`);
  return { success: true };
}

export async function deleteTimeLog(timeLogId: string) {
  const { profile } = await requirePermission("time_logs", "delete");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("time_logs")
    .select("user_id, ticket_id")
    .eq("id", timeLogId)
    .single();

  if (!existing) return { error: "Time log not found." };
  if (existing.user_id !== profile.id && profile.role === "hr_agent") {
    return { error: "Forbidden." };
  }

  const { error } = await supabase.from("time_logs").delete().eq("id", timeLogId);
  if (error) return { error: error.message };

  revalidatePath(`/tickets/${existing.ticket_id}`);
  return { success: true };
}

export async function uploadAttachment(
  ticketId: string,
  formData: FormData,
  options?: { commentId?: string }
) {
  await requirePermission("tickets", "edit");
  const supabase = await createClient();
  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided." };

  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const filePath = `${ticketId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("ticket-attachments")
    .upload(filePath, file);

  if (uploadError) return { error: uploadError.message };

  const { data: { user } } = await supabase.auth.getUser();

  const baseRecord = {
    ticket_id: ticketId,
    comment_id: options?.commentId || null,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type,
    uploaded_by: user?.id,
  };

  let { error } = await supabase.from("ticket_attachments").insert({
    ...baseRecord,
    source: "internal",
  });

  if (error?.message?.includes("source")) {
    ({ error } = await supabase.from("ticket_attachments").insert(baseRecord));
  }

  if (error) return { error: error.message };

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}

export async function updateUser(userId: string, formData: FormData) {
  const { updateUser: update } = await import("@/lib/actions/settings");
  return update(userId, formData);
}

export async function createDepartment(formData: FormData) {
  const { profile } = await requirePermission("departments", "create");
  const supabase = await createClient();

  const basePayload = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
  };

  let logoUrl: string | null = null;
  const logoFile = formData.get("logo") as File | null;
  if (logoFile && logoFile.size > 0) {
    const filePath = `${Date.now()}-${logoFile.name.replace(/[^\w.-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("department-logos")
      .upload(filePath, logoFile);

    if (!uploadError) {
      const { data: publicUrl } = supabase.storage
        .from("department-logos")
        .getPublicUrl(filePath);
      logoUrl = publicUrl.publicUrl;
    }
  }

  const associateAgentId = formData.get("associate_agent_id") as string;
  const displayInHelpCenter = formData.get("display_in_help_center") === "true";

  const extendedPayload = {
    ...basePayload,
    help_center_display_name: (formData.get("help_center_display_name") as string) || null,
    logo_url: logoUrl,
    display_in_help_center: displayInHelpCenter,
    associate_agent_id: associateAgentId || null,
    created_by: profile.id,
  };

  let { error } = await supabase.from("departments").insert(extendedPayload);

  if (error?.message?.includes("column")) {
    ({ error } = await supabase.from("departments").insert({
      ...basePayload,
      created_by: profile.id,
    }));
    if (error?.message?.includes("column")) {
      ({ error } = await supabase.from("departments").insert(basePayload));
    }
  }

  if (error) return { error: error.message };
  revalidatePath("/settings/departments");
  return { success: true };
}

export async function updateDepartment(departmentId: string, formData: FormData) {
  await requirePermission("departments", "edit");
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
  };

  if (formData.has("help_center_display_name")) {
    updates.help_center_display_name =
      (formData.get("help_center_display_name") as string) || null;
  }
  if (formData.has("display_in_help_center")) {
    updates.display_in_help_center = formData.get("display_in_help_center") === "true";
  }
  if (formData.has("associate_agent_id")) {
    const associateAgentId = formData.get("associate_agent_id") as string;
    updates.associate_agent_id = associateAgentId || null;
  }

  const logoFile = formData.get("logo") as File | null;
  if (logoFile && logoFile.size > 0) {
    const filePath = `${departmentId}/${Date.now()}-${logoFile.name.replace(/[^\w.-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("department-logos")
      .upload(filePath, logoFile);

    if (uploadError) return { error: uploadError.message };

    const { data: publicUrl } = supabase.storage
      .from("department-logos")
      .getPublicUrl(filePath);
    updates.logo_url = publicUrl.publicUrl;
  }

  const { error } = await supabase
    .from("departments")
    .update(updates)
    .eq("id", departmentId);

  if (error) return { error: error.message };
  revalidatePath("/settings/departments");
  revalidatePath(`/settings/departments/${departmentId}`);
  return { success: true };
}

export async function deleteDepartment(departmentId: string) {
  await requirePermission("departments", "delete");
  const supabase = await createClient();

  const { error } = await supabase
    .from("departments")
    .update({ is_active: false })
    .eq("id", departmentId);

  if (error) return { error: error.message };
  revalidatePath("/settings/departments");
  return { success: true };
}

const MAX_CATEGORY_IMAGE_BYTES = 1024 * 1024;

async function uploadCategoryImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  if (file.size > MAX_CATEGORY_IMAGE_BYTES) {
    return { error: "Image must be 1MB or smaller." };
  }

  const filePath = `${categoryId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from("category-images")
    .upload(filePath, file);

  if (uploadError) return { error: uploadError.message };

  const { data: publicUrl } = supabase.storage
    .from("category-images")
    .getPublicUrl(filePath);

  return { url: publicUrl.publicUrl };
}

export async function createCategory(formData: FormData) {
  const { profile } = await requirePermission("categories", "create");
  const supabase = await createClient();

  const basePayload = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    department_id: (formData.get("department_id") as string) || null,
  };

  let { data, error } = await supabase
    .from("categories")
    .insert({ ...basePayload, created_by: profile.id })
    .select("id")
    .single();

  if (error?.message?.includes("column")) {
    ({ data, error } = await supabase
      .from("categories")
      .insert(basePayload)
      .select("id")
      .single());
  }

  if (error) return { error: error.message };

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0 && data) {
    const uploaded = await uploadCategoryImage(supabase, data.id, imageFile);
    if (uploaded.error) return { error: uploaded.error };
    if (uploaded.url) {
      const { error: imageError } = await supabase
        .from("categories")
        .update({ image_url: uploaded.url })
        .eq("id", data.id);
      if (imageError && !imageError.message.includes("column")) {
        return { error: imageError.message };
      }
    }
  }

  const subcategoryName = (formData.get("subcategory_name") as string)?.trim();
  if (subcategoryName && data) {
    const { error: subError } = await supabase.from("subcategories").insert({
      category_id: data.id,
      name: subcategoryName,
      description: (formData.get("subcategory_description") as string) || null,
    });
    if (subError) return { error: subError.message };
    revalidatePath("/settings/subcategories");
  }

  revalidatePath("/settings/categories");
  return { success: true };
}

export async function updateCategory(categoryId: string, formData: FormData) {
  await requirePermission("categories", "edit");
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    department_id: (formData.get("department_id") as string) || null,
  };

  if (formData.get("remove_image") === "true") {
    updates.image_url = null;
  }

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const uploaded = await uploadCategoryImage(supabase, categoryId, imageFile);
    if (uploaded.error) return { error: uploaded.error };
    if (uploaded.url) updates.image_url = uploaded.url;
  }

  const { error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidatePath("/settings/categories");
  return { success: true };
}

export async function toggleCategoryStatus(categoryId: string, isActive: boolean) {
  await requirePermission("categories", "edit");
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidatePath("/settings/categories");
  return { success: true };
}

export async function deleteCategory(categoryId: string) {
  await requirePermission("categories", "delete");
  const supabase = await createClient();

  const { count: ticketCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (ticketCount && ticketCount > 0) {
    return {
      error: `This category is linked to ${ticketCount} ticket(s). Turn it off using the toggle instead of deleting.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);

  if (error) return { error: error.message };
  revalidatePath("/settings/categories");
  revalidatePath("/settings/subcategories");
  return { success: true };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}
