import { REPORT_DEFINITIONS } from "./types";

export const CUSTOM_REPORT_SECTION = "custom" as const;

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
