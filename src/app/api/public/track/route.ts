import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ticketNumber = request.nextUrl.searchParams.get("ticket");
  const email = request.nextUrl.searchParams.get("email");

  if (!ticketNumber || !email) {
    return NextResponse.json({ error: "Ticket number and email are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("ticket_number, subject, status, created_at, updated_at, contact_name, contact_email")
    .eq("ticket_number", ticketNumber.toUpperCase())
    .eq("contact_email", email.toLowerCase())
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket not found. Please check your ticket number and email." }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}
