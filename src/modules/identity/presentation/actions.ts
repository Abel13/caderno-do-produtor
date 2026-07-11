"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { completeProducerOnboarding, createAccountInvitation, revokeAccountInvitation, revokeMembership, setActiveProperty } from "../application/use-cases";
import { invitationSchema, onboardingSchema } from "../domain/schemas";
import { getIdentityRepository, requireIdentityContext, requireUser } from "../infrastructure/supabase/server-context";
import type { ActionState } from "./action-state";

function errorState(error: unknown): ActionState {
  if (error instanceof ZodError) return { status: "error", message: "Revise os campos destacados.", fieldErrors: error.flatten().fieldErrors };
  return { status: "error", message: "Não foi possível concluir a operação. Tente novamente." };
}

export async function completeOnboardingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { repository } = await requireUser();
    const input = onboardingSchema.parse({
      accountName: formData.get("accountName"), propertyName: formData.get("propertyName"), city: formData.get("city"),
      state: formData.get("state"), totalAreaHa: formData.get("totalAreaHa")
    });
    await completeProducerOnboarding(repository, input);
  } catch (error) { return errorState(error); }
  redirect("/dashboard");
}

export async function setActivePropertyAction(formData: FormData) {
  const propertyId = String(formData.get("propertyId") ?? "");
  const repository = await getIdentityRepository();
  await setActiveProperty(repository, propertyId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createInvitationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { repository, context } = await requireIdentityContext();
    const accountId = String(formData.get("accountId") ?? "");
    if (!context.memberships.some((membership) => membership.account_id === accountId && ["owner", "manager"].includes(membership.role))) {
      return { status: "error", message: "Você não possui permissão para administrar esta conta." };
    }
    const input = invitationSchema.parse({
      accountId, email: formData.get("email"), role: formData.get("role"), propertyIds: formData.getAll("propertyIds")
    });
    await createAccountInvitation(repository, input);
    revalidatePath("/settings/access");
    return { status: "success", message: "Convite pendente criado. Avise o usuário para entrar com esse e-mail Google." };
  } catch (error) { return errorState(error); }
}

export async function revokeInvitationAction(formData: FormData) {
  const repository = await getIdentityRepository();
  await revokeAccountInvitation(repository, String(formData.get("invitationId") ?? ""));
  revalidatePath("/settings/access");
}

export async function updateInvitationAction(formData: FormData) {
  const repository = await getIdentityRepository();
  const invitationId = String(formData.get("invitationId") ?? "");
  const input = invitationSchema.parse({
    accountId: formData.get("accountId"), email: formData.get("email"), role: formData.get("role"), propertyIds: formData.getAll("propertyIds")
  });
  await repository.updateInvitation(invitationId, input);
  revalidatePath("/settings/access");
}

export async function revokeMembershipAction(formData: FormData) {
  const repository = await getIdentityRepository();
  await revokeMembership(repository, String(formData.get("membershipId") ?? ""));
  revalidatePath("/settings/access");
}
