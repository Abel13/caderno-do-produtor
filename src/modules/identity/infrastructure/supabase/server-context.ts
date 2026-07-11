import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdentityRepository } from "./identity-repository";

export async function getIdentityRepository() {
  return new IdentityRepository(await createClient());
}

export async function requireUser() {
  const repository = await getIdentityRepository();
  const user = await repository.getAuthenticatedUser();
  if (!user) redirect("/");
  return { repository, user };
}

export async function requireIdentityContext() {
  const { repository, user } = await requireUser();
  let context = await repository.getContext();
  if (!context?.memberships.length) {
    await repository.acceptPendingInvitations();
    context = await repository.getContext();
  }
  if (!context || context.memberships.length === 0) redirect("/onboarding");
  return { repository, user, context };
}
