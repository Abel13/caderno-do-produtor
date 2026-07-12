"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { operationCreateSchema, operationUpdateSchema } from "../domain/schemas";
import { OperationsRepository } from "../infrastructure/supabase/operations-repository";
import { operationErrorState } from "./action-errors";
import type { OperationsActionState } from "./action-state";

const repository = async () => new OperationsRepository(await createClient());

function valuesOf(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].map((entry) => [String(entry[0]), typeof entry[1] === "string" ? entry[1] : ""]).filter(Boolean),
  ) as Record<string, string>;
}

export async function createOperationAction(_: OperationsActionState, formData: FormData): Promise<OperationsActionState> {
  try {
    const input = operationCreateSchema.parse({
      propertyId: formData.get("propertyId"),
      recordType: formData.get("recordType"),
      occurredAt: formData.get("occurredAt"),
      plotId: formData.get("plotId"),
      plantingId: formData.get("plantingId"),
      seasonId: formData.get("seasonId"),
      status: formData.get("status"),
      payload: {
        value: formData.get("payloadValue"),
        value_unit: formData.get("payloadUnit"),
        comment: formData.get("payloadComment"),
      },
      notes: formData.get("notes"),
      origin: formData.get("origin"),
      responsibleUserId: formData.get("responsibleUserId"),
      clientId: formData.get("clientId"),
    });

    await (await repository()).createRecord({ ...input, clientId: input.clientId ?? crypto.randomUUID() });
    revalidatePath("/operations");
    return { status: "success", message: "Registro operacional criado com sucesso." };
  } catch (error) {
    return {
      ...operationErrorState(error),
      values: valuesOf(formData),
    };
  }
}

export async function updateOperationAction(_: OperationsActionState, formData: FormData): Promise<OperationsActionState> {
  try {
    const input = operationUpdateSchema.parse({
      recordId: formData.get("recordId"),
      recordType: formData.get("recordType"),
      occurredAt: formData.get("occurredAt"),
      plotId: formData.get("plotId"),
      plantingId: formData.get("plantingId"),
      seasonId: formData.get("seasonId"),
      status: formData.get("status"),
      payload: {
        value: formData.get("payloadValue"),
        value_unit: formData.get("payloadUnit"),
        comment: formData.get("payloadComment"),
      },
      notes: formData.get("notes"),
      responsibleUserId: formData.get("responsibleUserId"),
    });

    await (await repository()).updateRecord(input.recordId, input);
    revalidatePath("/operations");
    return { status: "success", message: "Registro operacional atualizado com sucesso." };
  } catch (error) {
    return {
      ...operationErrorState(error),
      values: valuesOf(formData),
    };
  }
}

export async function deleteOperationAction(_: OperationsActionState, formData: FormData): Promise<OperationsActionState> {
  try {
    const recordId = String(formData.get("recordId") ?? "");
    await (await repository()).deleteRecord(recordId);
    revalidatePath("/operations");
    return { status: "success", message: "Registro removido. Ele continua no histórico e pode ser restaurado." };
  } catch (error) {
    return operationErrorState(error);
  }
}

export async function restoreOperationAction(_: OperationsActionState, formData: FormData): Promise<OperationsActionState> {
  try {
    const recordId = String(formData.get("recordId") ?? "");
    const notes = String(formData.get("notes") ?? "");
    await (await repository()).restoreRecord(recordId, notes || null);
    revalidatePath("/operations");
    return { status: "success", message: "Registro restaurado." };
  } catch (error) {
    return operationErrorState(error);
  }
}

export async function changeOperationStatusAction(
  _: OperationsActionState,
  formData: FormData,
): Promise<OperationsActionState> {
  try {
    const recordId = String(formData.get("recordId") ?? "");
    const targetStatus = String(formData.get("status") ?? "");
    const notes = String(formData.get("notes") ?? "");
    await (await repository()).changeStatus(recordId, targetStatus as "draft" | "confirmed" | "cancelled" | "review_required", notes || null);
    revalidatePath("/operations");
    return { status: "success", message: "Situação alterada." };
  } catch (error) {
    return operationErrorState(error);
  }
}
