import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("configuração de portas", () => {
  it("reserva o bloco definido sem usar as portas padrão do Supabase", () => {
    const script = readFileSync("scripts/check-ports.mjs", "utf8");
    for (let port = 57320; port <= 57329; port += 1) expect(script).toContain(String(port));
    expect(script).not.toContain("54321");
  });
});
