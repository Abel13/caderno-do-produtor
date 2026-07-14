"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { soilAnalysisSchema, soilCorrectionSchema, soilFertilizationSchema } from "../domain/schemas";
import { SoilNutritionRepository } from "../infrastructure/supabase/soil-nutrition-repository";
import { soilErrorState } from "./action-errors";
import type { SoilActionState } from "./action-state";

const repository = async () => new SoilNutritionRepository(await createClient());

function valuesOf(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()]
      .filter((entry) => typeof entry[1] === "string")
      .map((entry) => [String(entry[0]), String(entry[1])])
      .filter(Boolean),
  ) as Record<string, string>;
}

function revalidateSoil() {
  revalidatePath("/soil");
  revalidatePath("/soil/analyses");
  revalidatePath("/soil/corrections");
  revalidatePath("/soil/soil-fertilizations");
  revalidatePath("/dashboard");
  revalidatePath("/operations");
}

export async function createSoilFertilizationAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    const input = soilFertilizationSchema.parse(readSoilFertilizationForm(formData));
    await (await repository()).createFertilization(input);
    revalidateSoil();
    return { status: "success", message: "Adubação via solo registrada com sucesso." };
  } catch (error) {
    return { ...soilErrorState(error), values: valuesOf(formData) };
  }
}

export async function updateSoilFertilizationAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    const input = soilFertilizationSchema.parse(readSoilFertilizationForm(formData));
    await (await repository()).updateFertilization(input);
    revalidateSoil();
    return { status: "success", message: "Adubação via solo atualizada." };
  } catch (error) {
    return { ...soilErrorState(error), values: valuesOf(formData) };
  }
}

export async function deleteSoilFertilizationAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    await (await repository()).deleteFertilization(String(formData.get("fertilizationId") ?? ""));
    revalidateSoil();
    return { status: "success", message: "Adubação apagada logicamente. Ela permanece no histórico." };
  } catch (error) {
    return soilErrorState(error);
  }
}

export async function restoreSoilFertilizationAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    await (await repository()).restoreFertilization(String(formData.get("fertilizationId") ?? ""));
    revalidateSoil();
    return { status: "success", message: "Adubação restaurada." };
  } catch (error) {
    return soilErrorState(error);
  }
}

export async function createSoilCorrectionAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    const input = soilCorrectionSchema.parse(readSoilCorrectionForm(formData));
    await (await repository()).createCorrection(input);
    revalidateSoil();
    return { status: "success", message: "Correção do solo registrada com sucesso." };
  } catch (error) {
    return { ...soilErrorState(error), values: valuesOf(formData) };
  }
}

export async function updateSoilCorrectionAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    const input = soilCorrectionSchema.parse(readSoilCorrectionForm(formData));
    await (await repository()).updateCorrection(input);
    revalidateSoil();
    return { status: "success", message: "Correção do solo atualizada." };
  } catch (error) {
    return { ...soilErrorState(error), values: valuesOf(formData) };
  }
}

export async function deleteSoilCorrectionAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    await (await repository()).deleteCorrection(String(formData.get("correctionId") ?? ""));
    revalidateSoil();
    return { status: "success", message: "Correção apagada logicamente. Ela permanece no histórico." };
  } catch (error) {
    return soilErrorState(error);
  }
}

export async function restoreSoilCorrectionAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    await (await repository()).restoreCorrection(String(formData.get("correctionId") ?? ""));
    revalidateSoil();
    return { status: "success", message: "Correção restaurada." };
  } catch (error) {
    return soilErrorState(error);
  }
}

export async function createSoilAnalysisAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    const input = soilAnalysisSchema.parse(readSoilAnalysisForm(formData));
    const analysisId = await (await repository()).createAnalysis(input);
    const report = formData.get("reportFile");
    if (report instanceof File && report.size > 0) {
      validateReportFile(report);
      await (await repository()).uploadReport(analysisId, report);
    }
    revalidateSoil();
    return { status: "success", message: "Análise de solo registrada com sucesso." };
  } catch (error) {
    return { ...soilErrorState(error), values: valuesOf(formData) };
  }
}

export async function updateSoilAnalysisAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    const input = soilAnalysisSchema.parse(readSoilAnalysisForm(formData));
    await (await repository()).updateAnalysis(input);
    const report = formData.get("reportFile");
    if (input.analysisId && report instanceof File && report.size > 0) {
      validateReportFile(report);
      await (await repository()).uploadReport(input.analysisId, report);
    }
    revalidateSoil();
    return { status: "success", message: "Análise de solo atualizada." };
  } catch (error) {
    return { ...soilErrorState(error), values: valuesOf(formData) };
  }
}

