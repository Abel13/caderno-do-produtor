import type { SupabaseClient } from "@supabase/supabase-js";

import { throwSupabaseError } from "@/modules/identity/infrastructure/supabase/identity-repository";
import type {
  OperationalListResult,
  OperationFormContext,
  OperationalRecordSummary,
  SeasonOption,
} from "@/modules/operations/domain/types";
import type { OperationCreateInput, OperationUpdateInput, OperationalListFilterInput } from "@/modules/operations/domain/schemas";

function parseDateRangeStart(value?: string): string | null {
  if (!value) return null;
  const normalized = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  return `${normalized}T00:00:00.000Z`;
}

function parseDateRangeEnd(value?: string): string | null {
  if (!value) return null;
  const normalized = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

type PlantingWithPlot = {
  id: string;
  plot_id: string;
  planted_year: number | null;
  status: string;
  plots: { id: string; name: string } | { id: string; name: string }[] | null;
};

export class OperationsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getFormContext(propertyId: string): Promise<OperationFormContext> {
    const [recordTypes, plots, plantings, seasons] = await Promise.all([
      this.supabase.from("operation_types").select("code,label,description,default_unit,category,active").eq("active", true).order("label"),
      this.supabase.from("plots").select("id,name").eq("property_id", propertyId).order("name"),
      this.supabase
      .from("plantings")
      .select("id,plot_id,planted_year,status,plots!inner(id,name)")
      .neq("status", "closed")
      .eq("plots.property_id", propertyId)
      .order("created_at", { ascending: false }),
      this.supabase.from("harvest_seasons").select("id,name,status").eq("property_id", propertyId).order("starts_on", { ascending: false }),
    ]);

    const seasonItems = (seasons.data ?? []).map((item) => ({
      id: item.id as string,
      name: item.name as string,
      status: item.status as string,
    })) as SeasonOption[];

    if (recordTypes.error) throwSupabaseError(recordTypes.error);
    if (plots.error) throwSupabaseError(plots.error);
    if (plantings.error) throwSupabaseError(plantings.error);
    if (seasons.error) throwSupabaseError(seasons.error);

    return {
      recordTypes: (recordTypes.data ?? []).map((item) => ({
        code: item.code,
        label: item.label,
        description: item.description,
        default_unit: item.default_unit,
        category: item.category,
        active: item.active ?? true,
      })),
      plots: (plots.data ?? []).map((item: { id: string; name: string }) => ({
        id: item.id,
        name: item.name,
      })),
      plantings: (plantings.data as PlantingWithPlot[] | undefined ?? [])
        .map((item) => ({
          id: item.id,
          name: `${Array.isArray(item.plots) ? item.plots[0]?.name : item.plots?.name ?? "Talhão"} - ${item.status}${
            item.planted_year ? ` · ${item.planted_year}` : ""
          }`,
          plot_id: item.plot_id,
        }))
        .filter((item) => item.id),
      seasons: seasonItems,
    };
  }

  async listRecords(filters: OperationalListFilterInput): Promise<OperationalListResult> {
    const fromIndex = (filters.page - 1) * filters.limit;
    const toIndex = filters.page * filters.limit - 1;
    let query = this.supabase
      .from("operational_records")
      .select(
        "id,property_id,plot_id,planting_id,season_id,record_type,occurred_at,status,origin,payload,notes,responsible_user_id,deleted_at",
        { count: "exact" },
      )
      .eq("property_id", filters.propertyId)
      .range(fromIndex, toIndex)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.recordType) query = query.eq("record_type", filters.recordType);
    if (filters.seasonId) query = query.eq("season_id", filters.seasonId);
    if (filters.plotId) query = query.eq("plot_id", filters.plotId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.responsibleUserId) query = query.eq("responsible_user_id", filters.responsibleUserId);
    if (!filters.showDeleted) query = query.is("deleted_at", null);

    const fromDate = parseDateRangeStart(filters.from);
    const toDate = parseDateRangeEnd(filters.to);
    if (fromDate) query = query.gte("occurred_at", fromDate);
    if (toDate) query = query.lt("occurred_at", toDate);

    const records = await query;

    if (records.error) throwSupabaseError(records.error);

    const mapped = (records.data ?? []).map((item): OperationalRecordSummary => ({
      id: item.id as string,
      property_id: item.property_id as string,
      plot_id: item.plot_id as string | null,
      planting_id: item.planting_id as string | null,
      season_id: item.season_id as string | null,
      record_type: item.record_type as string,
      occurred_at: item.occurred_at as string,
      status: item.status as OperationalRecordSummary["status"],
      origin: item.origin as OperationalRecordSummary["origin"],
      payload: (item.payload as Record<string, unknown>) ?? {},
      notes: item.notes as string | null,
      responsible_user_id: item.responsible_user_id as string | null,
      deleted_at: item.deleted_at as string | null,
    }));

    return {
      records: mapped,
      total: records.count ?? mapped.length,
    };
  }

  async createRecord(input: OperationCreateInput) {
    const { error } = await this.supabase.rpc("create_operational_record", {
      target_property_id: input.propertyId,
      target_record_type: input.recordType,
      target_occurred_at: input.occurredAt.toISOString(),
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_payload: this.buildPayload(input.payload),
      target_notes: input.notes,
      target_status: input.status,
      target_origin: input.origin,
      target_responsible_user_id: input.responsibleUserId ?? null,
      target_client_id: input.clientId ?? null,
    });
    if (error) throwSupabaseError(error);
  }

  async updateRecord(recordId: string, input: OperationUpdateInput) {
    const { error } = await this.supabase.rpc("update_operational_record", {
      target_record_id: recordId,
      target_record_type: input.recordType,
      target_occurred_at: input.occurredAt.toISOString(),
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_payload: this.buildPayload(input.payload),
      target_notes: input.notes,
      target_status: input.status,
      target_responsible_user_id: input.responsibleUserId ?? null,
    });
    if (error) throwSupabaseError(error);
  }

  async changeStatus(recordId: string, status: OperationalRecordSummary["status"], notes?: string | null) {
    const { error } = await this.supabase.rpc("change_operational_record_status", {
      target_record_id: recordId,
      target_status: status,
      target_notes: notes ?? null,
    });
    if (error) throwSupabaseError(error);
  }

  async deleteRecord(recordId: string) {
    const { error } = await this.supabase.rpc("delete_operational_record", { target_record_id: recordId });
    if (error) throwSupabaseError(error);
  }

  async restoreRecord(recordId: string, notes?: string | null) {
    const { error } = await this.supabase.rpc("restore_operational_record", {
      target_record_id: recordId,
      target_notes: notes ?? null,
    });
    if (error) throwSupabaseError(error);
  }

  private buildPayload(payload: { value: number | null; value_unit: string | null; comment: string | null }) {
    const output: Record<string, unknown> = {};
    if (payload.value !== null && payload.value !== undefined) output.value = payload.value;
    if (payload.value_unit) output.value_unit = payload.value_unit;
    if (payload.comment) output.comment = payload.comment;
    return output;
  }
}
