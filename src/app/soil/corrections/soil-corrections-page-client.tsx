"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type React from "react";

import { Edit2, Plus, Save, Sliders, Trash2, X } from "@/components/icons";
import { SystemAlert } from "@/components/atoms/system-alert";
import { Button } from "@/components/ui/button";
import { calculateCorrectionTotal, formatSoilDecimal, summarizeSoilCorrections } from "@/modules/soil-nutrition/domain/rules";
import type { SoilCorrectionRecord, SoilFormContext, SoilOption } from "@/modules/soil-nutrition/domain/types";
import { initialSoilActionState } from "@/modules/soil-nutrition/presentation/action-state";
import { createSoilCorrectionAction, deleteSoilCorrectionAction, restoreSoilCorrectionAction, updateSoilCorrectionAction } from "@/modules/soil-nutrition/presentation/actions";

type Lookup = Record<string, string>;

interface SoilCorrectionsPageProps {
  canManage: boolean;
  propertyId: string;
  propertyName: string;
  corrections: SoilCorrectionRecord[];
  context: SoilFormContext;
  searchParams: Record<string, string | boolean | undefined>;
}

export function SoilCorrectionsPageClient({ canManage, propertyId, propertyName, corrections, context, searchParams }: SoilCorrectionsPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<SoilCorrectionRecord | null>(null);
  const plotById = useMemo(() => Object.fromEntries(context.plots.map((plot) => [plot.id, plot.name])) as Lookup, [context.plots]);
  const plantingById = useMemo(() => Object.fromEntries(context.plantings.map((planting) => [planting.id, planting.name])) as Lookup, [context.plantings]);
  const seasonById = useMemo(() => Object.fromEntries(context.seasons.map((season) => [season.id, `${season.name}${season.status ? ` (${season.status})` : ""}`])) as Lookup, [context.seasons]);
  const analysisById = useMemo(() => Object.fromEntries(context.analyses.map((analysis) => [analysis.id, analysis.label])) as Lookup, [context.analyses]);
  const summary = useMemo(() => summarizeSoilCorrections(corrections), [corrections]);
  const activeFilters = [searchParams.plotId, searchParams.plantingId, searchParams.seasonId, searchParams.soilAnalysisId, searchParams.from, searchParams.to, searchParams.showDeleted ? "1" : ""].filter(Boolean).length;

  return (
    <div className="mt-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">{propertyName}</p>
            <h1 className="mt-1 text-2xl font-bold">Controle de correção do solo</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Preencha a ficha do caderno com corretivo utilizado, PRNT, dose, quantidade total, hh/hm e combustível. Não há recomendação automática nesta etapa.
            </p>
            <p className="mt-2 text-xs font-semibold text-stone-500">{activeFilters ? `${activeFilters} filtro${activeFilters === 1 ? "" : "s"} aplicado${activeFilters === 1 ? "" : "s"}` : "Sem filtros aplicados"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilterOpen(true)}><Sliders className="size-4" aria-hidden="true" />Filtrar</Button>
            {activeFilters > 0 && <a href="/soil/corrections" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Limpar</a>}
          </div>
        </div>
      </section>

      {!canManage ? (
        <SystemAlert tone="warning" className="mt-4">Acesso para consulta: você pode ver correções do solo desta propriedade, mas não criar, editar ou apagar.</SystemAlert>
      ) : (
        <div className="mt-4"><Button type="button" onClick={() => setFormOpen(true)}><Plus className="size-4" aria-hidden="true" />Registrar correção</Button></div>
      )}

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Correções" value={String(summary.correctionsCount)} helper="Registros ativos no filtro atual." />
        <Metric label="Quantidade total" value={`${formatSoilDecimal(summary.totalQuantityT)} t`} helper="Soma dos corretivos registrados." />
        <Metric label="Última aplicação" value={summary.latestAppliedOn ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${summary.latestAppliedOn}T12:00:00`)) : "—"} helper="Data mais recente no filtro." />
      </section>

      <section className="mt-4 grid gap-3">
        {corrections.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-stone-600">Nenhuma correção registrada. Use “Registrar correção” para preencher a primeira linha da ficha.</div>
        ) : corrections.map((correction) => (
          <article key={correction.id} className="rounded-2xl border bg-white p-4">
            <CorrectionCard correction={correction} plotById={plotById} plantingById={plantingById} seasonById={seasonById} analysisById={analysisById} />
            <div className="mt-3 flex flex-wrap gap-2">
              {canManage && !correction.operational_record.deleted_at && <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(correction)}><Edit2 className="size-4" aria-hidden="true" />Editar</Button>}
              {canManage && !correction.operational_record.deleted_at && <DeleteCorrectionButton correctionId={correction.id} />}
              {canManage && correction.operational_record.deleted_at && <RestoreCorrectionButton correctionId={correction.id} />}
              {correction.operational_record.deleted_at && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Apagado</span>}
            </div>
          </article>
        ))}
      </section>

      {formOpen && <CorrectionModal propertyId={propertyId} context={context} searchParams={searchParams} onClose={() => setFormOpen(false)} />}
      {editing && <CorrectionModal propertyId={propertyId} context={context} correction={editing} searchParams={searchParams} onClose={() => setEditing(null)} />}
      {filterOpen && <CorrectionFilterModal context={context} searchParams={searchParams} onClose={() => setFilterOpen(false)} />}
    </div>
  );
}

function CorrectionCard({ correction, plotById, plantingById, seasonById, analysisById }: { correction: SoilCorrectionRecord; plotById: Lookup; plantingById: Lookup; seasonById: Lookup; analysisById: Lookup }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-emerald-800">{plotById[correction.plot_id] ?? "Talhão"}{correction.season_id ? ` · ${seasonById[correction.season_id] ?? "Safra"}` : ""}</p>
          <h2 className="text-lg font-bold">{correction.corrective_name}</h2>
          <p className="text-sm text-stone-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(`${correction.applied_on}T12:00:00`))}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">Confirmado</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <ContextItem label="PRNT" value={correction.prnt_pct ? `${formatSoilDecimal(correction.prnt_pct)}%` : "Não informado"} />
        <ContextItem label="Dose recomendada" value={correction.recommended_dose_t_ha ? `${formatSoilDecimal(correction.recommended_dose_t_ha)} ton/ha` : "Não informada"} />
        <ContextItem label="Quantidade total" value={`${formatSoilDecimal(correction.total_quantity_t)} ton`} />
        <ContextItem label="hh/hm" value={correction.labor_type && correction.labor_quantity ? `${correction.labor_type} · ${formatSoilDecimal(correction.labor_quantity)}` : "Não informado"} />
        <ContextItem label="Combustível" value={correction.fuel_l ? `${formatSoilDecimal(correction.fuel_l)} L` : "Não informado"} />
        <ContextItem label="Responsável" value={correction.responsible_name ?? "Não informado"} />
        <ContextItem label="Análise referência" value={correction.soil_analysis_id ? analysisById[correction.soil_analysis_id] ?? "Análise vinculada" : "Não vinculada"} />
        <ContextItem label="Lavoura" value={correction.planting_id ? plantingById[correction.planting_id] ?? "Lavoura" : "Não vinculada"} />
      </dl>
      {correction.notes && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{correction.notes}</p>}
    </div>
  );
}

function CorrectionModal({ propertyId, context, correction, searchParams, onClose }: { propertyId: string; context: SoilFormContext; correction?: SoilCorrectionRecord; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  const action = correction ? updateSoilCorrectionAction : createSoilCorrectionAction;
  const [state, formAction, pending] = useActionState(action, initialSoilActionState);
  const clientId = useMemo(() => crypto.randomUUID(), []);
  const values = state.values ?? {};
  const selectedPlotId = values.plotId ?? correction?.plot_id ?? String(searchParams.plotId ?? "");
  const selectedPlot = context.plots.find((plot) => plot.id === selectedPlotId);
  const calculatedTotal = calculateCorrectionTotal(Number(String(selectedPlot?.area_ha ?? "").replace(",", ".")) || null, Number(String(values.recommendedDoseTHa ?? correction?.recommended_dose_t_ha ?? "").replace(",", ".")) || null);
  useEffect(() => { if (state.status === "success") onClose(); }, [state.status, onClose]);

  return (
    <Modal title={correction ? "Editar correção do solo" : "Registrar correção do solo"} onClose={onClose}>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="correctionId" value={correction?.id ?? ""} />
        <input type="hidden" name="clientId" value={correction ? "" : clientId} />
        {state.status === "error" && <SystemAlert tone="error">{state.message}</SystemAlert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Talhão" name="plotId" defaultValue={selectedPlotId} options={context.plots} error={state.fieldErrors?.plotId?.[0]} required />
          <SelectField label="Lavoura vinculada" name="plantingId" defaultValue={values.plantingId ?? correction?.planting_id ?? ""} options={context.plantings.filter((planting) => !selectedPlotId || planting.plot_id === selectedPlotId)} error={state.fieldErrors?.plantingId?.[0]} />
          <SelectField label="Safra" name="seasonId" defaultValue={values.seasonId ?? correction?.season_id ?? String(searchParams.seasonId ?? "")} options={context.seasons} error={state.fieldErrors?.seasonId?.[0]} />
          <SelectField label="Análise de solo de referência" name="soilAnalysisId" defaultValue={values.soilAnalysisId ?? correction?.soil_analysis_id ?? ""} options={context.analyses.filter((analysis) => !selectedPlotId || analysis.plot_id === selectedPlotId).map((analysis) => ({ id: analysis.id, name: analysis.label }))} error={state.fieldErrors?.soilAnalysisId?.[0]} />
          <Input label="Data de aplicação" name="appliedOn" type="date" defaultValue={values.appliedOn ?? correction?.applied_on ?? new Date().toISOString().slice(0, 10)} error={state.fieldErrors?.appliedOn?.[0]} required />
          <Input label="Corretivo utilizado" name="correctiveName" defaultValue={values.correctiveName ?? correction?.corrective_name ?? ""} error={state.fieldErrors?.correctiveName?.[0]} required />
          <Input label="PRNT (%)" name="prntPct" defaultValue={values.prntPct ?? correction?.prnt_pct ?? ""} error={state.fieldErrors?.prntPct?.[0]} inputMode="decimal" />
          <Input label="Dose recomendada (ton/ha)" name="recommendedDoseTHa" defaultValue={values.recommendedDoseTHa ?? correction?.recommended_dose_t_ha ?? ""} error={state.fieldErrors?.recommendedDoseTHa?.[0]} inputMode="decimal" />
          <Input label="Quantidade total (ton)" name="totalQuantityT" defaultValue={values.totalQuantityT ?? correction?.total_quantity_t ?? (calculatedTotal ? String(calculatedTotal) : "")} error={state.fieldErrors?.totalQuantityT?.[0]} inputMode="decimal" required />
          <SelectField label="Tipo de demanda" name="laborType" defaultValue={values.laborType ?? correction?.labor_type ?? ""} options={[{ id: "hh", name: "hh - hora homem" }, { id: "hm", name: "hm - hora máquina" }]} error={state.fieldErrors?.laborType?.[0]} />
          <Input label="Quantidade hh/hm" name="laborQuantity" defaultValue={values.laborQuantity ?? correction?.labor_quantity ?? ""} error={state.fieldErrors?.laborQuantity?.[0]} inputMode="decimal" />
          <Input label="Combustível (L)" name="fuelL" defaultValue={values.fuelL ?? correction?.fuel_l ?? ""} error={state.fieldErrors?.fuelL?.[0]} inputMode="decimal" />
          <Input label="Responsável" name="responsibleName" defaultValue={values.responsibleName ?? correction?.responsible_name ?? ""} error={state.fieldErrors?.responsibleName?.[0]} />
        </div>
        <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">Se a dose e a área do talhão estiverem disponíveis, o sistema sugere a quantidade total. Revise antes de salvar.</p>
        <label className="grid gap-1 text-sm font-medium">Observações<textarea name="notes" defaultValue={values.notes ?? correction?.notes ?? ""} rows={3} className="rounded-xl border border-stone-200 px-3 py-2 font-normal" /></label>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}><Save className="size-4" aria-hidden="true" />{pending ? "Salvando..." : "Salvar"}</Button></div>
      </form>
    </Modal>
  );
}

function CorrectionFilterModal({ context, searchParams, onClose }: { context: SoilFormContext; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  return (
    <Modal title="Filtrar correções do solo" onClose={onClose}>
      <form action="/soil/corrections" className="grid gap-4">
        <SelectField label="Talhão" name="plotId" defaultValue={String(searchParams.plotId ?? "")} options={context.plots} />
        <SelectField label="Lavoura" name="plantingId" defaultValue={String(searchParams.plantingId ?? "")} options={context.plantings} />
        <SelectField label="Safra" name="seasonId" defaultValue={String(searchParams.seasonId ?? "")} options={context.seasons} />
        <SelectField label="Análise de referência" name="soilAnalysisId" defaultValue={String(searchParams.soilAnalysisId ?? "")} options={context.analyses.map((analysis) => ({ id: analysis.id, name: analysis.label }))} />
        <div className="grid gap-3 sm:grid-cols-2"><Input label="De" name="from" type="date" defaultValue={String(searchParams.from ?? "")} /><Input label="Até" name="to" type="date" defaultValue={String(searchParams.to ?? "")} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showDeleted" value="1" defaultChecked={Boolean(searchParams.showDeleted)} />Mostrar registros apagados logicamente</label>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Aplicar filtros</Button></div>
      </form>
    </Modal>
  );
}

function DeleteCorrectionButton({ correctionId }: { correctionId: string }) {
  const [state, action, pending] = useActionState(deleteSoilCorrectionAction, initialSoilActionState);
  return <form action={action}><input type="hidden" name="correctionId" value={correctionId} /><Button type="submit" variant="ghost" size="sm" disabled={pending} onClick={(event) => { if (!confirm("Apagar esta correção? Ela ficará no histórico e poderá ser restaurada.")) event.preventDefault(); }}><Trash2 className="size-4" aria-hidden="true" />Apagar</Button>{state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}</form>;
}

function RestoreCorrectionButton({ correctionId }: { correctionId: string }) {
  const [state, action, pending] = useActionState(restoreSoilCorrectionAction, initialSoilActionState);
  return <form action={action}><input type="hidden" name="correctionId" value={correctionId} /><Button type="submit" variant="secondary" size="sm" disabled={pending}>Restaurar</Button>{state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}</form>;
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <article className="rounded-2xl border bg-white p-5"><p className="text-sm text-stone-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-stone-500">{helper}</p></article>;
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 font-medium text-stone-800">{value}</dd></div>;
}

function SelectField({ label, name, defaultValue, options, error, required }: { label: string; name: string; defaultValue?: string; options: Array<Pick<SoilOption, "id" | "name" | "status">>; error?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-medium">{label}<select name={name} defaultValue={defaultValue ?? ""} required={required} className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 py-2 font-normal"><option value="">{required ? "Selecione" : "Não informar"}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}{option.status ? ` (${option.status})` : ""}</option>)}</select>{error && <span className="text-xs text-red-700">{error}</span>}</label>;
}

function Input({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="grid gap-1 text-sm font-medium">{label}<input {...props} className="min-h-11 rounded-xl border border-stone-200 px-3 py-2 font-normal" />{error && <span className="text-xs text-red-700">{error}</span>}</label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/40 p-4"><div className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-xl"><div className="mb-4 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Ficha do caderno</p><h2 className="text-xl font-bold">{title}</h2></div><Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="size-5" aria-hidden="true" /></Button></div>{children}</div></div>;
}
