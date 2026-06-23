import { formatDate } from "@/lib/utils";
import type { Contact } from "@/types";

interface ContactListCardsProps {
  contacts: Contact[];
}

export function ContactListCards({ contacts }: ContactListCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="overflow-hidden rounded-2xl glass-panel p-4 transition-all hover-lift"
        >
          <p className="font-medium text-foreground">{contact.full_name}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{contact.email}</p>

          <div className="mt-3 space-y-1 text-2xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground/70">Phone:</span>{" "}
              {contact.phone || "—"}
            </p>
            <p>
              <span className="font-medium text-foreground/70">Department:</span>{" "}
              {contact.department || "—"}
            </p>
            <p>
              <span className="font-medium text-foreground/70">Company:</span>{" "}
              {contact.company || "—"}
            </p>
            <p>
              <span className="font-medium text-foreground/70">Created:</span>{" "}
              {formatDate(contact.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
