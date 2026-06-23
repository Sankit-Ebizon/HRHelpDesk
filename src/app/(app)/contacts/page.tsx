import { AppHeader } from "@/components/layout/sidebar";
import { PageContent, DataPanel } from "@/components/layout/page-content";
import { getContacts } from "@/lib/queries";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactListCards } from "@/components/contacts/contact-list-cards";
import { Contact } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function ContactsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  const contacts = await getContacts();

  return (
    <>
      <AppHeader title="Contacts" profile={ctx.profile} />
      <PageContent>
        {contacts.length === 0 ? (
          <DataPanel>
            <div className="p-6">
              <EmptyState
                icon={Contact}
                title="No contacts yet"
                description="Contacts are created automatically when employees raise tickets."
              />
            </div>
          </DataPanel>
        ) : (
          <>
            <ContactListCards contacts={contacts} />
            <DataPanel className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium text-foreground">{contact.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                      <TableCell className="text-muted-foreground">{contact.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{contact.department || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{contact.company || "—"}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatDate(contact.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataPanel>
          </>
        )}
      </PageContent>
    </>
  );
}
