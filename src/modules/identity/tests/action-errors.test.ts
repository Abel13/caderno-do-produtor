import { describe, expect, it } from "vitest";
import { errorState } from "../presentation/action-errors";

describe("identity action errors", () => {
  it.each([
    ["permission_denied", "Você não possui permissão"],
    ["invitation_not_found", "O convite não existe"],
    ["membership_not_found", "O vínculo não existe"],
    ["owner_cannot_be_revoked", "O acesso do proprietário"]
  ])("translates %s", (code, message) => {
    expect(errorState(new Error(`Supabase request failed: ${code}`)).message).toContain(message);
  });
});
