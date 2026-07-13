import type { AccountRole, IdentityProperty } from "@/modules/identity/domain/types";
import type { OperationalRecordStatus } from "@/modules/operations/domain/types";

export interface DashboardSeason {
  id: string;
  name: string;
  status: "planning" | "open" | "closed" | string;
  starts_on: string;
  ends_on: string;
}

export interface DashboardRecentRecord {
  id: string;
  record_type: string;
  occurred_at: string;
  status: OperationalRecordStatus;
  notes: string | null;
  payload: Record<string, unknown> | null;
}

export interface DashboardProductionRecord {
  season_id: string;
  total_sc: string;
}

export interface DashboardSummaryInput {
  activeProperty: IdentityProperty;
  preferredSeasonId: string | null;
  role: AccountRole;
  seasons: DashboardSeason[];
  activePlotCount: number;
  activePlantingCount: number;
  plantingSeasonLinkCount: number;
  recordsThisMonthCount: number;
  recentRecords: DashboardRecentRecord[];
  productionRecords: DashboardProductionRecord[];
  soilAnalysisCount: number;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: string;
  helper: string;
}

export interface DashboardAction {
  key: string;
  label: string;
  description: string;
  href: string;
  kind: "primary" | "secondary";
}

export interface DashboardViewModel {
  activeProperty: IdentityProperty;
  activeSeason: DashboardSeason | null;
  role: AccountRole;
  canManage: boolean;
  metrics: DashboardMetric[];
  quickActions: DashboardAction[];
  recommendedAction: DashboardAction;
  recentRecords: DashboardRecentRecord[];
  hasIncompleteStructure: boolean;
  seasonOptions: DashboardSeason[];
}
