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

export function calculateDurationMinutes(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return null;
  const [startHour, startMinute] = startedAt.split(":").map(Number);
  const [endHour, endMinute] = endedAt.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (end < start) return null;
  return end - start;
}

export function formatDuration(minutes: number | null | undefined) {
  if (!minutes) return "Não informado";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} min`;
  if (!remaining) return `${hours} h`;
  return `${hours} h ${remaining} min`;
}
