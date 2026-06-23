import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ReportDetailHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function ReportDetailHeader({ title, description, actions }: ReportDetailHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1a73b5] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Reports
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
