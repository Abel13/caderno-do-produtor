export type AccountRole = "owner" | "producer" | "manager" | "technician" | "collaborator" | "viewer";

export interface IdentityProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_property_id: string | null;
  last_season_id: string | null;
  timezone: BrazilianTimezone;
  measurement_system: "metric";
  internal_notifications_enabled: boolean;
}

export type BrazilianTimezone = "America/Sao_Paulo" | "America/Manaus" | "America/Cuiaba" | "America/Rio_Branco" | "America/Noronha";

export interface IdentityMembership {
  id: string;
  account_id: string;
  account_name: string;
  role: AccountRole;
}

export interface IdentityProperty {
  id: string;
  account_id: string;
  name: string;
  city: string;
  state: string;
  total_area_ha: number | null;
}

export interface IdentityContext {
  profile: IdentityProfile;
  memberships: IdentityMembership[];
  properties: IdentityProperty[];
}

export interface AccountMember {
  id: string;
  account_id: string;
  user_id: string;
  role: AccountRole;
  status: "invited" | "active" | "revoked";
  profile: { full_name: string | null; avatar_url: string | null } | null;
}

export interface AccountInvitation {
  id: string;
  account_id: string;
  email: string;
  role: "manager" | "technician";
  status: "pending" | "accepted" | "revoked";
  property_ids: string[];
  created_at: string;
}

export interface AdministrativeAuditEvent {
  id: number;
  table_name: "account_invitations" | "account_memberships";
  record_id: string;
  action: "insert" | "update";
  old_data: { role?: string; status?: string; property_ids?: string[] } | null;
  new_data: { role?: string; status?: string; property_ids?: string[] } | null;
  created_at: string;
  actor: { full_name: string | null } | null;
}
