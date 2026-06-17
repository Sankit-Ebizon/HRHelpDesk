import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-indigo-500/20 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
        secondary: "border-border bg-muted text-muted-foreground",
        outline: "border-border bg-transparent text-foreground",
        success: "border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        warning: "border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-300",
        destructive: "border-red-500/20 bg-red-500/15 text-red-700 dark:text-red-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
