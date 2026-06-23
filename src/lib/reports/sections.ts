import { REPORT_DEFINITIONS, type ReportType } from "./types";

export const CUSTOM_REPORT_SECTION = "custom" as const;

export const CUSTOM_REPORT_META = {
  id: CUSTOM_REPORT_SECTION,
  label: "Custom Report",
  description:
    "Build your own report by selecting a module, optional joins, and the fields to include.",
} as const;

export type ReportSectionId =
  | (typeof REPORT_DEFINITIONS)[number]["id"]
  | typeof CUSTOM_REPORT_SECTION;

export const ALL_REPORT_SECTIONS: { id: ReportSectionId; label: string }[] = [
  ...REPORT_DEFINITIONS.map((report) => ({ id: report.id, label: report.label })),
  { id: CUSTOM_REPORT_SECTION, label: "Custom Report" },
];

export function isReportSectionId(value: string): value is ReportSectionId {
  return ALL_REPORT_SECTIONS.some((section) => section.id === value);
}

export function isReportType(value: string): value is ReportType {
  return REPORT_DEFINITIONS.some((report) => report.id === value);
}
