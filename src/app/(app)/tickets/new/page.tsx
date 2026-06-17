import Link from "next/link";
import { AppHeader } from "@/components/layout/sidebar";
import { getDepartments, getCategories, getHRAgents } from "@/lib/queries";
import { NewTicketForm } from "@/components/tickets/new-ticket-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewTicketPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "tickets", "create")) redirect("/dashboard");
  const [departments, categories, agents] = await Promise.all([
    getDepartments(),
    getCategories(),
    getHRAgents(),
  ]);

  return (
    <>
      <AppHeader title="Create Ticket" profile={ctx.profile}>
        <Link href="/tickets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </AppHeader>
      <div className="p-6 max-w-3xl">
        <NewTicketForm departments={departments} categories={categories} agents={agents} />
      </div>
    </>
  );
}
