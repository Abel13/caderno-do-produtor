export interface SoilOption {
  id: string;
  name: string;
  status?: string;
  plot_id?: string;
  area_ha?: string;
}

export interface SoilAnalysisAttachment {
  id: string;
  filename: string;
  storage_path: string;
  signed_url?: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface SoilAnalysisRecord {
  id: string;
  operational_record_id: string;
  property_id: string;
  plot_id: string;
  planting_id: string | null;
  season_id: string | null;
  collected_on: string;
  depth_cm: string;
  laboratory_name: string | null;
  report_number: string | null;
  ph_water: string | null;
  ph_cacl2: string | null;
  ph_kcl: string | null;
  p_mg_dm3: string | null;
  k_mg_dm3: string | null;
  ca_cmolc_dm3: string | null;
  mg_cmolc_dm3: string | null;
  al_cmolc_dm3: string | null;
  h_al_cmolc_dm3: string | null;
  c_org_pct: string | null;
  sb_cmolc_dm3: string | null;
  effective_ctc_cmolc_dm3: string | null;
  ctc_ph7_cmolc_dm3: string | null;
  base_saturation_pct: string | null;
  aluminum_saturation_pct: string | null;
  organic_matter_dag_kg: string | null;
  b_mg_dm3: string | null;
  zn_mg_dm3: string | null;
  cu_mg_dm3: string | null;
  fe_mg_dm3: string | null;
  mn_mg_dm3: string | null;
  s_mg_dm3: string | null;
  p_rem_mg_l: string | null;
  sand_pct: string | null;
  silt_pct: string | null;
  clay_pct: string | null;
  notes: string | null;
  import_status: "manual" | "awaiting_import" | "review_required" | "confirmed";
  operational_record: {
    status: "draft" | "confirmed" | "cancelled" | "review_required";
    deleted_at: string | null;
  };
  attachments: SoilAnalysisAttachment[];
}

export interface SoilFormContext {
  plots: SoilOption[];
  plantings: SoilOption[];
  seasons: SoilOption[];
  analyses: SoilAnalysisOption[];
}

export interface SoilAnalysisOption {
  id: string;
  plot_id: string;
  label: string;
}

export interface SoilCorrectionRecord {
  id: string;
  operational_record_id: string;
  property_id: string;
  plot_id: string;
  planting_id: string | null;
  season_id: string | null;
  soil_analysis_id: string | null;
  applied_on: string;
  corrective_name: string;
  prnt_pct: string | null;
  recommended_dose_t_ha: string | null;
  total_quantity_t: string;
  labor_type: "hh" | "hm" | null;
  labor_quantity: string | null;
  fuel_l: string | null;
  responsible_name: string | null;
  notes: string | null;
  operational_record: {
    status: "draft" | "confirmed" | "cancelled" | "review_required";
    deleted_at: string | null;
  };
}

export interface SoilFertilizationRecord {
  id: string;
  operational_record_id: string;
  property_id: string;
  plot_id: string;
  planting_id: string | null;
  season_id: string | null;
  soil_analysis_id: string | null;
  applied_on: string;
  fertilizer_name: string;
  dose_kg_ha: string | null;
  total_quantity_kg: string;
  coverage_label: string | null;
  labor_type: "hh" | "hm" | null;
  labor_quantity: string | null;
  fuel_l: string | null;
  responsible_name: string | null;
  notes: string | null;
  operational_record: {
    status: "draft" | "confirmed" | "cancelled" | "review_required";
    deleted_at: string | null;
  };
}

export interface FoliarFertilizationComponent {
  id: string;
  product_name: string;
  dose_value: string;
  dose_unit: string;
  total_quantity: string | null;
  notes: string | null;
}

export interface FoliarFertilizationRecord {
  id: string;
  operational_record_id: string;
  property_id: string;
  plot_id: string;
  planting_id: string | null;
  season_id: string | null;
  applied_on: string;
  purpose: string;
  spray_volume_l_ha: string | null;
  temperature_c: string | null;
  humidity_pct: string | null;
  wind_speed_km_h: string | null;
  weather_notes: string | null;
  labor_type: "hh" | "hm" | null;
  labor_quantity: string | null;
  fuel_l: string | null;
  responsible_name: string | null;
  notes: string | null;
  components: FoliarFertilizationComponent[];
  operational_record: {
    status: "draft" | "confirmed" | "cancelled" | "review_required";
    deleted_at: string | null;
  };
}

export interface SoilSummary {
  analysesCount: number;
  reportsCount: number;
  latestCollectedOn: string | null;
}

export interface SoilCorrectionSummary {
  correctionsCount: number;
  totalQuantityT: string;
  latestAppliedOn: string | null;
}

export interface SoilFertilizationSummary {
  fertilizationsCount: number;
  totalQuantityKg: string;
  latestAppliedOn: string | null;
}

export interface FoliarFertilizationSummary {
  fertilizationsCount: number;
  totalSprayVolumeLHa: string;
  latestAppliedOn: string | null;
}
