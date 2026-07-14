import { z } from "zod";

const optionalUuid = z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable());
const optionalShortText = z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().trim().max(120).nullable());
const optionalText = z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().trim().max(500).nullable());
const optionalDecimal = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(String(value).replace(",", "."))),
  z.number({ message: "Informe um número válido." }).nullable(),
);

const ph = optionalDecimal.refine((value) => value === null || (value >= 0 && value <= 14), "O pH deve estar entre 0 e 14.");
const nonNegative = optionalDecimal.refine((value) => value === null || value >= 0, "O valor não pode ser negativo.");
const percentage = optionalDecimal.refine((value) => value === null || (value >= 0 && value <= 100), "Informe percentual entre 0 e 100.");
const prnt = optionalDecimal.refine((value) => value === null || (value > 0 && value <= 200), "O PRNT deve ser maior que zero e no máximo 200%.");

export const soilAnalysisSchema = z
  .object({
    propertyId: z.string().uuid("Selecione a propriedade."),
    analysisId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
    plotId: z.string().uuid("Selecione o talhão."),
    plantingId: optionalUuid,
    seasonId: optionalUuid,
    collectedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da coleta."),
    depthCm: z.string().trim().min(1, "Informe a profundidade.").max(40, "Use até 40 caracteres."),
    laboratoryName: optionalShortText,
    reportNumber: optionalShortText,
    notes: optionalText,
    importStatus: z.enum(["manual", "awaiting_import", "review_required", "confirmed"]).default("manual"),
    clientId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable().optional()),
    phWater: ph,
    phCacl2: ph,
    phKcl: ph,
    pMgDm3: nonNegative,
    kMgDm3: nonNegative,
    caCmolcDm3: nonNegative,
    mgCmolcDm3: nonNegative,
    alCmolcDm3: nonNegative,
    hAlCmolcDm3: nonNegative,
    cOrgPct: nonNegative,
    sbCmolcDm3: nonNegative,
    effectiveCtcCmolcDm3: nonNegative,
    ctcPh7CmolcDm3: nonNegative,
    baseSaturationPct: percentage,
    aluminumSaturationPct: percentage,
    organicMatterDagKg: nonNegative,
    bMgDm3: nonNegative,
    znMgDm3: nonNegative,
    cuMgDm3: nonNegative,
    feMgDm3: nonNegative,
    mnMgDm3: nonNegative,
    sMgDm3: nonNegative,
    pRemMgL: nonNegative,
    sandPct: percentage,
    siltPct: percentage,
    clayPct: percentage,
  })
  .superRefine((value, ctx) => {
    const collected = new Date(`${value.collectedOn}T00:00:00.000Z`);
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (collected > tomorrow) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["collectedOn"], message: "A data da coleta não pode ser futura." });
    }
  });

export const soilAnalysisFilterSchema = z.object({
  propertyId: z.string().uuid(),
  plotId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  plantingId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  seasonId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  from: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  to: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  showDeleted: z.preprocess((value) => value === "1" || value === true, z.boolean()),
});

export const soilCorrectionSchema = z
  .object({
    propertyId: z.string().uuid("Selecione a propriedade."),
    correctionId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
    plotId: z.string().uuid("Selecione o talhão."),
    plantingId: optionalUuid,
    seasonId: optionalUuid,
    soilAnalysisId: optionalUuid,
    appliedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de aplicação."),
    correctiveName: z.string().trim().min(1, "Informe o corretivo utilizado.").max(120, "Use até 120 caracteres."),
    prntPct: prnt,
    recommendedDoseTHa: nonNegative,
    totalQuantityT: nonNegative.refine((value) => value !== null, "Informe a quantidade total."),
    laborType: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.enum(["hh", "hm"]).nullable()),
    laborQuantity: nonNegative,
    fuelL: nonNegative,
    responsibleName: optionalShortText,
    notes: optionalText,
    clientId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable().optional()),
  })
  .superRefine((value, ctx) => {
    const applied = new Date(`${value.appliedOn}T00:00:00.000Z`);
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (applied > tomorrow) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["appliedOn"], message: "A data de aplicação não pode ser futura." });
    }
    if (value.laborQuantity !== null && value.laborQuantity > 0 && value.laborType === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["laborType"], message: "Informe se a demanda é hh ou hm." });
    }
  });

export const soilCorrectionFilterSchema = z.object({
  propertyId: z.string().uuid(),
  plotId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  plantingId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  seasonId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  soilAnalysisId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  from: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  to: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  showDeleted: z.preprocess((value) => value === "1" || value === true, z.boolean()),
});

export const soilFertilizationSchema = z
  .object({
    propertyId: z.string().uuid("Selecione a propriedade."),
    fertilizationId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
    plotId: z.string().uuid("Selecione o talhão."),
    plantingId: optionalUuid,
    seasonId: optionalUuid,
    soilAnalysisId: optionalUuid,
    appliedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de aplicação."),
    fertilizerName: z.string().trim().min(1, "Informe o nome do insumo.").max(120, "Use até 120 caracteres."),
    doseKgHa: nonNegative,
    totalQuantityKg: nonNegative.refine((value) => value !== null, "Informe a quantidade total."),
    coverageLabel: optionalShortText,
    laborType: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.enum(["hh", "hm"]).nullable()),
    laborQuantity: nonNegative,
    fuelL: nonNegative,
    responsibleName: optionalShortText,
    notes: optionalText,
    clientId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable().optional()),
  })
  .superRefine((value, ctx) => {
    const applied = new Date(`${value.appliedOn}T00:00:00.000Z`);
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (applied > tomorrow) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["appliedOn"], message: "A data de aplicação não pode ser futura." });
    }
    if (value.laborQuantity !== null && value.laborQuantity > 0 && value.laborType === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["laborType"], message: "Informe se a demanda é hh ou hm." });
    }
  });

export const soilFertilizationFilterSchema = z.object({
  propertyId: z.string().uuid(),
  plotId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  plantingId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  seasonId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  soilAnalysisId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  fertilizerName: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().trim().max(120).optional()),
  from: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  to: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  showDeleted: z.preprocess((value) => value === "1" || value === true, z.boolean()),
});

export type SoilAnalysisInput = z.infer<typeof soilAnalysisSchema>;
export type SoilAnalysisFilterInput = z.infer<typeof soilAnalysisFilterSchema>;
export type SoilCorrectionInput = z.infer<typeof soilCorrectionSchema>;
export type SoilCorrectionFilterInput = z.infer<typeof soilCorrectionFilterSchema>;
export type SoilFertilizationInput = z.infer<typeof soilFertilizationSchema>;
export type SoilFertilizationFilterInput = z.infer<typeof soilFertilizationFilterSchema>;
