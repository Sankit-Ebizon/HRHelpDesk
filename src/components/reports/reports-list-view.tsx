import Link from "next/link";
import { CUSTOM_REPORT_META } from "@/lib/reports/sections";
import type { ReportDefinition } from "@/lib/reports/types";

interface ReportsListViewProps {
  reports: ReportDefinition[];
  showCustomReport: boolean;
}

export function ReportsListView({ reports, showCustomReport }: ReportsListViewProps) {
  const totalCount = reports.length + (showCustomReport ? 1 : 0);

  if (totalCount === 0) {
    return (
      <div className="rounded-lg border bg-white px-6 py-8 sm:px-8">
        <p className="text-sm text-muted-foreground">
          No report sections are enabled for your profile. Contact an administrator.
        </p>
      </div>
    );
  }

  const items = [
    ...reports.map((report) => ({
      id: report.id,
      label: report.label,
      description: report.description,
      href: `/reports/${report.id}`,
    })),
    ...(showCustomReport
      ? [
          {
            id: CUSTOM_REPORT_META.id,
            label: CUSTOM_REPORT_META.label,
            description: CUSTOM_REPORT_META.description,
            href: "/reports/custom",
          },
        ]
      : []),
  ];

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="border-b px-6 py-3 sm:px-8">
        <h2 className="text-sm font-semibold text-zinc-800">Reports ({totalCount})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-6 py-2.5 sm:px-8">Report Name</th>
              <th className="px-6 py-2.5 sm:px-8">Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100 last:border-b-0">
                <td className="px-6 py-3.5 sm:px-8">
                  <Link
                    href={item.href}
                    className="text-[15px] font-medium text-[#1a73b5] hover:underline"
                  >
                    {item.label}
                  </Link>
                </td>
                <td className="px-6 py-3.5 text-[13px] text-zinc-600 sm:px-8">
                  {item.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
