import Link from "next/link";
import { Command } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { rejectInvitation, validateInviteToken } from "@/lib/invite-actions";

const ERROR_MESSAGES = {
  invalid: "This invitation link is invalid.",
  expired: "This invitation has expired.",
  used: "This invitation has already been used.",
} as const;

export default async function InviteRejectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await validateInviteToken(token || "");

  if (!result.ok) {
    return (
      <InviteResultCard
        title="Unable to decline"
        description={ERROR_MESSAGES[result.reason]}
        actionLabel="Go to login"
        actionHref="/login"
      />
    );
  }

  await rejectInvitation(result.userId, result.tokenId);

  return (
    <InviteResultCard
      title="Invitation declined"
      description="You have declined the HR Helpdesk invitation. No account was created for you."
      actionLabel="Close"
      actionHref="/login"
    />
  );
}

function InviteResultCard({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-mesh">
      <Card className="w-full max-w-md shadow-glass">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <Command className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild variant="outline">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
