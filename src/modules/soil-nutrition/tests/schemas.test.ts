import { describe, expect, it } from "vitest";

import { calculateCorrectionTotal, calculateSoilFertilizationTotal, formatSoilDecimal, soilAnalysisStatusLabel, summarizeFoliarFertilizations, summarizeSoilAnalyses, summarizeSoilCorrections, summarizeSoilFertilizations } from "../domain/rules";
import { foliarFertilizationSchema, soilAnalysisSchema, soilCorrectionSchema, soilFertilizationSchema } from "../domain/schemas";

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

  it("valida ficha de correção do solo com números brasileiros", () => {
    const result = soilCorrectionSchema.parse({
      propertyId: uuid,
      plotId: uuid,
      plantingId: "",
      seasonId: "",
      soilAnalysisId: "",
      appliedOn: "2026-07-10",
      correctiveName: "Calcário dolomítico",
      prntPct: "82,5",
      recommendedDoseTHa: "1,75",
      totalQuantityT: "14",
      laborType: "hm",
      laborQuantity: "2,5",
      fuelL: "18,5",
      responsibleName: "João",
      notes: "Aplicação registrada na ficha do caderno.",
    });

    expect(result.plantingId).toBeNull();
    expect(result.soilAnalysisId).toBeNull();
    expect(result.prntPct).toBe(82.5);
    expect(result.recommendedDoseTHa).toBe(1.75);
    expect(result.totalQuantityT).toBe(14);
    expect(result.laborType).toBe("hm");
  });

  it("bloqueia PRNT, quantidade e hh/hm inválidos na correção", () => {
    const result = soilCorrectionSchema.safeParse({
      propertyId: uuid,
      plotId: uuid,
      appliedOn: "2026-07-10",
      correctiveName: "Calcário",
      prntPct: "250",
      totalQuantityT: "-1",
      laborQuantity: "3",
    });

    expect(result.success).toBe(false);
  });

  it("calcula quantidade total auxiliar e resume correções ativas", () => {
    expect(calculateCorrectionTotal(8, 1.5)).toBe(12);

    const summary = summarizeSoilCorrections([
      {
        id: "1",
        operational_record_id: "op",
        property_id: "p",
        plot_id: "plot",
        planting_id: null,
        season_id: null,
        soil_analysis_id: null,
        applied_on: "2026-07-10",
        corrective_name: "Calcário dolomítico",
        prnt_pct: "82.5",
        recommended_dose_t_ha: "1.5",
        total_quantity_t: "12",
        labor_type: "hm",
        labor_quantity: "2",
        fuel_l: "18",
        responsible_name: "João",
        notes: null,
        operational_record: { status: "confirmed", deleted_at: null },
      },
      {
        id: "2",
        operational_record_id: "op2",
        property_id: "p",
        plot_id: "plot",
        planting_id: null,
        season_id: null,
        soil_analysis_id: null,
        applied_on: "2026-07-11",
        corrective_name: "Gesso agrícola",
        prnt_pct: null,
        recommended_dose_t_ha: null,
        total_quantity_t: "5",
        labor_type: null,
        labor_quantity: null,
        fuel_l: null,
        responsible_name: null,
        notes: null,
        operational_record: { status: "confirmed", deleted_at: "2026-07-12T00:00:00Z" },
      },
    ]);

    expect(summary.correctionsCount).toBe(1);
    expect(summary.totalQuantityT).toBe("12");
    expect(summary.latestAppliedOn).toBe("2026-07-10");
  });

  it("valida ficha de adubação via solo com números brasileiros", () => {
    const result = soilFertilizationSchema.parse({
      propertyId: uuid,
      plotId: uuid,
      plantingId: "",
      seasonId: "",
      soilAnalysisId: "",
      appliedOn: "2026-07-10",
      fertilizerName: "20-05-20",
      doseKgHa: "250,5",
      totalQuantityKg: "2375,75",
      coverageLabel: "1ª cobertura",
      laborType: "hh",
      laborQuantity: "3,5",
      fuelL: "12",
      responsibleName: "Alex",
      notes: "Linha da ficha do caderno.",
    });

    expect(result.plantingId).toBeNull();
    expect(result.soilAnalysisId).toBeNull();
    expect(result.doseKgHa).toBe(250.5);
    expect(result.totalQuantityKg).toBe(2375.75);
    expect(result.coverageLabel).toBe("1ª cobertura");
    expect(result.laborType).toBe("hh");
  });

  it("bloqueia quantidade e hh/hm inválidos na adubação via solo", () => {
    const result = soilFertilizationSchema.safeParse({
      propertyId: uuid,
      plotId: uuid,
      appliedOn: "2026-07-10",
      fertilizerName: "20-05-20",
      doseKgHa: "-1",
      totalQuantityKg: "-10",
      laborQuantity: "3",
    });

    expect(result.success).toBe(false);
  });

  it("calcula quantidade total auxiliar e resume adubações ativas", () => {
    expect(calculateSoilFertilizationTotal(9.5, 250)).toBe(2375);

    const summary = summarizeSoilFertilizations([
      {
        id: "1",
        operational_record_id: "op",
        property_id: "p",
        plot_id: "plot",
        planting_id: null,
        season_id: null,
        soil_analysis_id: null,
        applied_on: "2026-07-10",
        fertilizer_name: "20-05-20",
        dose_kg_ha: "250",
        total_quantity_kg: "2375",
        coverage_label: "1ª cobertura",
        labor_type: "hh",
        labor_quantity: "3",
        fuel_l: "12",
        responsible_name: "Alex",
        notes: null,
        operational_record: { status: "confirmed", deleted_at: null },
      },
      {
        id: "2",
        operational_record_id: "op2",
        property_id: "p",
        plot_id: "plot",
        planting_id: null,
        season_id: null,
        soil_analysis_id: null,
        applied_on: "2026-07-11",
        fertilizer_name: "Orgânico",
        dose_kg_ha: null,
        total_quantity_kg: "1000",
        coverage_label: null,
        labor_type: null,
        labor_quantity: null,
        fuel_l: null,
        responsible_name: null,
        notes: null,
        operational_record: { status: "confirmed", deleted_at: "2026-12-01T00:00:00Z" },
      },
    ]);

    expect(summary.fertilizationsCount).toBe(1);
    expect(summary.totalQuantityKg).toBe("2375");
    expect(summary.latestAppliedOn).toBe("2026-07-10");
  });

  it("valida ficha de adubação via folha com componentes de mistura", () => {
    const result = foliarFertilizationSchema.parse({
      propertyId: uuid,
      plotId: uuid,
      plantingId: "",
      seasonId: "",
      appliedOn: "2026-07-10",
      purpose: "Nutrição foliar pós-florada",
      sprayVolumeLHa: "400,5",
      temperatureC: "24,8",
      humidityPct: "68",
      windSpeedKmH: "5,5",
      weatherNotes: "Manhã sem chuva.",
      laborType: "hh",
      laborQuantity: "3",
      fuelL: "11,5",
      responsibleName: "Alex",
      notes: "Registro realizado.",
      components: [
        { productName: "Boro", doseValue: "1,5", doseUnit: "L/ha", totalQuantity: "12", notes: "" },
        { productName: "Zinco", doseValue: "250", doseUnit: "mL/100 L", totalQuantity: "", notes: "Mistura compatível." },
      ],
    });

    expect(result.plantingId).toBeNull();
    expect(result.sprayVolumeLHa).toBe(400.5);
    expect(result.temperatureC).toBe(24.8);
    expect(result.components).toHaveLength(2);
    expect(result.components[1].totalQuantity).toBeNull();
  });

  it("bloqueia ficha foliar sem componente ou com valores inválidos", () => {
    const withoutComponents = foliarFertilizationSchema.safeParse({
      propertyId: uuid,
      plotId: uuid,
      appliedOn: "2026-07-10",
      purpose: "Nutrição",
      components: [],
    });
    const invalidValues = foliarFertilizationSchema.safeParse({
      propertyId: uuid,
      plotId: uuid,
      appliedOn: "2026-07-10",
      purpose: "Nutrição",
      sprayVolumeLHa: "-1",
      humidityPct: "101",
      laborQuantity: "2",
      components: [{ productName: "Boro", doseValue: "-1", doseUnit: "L/ha" }],
    });

    expect(withoutComponents.success).toBe(false);
    expect(invalidValues.success).toBe(false);
  });

  it("resume adubações foliares ativas", () => {
    const summary = summarizeFoliarFertilizations([
      {
        id: "1",
        operational_record_id: "op",
        property_id: "p",
        plot_id: "plot",
        planting_id: null,
        season_id: null,
        applied_on: "2026-07-10",
        purpose: "Nutrição",
        spray_volume_l_ha: "400",
        temperature_c: "24",
        humidity_pct: "68",
        wind_speed_km_h: "5",
        weather_notes: null,
        labor_type: "hh",
        labor_quantity: "3",
        fuel_l: "11",
        responsible_name: "Alex",
        notes: null,
        components: [{ id: "c1", product_name: "Boro", dose_value: "1.5", dose_unit: "L/ha", total_quantity: "12", notes: null }],
        operational_record: { status: "confirmed", deleted_at: null },
      },
      {
        id: "2",
        operational_record_id: "op2",
        property_id: "p",
        plot_id: "plot",
        planting_id: null,
        season_id: null,
        applied_on: "2026-07-11",
        purpose: "Micronutrientes",
        spray_volume_l_ha: "300",
        temperature_c: null,
        humidity_pct: null,
        wind_speed_km_h: null,
        weather_notes: null,
        labor_type: null,
        labor_quantity: null,
        fuel_l: null,
        responsible_name: null,
        notes: null,
        components: [{ id: "c2", product_name: "Zinco", dose_value: "250", dose_unit: "mL/100 L", total_quantity: null, notes: null }],
        operational_record: { status: "confirmed", deleted_at: "2026-12-01T00:00:00Z" },
      },
    ]);

    expect(summary.fertilizationsCount).toBe(1);
    expect(summary.totalSprayVolumeLHa).toBe("400");
    expect(summary.latestAppliedOn).toBe("2026-07-10");
  });
});