export async function deleteSoilAnalysisAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    await (await repository()).deleteAnalysis(String(formData.get("analysisId") ?? ""));
    revalidateSoil();
    return { status: "success", message: "Análise apagada logicamente. Ela permanece no histórico." };
  } catch (error) {
    return soilErrorState(error);
  }
}

export async function restoreSoilAnalysisAction(_: SoilActionState, formData: FormData): Promise<SoilActionState> {
  try {
    await (await repository()).restoreAnalysis(String(formData.get("analysisId") ?? ""));
    revalidateSoil();
    return { status: "success", message: "Análise restaurada." };
  } catch (error) {
    return soilErrorState(error);
  }
}

function validateReportFile(file: File) {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/heic"];
  if (!allowed.includes(file.type)) throw new Error("soil_analysis_invalid_parameter");
  if (file.size > 26_214_400) throw new Error("soil_analysis_invalid_parameter");
}

function readSoilAnalysisForm(formData: FormData) {
  return {
    propertyId: formData.get("propertyId"),
    analysisId: formData.get("analysisId"),
    plotId: formData.get("plotId"),
    plantingId: formData.get("plantingId"),
    seasonId: formData.get("seasonId"),
    collectedOn: formData.get("collectedOn"),
    depthCm: formData.get("depthCm"),
    laboratoryName: formData.get("laboratoryName"),
    reportNumber: formData.get("reportNumber"),
    notes: formData.get("notes"),
    importStatus: formData.get("importStatus"),
    clientId: formData.get("clientId"),
    phWater: formData.get("phWater"),
    phCacl2: formData.get("phCacl2"),
    phKcl: formData.get("phKcl"),
    pMgDm3: formData.get("pMgDm3"),
    kMgDm3: formData.get("kMgDm3"),
    caCmolcDm3: formData.get("caCmolcDm3"),
    mgCmolcDm3: formData.get("mgCmolcDm3"),
    alCmolcDm3: formData.get("alCmolcDm3"),
    hAlCmolcDm3: formData.get("hAlCmolcDm3"),
    cOrgPct: formData.get("cOrgPct"),
    sbCmolcDm3: formData.get("sbCmolcDm3"),
    effectiveCtcCmolcDm3: formData.get("effectiveCtcCmolcDm3"),
    ctcPh7CmolcDm3: formData.get("ctcPh7CmolcDm3"),
    baseSaturationPct: formData.get("baseSaturationPct"),
    aluminumSaturationPct: formData.get("aluminumSaturationPct"),
    organicMatterDagKg: formData.get("organicMatterDagKg"),
    bMgDm3: formData.get("bMgDm3"),
    znMgDm3: formData.get("znMgDm3"),
    cuMgDm3: formData.get("cuMgDm3"),
    feMgDm3: formData.get("feMgDm3"),
    mnMgDm3: formData.get("mnMgDm3"),
    sMgDm3: formData.get("sMgDm3"),
    pRemMgL: formData.get("pRemMgL"),
    sandPct: formData.get("sandPct"),
    siltPct: formData.get("siltPct"),
    clayPct: formData.get("clayPct"),
  };
}

function readSoilCorrectionForm(formData: FormData) {
  return {
    propertyId: formData.get("propertyId"),
    correctionId: formData.get("correctionId"),
    plotId: formData.get("plotId"),
    plantingId: formData.get("plantingId"),
    seasonId: formData.get("seasonId"),
    soilAnalysisId: formData.get("soilAnalysisId"),
    appliedOn: formData.get("appliedOn"),
    correctiveName: formData.get("correctiveName"),
    prntPct: formData.get("prntPct"),
    recommendedDoseTHa: formData.get("recommendedDoseTHa"),
    totalQuantityT: formData.get("totalQuantityT"),
    laborType: formData.get("laborType"),
    laborQuantity: formData.get("laborQuantity"),
    fuelL: formData.get("fuelL"),
    responsibleName: formData.get("responsibleName"),
    notes: formData.get("notes"),
    clientId: formData.get("clientId"),
  };
}

function readSoilFertilizationForm(formData: FormData) {
  return {
    propertyId: formData.get("propertyId"),
    fertilizationId: formData.get("fertilizationId"),
    plotId: formData.get("plotId"),
    plantingId: formData.get("plantingId"),
    seasonId: formData.get("seasonId"),
    soilAnalysisId: formData.get("soilAnalysisId"),
    appliedOn: formData.get("appliedOn"),
    fertilizerName: formData.get("fertilizerName"),
    doseKgHa: formData.get("doseKgHa"),
    totalQuantityKg: formData.get("totalQuantityKg"),
    coverageLabel: formData.get("coverageLabel"),
    laborType: formData.get("laborType"),
    laborQuantity: formData.get("laborQuantity"),
    fuelL: formData.get("fuelL"),
    responsibleName: formData.get("responsibleName"),
    notes: formData.get("notes"),
    clientId: formData.get("clientId"),
  };
}
