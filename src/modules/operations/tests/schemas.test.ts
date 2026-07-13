import { describe, expect, it } from "vitest";

import { operationCreateSchema, operationFilterSchema, operationUpdateSchema } from "../domain/schemas";
import { resolveHasManagePermission, resolveOperationFilters } from "../application/use-cases";
import { operationErrorState } from "../presentation/action-errors";

describe("operations schemas", () => {
  it("aceita valor opcional em texto com vírgula", () => {
    const parsed = operationCreateSchema.parse({
      propertyId: crypto.randomUUID(),
      recordType: "chuva",
      occurredAt: "2026-07-10T08:00",
      payload: {
        value: "12,5",
        value_unit: "mm",
        comment: "",
      },
      notes: null,
      status: "draft",
      origin: "manual",
    });

    expect(parsed.payload.value).toBe(12.5);
    expect(parsed.payload.value_unit).toBe("mm");
  });

  it("rejeita status inválido", () => {
    const parsed = operationUpdateSchema.safeParse({
      recordId: crypto.randomUUID(),
      status: "invalid",
      occurredAt: "2026-07-10T08:00",
      payload: {
        value: "1",
        value_unit: null,
        comment: null,
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("aceita origem de importação prevista pelo contrato do banco", () => {
    const parsed = operationCreateSchema.parse({
      propertyId: crypto.randomUUID(),
      recordType: "chuva",
      occurredAt: "2026-07-10T08:00",
      payload: { value: null, value_unit: null, comment: null },
      notes: null,
      status: "review_required",
      origin: "import",
    });

    expect(parsed.origin).toBe("import");
  });

  it("não substitui data vazia de edição pela data atual", () => {
    const parsed = operationUpdateSchema.safeParse({
      recordId: crypto.randomUUID(),
      recordType: "chuva",
      occurredAt: "",
      status: "draft",
      payload: { value: null, value_unit: null, comment: null },
    });

    expect(parsed.success).toBe(false);
  });

  it("rejeita período de data futura", () => {
    const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const parsed = operationCreateSchema.safeParse({
      propertyId: crypto.randomUUID(),
      recordType: "chuva",
      occurredAt: tomorrow,
      payload: { value: null, value_unit: null, comment: null },
      notes: null,
      status: "draft",
      origin: "manual",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("operations action errors", () => {
  it("traduz erros de domínio sem apagar valores submetidos", () => {
    const state = operationErrorState(new Error("Supabase request failed (P0001): season_closed_record"));

    expect(state.status).toBe("error");
    expect(state.message).toContain("safra");
    expect(state.values).toBeUndefined();
  });
});

describe("operations filters and permissions", () => {
  it("aceita filtros de busca com padrão seguro", () => {
    const filters = resolveOperationFilters({
      propertyId: crypto.randomUUID(),
      recordType: "chuva",
      status: undefined,
      showDeleted: false,
      page: 0,
      limit: 999,
    });

    expect(filters.page).toBe(1);
    expect(filters.limit).toBe(50);
  });

  it("resolve permissão operacional por papel", () => {
    expect(resolveHasManagePermission("owner")).toBe(true);
    expect(resolveHasManagePermission("manager")).toBe(true);
    expect(resolveHasManagePermission("technician")).toBe(false);
    expect(resolveHasManagePermission("viewer")).toBe(false);
  });

  it("valida schema de filtro com propriedade válida", () => {
    const parse = operationFilterSchema.parse({
      propertyId: crypto.randomUUID(),
      status: "draft",
      limit: "12",
      page: "2",
      showDeleted: "1",
    });

    expect(parse.limit).toBe(12);
    expect(parse.page).toBe(2);
    expect(parse.showDeleted).toBe(true);
  });
});
