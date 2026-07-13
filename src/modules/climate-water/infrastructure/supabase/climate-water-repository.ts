import type { SupabaseClient } from "@supabase/supabase-js";

import { throwSupabaseError } from "@/modules/identity/infrastructure/supabase/identity-repository";
import type { ClimateFilterInput, DailyWeatherInput, MeasurementPointInput, RainfallInput } from "../../domain/schemas";
import type { ClimateFormContext, ClimateMeasurementPoint, ClimateReading, ClimateSummary } from "../../domain/types";

type RawClimateReading = {
  id: string;
  operational_record_id: string;
  property_id: string;
  measurement_point_id: string | null;
  control_type: "rainfall" | "daily_weather";
  occurred_on: string;
  plot_id: string | null;
  season_id: string | null;
  rainfall_mm: string | number;
  temperature_min_c: string | number | null;
  temperature_avg_c: string | number | null;
  temperature_max_c: string | number | null;
  relative_humidity_pct: string | number | null;
  harmful_occurrences: string | null;
  notes: string | null;
  operational_records: { status: ClimateReading["operational_record"]["status"]; deleted_at: string | null } | { status: ClimateReading["operational_record"]["status"]; deleted_at: string | null }[] | null;
};

function normalizeDecimal(value: string | number | null) {
  return value === null ? null : String(value);
}

function todayRange() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  return { monthStart };
}

export class ClimateWaterRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getFormContext(propertyId: string): Promise<ClimateFormContext> {
    const [points, plots, seasons] = await Promise.all([
      this.supabase.from("climate_measurement_points").select("id,property_id,name,description,active").eq("property_id", propertyId).eq("active", true).order("name"),
      this.supabase.from("plots").select("id,name").eq("property_id", propertyId).order("name"),
      this.supabase.from("harvest_seasons").select("id,name,status").eq("property_id", propertyId).order("starts_on", { ascending: false }),
    ]);

    if (points.error) throwSupabaseError(points.error);
    if (plots.error) throwSupabaseError(plots.error);
    if (seasons.error) throwSupabaseError(seasons.error);

