export type ClimateControlType = "rainfall" | "daily_weather";

export interface ClimateMeasurementPoint {
  id: string;
  property_id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface ClimateOption {
  id: string;
  name: string;
  status?: string;
}

export interface ClimateReading {
  id: string;
  operational_record_id: string;
  property_id: string;
  measurement_point_id: string | null;
  control_type: ClimateControlType;
  occurred_on: string;
  plot_id: string | null;
  season_id: string | null;
  rainfall_mm: string;
  temperature_min_c: string | null;
  temperature_avg_c: string | null;
  temperature_max_c: string | null;
  relative_humidity_pct: string | null;
  harmful_occurrences: string | null;
  notes: string | null;
  operational_record: {
    status: "draft" | "confirmed" | "cancelled" | "review_required";
    deleted_at: string | null;
  };
}

export interface ClimateSummary {
  monthRainfallMm: string;
  seasonRainfallMm: string;
  recentReadings: ClimateReading[];
  rainfallCount: number;
  dailyWeatherCount: number;
}

export interface ClimateFormContext {
  measurementPoints: ClimateMeasurementPoint[];
  plots: ClimateOption[];
  seasons: ClimateOption[];
}

export interface ClimateListFilter {
  propertyId: string;
  controlType: ClimateControlType;
  measurementPointId?: string;
  seasonId?: string;
  plotId?: string;
  from?: string;
  to?: string;
  showDeleted?: boolean;
}
