import * as XLSX from "xlsx";
import type { ReportResult } from "./types";

function buildSheetRows(result: ReportResult): Record<string, unknown>[] {
  return result.rows.map((row) => {
    const flat: Record<string, unknown> = {};
    for (const column of result.columns) {
      flat[column.label] = row[column.key] ?? "";
    }
    return flat;
  });
}

export function downloadReportAsExcel(reportLabel: string, result: ReportResult) {
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.json_to_sheet(buildSheetRows(result));
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Report");

  if (result.summary) {
    const summaryRows = Object.entries(result.summary).map(([key, value]) => ({
      Metric: key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      Value: value,
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  }

  const filename = `${reportLabel.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
