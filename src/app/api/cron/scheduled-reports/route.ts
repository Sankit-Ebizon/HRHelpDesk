import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledReports } from "@/lib/reports/schedule-runner";

/** Polls periodically; only schedules whose next_run_at has passed are emailed. */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueScheduledReports();
  return NextResponse.json(result);
}
