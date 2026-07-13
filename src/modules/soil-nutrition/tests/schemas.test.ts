import { describe, expect, it } from "vitest";

import { formatSoilDecimal, soilAnalysisStatusLabel, summarizeSoilAnalyses } from "../domain/rules";
import { soilAnalysisSchema } from "../domain/schemas";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("soil nutrition schemas", () => {
  it("valida ficha manual de análise de solo com números brasileiros", () => {
    const result = soilAnalysisSchema.parse({
      propertyId: uuid,
      plotId: uuid,
      plantingId: "",
      seasonId: "",
      collectedOn: "2026-06-11",
      depthCm: "0-20 cm",
      laboratoryName: "Laboratório de solos",
      reportNumber: "S20266814",
      importStatus: "manual",
      phWater: "5,18",
      pMgDm3: "48,67",
      baseSaturationPct: "39",
      clayPct: "22",
    });

    expect(result.plantingId).toBeNull();
    expect(result.phWater).toBe(5.18);
    expect(result.pMgDm3).toBe(48.67);
  });

  it("bloqueia pH e percentuais fora da faixa", () => {
    const result = soilAnalysisSchema.safeParse({
      propertyId: uuid,
      plotId: uuid,
      collectedOn: "2026-06-11",
      depthCm: "0-20 cm",
      phWater: "15",
      baseSaturationPct: "120",
    });

    expect(result.success).toBe(false);
  });

  it("resume análises ativas e laudos anexados", () => {
    const summary = summarizeSoilAnalyses([
      {
        id: "1",
        operational_record_id: "op",
        property_id: "p",
        plot_id: "plot",
        planting_id: null,
        season_id: null,
        collected_on: "2026-06-11",
        depth_cm: "0-20 cm",
        laboratory_name: null,
        report_number: null,
        ph_water: "5.18",
        ph_cacl2: null,
        ph_kcl: null,
        p_mg_dm3: null,
        k_mg_dm3: null,
        ca_cmolc_dm3: null,
        mg_cmolc_dm3: null,
        al_cmolc_dm3: null,
        h_al_cmolc_dm3: null,
        c_org_pct: null,
        sb_cmolc_dm3: null,
        effective_ctc_cmolc_dm3: null,
        ctc_ph7_cmolc_dm3: null,
        base_saturation_pct: null,
        aluminum_saturation_pct: null,
        organic_matter_dag_kg: null,
        b_mg_dm3: null,
        zn_mg_dm3: null,
        cu_mg_dm3: null,
        fe_mg_dm3: null,
        mn_mg_dm3: null,
        s_mg_dm3: null,
        p_rem_mg_l: null,
        sand_pct: null,
        silt_pct: null,
        clay_pct: null,
        notes: null,
        import_status: "manual",
        operational_record: { status: "confirmed", deleted_at: null },
        attachments: [{ id: "a", filename: "laudo.pdf", storage_path: "x", mime_type: "application/pdf", size_bytes: 100, created_at: "2026-06-11" }],
      },
    ]);

    expect(summary.analysesCount).toBe(1);
    expect(summary.reportsCount).toBe(1);
    expect(formatSoilDecimal("5.18")).toBe("5,18");
    expect(soilAnalysisStatusLabel("awaiting_import")).toBe("Aguardando importação");
  });
});
