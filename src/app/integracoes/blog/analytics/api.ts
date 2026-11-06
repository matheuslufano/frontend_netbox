import api from "@/lib/api";
import type { AnalyticsReport } from "./types";
export async function getAnalytics(
  params: { start: string; end: string; articleId?: string },
  signal?: AbortSignal,
) {
  return (
    await api.get<AnalyticsReport>("/admin/blog/analytics", { params, signal })
  ).data;
}
