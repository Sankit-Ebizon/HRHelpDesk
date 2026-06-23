import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function ProfileMissingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <h1 className="text-lg font-semibold text-foreground">Unable to load your profile</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        You are signed in, but your profile could not be loaded. Try signing out and back in.
        If the problem continues, contact your administrator.
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
