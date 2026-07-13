import type { ClimateReading } from "./types";

export function formatMillimeters(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(numeric);
}

export function climateStatusLabel(status: ClimateReading["operational_record"]["status"]) {
  return status === "confirmed" ? "Confirmado" : status === "draft" ? "Rascunho" : status === "cancelled" ? "Cancelado" : "Em revisão";
}

export function describeClimateControl(type: "rainfall" | "daily_weather") {
  if (type === "daily_weather") {
    return "Ficha completa para acompanhar chuva, temperatura, umidade e ocorrências prejudiciais como geada ou granizo.";
  }
  return "Registro rápido de precipitação para informar data, local e volume lido no pluviômetro.";
}

export function summarizeClimateReadings(readings: Pick<ClimateReading, "rainfall_mm">[]) {
  return readings.reduce((total, reading) => total + Number(reading.rainfall_mm ?? 0), 0);
}
