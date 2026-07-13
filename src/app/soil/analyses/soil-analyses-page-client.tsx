"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type React from "react";

import { Edit2, FileText, Plus, Save, Sliders, Trash2, X } from "@/components/icons";
import { SystemAlert } from "@/components/atoms/system-alert";
import { Button } from "@/components/ui/button";
import { formatSoilDecimal, soilAnalysisStatusLabel, summarizeSoilAnalyses } from "@/modules/soil-nutrition/domain/rules";
import type { SoilAnalysisRecord, SoilFormContext, SoilOption } from "@/modules/soil-nutrition/domain/types";
import { initialSoilActionState } from "@/modules/soil-nutrition/presentation/action-state";
import { createSoilAnalysisAction, deleteSoilAnalysisAction, restoreSoilAnalysisAction, updateSoilAnalysisAction } from "@/modules/soil-nutrition/presentation/actions";

type Lookup = Record<string, string>;

const parameterFields = [
  ["phWater", "pH em água"], ["phCacl2", "pH em CaCl₂"], ["phKcl", "pH em KCl"], ["pMgDm3", "P (mg/dm³)"], ["kMgDm3", "K (mg/dm³)"],
  ["caCmolcDm3", "Ca (cmolc/dm³)"], ["mgCmolcDm3", "Mg (cmolc/dm³)"], ["alCmolcDm3", "Al (cmolc/dm³)"], ["hAlCmolcDm3", "H+Al (cmolc/dm³)"],
  ["cOrgPct", "C orgânico (%)"], ["sbCmolcDm3", "SB"], ["effectiveCtcCmolcDm3", "t"], ["ctcPh7CmolcDm3", "T"], ["baseSaturationPct", "V (%)"],
  ["aluminumSaturationPct", "m (%)"], ["organicMatterDagKg", "M.O. (dag/kg)"], ["bMgDm3", "B"], ["znMgDm3", "Zn"], ["cuMgDm3", "Cu"],
  ["feMgDm3", "Fe"], ["mnMgDm3", "Mn"], ["sMgDm3", "S"], ["pRemMgL", "P-Rem (mg/L)"], ["sandPct", "Areia (%)"], ["siltPct", "Silte (%)"], ["clayPct", "Argila (%)"],
] as const;

