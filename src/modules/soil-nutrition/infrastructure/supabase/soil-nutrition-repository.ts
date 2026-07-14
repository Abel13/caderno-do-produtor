import type { SupabaseClient } from "@supabase/supabase-js";

import { throwSupabaseError } from "@/modules/identity/infrastructure/supabase/identity-repository";
import type { SoilAnalysisFilterInput, SoilAnalysisInput, SoilCorrectionFilterInput, SoilCorrectionInput, SoilFertilizationFilterInput, SoilFertilizationInput } from "../../domain/schemas";
import type { SoilAnalysisAttachment, SoilAnalysisRecord, SoilCorrectionRecord, SoilFertilizationRecord, SoilFormContext } from "../../domain/types";

type OperationalRecordRef = SoilAnalysisRecord["operational_record"] | SoilAnalysisRecord["operational_record"][] | null;
type RawSoilAnalysisRecord = Omit<SoilAnalysisRecord, "operational_record" | "attachments"> & { operational_records: OperationalRecordRef };
type RawSoilCorrectionRecord = Omit<SoilCorrectionRecord, "operational_record"> & { operational_records: SoilCorrectionRecord["operational_record"] | SoilCorrectionRecord["operational_record"][] | null };
type RawSoilFertilizationRecord = Omit<SoilFertilizationRecord, "operational_record"> & { operational_records: SoilFertilizationRecord["operational_record"] | SoilFertilizationRecord["operational_record"][] | null };

const parameterKeys = [
  "phWater", "phCacl2", "phKcl", "pMgDm3", "kMgDm3", "caCmolcDm3", "mgCmolcDm3", "alCmolcDm3", "hAlCmolcDm3",
  "cOrgPct", "sbCmolcDm3", "effectiveCtcCmolcDm3", "ctcPh7CmolcDm3", "baseSaturationPct", "aluminumSaturationPct",
  "organicMatterDagKg", "bMgDm3", "znMgDm3", "cuMgDm3", "feMgDm3", "mnMgDm3", "sMgDm3", "pRemMgL", "sandPct", "siltPct", "clayPct",
] as const;

const dbKeyByInputKey: Record<(typeof parameterKeys)[number], string> = {
  phWater: "ph_water",
  phCacl2: "ph_cacl2",
  phKcl: "ph_kcl",
  pMgDm3: "p_mg_dm3",
  kMgDm3: "k_mg_dm3",
  caCmolcDm3: "ca_cmolc_dm3",
  mgCmolcDm3: "mg_cmolc_dm3",
  alCmolcDm3: "al_cmolc_dm3",
  hAlCmolcDm3: "h_al_cmolc_dm3",
  cOrgPct: "c_org_pct",
  sbCmolcDm3: "sb_cmolc_dm3",
  effectiveCtcCmolcDm3: "effective_ctc_cmolc_dm3",
  ctcPh7CmolcDm3: "ctc_ph7_cmolc_dm3",
  baseSaturationPct: "base_saturation_pct",
  aluminumSaturationPct: "aluminum_saturation_pct",
  organicMatterDagKg: "organic_matter_dag_kg",
  bMgDm3: "b_mg_dm3",
  znMgDm3: "zn_mg_dm3",
  cuMgDm3: "cu_mg_dm3",
  feMgDm3: "fe_mg_dm3",
  mnMgDm3: "mn_mg_dm3",
  sMgDm3: "s_mg_dm3",
  pRemMgL: "p_rem_mg_l",
  sandPct: "sand_pct",
  siltPct: "silt_pct",
  clayPct: "clay_pct",
};

function normalizeDecimal(value: string | number | null) {
  return value === null ? null : String(value);
}

function parametersPayload(input: SoilAnalysisInput) {
  return Object.fromEntries(parameterKeys.map((key) => [dbKeyByInputKey[key], input[key]]));
}

function safeFilename(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "laudo";
}

