import { describe, expect, it } from "vitest";
import { invitationSchema, onboardingSchema, profileSchema } from "../domain/schemas";

describe("identity schemas", () => {
  it("normalizes decimal area and accepts complete onboarding data", () => {
    const result = onboardingSchema.parse({ accountName: "Família Silva", propertyName: "Boa Vista", city: "Varginha", state: "MG", totalAreaHa: "12,5" });
    expect(result.totalAreaHa).toBe(12.5);
  });

  it("rejects invalid states and non-positive areas", () => {
    expect(onboardingSchema.safeParse({ accountName: "Conta", propertyName: "Fazenda", city: "Cidade", state: "XX", totalAreaHa: "0" }).success).toBe(false);
  });

  it("requires at least one property for a technician", () => {
    const result = invitationSchema.safeParse({ accountId: crypto.randomUUID(), email: "tecnico@example.com", role: "technician", propertyIds: [] });
    expect(result.success).toBe(false);
  });

  it("allows managers without property selection and normalizes email", () => {
    const result = invitationSchema.parse({ accountId: crypto.randomUUID(), email: " Gestor@Example.COM ", role: "manager", propertyIds: [] });
    expect(result.email).toBe("gestor@example.com");
  });
});

describe("profileSchema", () => {
  it("accepts Brazilian defaults", () => {
    expect(profileSchema.parse({ fullName: "Maria Silva", timezone: "America/Sao_Paulo", internalNotificationsEnabled: true })).toEqual({
      fullName: "Maria Silva", timezone: "America/Sao_Paulo", internalNotificationsEnabled: true
    });
  });

  it("rejects unsupported timezones and short names", () => {
    expect(profileSchema.safeParse({ fullName: "M", timezone: "UTC", internalNotificationsEnabled: true }).success).toBe(false);
  });
});
