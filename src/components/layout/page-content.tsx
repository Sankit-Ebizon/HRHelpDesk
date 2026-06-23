import { cn } from "@/lib/utils";

export function PageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

export function DataPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl glass-panel shadow-glass", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[15px] font-medium text-foreground">{title}</h2>
        {description && (
          <p className="mt-1.5 text-[13px] text-muted-foreground leading-normal max-w-2xl">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "from-indigo-500/20 to-violet-500/5",
  className,
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl glass-panel p-4 sm:p-5 hover-lift", className)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100", accent)} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums sm:mt-2 sm:text-3xl">{value}</p>
          {trend && <p className="mt-1 text-2xs text-muted-foreground">{trend}</p>}
        </div>
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border sm:h-10 sm:w-10">
            <Icon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