export class SoilNutritionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getFormContext(propertyId: string): Promise<SoilFormContext> {
    const [plots, plantings, seasons, analyses] = await Promise.all([
      this.supabase.from("plots").select("id,name,status,area_ha").eq("property_id", propertyId).neq("status", "closed").order("name"),
      this.supabase
        .from("plantings")
        .select("id,status,plot:plots!inner(id,name,property_id)")
        .eq("plot.property_id", propertyId)
        .neq("status", "closed")
        .order("created_at", { ascending: false }),
      this.supabase.from("harvest_seasons").select("id,name,status").eq("property_id", propertyId).neq("status", "closed").order("starts_on", { ascending: false }),
      this.supabase
        .from("soil_analysis_records")
        .select("id,plot_id,collected_on,depth_cm,report_number,laboratory_name,operational_records!inner(deleted_at)")
        .eq("property_id", propertyId)
        .is("operational_records.deleted_at", null)
        .order("collected_on", { ascending: false }),
    ]);
    if (plots.error) throwSupabaseError(plots.error);
    if (plantings.error) throwSupabaseError(plantings.error);
    if (seasons.error) throwSupabaseError(seasons.error);
    if (analyses.error) throwSupabaseError(analyses.error);
    return {
      plots: (plots.data ?? []).map((item) => ({ id: item.id as string, name: item.name as string, status: item.status as string, area_ha: normalizeDecimal(item.area_ha as string | number | null) ?? undefined })),
      plantings: (plantings.data ?? []).map((item) => {
        const plot = Array.isArray(item.plot) ? item.plot[0] : item.plot;
        return { id: item.id as string, name: `${plot?.name ?? "Talhão"} · ${item.status}`, status: item.status as string, plot_id: plot?.id as string };
      }),
      seasons: (seasons.data ?? []).map((item) => ({ id: item.id as string, name: item.name as string, status: item.status as string })),
      analyses: (analyses.data ?? []).map((item) => ({
        id: item.id as string,
        plot_id: item.plot_id as string,
        label: `${item.report_number ? `${item.report_number} · ` : ""}${item.depth_cm} · ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${item.collected_on}T12:00:00`))}`,
      })),
    };
  }

  async listAnalyses(filters: SoilAnalysisFilterInput): Promise<SoilAnalysisRecord[]> {
    let query = this.supabase
      .from("soil_analysis_records")
      .select("id,operational_record_id,property_id,plot_id,planting_id,season_id,collected_on,depth_cm,laboratory_name,report_number,ph_water,ph_cacl2,ph_kcl,p_mg_dm3,k_mg_dm3,ca_cmolc_dm3,mg_cmolc_dm3,al_cmolc_dm3,h_al_cmolc_dm3,c_org_pct,sb_cmolc_dm3,effective_ctc_cmolc_dm3,ctc_ph7_cmolc_dm3,base_saturation_pct,aluminum_saturation_pct,organic_matter_dag_kg,b_mg_dm3,zn_mg_dm3,cu_mg_dm3,fe_mg_dm3,mn_mg_dm3,s_mg_dm3,p_rem_mg_l,sand_pct,silt_pct,clay_pct,notes,import_status,operational_records!inner(status,deleted_at)")
      .eq("property_id", filters.propertyId)
      .order("collected_on", { ascending: false })
      .limit(80);
    if (filters.plotId) query = query.eq("plot_id", filters.plotId);
    if (filters.plantingId) query = query.eq("planting_id", filters.plantingId);
    if (filters.seasonId) query = query.eq("season_id", filters.seasonId);
    if (filters.from) query = query.gte("collected_on", filters.from);
    if (filters.to) query = query.lte("collected_on", filters.to);
    if (!filters.showDeleted) query = query.is("operational_records.deleted_at", null);
    const { data, error } = await query;
    if (error) throwSupabaseError(error);
    const rows = (data ?? []) as unknown as RawSoilAnalysisRecord[];
    const opIds = rows.map((item) => item.operational_record_id);
    const attachmentsByRecord = await this.listAttachmentsByOperationalRecord(opIds);
    return rows.map((item) => {
      const operationalRecord = Array.isArray(item.operational_records) ? item.operational_records[0] : item.operational_records;
      return {
        ...item,
        ph_water: normalizeDecimal(item.ph_water),
        ph_cacl2: normalizeDecimal(item.ph_cacl2),
        ph_kcl: normalizeDecimal(item.ph_kcl),
        p_mg_dm3: normalizeDecimal(item.p_mg_dm3),
        k_mg_dm3: normalizeDecimal(item.k_mg_dm3),
        ca_cmolc_dm3: normalizeDecimal(item.ca_cmolc_dm3),
        mg_cmolc_dm3: normalizeDecimal(item.mg_cmolc_dm3),
        al_cmolc_dm3: normalizeDecimal(item.al_cmolc_dm3),
        h_al_cmolc_dm3: normalizeDecimal(item.h_al_cmolc_dm3),
        c_org_pct: normalizeDecimal(item.c_org_pct),
        sb_cmolc_dm3: normalizeDecimal(item.sb_cmolc_dm3),
        effective_ctc_cmolc_dm3: normalizeDecimal(item.effective_ctc_cmolc_dm3),
        ctc_ph7_cmolc_dm3: normalizeDecimal(item.ctc_ph7_cmolc_dm3),
        base_saturation_pct: normalizeDecimal(item.base_saturation_pct),
        aluminum_saturation_pct: normalizeDecimal(item.aluminum_saturation_pct),
        organic_matter_dag_kg: normalizeDecimal(item.organic_matter_dag_kg),
        b_mg_dm3: normalizeDecimal(item.b_mg_dm3),
        zn_mg_dm3: normalizeDecimal(item.zn_mg_dm3),
        cu_mg_dm3: normalizeDecimal(item.cu_mg_dm3),
        fe_mg_dm3: normalizeDecimal(item.fe_mg_dm3),
        mn_mg_dm3: normalizeDecimal(item.mn_mg_dm3),
        s_mg_dm3: normalizeDecimal(item.s_mg_dm3),
        p_rem_mg_l: normalizeDecimal(item.p_rem_mg_l),
        sand_pct: normalizeDecimal(item.sand_pct),
        silt_pct: normalizeDecimal(item.silt_pct),
        clay_pct: normalizeDecimal(item.clay_pct),
        operational_record: operationalRecord ?? { status: "confirmed", deleted_at: null },
        attachments: attachmentsByRecord[item.operational_record_id] ?? [],
      };
    });
  }

  async createAnalysis(input: SoilAnalysisInput) {
    const { data, error } = await this.supabase.rpc("create_soil_analysis_record", {
      target_property_id: input.propertyId,
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_collected_on: input.collectedOn,
      target_depth_cm: input.depthCm,
      target_laboratory_name: input.laboratoryName,
      target_report_number: input.reportNumber,
      target_parameters: parametersPayload(input),
      target_notes: input.notes,
      target_import_status: input.importStatus,
      target_client_id: input.clientId ?? crypto.randomUUID(),
    });
    if (error) throwSupabaseError(error);
    return data as string;
  }

  async updateAnalysis(input: SoilAnalysisInput) {
    const { error } = await this.supabase.rpc("update_soil_analysis_record", {
      target_analysis_id: input.analysisId,
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_collected_on: input.collectedOn,
      target_depth_cm: input.depthCm,
      target_laboratory_name: input.laboratoryName,
      target_report_number: input.reportNumber,
      target_parameters: parametersPayload(input),
      target_notes: input.notes,
      target_import_status: input.importStatus,
    });
    if (error) throwSupabaseError(error);
  }

  async deleteAnalysis(analysisId: string) {
    const { error } = await this.supabase.rpc("delete_soil_analysis_record", { target_analysis_id: analysisId });
    if (error) throwSupabaseError(error);
  }

  async restoreAnalysis(analysisId: string) {
    const { error } = await this.supabase.rpc("restore_soil_analysis_record", { target_analysis_id: analysisId, target_notes: null });
    if (error) throwSupabaseError(error);
  }

  async uploadReport(analysisId: string, file: File) {
    const { data: analysis, error: analysisError } = await this.supabase
      .from("soil_analysis_records")
      .select("operational_record_id")
      .eq("id", analysisId)
      .single();
    if (analysisError) throwSupabaseError(analysisError);
    const safe = safeFilename(file.name);
    const storagePath = `soil-analyses/${analysis.operational_record_id}/${crypto.randomUUID()}-${safe}`;
    const { error: uploadError } = await this.supabase.storage.from("private-documents").upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) throwSupabaseError(uploadError);
    const { error } = await this.supabase.rpc("create_soil_analysis_attachment", {
      target_analysis_id: analysisId,
      target_filename: file.name,
      target_storage_path: storagePath,
      target_mime_type: file.type || "application/octet-stream",
      target_size_bytes: file.size,
    });
    if (error) throwSupabaseError(error);
  }

  async listCorrections(filters: SoilCorrectionFilterInput): Promise<SoilCorrectionRecord[]> {
    let query = this.supabase
      .from("soil_correction_records")
      .select("id,operational_record_id,property_id,plot_id,planting_id,season_id,soil_analysis_id,applied_on,corrective_name,prnt_pct,recommended_dose_t_ha,total_quantity_t,labor_type,labor_quantity,fuel_l,responsible_name,notes,operational_records!inner(status,deleted_at)")
      .eq("property_id", filters.propertyId)
      .order("applied_on", { ascending: false })
      .limit(80);
    if (filters.plotId) query = query.eq("plot_id", filters.plotId);
    if (filters.plantingId) query = query.eq("planting_id", filters.plantingId);
    if (filters.seasonId) query = query.eq("season_id", filters.seasonId);
    if (filters.soilAnalysisId) query = query.eq("soil_analysis_id", filters.soilAnalysisId);
    if (filters.from) query = query.gte("applied_on", filters.from);
    if (filters.to) query = query.lte("applied_on", filters.to);
    if (!filters.showDeleted) query = query.is("operational_records.deleted_at", null);
    const { data, error } = await query;
    if (error) throwSupabaseError(error);
    return ((data ?? []) as unknown as RawSoilCorrectionRecord[]).map((item) => {
      const operationalRecord = Array.isArray(item.operational_records) ? item.operational_records[0] : item.operational_records;
      return {
        ...item,
        prnt_pct: normalizeDecimal(item.prnt_pct),
        recommended_dose_t_ha: normalizeDecimal(item.recommended_dose_t_ha),
        total_quantity_t: String(item.total_quantity_t),
        labor_quantity: normalizeDecimal(item.labor_quantity),
        fuel_l: normalizeDecimal(item.fuel_l),
        operational_record: operationalRecord ?? { status: "confirmed", deleted_at: null },
      };
    });
  }

  async createCorrection(input: SoilCorrectionInput) {
    const { error } = await this.supabase.rpc("create_soil_correction_record", {
      target_property_id: input.propertyId,
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_soil_analysis_id: input.soilAnalysisId,
      target_applied_on: input.appliedOn,
      target_corrective_name: input.correctiveName,
      target_prnt_pct: input.prntPct,
      target_recommended_dose_t_ha: input.recommendedDoseTHa,
      target_total_quantity_t: input.totalQuantityT,
      target_labor_type: input.laborType,
      target_labor_quantity: input.laborQuantity,
      target_fuel_l: input.fuelL,
      target_responsible_name: input.responsibleName,
      target_notes: input.notes,
      target_client_id: input.clientId ?? crypto.randomUUID(),
    });
    if (error) throwSupabaseError(error);
  }

  async updateCorrection(input: SoilCorrectionInput) {
    const { error } = await this.supabase.rpc("update_soil_correction_record", {
      target_correction_id: input.correctionId,
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_soil_analysis_id: input.soilAnalysisId,
      target_applied_on: input.appliedOn,
      target_corrective_name: input.correctiveName,
      target_prnt_pct: input.prntPct,
      target_recommended_dose_t_ha: input.recommendedDoseTHa,
      target_total_quantity_t: input.totalQuantityT,
      target_labor_type: input.laborType,
      target_labor_quantity: input.laborQuantity,
      target_fuel_l: input.fuelL,
      target_responsible_name: input.responsibleName,
      target_notes: input.notes,
    });
    if (error) throwSupabaseError(error);
  }

  async deleteCorrection(correctionId: string) {
    const { error } = await this.supabase.rpc("delete_soil_correction_record", { target_correction_id: correctionId });
    if (error) throwSupabaseError(error);
  }

  async restoreCorrection(correctionId: string) {
    const { error } = await this.supabase.rpc("restore_soil_correction_record", { target_correction_id: correctionId, target_notes: null });
    if (error) throwSupabaseError(error);
  }

  async listFertilizations(filters: SoilFertilizationFilterInput): Promise<SoilFertilizationRecord[]> {
    let query = this.supabase
      .from("soil_fertilization_records")
      .select("id,operational_record_id,property_id,plot_id,planting_id,season_id,soil_analysis_id,applied_on,fertilizer_name,dose_kg_ha,total_quantity_kg,coverage_label,labor_type,labor_quantity,fuel_l,responsible_name,notes,operational_records!inner(status,deleted_at)")
      .eq("property_id", filters.propertyId)
      .order("applied_on", { ascending: false })
      .limit(80);
    if (filters.plotId) query = query.eq("plot_id", filters.plotId);
    if (filters.plantingId) query = query.eq("planting_id", filters.plantingId);
    if (filters.seasonId) query = query.eq("season_id", filters.seasonId);
    if (filters.soilAnalysisId) query = query.eq("soil_analysis_id", filters.soilAnalysisId);
    if (filters.fertilizerName) query = query.ilike("fertilizer_name", `%${filters.fertilizerName}%`);
    if (filters.from) query = query.gte("applied_on", filters.from);
    if (filters.to) query = query.lte("applied_on", filters.to);
    if (!filters.showDeleted) query = query.is("operational_records.deleted_at", null);
    const { data, error } = await query;
    if (error) throwSupabaseError(error);
    return ((data ?? []) as unknown as RawSoilFertilizationRecord[]).map((item) => {
      const operationalRecord = Array.isArray(item.operational_records) ? item.operational_records[0] : item.operational_records;
      return {
        ...item,
        dose_kg_ha: normalizeDecimal(item.dose_kg_ha),
        total_quantity_kg: String(item.total_quantity_kg),
        labor_quantity: normalizeDecimal(item.labor_quantity),
        fuel_l: normalizeDecimal(item.fuel_l),
        operational_record: operationalRecord ?? { status: "confirmed", deleted_at: null },
      };
    });
  }

  async createFertilization(input: SoilFertilizationInput) {
    const { error } = await this.supabase.rpc("create_soil_fertilization_record", {
      target_property_id: input.propertyId,
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_soil_analysis_id: input.soilAnalysisId,
      target_applied_on: input.appliedOn,
      target_fertilizer_name: input.fertilizerName,
      target_dose_kg_ha: input.doseKgHa,
      target_total_quantity_kg: input.totalQuantityKg,
      target_coverage_label: input.coverageLabel,
      target_labor_type: input.laborType,
      target_labor_quantity: input.laborQuantity,
      target_fuel_l: input.fuelL,
      target_responsible_name: input.responsibleName,
      target_notes: input.notes,
      target_client_id: input.clientId ?? crypto.randomUUID(),
    });
    if (error) throwSupabaseError(error);
  }

  async updateFertilization(input: SoilFertilizationInput) {
    const { error } = await this.supabase.rpc("update_soil_fertilization_record", {
      target_fertilization_id: input.fertilizationId,
      target_plot_id: input.plotId,
      target_planting_id: input.plantingId,
      target_season_id: input.seasonId,
      target_soil_analysis_id: input.soilAnalysisId,
      target_applied_on: input.appliedOn,
      target_fertilizer_name: input.fertilizerName,
      target_dose_kg_ha: input.doseKgHa,
      target_total_quantity_kg: input.totalQuantityKg,
      target_coverage_label: input.coverageLabel,
      target_labor_type: input.laborType,
      target_labor_quantity: input.laborQuantity,
      target_fuel_l: input.fuelL,
      target_responsible_name: input.responsibleName,
      target_notes: input.notes,
    });
    if (error) throwSupabaseError(error);
  }

  async deleteFertilization(fertilizationId: string) {
    const { error } = await this.supabase.rpc("delete_soil_fertilization_record", { target_fertilization_id: fertilizationId });
    if (error) throwSupabaseError(error);
  }

  async restoreFertilization(fertilizationId: string) {
    const { error } = await this.supabase.rpc("restore_soil_fertilization_record", { target_fertilization_id: fertilizationId, target_notes: null });
    if (error) throwSupabaseError(error);
  }

  private async listAttachmentsByOperationalRecord(opIds: string[]) {
    if (opIds.length === 0) return {};
    const { data, error } = await this.supabase
      .from("operation_record_attachments")
      .select("id,operational_record_id,filename,storage_path,mime_type,size_bytes,created_at")
      .in("operational_record_id", opIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throwSupabaseError(error);
    const enriched = await Promise.all((data ?? []).map(async (item) => {
      const { data: signed } = await this.supabase.storage.from("private-documents").createSignedUrl(item.storage_path as string, 3600);
      return { item, signed_url: signed?.signedUrl };
    }));
    return enriched.reduce<Record<string, SoilAnalysisAttachment[]>>((acc, { item, signed_url }) => {
      const opId = item.operational_record_id as string;
      acc[opId] ??= [];
      acc[opId].push({
        id: item.id as string,
        filename: item.filename as string,
        storage_path: item.storage_path as string,
        signed_url: signed_url ?? undefined,
        mime_type: item.mime_type as string,
        size_bytes: Number(item.size_bytes),
        created_at: item.created_at as string,
      });
      return acc;
    }, {});
  }
}
