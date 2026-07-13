export interface SoilOption {
  id: string;
  name: string;
  status?: string;
  plot_id?: string;
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
}

export interface SoilSummary {
  analysesCount: number;
  reportsCount: number;
  latestCollectedOn: string | null;
}
