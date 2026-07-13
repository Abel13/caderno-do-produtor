import type { SoilAnalysisRecord, SoilSummary } from "./types";

export function formatSoilDecimal(value: string | number | null | undefined, maximumFractionDigits = 3) {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(Number(value));
}

export function soilAnalysisStatusLabel(status: SoilAnalysisRecord["import_status"]) {
  if (status === "manual") return "Preenchido manualmente";
  if (status === "awaiting_import") return "Aguardando importação";
  if (status === "review_required") return "Revisão necessária";
  return "Confirmado";
}

export function summarizeSoilAnalyses(records: SoilAnalysisRecord[]): SoilSummary {
  const active = records.filter((record) => !record.operational_record.deleted_at);
  return {
    analysesCount: active.length,
    reportsCount: active.reduce((total, record) => total + record.attachments.length, 0),
    latestCollectedOn: active[0]?.collected_on ?? null,
  };
}
