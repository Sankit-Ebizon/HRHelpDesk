import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/sidebar";
import { TicketOwnerDetailView } from "@/components/ticket-owners/ticket-owner-detail-view";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { getTicketOwnerProfile, getTicketOwnerStats } from "@/lib/queries";
import type { Profile } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketOwnerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await getLayoutContext();
  if (!ctx) return null;

  const profile = await getTicketOwnerProfile(id);
  if (!profile) notFound();

  const owners = await getTicketOwnerStats();
  const canCreate = canAccess(ctx.permissions, "tickets", "create");

  return (
    <>
      <AppHeader title="Ticket Owners" profile={ctx.profile} />
      <TicketOwnerDetailView
          owner={profile.owner as Profile & { last_login_at?: string | null }}
          owners={owners.map((item) => ({
            id: item.id,
            full_name: item.full_name,
            email: item.email,
          }))}
          stats={profile.stats}
          recentTickets={profile.recentTickets}
          canCreate={canCreate}
      />
    </>
  );
}
