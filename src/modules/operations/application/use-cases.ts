import type { OperationalListFilterInput } from "../domain/schemas";
import type { OperationsRepository } from "../infrastructure/supabase/operations-repository";

export function resolveHasManagePermission(role: string | undefined) {
  return role === "owner" || role === "manager";
}

export function resolveOperationFilters(raw: {
  propertyId: string;
  recordType?: string;
  seasonId?: string | null;
  status?: string;
  plotId?: string | null;
  responsibleUserId?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  limit?: number;
  showDeleted?: boolean;
}): OperationalListFilterInput {
  return {
    propertyId: raw.propertyId,
    recordType: raw.recordType ?? undefined,
    seasonId: raw.seasonId || undefined,
    status: (raw.status as OperationalListFilterInput["status"]) ?? undefined,
    plotId: raw.plotId || undefined,
    responsibleUserId: raw.responsibleUserId || undefined,
    from: raw.from || undefined,
    to: raw.to || undefined,
    page: raw.page == null || Number.isNaN(raw.page) ? 1 : Math.max(1, raw.page),
    limit: raw.limit == null || Number.isNaN(raw.limit) ? 20 : Math.min(50, Math.max(5, raw.limit)),
    showDeleted: raw.showDeleted ?? false,
  };
}

export type OperationsUseCases = {
  canManageOperations: (role: string | undefined) => boolean;
  buildFilters: (input: Parameters<typeof resolveOperationFilters>[0]) => OperationalListFilterInput;
  loadRecords: (repo: OperationsRepository, filters: OperationalListFilterInput) => ReturnType<OperationsRepository["listRecords"]>;
};

export function createOperationsUseCases(): OperationsUseCases {
  return {
    canManageOperations: resolveHasManagePermission,
    buildFilters: resolveOperationFilters,
    loadRecords: (repo, filters) => repo.listRecords(filters),
  };
}
