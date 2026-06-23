"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TICKET_STATUS_LABELS } from "@/types";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Search, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface TicketStatus {
  ticket_number: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  contact_name: string;
}

interface TrackTicketClientProps {
  supportEmail: string;
}

export function TrackTicketClient({ supportEmail }: TrackTicketClientProps) {
  const [ticketNumber, setTicketNumber] = useState("");
  const [email, setEmail] = useState("");
  const [ticket, setTicket] = useState<TicketStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTicket(null);

    try {
      const res = await fetch(
        `/api/public/track?ticket=${encodeURIComponent(ticketNumber)}&email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ticket not found");
        toast({
          variant: "error",
          title: "Ticket not found",
          description: data.error || "Please check your ticket number and email.",
        });
      } else {
        setTicket(data.ticket);
        toast({
          variant: "success",
          title: "Ticket found",
          description: `Current status: ${data.ticket?.status ?? "—"}`,
        });
      }
    } catch {
      setError("Failed to look up ticket. Please try again.");
      toast({
        variant: "error",
        title: "Lookup failed",
        description: "Please try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fuchsia-50 via-purple-50 to-cyan-50 p-4">
      <Card className="w-full max-w-lg border-primary/15 shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-bold text-lg shadow-sm">
            HR
          </div>
          <CardTitle className="text-2xl">Track Your Ticket</CardTitle>
          <CardDescription>
            Enter your ticket number and email to check status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticket">Ticket Number</Label>
              <Input
                id="ticket"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="HR-1025"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ebizondigital.com"
                required
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {loading ? "Searching..." : "Track Ticket"}
            </Button>
          </form>

          {ticket && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-indigo-50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-primary">{ticket.ticket_number}</span>
                <span className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  getStatusColor(ticket.status)
                )}>
                  Ticket Status: {TICKET_STATUS_LABELS[ticket.status as keyof typeof TICKET_STATUS_LABELS]}
                </span>
              </div>
              <h3 className="font-medium">{ticket.subject}</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Contact: {ticket.contact_name}</p>
                <p>Created: {formatDateTime(ticket.created_at)}</p>
                <p>Last Updated: {formatDateTime(ticket.updated_at)}</p>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Need to create a ticket? Email{" "}
            <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
              {supportEmail}
            </a>
          </p>
          <p className="mt-2 text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              HR Staff Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
