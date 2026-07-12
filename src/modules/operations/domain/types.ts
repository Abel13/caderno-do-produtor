export type OperationalRecordStatus = "draft" | "confirmed" | "cancelled" | "review_required";
export type OperationalRecordOrigin = "manual" | "pdf" | "integration" | "system";

export interface OperationalRecordType {
  code: string;
  label: string;
  description: string | null;
  default_unit: string | null;
  category: string;
  active: boolean;
}

export interface PlotOption {
  id: string;
  name: string;
}

export interface PlantingOption {
  id: string;
  name: string;
  plot_id: string;
}

export interface SeasonOption {
  id: string;
  name: string;
  status: string;
}

export interface ResponsibleOption {
  id: string;
  full_name: string | null;
}

export interface OperationalRecordSummary {
  id: string;
  property_id: string;
  plot_id: string | null;
  planting_id: string | null;
  season_id: string | null;
  record_type: string;
  occurred_at: string;
  status: OperationalRecordStatus;
  origin: OperationalRecordOrigin;
  payload: Record<string, unknown> | null;
  notes: string | null;
  responsible_user_id: string | null;
  deleted_at: string | null;
}

export interface OperationFormContext {
  recordTypes: OperationalRecordType[];
  plots: PlotOption[];
  plantings: PlantingOption[];
  seasons: SeasonOption[];
}

export interface OperationalListFilter {
  recordType?: string;
  seasonId?: string;
  status?: OperationalRecordStatus;
  plotId?: string;
  responsibleUserId?: string;
  from?: string;
  to?: string;
  showDeleted?: boolean;
}

export interface OperationalListResult {
  records: OperationalRecordSummary[];
  total: number;
}
