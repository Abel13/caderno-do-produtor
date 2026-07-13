import type { SupabaseClient } from "@supabase/supabase-js";

import { throwSupabaseError } from "@/modules/identity/infrastructure/supabase/identity-repository";
import type { DashboardRecentRecord, DashboardSeason } from "../../domain/types";

function startOfCurrentMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export interface DashboardRepositorySummary {
  seasons: DashboardSeason[];
  activePlotCount: number;
  activePlantingCount: number;
  plantingSeasonLinkCount: number;
  recordsThisMonthCount: number;
  recentRecords: DashboardRecentRecord[];
}

export class DashboardRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getSummary(propertyId: string): Promise<DashboardRepositorySummary> {
    const [plots, plantings, seasons, links, recordsThisMonth, recentRecords] = await Promise.all([
      this.supabase.from("plots").select("id", { count: "exact", head: true }).eq("property_id", propertyId).neq("status", "closed"),
      this.supabase
        .from("plantings")
        .select("id,plots!inner(property_id)", { count: "exact", head: true })
        .neq("status", "closed")
        .eq("plots.property_id", propertyId),
      this.supabase.from("harvest_seasons").select("id,name,status,starts_on,ends_on").eq("property_id", propertyId).order("starts_on", { ascending: false }),
      this.supabase
        .from("planting_seasons")
        .select("id,planting:plantings!inner(plot:plots!inner(property_id))", { count: "exact", head: true })
        .eq("planting.plot.property_id", propertyId),
      this.supabase
        .from("operational_records")
        .select("id", { count: "exact", head: true })
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .gte("occurred_at", startOfCurrentMonthIso()),
      this.supabase
        .from("operational_records")
        .select("id,record_type,occurred_at,status,notes,payload")
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .limit(5),
    ]);

    for (const result of [plots, plantings, seasons, links, recordsThisMonth, recentRecords]) {
      if (result.error) throwSupabaseError(result.error);
    }

    return {
      activePlotCount: plots.count ?? 0,
      activePlantingCount: plantings.count ?? 0,
      seasons: (seasons.data ?? []) as DashboardSeason[],
      plantingSeasonLinkCount: links.count ?? 0,
      recordsThisMonthCount: recordsThisMonth.count ?? 0,
      recentRecords: (recentRecords.data ?? []).map((record) => ({
        id: record.id as string,
        record_type: record.record_type as string,
        occurred_at: record.occurred_at as string,
        status: record.status as DashboardRecentRecord["status"],
        notes: record.notes as string | null,
        payload: (record.payload as Record<string, unknown>) ?? {},
      })),
    };
  }
}
