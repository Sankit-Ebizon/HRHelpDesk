import Link from "next/link";
import { AppHeader } from "@/components/layout/sidebar";
import { PageContent, DataPanel } from "@/components/layout/page-content";
import { getTicketOwnerStats } from "@/lib/queries";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { USER_ROLE_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function TicketOwnersPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  const owners = await getTicketOwnerStats();

  return (
    <>
      <AppHeader title="Ticket Owners" profile={ctx.profile} />
      <PageContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          HR agents and managers who can be assigned tickets. Click to view their tickets.
        </p>
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Open Tickets</TableHead>
                <TableHead>Total Assigned</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((owner) => (
                <TableRow key={owner.id}>
                  <TableCell className="font-medium text-foreground">{owner.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{owner.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {USER_ROLE_LABELS[owner.role as keyof typeof USER_ROLE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(owner.department as unknown as { name: string } | null)?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        owner.open_tickets > 0
                          ? "font-semibold text-amber-400"
                          : "text-muted-foreground"
                      }
                    >
                      {owner.open_tickets}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{owner.total_tickets}</TableCell>
                  <TableCell>
                    <Link href={`/tickets?view=my_open&owner_id=${owner.id}`}>
                      <Button variant="ghost" size="sm" aria-label="View tickets">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      </PageContent>
    </>
  );
}
