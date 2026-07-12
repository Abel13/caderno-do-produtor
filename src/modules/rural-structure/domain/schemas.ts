import { z } from "zod";
const decimal = z.preprocess((v) => Number(String(v).replace(",", ".")), z.number().positive());
export const plotSchema=z.object({propertyId:z.string().uuid(),name:z.string().trim().min(1).max(80),areaHa:decimal,status:z.enum(["active","forming","inactive","closed"])});
export const plantingSchema=z.object({plotId:z.string().uuid(),cultivarId:z.preprocess(v=>v===""?null:v,z.string().uuid().nullable()),areaHa:decimal,plantedYear:z.preprocess(v=>v===""?null:Number(v),z.number().int().min(1900).max(2200).nullable()),status:z.enum(["forming","productive","renewing"])});
export const seasonSchema=z.object({propertyId:z.string().uuid(),name:z.string().trim().min(2).max(80),startsOn:z.coerce.date(),endsOn:z.coerce.date(),status:z.enum(["planning","open"])}).refine(v=>v.endsOn>v.startsOn,{path:["endsOn"],message:"A data final deve ser posterior à inicial."});
export type PlotInput=z.infer<typeof plotSchema>; export type PlantingInput=z.infer<typeof plantingSchema>; export type SeasonInput=z.infer<typeof seasonSchema>;
