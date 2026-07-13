import type { ProductionRecord } from "./types";

export function formatDecimal(value: string | number | null | undefined, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(Number(value ?? 0));
}

export function calculateProductionTotal(areaHa: number | null, productivityScHa: number | null) {
  if (!areaHa || areaHa <= 0 || productivityScHa === null || productivityScHa < 0) return null;
  return Number((areaHa * productivityScHa).toFixed(4));
}

export function calculateProductivity(areaHa: number | null, totalSc: number | null) {
  if (!areaHa || areaHa <= 0 || totalSc === null || totalSc < 0) return null;
  return Number((totalSc / areaHa).toFixed(4));
}

export function productionStatusLabel(status: ProductionRecord["operational_record"]["status"]) {
  return status === "confirmed" ? "Confirmado" : status === "draft" ? "Rascunho" : status === "cancelled" ? "Cancelado" : "Em revisão";
}

export function summarizeProduction(records: ProductionRecord[]) {
  const active = records.filter((record) => !record.operational_record.deleted_at);
  const totalSc = active.reduce((total, record) => total + Number(record.total_sc ?? 0), 0);
  const totalArea = active.reduce((total, record) => total + Number(record.area_ha ?? 0), 0);
  return {
    totalSc: String(totalSc),
    averageProductivityScHa: totalArea > 0 ? String(totalSc / totalArea) : "0",
    recordsCount: active.length,
  };
}
