import { describe, expect, it } from "vitest";
import { plotSchema, plantingSchema, seasonSchema, seasonStatusSchema } from "../domain/schemas";

describe("rural structure schemas", () => {
  it("accepts decimal comma and optional cultivar", () => {
    expect(plotSchema.parse({ propertyId: crypto.randomUUID(), name: "Talhão 1", areaHa: "2,5", status: "active" }).areaHa).toBe(
      2.5
    );
    expect(
      plantingSchema.parse({ plotId: crypto.randomUUID(), cultivarId: "", areaHa: "2", plantedYear: "", status: "forming" }).cultivarId
    ).toBeNull();
  });

  it("rejects an inverted season", () => {
    expect(
      seasonSchema.safeParse({
        propertyId: crypto.randomUUID(),
        name: "2026/27",
        startsOn: "2027-01-01",
        endsOn: "2026-01-01",
        status: "open",
      }).success
    ).toBe(false);
  });

  it("requires reopen reason only by explicit schema field", () => {
    expect(
      seasonStatusSchema.parse({
        seasonId: crypto.randomUUID(),
        status: "open",
        reopenReason: "",
      }).reopenReason
    ).toBeNull();
    expect(
      seasonStatusSchema.safeParse({
        seasonId: "invalid",
        status: "planning",
        reopenReason: "ok",
      }).success
    ).toBe(false);
  });
});
