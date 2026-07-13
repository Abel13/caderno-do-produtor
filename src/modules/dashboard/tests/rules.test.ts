import { describe, expect, it } from "vitest";

import { buildDashboardViewModel } from "../domain/rules";
import type { DashboardSummaryInput } from "../domain/types";

const baseInput: DashboardSummaryInput = {
  activeProperty: {
    id: "property-1",
    account_id: "account-1",
    name: "Fazenda Boa Vista",
    city: "Franca",
    state: "SP",
    total_area_ha: 20,
  },
  preferredSeasonId: null,
  role: "owner",
  seasons: [{ id: "season-1", name: "Safra 2026", status: "open", starts_on: "2026-01-01", ends_on: "2026-12-31" }],
  activePlotCount: 2,
  activePlantingCount: 2,
  plantingSeasonLinkCount: 1,
  recordsThisMonthCount: 3,
  recentRecords: [],
  productionRecords: [],
  soilAnalysisCount: 0,
};

describe("dashboard rules", () => {
  it("recomenda cadastrar talhão quando a estrutura ainda não começou", () => {
    const dashboard = buildDashboardViewModel({ ...baseInput, activePlotCount: 0, activePlantingCount: 0, plantingSeasonLinkCount: 0, seasons: [] });

    expect(dashboard.recommendedAction.key).toBe("plot");
    expect(dashboard.hasIncompleteStructure).toBe(true);
  });

  it("usa a safra preferida quando ela ainda é acessível", () => {
    const dashboard = buildDashboardViewModel({
      ...baseInput,
      preferredSeasonId: "season-2",
      seasons: [
        { id: "season-1", name: "Safra 2026", status: "open", starts_on: "2026-01-01", ends_on: "2026-12-31" },
        { id: "season-2", name: "Safra Planejada", status: "planning", starts_on: "2027-01-01", ends_on: "2027-12-31" },
      ],
    });

    expect(dashboard.activeSeason?.id).toBe("season-2");
  });

  it("filtra ações de criação para técnico em modo consulta", () => {
    const dashboard = buildDashboardViewModel({ ...baseInput, role: "technician" });

    expect(dashboard.canManage).toBe(false);
    expect(dashboard.quickActions).toHaveLength(1);
    expect(dashboard.quickActions[0].key).toBe("consultar");
  });

  it("direciona ação rápida de chuva com safra ativa", () => {
    const dashboard = buildDashboardViewModel({ ...baseInput, recordsThisMonthCount: 0 });

    expect(dashboard.recommendedAction.href).toContain("/climate/rainfall");
    expect(dashboard.recommendedAction.href).toContain("seasonId=season-1");
  });

  it("mostra produção registrada na safra ativa", () => {
    const dashboard = buildDashboardViewModel({
      ...baseInput,
      productionRecords: [
        { season_id: "season-1", total_sc: "120" },
        { season_id: "season-2", total_sc: "50" },
      ],
    });

    expect(dashboard.metrics.find((metric) => metric.key === "production")?.value).toBe("120 sc");
    expect(dashboard.quickActions.some((action) => action.key === "producao" && action.href.includes("/production"))).toBe(true);
  });
});
