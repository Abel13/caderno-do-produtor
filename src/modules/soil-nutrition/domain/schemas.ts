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

export type SoilAnalysisInput = z.infer<typeof soilAnalysisSchema>;
export type SoilAnalysisFilterInput = z.infer<typeof soilAnalysisFilterSchema>;
