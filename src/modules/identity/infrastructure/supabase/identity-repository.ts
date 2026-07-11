import type { SupabaseClient } from "@supabase/supabase-js";
import type { IdentityContext, AccountInvitation, AccountMember } from "../../domain/types";
import type { InvitationInput, OnboardingInput } from "../../domain/schemas";

type SupabaseErrorShape = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
};

export const accountMemberSelect =
  "id,account_id,user_id,role,status,profile:profiles!account_memberships_user_id_fkey(full_name,avatar_url)";

export function throwSupabaseError(error: unknown): never {
  if (error instanceof Error) throw error;

  const candidate = error as SupabaseErrorShape | null;
  const message = typeof candidate?.message === "string" ? candidate.message : "Unknown Supabase error";
  const code = typeof candidate?.code === "string" ? ` (${candidate.code})` : "";

  throw new Error(`Supabase request failed${code}: ${message}`, { cause: error });
}

export class IdentityRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getAuthenticatedUser() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) throwSupabaseError(error);
    return data.user;
  }

  async getContext(): Promise<IdentityContext | null> {
    const { data, error } = await this.supabase.rpc("get_my_identity_context");
    if (error) throwSupabaseError(error);
    return data as IdentityContext | null;
  }

  async acceptPendingInvitations() {
    const { data, error } = await this.supabase.rpc("accept_pending_invitations");
    if (error) throwSupabaseError(error);
    return data as number;
  }

  async completeOnboarding(input: OnboardingInput) {
    const { data, error } = await this.supabase.rpc("complete_producer_onboarding", {
      account_name: input.accountName,
      property_name: input.propertyName,
      property_city: input.city,
      property_state: input.state,
      property_area_ha: input.totalAreaHa ?? null
    });
    if (error) throwSupabaseError(error);
    return data as { account_id: string; property_id: string };
  }

  async setActiveProperty(propertyId: string) {
    const { error } = await this.supabase.rpc("set_active_property", { target_property_id: propertyId });
    if (error) throwSupabaseError(error);
  }

  async createInvitation(input: InvitationInput) {
    const { error } = await this.supabase.rpc("create_account_invitation", {
      target_account_id: input.accountId,
      target_email: input.email,
      target_role: input.role,
      target_property_ids: input.propertyIds
    });
    if (error) throwSupabaseError(error);
  }

  async revokeInvitation(invitationId: string) {
    const { error } = await this.supabase.rpc("revoke_account_invitation", { target_invitation_id: invitationId });
    if (error) throwSupabaseError(error);
  }

  async updateInvitation(invitationId: string, input: InvitationInput) {
    const { error } = await this.supabase.rpc("update_account_invitation", {
      target_invitation_id: invitationId,
      target_email: input.email,
      target_role: input.role,
      target_property_ids: input.propertyIds
    });
    if (error) throwSupabaseError(error);
  }

  async revokeMembership(membershipId: string) {
    const { error } = await this.supabase.rpc("revoke_membership", { target_membership_id: membershipId });
    if (error) throwSupabaseError(error);
  }

  async listMembers(accountId: string): Promise<AccountMember[]> {
    const { data, error } = await this.supabase
      .from("account_memberships")
      .select(accountMemberSelect)
      .eq("account_id", accountId)
      .eq("status", "active")
      .order("created_at");
    if (error) throwSupabaseError(error);
    return data as unknown as AccountMember[];
  }

  async listInvitations(accountId: string): Promise<AccountInvitation[]> {
    const { data, error } = await this.supabase
      .from("account_invitations")
      .select("id,account_id,email,role,status,created_at,invitation_properties(property_id)")
      .eq("account_id", accountId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throwSupabaseError(error);
    return (data ?? []).map((item) => ({
      id: item.id,
      account_id: item.account_id,
      email: item.email,
      role: item.role,
      status: item.status,
      created_at: item.created_at,
      property_ids: (item.invitation_properties ?? []).map((property: { property_id: string }) => property.property_id)
    })) as AccountInvitation[];
  }
}
