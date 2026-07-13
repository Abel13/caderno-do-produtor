import { z } from "zod";

const optionalUuid = z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable());
const optionalText = z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().trim().max(500).nullable());
const decimal = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(String(value).replace(",", "."))),
  z.number({ message: "Informe um número válido." }),
);
const optionalDecimal = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(String(value).replace(",", "."))),
  z.number({ message: "Informe um número válido." }).nullable(),
);

export const measurementPointSchema = z.object({
  propertyId: z.string().uuid("Selecione a propriedade."),
  name: z.string().trim().min(1, "Informe o nome do pluviômetro ou local.").max(80, "Use até 80 caracteres."),
  description: optionalText,
});

const baseClimateSchema = z
  .object({
    propertyId: z.string().uuid("Selecione a propriedade."),
    readingId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
    measurementPointId: optionalUuid,
    plotId: optionalUuid,
    seasonId: optionalUuid,
    rainfallMm: decimal.refine((value) => value >= 0, "O volume de chuva não pode ser negativo."),
    notes: optionalText,
    status: z.enum(["draft", "confirmed", "cancelled", "review_required"]).default("confirmed"),
    clientId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable().optional()),
  })
  .superRefine((value, ctx) => {
    const occurred = new Date(`${value.occurredOn}T00:00:00.000Z`);
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (occurred > tomorrow) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["occurredOn"], message: "A data não pode ser futura." });
    }
  });

export const rainfallSchema = baseClimateSchema;

export const dailyWeatherSchema = baseClimateSchema
  .extend({
    temperatureMinC: optionalDecimal,
    temperatureAvgC: optionalDecimal,
    temperatureMaxC: optionalDecimal,
    relativeHumidityPct: optionalDecimal.refine((value) => value === null || (value >= 0 && value <= 100), "A umidade deve estar entre 0 e 100%."),
    harmfulOccurrences: optionalText,
  })
  .superRefine((value, ctx) => {
    if (value.temperatureMinC !== null && value.temperatureMaxC !== null && value.temperatureMinC > value.temperatureMaxC) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["temperatureMinC"], message: "A mínima não pode ser maior que a máxima." });
    }
    if (value.temperatureAvgC !== null && value.temperatureMinC !== null && value.temperatureAvgC < value.temperatureMinC) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["temperatureAvgC"], message: "A média não pode ser menor que a mínima." });
    }
    if (value.temperatureAvgC !== null && value.temperatureMaxC !== null && value.temperatureAvgC > value.temperatureMaxC) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["temperatureAvgC"], message: "A média não pode ser maior que a máxima." });
    }
  });

export const climateFilterSchema = z.object({
  propertyId: z.string().uuid(),
  controlType: z.enum(["rainfall", "daily_weather"]),
  measurementPointId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  seasonId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  plotId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  from: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  to: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  showDeleted: z.preprocess((value) => value === "1" || value === true, z.boolean()),
});

export type MeasurementPointInput = z.infer<typeof measurementPointSchema>;
export type RainfallInput = z.infer<typeof rainfallSchema>;
export type DailyWeatherInput = z.infer<typeof dailyWeatherSchema>;
export type ClimateFilterInput = z.infer<typeof climateFilterSchema>;
