import { describe, expect, it } from "vitest";
import { accountMemberSelect, isMissingSessionError, throwSupabaseError } from "../infrastructure/supabase/identity-repository";

describe("accountMemberSelect", () => {
  it("embeds the membership user instead of the inviter", () => {
    expect(accountMemberSelect).toContain("profiles!account_memberships_user_id_fkey");
  });
});

describe("throwSupabaseError", () => {
  it("converts a structured Supabase failure into an Error", () => {
    const failure = { code: "PGRST202", details: null, hint: null, message: "Function was not found" };

    expect(() => throwSupabaseError(failure)).toThrowError(
      "Supabase request failed (PGRST202): Function was not found"
    );
  });

  it("preserves native errors", () => {
    const failure = new Error("Network unavailable");

    expect(() => throwSupabaseError(failure)).toThrow(failure);
  });
});

describe("isMissingSessionError", () => {
  it("distinguishes an absent session from a technical authentication failure", () => {
    const missing = new Error("Auth session missing!");
    missing.name = "AuthSessionMissingError";
    expect(isMissingSessionError(missing)).toBe(true);
    expect(isMissingSessionError(new Error("Network unavailable"))).toBe(false);
  });
});
