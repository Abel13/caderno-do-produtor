"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { productionRecordSchema } from "../domain/schemas";
import { ProductionRepository } from "../infrastructure/supabase/production-repository";
import { productionErrorState } from "./action-errors";
import type { ProductionActionState } from "./action-state";

const repository = async () => new ProductionRepository(await createClient());

function valuesOf(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].map((entry) => [String(entry[0]), typeof entry[1] === "string" ? entry[1] : ""]).filter(Boolean),
  ) as Record<string, string>;
}

function revalidateProduction() {
  revalidatePath("/production");
  revalidatePath("/dashboard");
  revalidatePath("/operations");
}

export async function createProductionRecordAction(_: ProductionActionState, formData: FormData): Promise<ProductionActionState> {
  try {
    const input = productionRecordSchema.parse(readProductionForm(formData));
    await (await repository()).createRecord(input);
    revalidateProduction();
    return { status: "success", message: "Produção registrada com sucesso." };
  } catch (error) {
    return { ...productionErrorState(error), values: valuesOf(formData) };
  }
}

export async function updateProductionRecordAction(_: ProductionActionState, formData: FormData): Promise<ProductionActionState> {
  try {
    const input = productionRecordSchema.parse(readProductionForm(formData));
    await (await repository()).updateRecord(input);
    revalidateProduction();
    return { status: "success", message: "Registro de produção atualizado." };
  } catch (error) {
    return { ...productionErrorState(error), values: valuesOf(formData) };
  }
}

export async function deleteProductionRecordAction(_: ProductionActionState, formData: FormData): Promise<ProductionActionState> {
  try {
    await (await repository()).deleteRecord(String(formData.get("productionId") ?? ""));
    revalidateProduction();
    return { status: "success", message: "Registro de produção apagado logicamente. Ele permanece no histórico." };
  } catch (error) {
    return productionErrorState(error);
  }
}

export async function restoreProductionRecordAction(_: ProductionActionState, formData: FormData): Promise<ProductionActionState> {
  try {
    await (await repository()).restoreRecord(String(formData.get("productionId") ?? ""));
    revalidateProduction();
    return { status: "success", message: "Registro de produção restaurado." };
  } catch (error) {
    return productionErrorState(error);
  }
}

function readProductionForm(formData: FormData) {
  return {
    propertyId: formData.get("propertyId"),
    productionId: formData.get("productionId"),
    plotId: formData.get("plotId"),
    plantingId: formData.get("plantingId"),
    seasonId: formData.get("seasonId"),
    harvestedOn: formData.get("harvestedOn"),
    areaHa: formData.get("areaHa"),
    productivityScHa: formData.get("productivityScHa"),
    totalSc: formData.get("totalSc"),
    lotCode: formData.get("lotCode"),
    processingMethod: formData.get("processingMethod"),
    beverageClassification: formData.get("beverageClassification"),
    coffeeType: formData.get("coffeeType"),
    pickingPercentage: formData.get("pickingPercentage"),
    notes: formData.get("notes"),
    clientId: formData.get("clientId"),
  };
}
