import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex gap-3 rounded-xl border px-4 py-3.5 text-sm transition-all animate-slide-up",
  {
    variants: {
      variant: {
        default: "border-border bg-muted/50 text-foreground",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
        destructive: "border-red-500/20 bg-red-500/10 text-red-700",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const icons = {
  default: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
  warning: AlertCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const Icon = icons[variant ?? "default"];
    return (
      <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
        <Icon className="h-4 w-4 shrink-0 mt-0.5 opacity-80" />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm opacity-90 mt-1 leading-relaxed", className)} {...props} />
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
