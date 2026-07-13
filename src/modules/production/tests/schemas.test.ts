import { describe, expect, it } from "vitest";

import { calculateProductionTotal, calculateProductivity, summarizeProduction } from "../domain/rules";
import { productionRecordSchema } from "../domain/schemas";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("production schemas", () => {
  it("valida ficha de produção com números brasileiros", () => {
    const result = productionRecordSchema.parse({
      propertyId: uuid,
      plotId: uuid,
      plantingId: "",
      seasonId: uuid,
      harvestedOn: "2026-07-10",
      areaHa: "9,5",
      productivityScHa: "34",
      totalSc: "",
      lotCode: "A2",
      processingMethod: "Via úmida",
      beverageClassification: "Dura",
      coffeeType: "6",
      pickingPercentage: "10",
      notes: "",
    });

    expect(result.areaHa).toBe(9.5);
    expect(result.plantingId).toBeNull();
    expect(result.totalSc).toBeNull();
    expect(result.notes).toBeNull();
  });

  it("exige produção total ou produção por hectare", () => {
    const result = productionRecordSchema.safeParse({
      propertyId: uuid,
      plotId: uuid,
      seasonId: uuid,
      harvestedOn: "2026-07-10",
      areaHa: "9",
      productivityScHa: "",
      totalSc: "",
    });

    expect(result.success).toBe(false);
  });

  it("calcula produção total e produtividade", () => {
    expect(calculateProductionTotal(9, 34)).toBe(306);
    expect(calculateProductivity(9, 306)).toBe(34);
  });

  it("resume apenas registros ativos", () => {
    const summary = summarizeProduction([
      {
        id: "1",
        operational_record_id: "op-1",
        property_id: "p",
        plot_id: "plot",
        planting_id: null,
        season_id: "s",
        harvested_on: "2026-07-10",
        area_ha: "9",
        productivity_sc_ha: "34",
        total_sc: "306",
        lot_code: null,
        processing_method: null,
        beverage_classification: null,
        coffee_type: null,
        picking_percentage: null,
        notes: null,
        operational_record: { status: "confirmed", deleted_at: null },
      },
      {
        id: "2",
        operational_record_id: "op-2",
        property_id: "p",
        plot_id: "plot",
        planting_id: null,
        season_id: "s",
        harvested_on: "2026-07-11",
        area_ha: "1",
        productivity_sc_ha: "10",
        total_sc: "10",
        lot_code: null,
        processing_method: null,
        beverage_classification: null,
        coffee_type: null,
        picking_percentage: null,
        notes: null,
        operational_record: { status: "confirmed", deleted_at: "2026-07-12" },
      },
    ]);

    expect(summary.totalSc).toBe("306");
    expect(summary.averageProductivityScHa).toBe("34");
    expect(summary.recordsCount).toBe(1);
  });
});
