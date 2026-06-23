import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { USER_ROLE_LABELS } from "@/types";
import { ChevronRight, Plus } from "lucide-react";

interface TicketOwner {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: unknown;
  open_tickets: number;
  total_tickets: number;
}

interface TicketOwnerListCardsProps {
  owners: TicketOwner[];
  canCreate?: boolean;
}

export function TicketOwnerListCards({ owners, canCreate }: TicketOwnerListCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {owners.map((owner) => (
        <div
          key={owner.id}
          className="overflow-hidden rounded-2xl glass-panel transition-all hover-lift"
        >
          <div className="flex items-start gap-2 p-4">
            <Link href={`/ticket-owners/${owner.id}`} className="min-w-0 flex-1">
              <p className="font-medium text-[#1a73b5]">{owner.full_name}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{owner.email}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {USER_ROLE_LABELS[owner.role as keyof typeof USER_ROLE_LABELS]}
                </Badge>
              </div>

              <div className="mt-3 space-y-1 text-2xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground/70">Department:</span>{" "}
                  {(owner.department as { name: string } | null)?.name || "—"}
                </p>
                <p className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    <span className="font-medium text-foreground/70">Open:</span>{" "}
                    <span className={owner.open_tickets > 0 ? "font-semibold text-amber-400" : ""}>
                      {owner.open_tickets}
                    </span>
                  </span>
                  <span>
                    <span className="font-medium text-foreground/70">Total:</span>{" "}
                    {owner.total_tickets}
                  </span>
                </p>
              </div>
            </Link>

            <div className="flex shrink-0 flex-col items-center gap-1">
              {canCreate && (
                <Link href={`/tickets/new?owner_id=${owner.id}`}>
                  <Button variant="ghost" size="sm" aria-label="Create ticket for this owner">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link href={`/ticket-owners/${owner.id}`} aria-label="View profile">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
