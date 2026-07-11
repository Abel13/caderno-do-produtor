import type { SupabaseClient } from "@supabase/supabase-js";
import type { IdentityContext, AccountInvitation, AccountMember } from "../../domain/types";
import type { InvitationInput, OnboardingInput } from "../../domain/schemas";

export class IdentityRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getAuthenticatedUser() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async getContext(): Promise<IdentityContext | null> {
    const { data, error } = await this.supabase.rpc("get_my_identity_context");
    if (error) throw error;
    return data as IdentityContext | null;
  }

  async acceptPendingInvitations() {
    const { data, error } = await this.supabase.rpc("accept_pending_invitations");
    if (error) throw error;
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
    if (error) throw error;
    return data as { account_id: string; property_id: string };
  }

  async setActiveProperty(propertyId: string) {
    const { error } = await this.supabase.rpc("set_active_property", { target_property_id: propertyId });
    if (error) throw error;
  }

  async createInvitation(input: InvitationInput) {
    const { error } = await this.supabase.rpc("create_account_invitation", {
      target_account_id: input.accountId,
      target_email: input.email,
      target_role: input.role,
      target_property_ids: input.propertyIds
    });
    if (error) throw error;
  }

  async revokeInvitation(invitationId: string) {
    const { error } = await this.supabase.rpc("revoke_account_invitation", { target_invitation_id: invitationId });
    if (error) throw error;
  }

  async updateInvitation(invitationId: string, input: InvitationInput) {
    const { error } = await this.supabase.rpc("update_account_invitation", {
      target_invitation_id: invitationId,
      target_email: input.email,
      target_role: input.role,
      target_property_ids: input.propertyIds
    });
    if (error) throw error;
  }

  async revokeMembership(membershipId: string) {
    const { error } = await this.supabase.rpc("revoke_membership", { target_membership_id: membershipId });
    if (error) throw error;
  }

  async listMembers(accountId: string): Promise<AccountMember[]> {
    const { data, error } = await this.supabase
      .from("account_memberships")
      .select("id,account_id,user_id,role,status,profile:profiles(full_name,avatar_url)")
      .eq("account_id", accountId)
      .eq("status", "active")
      .order("created_at");
    if (error) throw error;
    return data as unknown as AccountMember[];
  }

  async listInvitations(accountId: string): Promise<AccountInvitation[]> {
    const { data, error } = await this.supabase
      .from("account_invitations")
      .select("id,account_id,email,role,status,created_at,invitation_properties(property_id)")
      .eq("account_id", accountId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
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
