import { invitationSchema, onboardingSchema, type InvitationInput, type OnboardingInput } from "../domain/schemas";
import type { IdentityRepository } from "../infrastructure/supabase/identity-repository";

export async function completeProducerOnboarding(repository: IdentityRepository, input: OnboardingInput) {
  return repository.completeOnboarding(onboardingSchema.parse(input));
}

export async function createAccountInvitation(repository: IdentityRepository, input: InvitationInput) {
  return repository.createInvitation(invitationSchema.parse(input));
}

export async function acceptPendingInvitations(repository: IdentityRepository) {
  return repository.acceptPendingInvitations();
}

export async function setActiveProperty(repository: IdentityRepository, propertyId: string) {
  return repository.setActiveProperty(propertyId);
}

export async function revokeAccountInvitation(repository: IdentityRepository, invitationId: string) {
  return repository.revokeInvitation(invitationId);
}

export async function revokeMembership(repository: IdentityRepository, membershipId: string) {
  return repository.revokeMembership(membershipId);
}