    return {
      measurementPoints: (points.data ?? []) as ClimateMeasurementPoint[],
      plots: (plots.data ?? []).map((item) => ({ id: item.id as string, name: item.name as string })),
      seasons: (seasons.data ?? []).map((item) => ({ id: item.id as string, name: item.name as string, status: item.status as string })),
    };
  }

  async getSummary(propertyId: string, seasonId?: string | null): Promise<ClimateSummary> {
    const { monthStart } = todayRange();
    const [month, season, recent, rainfallCount, dailyWeatherCount] = await Promise.all([
      this.supabase
        .from("climate_readings")
        .select("rainfall_mm,operational_records!inner(deleted_at)")
        .eq("property_id", propertyId)
        .gte("occurred_on", monthStart)
        .is("operational_records.deleted_at", null),
      seasonId
        ? this.supabase
          .from("climate_readings")
          .select("rainfall_mm,operational_records!inner(deleted_at)")
          .eq("property_id", propertyId)
          .eq("season_id", seasonId)
          .is("operational_records.deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      this.listReadings({ propertyId, controlType: "rainfall", showDeleted: false }),
      this.supabase.from("climate_readings").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("control_type", "rainfall"),
      this.supabase.from("climate_readings").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("control_type", "daily_weather"),
    ]);

    if (month.error) throwSupabaseError(month.error);
    if (season.error) throwSupabaseError(season.error);
    if (rainfallCount.error) throwSupabaseError(rainfallCount.error);
    if (dailyWeatherCount.error) throwSupabaseError(dailyWeatherCount.error);

    const sum = (items: { rainfall_mm: string | number | null }[] | null) =>
      String((items ?? []).reduce((total, item) => total + Number(item.rainfall_mm ?? 0), 0));

    return {
      monthRainfallMm: sum(month.data),
      seasonRainfallMm: sum(season.data),
      recentReadings: recent.slice(0, 5),
      rainfallCount: rainfallCount.count ?? 0,
      dailyWeatherCount: dailyWeatherCount.count ?? 0,
    };
  }

  async listReadings(filters: ClimateFilterInput): Promise<ClimateReading[]> {
    let query = this.supabase
      .from("climate_readings")
      .select("id,operational_record_id,property_id,measurement_point_id,control_type,occurred_on,plot_id,season_id,rainfall_mm,temperature_min_c,temperature_avg_c,temperature_max_c,relative_humidity_pct,harmful_occurrences,notes,operational_records!inner(status,deleted_at)")
      .eq("property_id", filters.propertyId)
      .eq("control_type", filters.controlType)
      .order("occurred_on", { ascending: false })
      .limit(50);

    if (filters.measurementPointId) query = query.eq("measurement_point_id", filters.measurementPointId);
    if (filters.seasonId) query = query.eq("season_id", filters.seasonId);
    if (filters.plotId) query = query.eq("plot_id", filters.plotId);
    if (filters.from) query = query.gte("occurred_on", filters.from);
    if (filters.to) query = query.lte("occurred_on", filters.to);
    if (!filters.showDeleted) query = query.is("operational_records.deleted_at", null);

    const { data, error } = await query;
    if (error) throwSupabaseError(error);

    return ((data ?? []) as unknown as RawClimateReading[]).map((item) => {
      const operationalRecord = Array.isArray(item.operational_records) ? item.operational_records[0] : item.operational_records;
      return ({
      id: item.id,
      operational_record_id: item.operational_record_id,
      property_id: item.property_id,
      measurement_point_id: item.measurement_point_id,
      control_type: item.control_type,
      occurred_on: item.occurred_on,
      plot_id: item.plot_id,
      season_id: item.season_id,
      rainfall_mm: String(item.rainfall_mm),
      temperature_min_c: normalizeDecimal(item.temperature_min_c),
      temperature_avg_c: normalizeDecimal(item.temperature_avg_c),
      temperature_max_c: normalizeDecimal(item.temperature_max_c),
      relative_humidity_pct: normalizeDecimal(item.relative_humidity_pct),
      harmful_occurrences: item.harmful_occurrences,
      notes: item.notes,
      operational_record: operationalRecord ?? { status: "confirmed", deleted_at: null },
    });
    });
  }

  async createMeasurementPoint(input: MeasurementPointInput) {
    const { error } = await this.supabase.rpc("create_climate_measurement_point", {
      target_property_id: input.propertyId,
      target_name: input.name,
      target_description: input.description,
    });
    if (error) throwSupabaseError(error);
  }

  async createRainfall(input: RainfallInput) {
    const { error } = await this.supabase.rpc("create_rainfall_record", {
      target_property_id: input.propertyId,
      target_occurred_on: input.occurredOn,
      target_measurement_point_id: input.measurementPointId,
      target_rainfall_mm: input.rainfallMm,
      target_plot_id: input.plotId,
      target_season_id: input.seasonId,
      target_notes: input.notes,
      target_status: input.status,
      target_client_id: input.clientId ?? crypto.randomUUID(),
    });
    if (error) throwSupabaseError(error);
  }

  async createDailyWeather(input: DailyWeatherInput) {
    const { error } = await this.supabase.rpc("create_daily_weather_record", {
      target_property_id: input.propertyId,
      target_occurred_on: input.occurredOn,
      target_measurement_point_id: input.measurementPointId,
      target_rainfall_mm: input.rainfallMm,
      target_temperature_min_c: input.temperatureMinC,
      target_temperature_avg_c: input.temperatureAvgC,
      target_temperature_max_c: input.temperatureMaxC,
      target_relative_humidity_pct: input.relativeHumidityPct,
      target_harmful_occurrences: input.harmfulOccurrences,
      target_plot_id: input.plotId,
      target_season_id: input.seasonId,
      target_notes: input.notes,
      target_status: input.status,
      target_client_id: input.clientId ?? crypto.randomUUID(),
    });
    if (error) throwSupabaseError(error);
  }

  async updateReading(input: RainfallInput | DailyWeatherInput) {
    const { error } = await this.supabase.rpc("update_climate_reading", {
      target_reading_id: input.readingId,
      target_occurred_on: input.occurredOn,
      target_measurement_point_id: input.measurementPointId,
      target_rainfall_mm: input.rainfallMm,
      target_temperature_min_c: "temperatureMinC" in input ? input.temperatureMinC : null,
      target_temperature_avg_c: "temperatureAvgC" in input ? input.temperatureAvgC : null,
      target_temperature_max_c: "temperatureMaxC" in input ? input.temperatureMaxC : null,
      target_relative_humidity_pct: "relativeHumidityPct" in input ? input.relativeHumidityPct : null,
      target_harmful_occurrences: "harmfulOccurrences" in input ? input.harmfulOccurrences : null,
      target_plot_id: input.plotId,
      target_season_id: input.seasonId,
      target_notes: input.notes,
      target_status: input.status,
    });
    if (error) throwSupabaseError(error);
  }

  async deleteReading(readingId: string) {
    const { error } = await this.supabase.rpc("delete_climate_reading", { target_reading_id: readingId });
    if (error) throwSupabaseError(error);
  }

  async restoreReading(readingId: string) {
    const { error } = await this.supabase.rpc("restore_climate_reading", { target_reading_id: readingId, target_notes: null });
    if (error) throwSupabaseError(error);
  }
}
