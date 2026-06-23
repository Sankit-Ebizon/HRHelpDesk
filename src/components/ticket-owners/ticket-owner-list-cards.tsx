import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { USER_ROLE_LABELS } from "@/types";
import { ExternalLink, Plus } from "lucide-react";

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
          className="overflow-hidden rounded-2xl glass-panel p-4 transition-all hover-lift"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{owner.full_name}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{owner.email}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link href={`/tickets?view=my_open&owner_id=${owner.id}`}>
                <Button variant="ghost" size="sm" aria-label="View tickets">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
              {canCreate && (
                <Link href={`/tickets/new?owner_id=${owner.id}`}>
                  <Button variant="ghost" size="sm" aria-label="Create ticket for this owner">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

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
        </div>
      ))}
    </div>
  );
}
