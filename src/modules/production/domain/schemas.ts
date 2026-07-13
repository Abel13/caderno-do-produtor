import { z } from "zod";

const optionalUuid = z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable());
const optionalText = z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().trim().max(500).nullable());
const optionalShortText = z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().trim().max(120).nullable());
const optionalDecimal = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(String(value).replace(",", "."))),
  z.number({ message: "Informe um número válido." }).nullable(),
);
const requiredDecimal = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(String(value).replace(",", "."))),
  z.number({ message: "Informe um número válido." }).positive("Informe um valor maior que zero."),
);

export const productionRecordSchema = z
  .object({
    propertyId: z.string().uuid("Selecione a propriedade."),
    productionId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
    plotId: z.string().uuid("Selecione o talhão."),
    plantingId: optionalUuid,
    seasonId: z.string().uuid("Selecione a safra."),
    harvestedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da colheita."),
    areaHa: requiredDecimal,
    productivityScHa: optionalDecimal.refine((value) => value === null || value >= 0, "A produtividade não pode ser negativa."),
    totalSc: optionalDecimal.refine((value) => value === null || value >= 0, "A produção total não pode ser negativa."),
    lotCode: optionalShortText,
    processingMethod: optionalShortText,
    beverageClassification: optionalShortText,
    coffeeType: optionalShortText,
    pickingPercentage: optionalDecimal.refine((value) => value === null || (value >= 0 && value <= 100), "A catação deve estar entre 0 e 100%."),
    notes: optionalText,
    clientId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable().optional()),
  })
  .superRefine((value, ctx) => {
    const harvested = new Date(`${value.harvestedOn}T00:00:00.000Z`);
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (harvested > tomorrow) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["harvestedOn"], message: "A data da colheita não pode ser futura." });
    }
    if (value.productivityScHa === null && value.totalSc === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["totalSc"], message: "Informe a produção total ou a produção por hectare." });
    }
  });

export const productionFilterSchema = z.object({
  propertyId: z.string().uuid(),
  plotId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  plantingId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  seasonId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  from: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  to: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  showDeleted: z.preprocess((value) => value === "1" || value === true, z.boolean()),
});

export type ProductionRecordInput = z.infer<typeof productionRecordSchema>;
export type ProductionFilterInput = z.infer<typeof productionFilterSchema>;
