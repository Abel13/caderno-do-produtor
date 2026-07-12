import type { SupabaseClient } from "@supabase/supabase-js";

import { throwSupabaseError } from "@/modules/identity/infrastructure/supabase/identity-repository";
import type { PlotInput, PlantingInput, SeasonInput } from "../../domain/schemas";

export interface PlantingSummary {
  id: string;
  status: string;
  planted_area_ha: number;
  planted_on: string | null;
  planted_year: number | null;
  spacing_between_rows_m: number | null;
  spacing_between_plants_m: number | null;
  estimated_plants: number | null;
  cultivation_system: string | null;
  seedling_origin: string | null;
  cultivar: { name: string } | null;
}

export interface PlotSummary {
  id: string;
  name: string;
  area_ha: number;
  status: string;
  plantings: PlantingSummary[];
}

export interface SeasonSummary {
  id: string;
  name: string;
  status: string;
  starts_on: string;
  ends_on: string;
}

export interface CultivarSummary {
  id: string;
  name: string;
}

export class RuralStructureRepository {
  constructor(private supabase: SupabaseClient) {}

  async overview(propertyId: string) {
    const [plots, seasons, cultivars, links] = await Promise.all([
      this.supabase
        .from("plots")
        .select(
          "id,name,area_ha,status,plantings(id,status,planted_area_ha,planted_on,planted_year,spacing_between_rows_m,spacing_between_plants_m,estimated_plants,cultivation_system,seedling_origin,cultivar:cultivars(name))"
        )
        .eq("property_id", propertyId)
        .order("name"),
      this.supabase.from("harvest_seasons").select("id,name,status,starts_on,ends_on").eq("property_id", propertyId).order("starts_on", { ascending: false }),
      this.supabase.from("cultivars").select("id,name").eq("active", true).order("name"),
      this.supabase
        .from("planting_seasons")
        .select("id,planting:plantings!inner(plot:plots!inner(property_id))")
        .eq("planting.plot.property_id", propertyId),
    ]);

    for (const result of [plots, seasons, cultivars, links]) if (result.error) throwSupabaseError(result.error);

    return {
      plots: (plots.data ?? []) as unknown as PlotSummary[],
      seasons: (seasons.data ?? []) as SeasonSummary[],
      cultivars: (cultivars.data ?? []) as CultivarSummary[],
      linkCount: links.data?.length ?? 0,
    };
  }

  async createPlot(i: PlotInput) {
    const { error } = await this.supabase.rpc("create_plot", {
      target_property_id: i.propertyId,
      target_name: i.name,
      target_area_ha: i.areaHa,
      target_status: i.status,
    });
    if (error) throwSupabaseError(error);
  }

  async updatePlot(plotId: string, i: PlotInput) {
    const { error } = await this.supabase.rpc("update_plot", {
      target_plot_id: plotId,
      target_name: i.name,
      target_area_ha: i.areaHa,
      target_status: i.status,
    });
    if (error) throwSupabaseError(error);
  }

  async deletePlot(plotId: string) {
    const { error } = await this.supabase.rpc("delete_unused_plot", { target_plot_id: plotId });
    if (error) throwSupabaseError(error);
  }

  async createPlanting(i: PlantingInput) {
    const { error } = await this.supabase.rpc("create_planting", {
      target_plot_id: i.plotId,
      target_cultivar_id: i.cultivarId,
      target_area_ha: i.areaHa,
      target_planted_on: null,
      target_planted_year: i.plantedYear,
      target_row_spacing: null,
      target_plant_spacing: null,
      target_estimated_plants: null,
      target_status: i.status,
      target_system: null,
      target_origin: null,
    });
    if (error) throwSupabaseError(error);
  }

  async createSeason(i: SeasonInput) {
    const { error } = await this.supabase.rpc("create_season", {
      target_property_id: i.propertyId,
      target_name: i.name,
      target_starts_on: i.startsOn.toISOString().slice(0, 10),
      target_ends_on: i.endsOn.toISOString().slice(0, 10),
      target_status: i.status,
    });
    if (error) throwSupabaseError(error);
  }

  async updateSeasonStatus(seasonId: string, status: "planning" | "open" | "closed", reopenReason?: string | null) {
    const { error } = await this.supabase.rpc("update_season_status", {
      target_season_id: seasonId,
      target_status: status,
      target_reason: reopenReason,
    });
    if (error) throwSupabaseError(error);
  }

  async linkPlantingSeason(
    plantingId: string,
    seasonId: string,
    conductedAreaHa: number,
    productiveStatus: "forming" | "productive" | "renewing",
    productionGoalKg: number | null,
    productionEstimateKg: number | null,
    notes: string | null
  ) {
    const { error } = await this.supabase.rpc("link_planting_season", {
      target_planting_id: plantingId,
      target_season_id: seasonId,
      target_area_ha: conductedAreaHa,
      target_productive_status: productiveStatus,
      target_goal_kg: productionGoalKg,
      target_estimate_kg: productionEstimateKg,
      target_notes: notes,
    });
    if (error) throwSupabaseError(error);
  }

  async deletePlanting(plantingId: string) {
    const { error } = await this.supabase.rpc("delete_unused_planting", { target_planting_id: plantingId });
    if (error) throwSupabaseError(error);
  }

  async updatePlantingPhase(plantingId: string, status: "forming" | "productive" | "renewing") {
    const { error } = await this.supabase.rpc("update_planting_phase", {
      target_planting_id: plantingId,
      target_status: status,
    });
    if (error) throwSupabaseError(error);
  }
}
