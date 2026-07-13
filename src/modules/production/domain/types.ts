export interface ProductionOption {
  id: string;
  name: string;
  status?: string;
  plot_id?: string;
  area_ha?: string;
}

export interface ProductionFormContext {
  plots: ProductionOption[];
  plantings: ProductionOption[];
  seasons: ProductionOption[];
}

export interface ProductionRecord {
  id: string;
  operational_record_id: string;
  property_id: string;
  plot_id: string;
  planting_id: string | null;
  season_id: string;
  harvested_on: string;
  area_ha: string;
  productivity_sc_ha: string;
  total_sc: string;
  lot_code: string | null;
  processing_method: string | null;
  beverage_classification: string | null;
  coffee_type: string | null;
  picking_percentage: string | null;
  notes: string | null;
  operational_record: {
    status: "draft" | "confirmed" | "cancelled" | "review_required";
    deleted_at: string | null;
  };
}

export interface ProductionSummary {
  totalSc: string;
  averageProductivityScHa: string;
  recordsCount: number;
}
