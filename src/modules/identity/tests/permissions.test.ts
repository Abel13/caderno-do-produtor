import { describe, expect, it } from "vitest";
import { accountRoleLabel, canInviteRole, canManageAccount, canRevokeRole, chooseActiveProperty } from "../domain/permissions";

describe("identity permissions", () => {
  it("allows only owners and managers to administer an account", () => {
    expect(canManageAccount("owner")).toBe(true);
    expect(canManageAccount("manager")).toBe(true);
    expect(canManageAccount("technician")).toBe(false);
    expect(canManageAccount("producer")).toBe(false);
  });

  it("prevents managers from revoking owners and other managers", () => {
    expect(canRevokeRole("manager", "technician")).toBe(true);
    expect(canRevokeRole("manager", "manager")).toBe(false);
    expect(canRevokeRole("manager", "owner")).toBe(false);
    expect(canRevokeRole("owner", "manager")).toBe(true);
  });

  it("uses the preferred accessible property or falls back to the first one", () => {
    const properties = [{ id: "a" }, { id: "b" }];
    expect(chooseActiveProperty(properties, "b")?.id).toBe("b");
    expect(chooseActiveProperty(properties, "missing")?.id).toBe("a");
    expect(chooseActiveProperty([], "missing")).toBeNull();
  });

  it("allows only owners to invite managers and managers to invite technicians", () => {
    expect(canInviteRole("owner", "manager")).toBe(true);
    expect(canInviteRole("owner", "technician")).toBe(true);
    expect(canInviteRole("manager", "manager")).toBe(false);
    expect(canInviteRole("manager", "technician")).toBe(true);
    expect(canInviteRole("technician", "technician")).toBe(false);
  });

  it("presents account roles in Portuguese", () => {
    expect(accountRoleLabel("owner")).toBe("Proprietário");
    expect(accountRoleLabel("manager")).toBe("Gestor");
    expect(accountRoleLabel("technician")).toBe("Técnico");
  });
});
