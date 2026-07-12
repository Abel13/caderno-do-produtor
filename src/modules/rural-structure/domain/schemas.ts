import { z } from "zod";

const decimal = z.preprocess((value) => Number(String(value).replace(",", ".")), z.number().positive());

export const plotSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  areaHa: decimal,
  status: z.enum(["active", "forming", "inactive", "closed"]),
});

export const plantingSchema = z.object({
  plotId: z.string().uuid(),
  cultivarId: z.preprocess((value) => (value === "" ? null : value), z.string().uuid().nullable()),
  areaHa: decimal,
  plantedYear: z.preprocess((value) => (value === "" ? null : Number(value)), z.number().int().min(1900).max(2200).nullable()),
  status: z.enum(["forming", "productive", "renewing"]),
});

export const seasonSchema = z
  .object({
    propertyId: z.string().uuid(),
    name: z.string().trim().min(2).max(80),
    startsOn: z.coerce.date(),
    endsOn: z.coerce.date(),
    status: z.enum(["planning", "open"]),
  })
  .refine((value) => value.endsOn > value.startsOn, { path: ["endsOn"], message: "A data final deve ser posterior à inicial." });

export const seasonStatusSchema = z.object({
  seasonId: z.string().uuid(),
  status: z.enum(["planning", "open", "closed"]),
  reopenReason: z.preprocess((value) => (value === "" ? null : value), z.string().trim().max(500).nullable()),
});

export type PlotInput = z.infer<typeof plotSchema>;
export type PlantingInput = z.infer<typeof plantingSchema>;
export type SeasonInput = z.infer<typeof seasonSchema>;
export type SeasonStatusInput = z.infer<typeof seasonStatusSchema>;
