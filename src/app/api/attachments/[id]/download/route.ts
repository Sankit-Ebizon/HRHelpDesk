import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: attachment, error } = await supabase
    .from("ticket_attachments")
    .select("file_path, file_name, mime_type")
    .eq("id", id)
    .single();

  if (error || !attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from("ticket-attachments")
    .download(attachment.file_path);

  if (downloadError || !file) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  const buffer = await file.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": attachment.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${attachment.file_name}"`,
    },
  });
}
