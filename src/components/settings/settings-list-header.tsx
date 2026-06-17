import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsListHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/settings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Link>
      </Button>
      {children}
    </div>
  );
}