const recordKeyByInputName: Record<(typeof parameterFields)[number][0], keyof SoilAnalysisRecord> = {
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

interface SoilAnalysesPageProps {
  canManage: boolean;
  propertyId: string;
  propertyName: string;
  analyses: SoilAnalysisRecord[];
  context: SoilFormContext;
  searchParams: Record<string, string | boolean | undefined>;
}

export function SoilAnalysesPageClient({ canManage, propertyId, propertyName, analyses, context, searchParams }: SoilAnalysesPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<SoilAnalysisRecord | null>(null);
  const plotById = useMemo(() => Object.fromEntries(context.plots.map((plot) => [plot.id, plot.name])) as Lookup, [context.plots]);
  const plantingById = useMemo(() => Object.fromEntries(context.plantings.map((planting) => [planting.id, planting.name])) as Lookup, [context.plantings]);
  const seasonById = useMemo(() => Object.fromEntries(context.seasons.map((season) => [season.id, `${season.name}${season.status ? ` (${season.status})` : ""}`])) as Lookup, [context.seasons]);
  const summary = useMemo(() => summarizeSoilAnalyses(analyses), [analyses]);
  const activeFilters = [searchParams.plotId, searchParams.plantingId, searchParams.seasonId, searchParams.from, searchParams.to, searchParams.showDeleted ? "1" : ""].filter(Boolean).length;

  return (
    <div className="mt-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">{propertyName}</p>
            <h1 className="mt-1 text-2xl font-bold">Controle de análises de solo</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Preencha a ficha do caderno com os resultados do laudo por talhão e profundidade. A importação de PDF ficará para a continuação 6A.2.
            </p>
            <p className="mt-2 text-xs font-semibold text-stone-500">{activeFilters ? `${activeFilters} filtro${activeFilters === 1 ? "" : "s"} aplicado${activeFilters === 1 ? "" : "s"}` : "Sem filtros aplicados"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilterOpen(true)}><Sliders className="size-4" aria-hidden="true" />Filtrar</Button>
            {activeFilters > 0 && <a href="/soil/analyses" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Limpar</a>}
          </div>
        </div>
      </section>

      {!canManage ? (
        <SystemAlert tone="warning" className="mt-4">Acesso para consulta: você pode ver as análises de solo desta propriedade, mas não criar, editar ou apagar.</SystemAlert>
      ) : (
        <div className="mt-4">
          <Button type="button" onClick={() => setFormOpen(true)}><Plus className="size-4" aria-hidden="true" />Registrar análise</Button>
        </div>
      )}

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Análises" value={String(summary.analysesCount)} helper="Registros ativos no filtro atual." />
        <Metric label="Laudos anexados" value={String(summary.reportsCount)} helper="Arquivos privados ligados às análises." />
        <Metric label="Última coleta" value={summary.latestCollectedOn ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${summary.latestCollectedOn}T12:00:00`)) : "—"} helper="Data mais recente no filtro." />
      </section>

      <section className="mt-4 grid gap-3">
        {analyses.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-stone-600">Nenhuma análise de solo registrada. Use “Registrar análise” para preencher a primeira linha da ficha.</div>
        ) : (
          analyses.map((analysis) => (
            <article key={analysis.id} className="rounded-2xl border bg-white p-4">
              <AnalysisCard analysis={analysis} plotById={plotById} plantingById={plantingById} seasonById={seasonById} />
              <div className="mt-3 flex flex-wrap gap-2">
                {canManage && !analysis.operational_record.deleted_at && <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(analysis)}><Edit2 className="size-4" aria-hidden="true" />Editar</Button>}
                {canManage && !analysis.operational_record.deleted_at && <DeleteAnalysisButton analysisId={analysis.id} />}
                {canManage && analysis.operational_record.deleted_at && <RestoreAnalysisButton analysisId={analysis.id} />}
                {analysis.operational_record.deleted_at && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Apagado</span>}
              </div>
            </article>
          ))
        )}
      </section>

      {formOpen && <AnalysisModal propertyId={propertyId} context={context} searchParams={searchParams} onClose={() => setFormOpen(false)} />}
      {editing && <AnalysisModal propertyId={propertyId} context={context} analysis={editing} searchParams={searchParams} onClose={() => setEditing(null)} />}
      {filterOpen && <AnalysisFilterModal context={context} searchParams={searchParams} onClose={() => setFilterOpen(false)} />}
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <article className="rounded-2xl border bg-white p-5"><p className="text-sm text-stone-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-stone-500">{helper}</p></article>;
}

function AnalysisCard({ analysis, plotById, plantingById, seasonById }: { analysis: SoilAnalysisRecord; plotById: Lookup; plantingById: Lookup; seasonById: Lookup }) {
  const highlights: Array<[string, string | null]> = [
    ["pH água", analysis.ph_water], ["P", analysis.p_mg_dm3], ["K", analysis.k_mg_dm3], ["Ca", analysis.ca_cmolc_dm3], ["Mg", analysis.mg_cmolc_dm3], ["V%", analysis.base_saturation_pct],
  ];
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-emerald-800">{plotById[analysis.plot_id] ?? "Talhão"} · {analysis.depth_cm}</p>
          <h2 className="text-lg font-bold">{analysis.laboratory_name ?? "Análise de solo"}</h2>
          <p className="text-sm text-stone-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(`${analysis.collected_on}T12:00:00`))}{analysis.season_id ? ` · ${seasonById[analysis.season_id] ?? "Safra"}` : ""}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">{soilAnalysisStatusLabel(analysis.import_status)}</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
        {highlights.map(([label, value]) => <ContextItem key={label} label={label} value={formatSoilDecimal(value)} />)}
      </dl>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <ContextItem label="Laudo" value={analysis.report_number ?? "Não informado"} />
        <ContextItem label="Lavoura" value={analysis.planting_id ? plantingById[analysis.planting_id] ?? "Lavoura" : "Não vinculada"} />
        <ContextItem label="Granulometria" value={`Areia ${formatSoilDecimal(analysis.sand_pct)} · Silte ${formatSoilDecimal(analysis.silt_pct)} · Argila ${formatSoilDecimal(analysis.clay_pct)}`} />
      </dl>
      {analysis.attachments.length > 0 && (
        <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm">
          <p className="font-semibold">Laudo original</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {analysis.attachments.map((attachment) => attachment.signed_url ? (
              <a key={attachment.id} href={attachment.signed_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-emerald-800 ring-1 ring-stone-200">
                <FileText className="size-4" aria-hidden="true" />{attachment.filename}
              </a>
            ) : <span key={attachment.id}>{attachment.filename}</span>)}
          </div>
        </div>
      )}
      {analysis.notes && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{analysis.notes}</p>}
    </div>
  );
}

function AnalysisModal({ propertyId, context, analysis, searchParams, onClose }: { propertyId: string; context: SoilFormContext; analysis?: SoilAnalysisRecord; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  const action = analysis ? updateSoilAnalysisAction : createSoilAnalysisAction;
  const [state, formAction, pending] = useActionState(action, initialSoilActionState);
  const clientId = useMemo(() => crypto.randomUUID(), []);
  const values = state.values ?? {};
  const selectedPlotId = values.plotId ?? analysis?.plot_id ?? String(searchParams.plotId ?? "");

  useEffect(() => { if (state.status === "success") onClose(); }, [state.status, onClose]);

  return (
    <Modal title={analysis ? "Editar análise de solo" : "Registrar análise de solo"} onClose={onClose}>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="analysisId" value={analysis?.id ?? ""} />
        <input type="hidden" name="clientId" value={analysis ? "" : clientId} />
        <input type="hidden" name="importStatus" value={analysis?.import_status ?? "manual"} />
        {state.status === "error" && <SystemAlert tone="error">{state.message}</SystemAlert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Talhão" name="plotId" defaultValue={selectedPlotId} options={context.plots} error={state.fieldErrors?.plotId?.[0]} required />
          <SelectField label="Lavoura vinculada" name="plantingId" defaultValue={values.plantingId ?? analysis?.planting_id ?? ""} options={context.plantings.filter((planting) => !selectedPlotId || planting.plot_id === selectedPlotId)} error={state.fieldErrors?.plantingId?.[0]} />
          <SelectField label="Safra" name="seasonId" defaultValue={values.seasonId ?? analysis?.season_id ?? String(searchParams.seasonId ?? "")} options={context.seasons} error={state.fieldErrors?.seasonId?.[0]} />
          <Input label="Data da coleta" name="collectedOn" type="date" defaultValue={values.collectedOn ?? analysis?.collected_on ?? new Date().toISOString().slice(0, 10)} error={state.fieldErrors?.collectedOn?.[0]} required />
          <Input label="Profundidade" name="depthCm" defaultValue={values.depthCm ?? analysis?.depth_cm ?? "0-20 cm"} error={state.fieldErrors?.depthCm?.[0]} required />
          <Input label="Laboratório" name="laboratoryName" defaultValue={values.laboratoryName ?? analysis?.laboratory_name ?? ""} error={state.fieldErrors?.laboratoryName?.[0]} />
          <Input label="Número do laudo/protocolo" name="reportNumber" defaultValue={values.reportNumber ?? analysis?.report_number ?? ""} error={state.fieldErrors?.reportNumber?.[0]} />
          <label className="grid gap-1 text-sm font-medium">
            Anexar laudo original
            <input name="reportFile" type="file" accept="application/pdf,image/png,image/jpeg,image/heic" className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 py-2 font-normal" />
            <span className="text-xs text-stone-500">PDF ou imagem. A importação automática virá em uma etapa posterior.</span>
          </label>
        </div>
        <section>
          <h3 className="font-bold">Resultados da análise</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {parameterFields.map(([name, label]) => (
              <Input
                key={name}
                label={label}
                name={name}
                defaultValue={values[name] ?? String(analysis?.[recordKeyByInputName[name]] ?? "")}
                error={state.fieldErrors?.[name]?.[0]}
                inputMode="decimal"
              />
            ))}
          </div>
        </section>
        <label className="grid gap-1 text-sm font-medium">
          Observações
          <textarea name="notes" defaultValue={values.notes ?? analysis?.notes ?? ""} rows={3} className="rounded-xl border border-stone-200 px-3 py-2 font-normal" />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}><Save className="size-4" aria-hidden="true" />{pending ? "Salvando..." : "Salvar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AnalysisFilterModal({ context, searchParams, onClose }: { context: SoilFormContext; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  return (
    <Modal title="Filtrar análises de solo" onClose={onClose}>
      <form action="/soil/analyses" className="grid gap-4">
        <SelectField label="Talhão" name="plotId" defaultValue={String(searchParams.plotId ?? "")} options={context.plots} />
        <SelectField label="Lavoura" name="plantingId" defaultValue={String(searchParams.plantingId ?? "")} options={context.plantings} />
        <SelectField label="Safra" name="seasonId" defaultValue={String(searchParams.seasonId ?? "")} options={context.seasons} />
        <div className="grid gap-3 sm:grid-cols-2"><Input label="De" name="from" type="date" defaultValue={String(searchParams.from ?? "")} /><Input label="Até" name="to" type="date" defaultValue={String(searchParams.to ?? "")} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showDeleted" value="1" defaultChecked={Boolean(searchParams.showDeleted)} />Mostrar registros apagados logicamente</label>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Aplicar filtros</Button></div>
      </form>
    </Modal>
  );
}

function DeleteAnalysisButton({ analysisId }: { analysisId: string }) {
  const [state, action, pending] = useActionState(deleteSoilAnalysisAction, initialSoilActionState);
  return <form action={action}><input type="hidden" name="analysisId" value={analysisId} /><Button type="submit" variant="ghost" size="sm" disabled={pending} onClick={(event) => { if (!confirm("Apagar esta análise? Ela ficará no histórico e poderá ser restaurada.")) event.preventDefault(); }}><Trash2 className="size-4" aria-hidden="true" />Apagar</Button>{state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}</form>;
}

function RestoreAnalysisButton({ analysisId }: { analysisId: string }) {
  const [state, action, pending] = useActionState(restoreSoilAnalysisAction, initialSoilActionState);
  return <form action={action}><input type="hidden" name="analysisId" value={analysisId} /><Button type="submit" variant="secondary" size="sm" disabled={pending}>Restaurar</Button>{state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}</form>;
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 font-medium text-stone-800">{value}</dd></div>;
}

function SelectField({ label, name, defaultValue, options, error, required }: { label: string; name: string; defaultValue?: string; options: SoilOption[]; error?: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} required={required} className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 py-2 font-normal">
        <option value="">{required ? "Selecione" : "Não informar"}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}{option.status ? ` (${option.status})` : ""}</option>)}
      </select>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

function Input({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="grid gap-1 text-sm font-medium">{label}<input {...props} className="min-h-11 rounded-xl border border-stone-200 px-3 py-2 font-normal" />{error && <span className="text-xs text-red-700">{error}</span>}</label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/40 p-4">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Ficha do caderno</p><h2 className="text-xl font-bold">{title}</h2></div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="size-5" aria-hidden="true" /></Button>
        </div>
        {children}
      </div>
    </div>
  );
}
