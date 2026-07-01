import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

let reportClientOverride: SupabaseClient | null = null;

export function withReportServiceClient<T>(fn: () => Promise<T>): Promise<T> {
  reportClientOverride = createServiceClient();
  return fn().finally(() => {
    reportClientOverride = null;
  });
}

export async function getReportSupabase() {
  return reportClientOverride ?? (await createClient());
}
