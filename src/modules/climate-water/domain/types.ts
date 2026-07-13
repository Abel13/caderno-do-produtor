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
  monthIrrigationMm: string;
  seasonIrrigationMm: string;
  recentReadings: ClimateReading[];
  rainfallCount: number;
  dailyWeatherCount: number;
  irrigationCount: number;
}

export interface ClimateFormContext {
  measurementPoints: ClimateMeasurementPoint[];
  plots: ClimateOption[];
  seasons: ClimateOption[];
  irrigationSystems: IrrigationSystem[];
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

export interface IrrigationSystem {
  id: string;
  property_id: string;
  plot_id: string | null;
  name: string;
  system_type: string | null;
  water_source: string | null;
  emitters_description: string | null;
  efficiency_pct: string | null;
  wetted_area_m2: string | null;
  flow_lh: string | null;
  motor_description: string | null;
  pump_description: string | null;
  pressure_bar: string | null;
  spacing_description: string | null;
  notes: string | null;
  active: boolean;
}

export interface IrrigationEvent {
  id: string;
  operational_record_id: string;
  property_id: string;
  irrigation_system_id: string | null;
  plot_id: string | null;
  season_id: string | null;
  occurred_on: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  applied_mm: string | null;
  frequency_days: number | null;
  average_volume_l: string | null;
  responsible_name: string | null;
  notes: string | null;
  operational_record: {
    status: "draft" | "confirmed" | "cancelled" | "review_required";
    deleted_at: string | null;
  };
}
