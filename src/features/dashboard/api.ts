import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { parseJsonApi } from "@/lib/jsonapi";

export const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const count = z.number().int().nonnegative();
const summarySchema = z.object({
  total_lembur: count, total_upah: count, hari_kerja: count, hari_libur: count,
  bulan: z.string().regex(periodPattern),
  chart: z.array(z.object({ month: z.number().int().min(1).max(12), total: count })).length(12)
    .refine((items) => new Set(items.map((item) => item.month)).size === 12),
});
export type DashboardSummary = z.infer<typeof summarySchema>;

export function parseDashboard(input: unknown): DashboardSummary {
  const resource = parseJsonApi(input).data;
  if (!resource || Array.isArray(resource) || resource.type !== "dashboard-summaries") {
    throw new ApiError("Invalid dashboard resource.", "contract");
  }
  const result = summarySchema.safeParse(resource.attributes);
  if (!result.success || resource.id !== `periode-${result.data.bulan}`) {
    throw new ApiError("Invalid dashboard summary contract.", "contract");
  }
  // Backend supplies every month, including zero. Missing months are contract errors.
  return { ...result.data, chart: [...result.data.chart].sort((a, b) => a.month - b.month) };
}

export async function getDashboard(bulan?: string, signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await apiClient.get<unknown>("/api/admin/dashboard", {
    params: bulan ? { bulan } : undefined, signal,
  });
  return parseDashboard(response.data);
}
