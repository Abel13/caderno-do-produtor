import type { SupabaseClient } from "@supabase/supabase-js";

import { throwSupabaseError } from "@/modules/identity/infrastructure/supabase/identity-repository";
import type { ProductionFilterInput, ProductionRecordInput } from "../../domain/schemas";
import type { ProductionFormContext, ProductionRecord } from "../../domain/types";

type OperationalRecordRef = ProductionRecord["operational_record"] | ProductionRecord["operational_record"][] | null;
type RawProductionRecord = Omit<ProductionRecord, "operational_record"> & { operational_records: OperationalRecordRef };

function normalizeDecimal(value: string | number | null) {
  return value === null ? null : String(value);
}

export class ProductionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getFormContext(propertyId: string): Promise<ProductionFormContext> {
    const [plots, plantings, seasons] = await Promise.all([
      this.supabase.from("plots").select("id,name,status,area_ha").eq("property_id", propertyId).neq("status", "closed").order("name"),
      this.supabase
        .from("plantings")
        .select("id,status,planted_area_ha,plot:plots!inner(id,name,property_id)")
        .eq("plot.property_id", propertyId)
        .neq("status", "closed")
        .order("created_at", { ascending: false }),
      this.supabase.from("harvest_seasons").select("id,name,status").eq("property_id", propertyId).neq("status", "closed").order("starts_on", { ascending: false }),
    ]);

    if (plots.error) throwSupabaseError(plots.error);
    if (plantings.error) throwSupabaseError(plantings.error);
    if (seasons.error) throwSupabaseError(seasons.error);

    return {
      plots: (plots.data ?? []).map((item) => ({
        id: item.id as string,
        name: item.name as string,
        status: item.status as string,
        area_ha: normalizeDecimal(item.area_ha as string | number | null) ?? undefined,
      })),
      plantings: (plantings.data ?? []).map((item) => {
        const plot = Array.isArray(item.plot) ? item.plot[0] : item.plot;
        return {
          id: item.id as string,
          name: `${plot?.name ?? "Talhão"} · ${item.status}`,
          status: item.status as string,
          plot_id: plot?.id as string,
          area_ha: normalizeDecimal(item.planted_area_ha as string | number | null) ?? undefined,
        };
      }),
      seasons: (seasons.data ?? []).map((item) => ({ id: item.id as string, name: item.name as string, status: item.status as string })),
    };
  }

  async listRecords(filters: ProductionFilterInput): Promise<ProductionRecord[]> {
    let query = this.supabase
      .from("production_records")
      .select("id,operational_record_id,property_id,plot_id,planting_id,season_id,harvested_on,area_ha,productivity_sc_ha,total_sc,lot_code,processing_method,beverage_classification,coffee_type,picking_percentage,notes,operational_records!inner(status,deleted_at)")
      .eq("property_id", filters.propertyId)
      .order("harvested_on", { ascending: false })
      .limit(80);

    if (filters.plotId) query = query.eq("plot_id", filters.plotId);
    if (filters.plantingId) query = query.eq("planting_id", filters.plantingId);
    if (filters.seasonId) query = query.eq("season_id", filters.seasonId);
    if (filters.from) query = query.gte("harvested_on", filters.from);
    if (filters.to) query = query.lte("harvested_on", filters.to);
    if (!filters.showDeleted) query = query.is("operational_records.deleted_at", null);

    const { data, error } = await query;
    if (error) throwSupabaseError(error);

    return ((data ?? []) as unknown as RawProductionRecord[]).map((item) => {
      const operationalRecord = Array.isArray(item.operational_records) ? item.operational_records[0] : item.operational_records;
      return {
        id: item.id,
        operational_record_id: item.operational_record_id,
        property_id: item.property_id,
        plot_id: item.plot_id,
        planting_id: item.planting_id,
        season_id: item.season_id,
        harvested_on: item.harvested_on,
        area_ha: String(item.area_ha),
        productivity_sc_ha: String(item.productivity_sc_ha),
        total_sc: String(item.total_sc),
        lot_code: item.lot_code,
        processing_method: item.processing_method,
        beverage_classification: item.beverage_classification,
        coffee_type: item.coffee_type,
        picking_percentage: normalizeDecimal(item.picking_percentage),
        notes: item.notes,
        operational_record: operationalRecord ?? { status: "confirmed", deleted_at: null },
      };
    });
  }

  async createRecord(input: ProductionRecordInput) {
    const { error } = await this.supabase.rpc("create_production_record", {
      target_property_id: input.propertyId,
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_harvested_on: input.harvestedOn,
      target_area_ha: input.areaHa,
      target_productivity_sc_ha: input.productivityScHa,
      target_total_sc: input.totalSc,
      target_lot_code: input.lotCode,
      target_processing_method: input.processingMethod,
      target_beverage_classification: input.beverageClassification,
      target_coffee_type: input.coffeeType,
      target_picking_percentage: input.pickingPercentage,
      target_notes: input.notes,
      target_client_id: input.clientId ?? crypto.randomUUID(),
    });
    if (error) throwSupabaseError(error);
  }

  async updateRecord(input: ProductionRecordInput) {
    const { error } = await this.supabase.rpc("update_production_record", {
      target_production_id: input.productionId,
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_harvested_on: input.harvestedOn,
      target_area_ha: input.areaHa,
      target_productivity_sc_ha: input.productivityScHa,
      target_total_sc: input.totalSc,
      target_lot_code: input.lotCode,
      target_processing_method: input.processingMethod,
      target_beverage_classification: input.beverageClassification,
      target_coffee_type: input.coffeeType,
      target_picking_percentage: input.pickingPercentage,
      target_notes: input.notes,
    });
    if (error) throwSupabaseError(error);
  }

  async deleteRecord(productionId: string) {
    const { error } = await this.supabase.rpc("delete_production_record", { target_production_id: productionId });
    if (error) throwSupabaseError(error);
  }

  async restoreRecord(productionId: string) {
    const { error } = await this.supabase.rpc("restore_production_record", { target_production_id: productionId, target_notes: null });
    if (error) throwSupabaseError(error);
  }
}
