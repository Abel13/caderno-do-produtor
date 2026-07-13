import { describe, expect, it } from "vitest";

import { dailyWeatherSchema, measurementPointSchema, rainfallSchema } from "../domain/schemas";
import { formatMillimeters, summarizeClimateReadings } from "../domain/rules";

describe("climate-water schemas", () => {
  it("valida registro simples de chuva", () => {
    const result = rainfallSchema.parse({
      propertyId: "11111111-1111-4111-8111-111111111111",
      occurredOn: "2026-01-10",
      measurementPointId: "",
      plotId: "",
      seasonId: "",
      rainfallMm: "30,5",
      notes: "Chuva pela manhã",
      status: "confirmed",
    });

    expect(result.rainfallMm).toBe(30.5);
    expect(result.measurementPointId).toBeNull();
  });

  it("bloqueia chuva negativa", () => {
    const result = rainfallSchema.safeParse({
      propertyId: "11111111-1111-4111-8111-111111111111",
      occurredOn: "2026-01-10",
      rainfallMm: "-1",
      status: "confirmed",
    });

    expect(result.success).toBe(false);
  });

  it("valida coerência de temperaturas no clima diário", () => {
    const result = dailyWeatherSchema.safeParse({
      propertyId: "11111111-1111-4111-8111-111111111111",
      occurredOn: "2026-01-10",
      rainfallMm: "8",
      temperatureMinC: "30",
      temperatureAvgC: "25",
      temperatureMaxC: "20",
      relativeHumidityPct: "75",
      status: "confirmed",
    });

    expect(result.success).toBe(false);
  });

  it("valida cadastro de pluviômetro", () => {
    expect(measurementPointSchema.parse({
      propertyId: "11111111-1111-4111-8111-111111111111",
      name: "Sede",
      description: "",
    }).description).toBeNull();
  });

  it("calcula e formata acumulados", () => {
    expect(summarizeClimateReadings([{ rainfall_mm: "10.5" }, { rainfall_mm: "4.5" }])).toBe(15);
    expect(formatMillimeters("15.5")).toBe("15,5");
  });
});
