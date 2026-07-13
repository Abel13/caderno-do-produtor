import { z } from "zod";

const optionalDecimal = z.preprocess(
  (value) => (value === "" || value == null || typeof value === "undefined" ? null : Number(String(value).replace(",", "."))),
  z.number().nonnegative().nullable(),
);

export const operationPayloadSchema = z.object({
  value: optionalDecimal,
  value_unit: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().trim().max(40).nullable()),
  comment: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().trim().max(500).nullable()),
});

export const operationCreateSchema = z
  .object({
    propertyId: z.string().uuid("Selecione a propriedade."),
    recordType: z.string().trim().min(1, "Informe o tipo de registro."),
    occurredAt: z.coerce.date(),
    plotId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable()),
    plantingId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable()),
    seasonId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable()),
    status: z.enum(["draft", "confirmed", "cancelled", "review_required"]).default("draft"),
    payload: operationPayloadSchema,
    notes: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().trim().max(500).nullable()),
    origin: z
      .preprocess((value) => (value === "" || value == null ? "manual" : value), z.string())
      .pipe(z.enum(["manual", "pdf", "import", "integration", "system"])),
    responsibleUserId: z
      .preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable())
      .optional(),
    clientId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable().optional()),
  })
  .superRefine((value, ctx) => {
    if (!value.occurredAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occurredAt"],
        message: "Escolha uma data e horário de ocorrência.",
      });
    }
    if (value.occurredAt > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["occurredAt"], message: "Data inválida: não pode ser futura." });
    }
  });

export const operationUpdateSchema = z.object({
  recordId: z.string().uuid("Registro inválido."),
  recordType: z.string().trim().min(1, "Informe o tipo de registro.").optional(),
  occurredAt: z
    .preprocess((value) => (value === "" || value == null ? null : new Date(String(value))), z.date({ message: "Informe a data do registro." }).nullable())
    .refine((value) => value !== null, "Informe a data do registro.")
    .transform((value) => value as Date)
    .refine((value) => value <= new Date(Date.now() + 24 * 60 * 60 * 1000), "Data inválida: não pode ser futura."),
  plotId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable()),
  plantingId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable()),
  seasonId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable()),
  status: z.enum(["draft", "confirmed", "cancelled", "review_required"]).default("draft"),
  payload: operationPayloadSchema,
  notes: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().trim().max(500).nullable()),
  responsibleUserId: z.preprocess((value) => (value === "" || value == null ? null : String(value)), z.string().uuid().nullable()),
});

export const operationFilterSchema = z.object({
  propertyId: z.string().uuid(),
  recordType: z.string().optional(),
  seasonId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  plotId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  status: z
    .preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.enum(["draft", "confirmed", "cancelled", "review_required"]).optional()),
  responsibleUserId: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().uuid().optional()),
  from: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  to: z.preprocess((value) => (value === "" || value == null ? undefined : String(value)), z.string().max(10).optional()),
  limit: z.preprocess((value) => {
    if (value === "" || value == null || typeof value === "undefined") return 20;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 20;
    return Math.max(5, Math.min(50, Math.trunc(parsed)));
  }, z.number().int()),
  page: z.preprocess((value) => {
    if (value === "" || value == null || typeof value === "undefined") return 1;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.trunc(parsed));
  }, z.number().int()),
  showDeleted: z.preprocess((value) => value === "1", z.boolean()),
});

export type OperationCreateInput = z.infer<typeof operationCreateSchema>;
export type OperationUpdateInput = z.infer<typeof operationUpdateSchema>;
export type OperationalListFilterInput = z.infer<typeof operationFilterSchema>;
