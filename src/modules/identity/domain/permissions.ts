import type { AccountRole } from "./types";

export function canManageAccount(role: AccountRole) {
  return role === "owner" || role === "manager";
}

export function canRevokeRole(actor: AccountRole, target: AccountRole) {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  return actor === "manager" && target === "technician";
}

export function canInviteRole(actor: AccountRole, target: "manager" | "technician") {
  return actor === "owner" || (actor === "manager" && target === "technician");
}

export function chooseActiveProperty<T extends { id: string }>(properties: T[], preferredId?: string | null) {
  return properties.find((property) => property.id === preferredId) ?? properties[0] ?? null;
}
