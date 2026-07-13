"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { dailyWeatherSchema, measurementPointSchema, rainfallSchema } from "../domain/schemas";
import { ClimateWaterRepository } from "../infrastructure/supabase/climate-water-repository";
import { climateErrorState } from "./action-errors";
import type { ClimateActionState } from "./action-state";

const repository = async () => new ClimateWaterRepository(await createClient());

function valuesOf(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].map((entry) => [String(entry[0]), typeof entry[1] === "string" ? entry[1] : ""]).filter(Boolean),
  ) as Record<string, string>;
}

function revalidateClimate() {
  revalidatePath("/climate");
  revalidatePath("/climate/rainfall");
  revalidatePath("/climate/daily-weather");
  revalidatePath("/dashboard");
  revalidatePath("/operations");
}

export async function createMeasurementPointAction(_: ClimateActionState, formData: FormData): Promise<ClimateActionState> {
  try {
    const input = measurementPointSchema.parse({
      propertyId: formData.get("propertyId"),
      name: formData.get("name"),
      description: formData.get("description"),
    });
    await (await repository()).createMeasurementPoint(input);
    revalidateClimate();
    return { status: "success", message: "Pluviômetro ou local cadastrado com sucesso." };
  } catch (error) {
    return { ...climateErrorState(error), values: valuesOf(formData) };
  }
}

export async function createRainfallAction(_: ClimateActionState, formData: FormData): Promise<ClimateActionState> {
  try {
    const input = rainfallSchema.parse(readBaseForm(formData));
    await (await repository()).createRainfall(input);
    revalidateClimate();
    return { status: "success", message: "Chuva registrada com sucesso." };
  } catch (error) {
    return { ...climateErrorState(error), values: valuesOf(formData) };
  }
}

export async function updateRainfallAction(_: ClimateActionState, formData: FormData): Promise<ClimateActionState> {
  try {
    const input = rainfallSchema.parse(readBaseForm(formData));
    await (await repository()).updateReading(input);
    revalidateClimate();
    return { status: "success", message: "Registro de chuva atualizado." };
  } catch (error) {
    return { ...climateErrorState(error), values: valuesOf(formData) };
  }
}

export async function createDailyWeatherAction(_: ClimateActionState, formData: FormData): Promise<ClimateActionState> {
  try {
    const input = dailyWeatherSchema.parse(readDailyWeatherForm(formData));
    await (await repository()).createDailyWeather(input);
    revalidateClimate();
    return { status: "success", message: "Clima diário registrado com sucesso." };
  } catch (error) {
    return { ...climateErrorState(error), values: valuesOf(formData) };
  }
}

export async function updateDailyWeatherAction(_: ClimateActionState, formData: FormData): Promise<ClimateActionState> {
  try {
    const input = dailyWeatherSchema.parse(readDailyWeatherForm(formData));
    await (await repository()).updateReading(input);
    revalidateClimate();
    return { status: "success", message: "Registro climático atualizado." };
  } catch (error) {
    return { ...climateErrorState(error), values: valuesOf(formData) };
  }
}

export async function deleteClimateReadingAction(_: ClimateActionState, formData: FormData): Promise<ClimateActionState> {
  try {
    await (await repository()).deleteReading(String(formData.get("readingId") ?? ""));
    revalidateClimate();
    return { status: "success", message: "Registro apagado logicamente. Ele permanece no histórico." };
  } catch (error) {
    return climateErrorState(error);
  }
}

export async function restoreClimateReadingAction(_: ClimateActionState, formData: FormData): Promise<ClimateActionState> {
  try {
    await (await repository()).restoreReading(String(formData.get("readingId") ?? ""));
    revalidateClimate();
    return { status: "success", message: "Registro restaurado." };
  } catch (error) {
    return climateErrorState(error);
  }
}

function readBaseForm(formData: FormData) {
  return {
    propertyId: formData.get("propertyId"),
    readingId: formData.get("readingId"),
    occurredOn: formData.get("occurredOn"),
    measurementPointId: formData.get("measurementPointId"),
    plotId: formData.get("plotId"),
    seasonId: formData.get("seasonId"),
    rainfallMm: formData.get("rainfallMm"),
    notes: formData.get("notes"),
    status: formData.get("status"),
    clientId: formData.get("clientId"),
  };
}

function readDailyWeatherForm(formData: FormData) {
  return {
    ...readBaseForm(formData),
    temperatureMinC: formData.get("temperatureMinC"),
    temperatureAvgC: formData.get("temperatureAvgC"),
    temperatureMaxC: formData.get("temperatureMaxC"),
    relativeHumidityPct: formData.get("relativeHumidityPct"),
    harmfulOccurrences: formData.get("harmfulOccurrences"),
  };
}
