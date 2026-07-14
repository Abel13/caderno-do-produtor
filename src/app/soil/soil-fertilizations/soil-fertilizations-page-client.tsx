"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type React from "react";

import { Edit2, Plus, Save, Sliders, Trash2, X } from "@/components/icons";
import { SystemAlert } from "@/components/atoms/system-alert";
import { Button } from "@/components/ui/button";
import { calculateSoilFertilizationTotal, formatSoilDecimal, summarizeSoilFertilizations } from "@/modules/soil-nutrition/domain/rules";
import type { SoilFertilizationRecord, SoilFormContext, SoilOption } from "@/modules/soil-nutrition/domain/types";
import { initialSoilActionState } from "@/modules/soil-nutrition/presentation/action-state";
import { createSoilFertilizationAction, deleteSoilFertilizationAction, restoreSoilFertilizationAction, updateSoilFertilizationAction } from "@/modules/soil-nutrition/presentation/actions";

type Lookup = Record<string, string>;

interface SoilFertilizationsPageProps {
  canManage: boolean;
  propertyId: string;
  propertyName: string;
  fertilizations: SoilFertilizationRecord[];
  context: SoilFormContext;
  searchParams: Record<string, string | boolean | undefined>;
}

export function SoilFertilizationsPageClient({ canManage, propertyId, propertyName, fertilizations, context, searchParams }: SoilFertilizationsPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<SoilFertilizationRecord | null>(null);
  const plotById = useMemo(() => Object.fromEntries(context.plots.map((plot) => [plot.id, plot.name])) as Lookup, [context.plots]);
  const plantingById = useMemo(() => Object.fromEntries(context.plantings.map((planting) => [planting.id, planting.name])) as Lookup, [context.plantings]);
  const seasonById = useMemo(() => Object.fromEntries(context.seasons.map((season) => [season.id, `${season.name}${season.status ? ` (${season.status})` : ""}`])) as Lookup, [context.seasons]);
  const analysisById = useMemo(() => Object.fromEntries(context.analyses.map((analysis) => [analysis.id, analysis.label])) as Lookup, [context.analyses]);
  const summary = useMemo(() => summarizeSoilFertilizations(fertilizations), [fertilizations]);
  const activeFilters = [searchParams.plotId, searchParams.plantingId, searchParams.seasonId, searchParams.soilAnalysisId, searchParams.fertilizerName, searchParams.from, searchParams.to, searchParams.showDeleted ? "1" : ""].filter(Boolean).length;

  return (
    <div className="mt-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">{propertyName}</p>
            <h1 className="mt-1 text-2xl font-bold">Controle de adubação via solo</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Preencha a ficha realizada com talhão, data, insumo, dose em kg/ha, quantidade em kg/talhão, cobertura, hh/hm e combustível.
            </p>
            <p className="mt-2 text-xs font-semibold text-stone-500">{activeFilters ? `${activeFilters} filtro${activeFilters === 1 ? "" : "s"} aplicado${activeFilters === 1 ? "" : "s"}` : "Sem filtros aplicados"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilterOpen(true)}><Sliders className="size-4" aria-hidden="true" />Filtrar</Button>
            {activeFilters > 0 && <a href="/soil/soil-fertilizations" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Limpar</a>}
          </div>
        </div>
      </section>

      {!canManage ? (
        <SystemAlert tone="warning" className="mt-4">Acesso para consulta: você pode ver adubações via solo desta propriedade, mas não criar, editar ou apagar.</SystemAlert>
      ) : (
        <div className="mt-4"><Button type="button" onClick={() => setFormOpen(true)}><Plus className="size-4" aria-hidden="true" />Registrar adubação</Button></div>
      )}

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Adubações" value={String(summary.fertilizationsCount)} helper="Registros ativos no filtro atual." />
        <Metric label="Quantidade total" value={`${formatSoilDecimal(summary.totalQuantityKg)} kg`} helper="Soma dos insumos registrados." />
        <Metric label="Última aplicação" value={summary.latestAppliedOn ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${summary.latestAppliedOn}T12:00:00`)) : "—"} helper="Data mais recente no filtro." />
      </section>

      <section className="mt-4 grid gap-3">
        {fertilizations.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-stone-600">Nenhuma adubação via solo registrada. Use “Registrar adubação” para preencher a primeira linha da ficha.</div>
        ) : fertilizations.map((fertilization) => (
          <article key={fertilization.id} className="rounded-2xl border bg-white p-4">
            <FertilizationCard fertilization={fertilization} plotById={plotById} plantingById={plantingById} seasonById={seasonById} analysisById={analysisById} />
            <div className="mt-3 flex flex-wrap gap-2">
              {canManage && !fertilization.operational_record.deleted_at && <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(fertilization)}><Edit2 className="size-4" aria-hidden="true" />Editar</Button>}
              {canManage && !fertilization.operational_record.deleted_at && <DeleteFertilizationButton fertilizationId={fertilization.id} />}
              {canManage && fertilization.operational_record.deleted_at && <RestoreFertilizationButton fertilizationId={fertilization.id} />}
              {fertilization.operational_record.deleted_at && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Apagado</span>}
            </div>
          </article>
        ))}
      </section>

      {formOpen && <FertilizationModal propertyId={propertyId} context={context} searchParams={searchParams} onClose={() => setFormOpen(false)} />}
      {editing && <FertilizationModal propertyId={propertyId} context={context} fertilization={editing} searchParams={searchParams} onClose={() => setEditing(null)} />}
      {filterOpen && <FertilizationFilterModal context={context} searchParams={searchParams} onClose={() => setFilterOpen(false)} />}
    </div>
  );
}

function FertilizationCard({ fertilization, plotById, plantingById, seasonById, analysisById }: { fertilization: SoilFertilizationRecord; plotById: Lookup; plantingById: Lookup; seasonById: Lookup; analysisById: Lookup }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-emerald-800">{plotById[fertilization.plot_id] ?? "Talhão"}{fertilization.season_id ? ` · ${seasonById[fertilization.season_id] ?? "Safra"}` : ""}</p>
          <h2 className="text-lg font-bold">{fertilization.fertilizer_name}</h2>
          <p className="text-sm text-stone-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(`${fertilization.applied_on}T12:00:00`))}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">Confirmado</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <ContextItem label="Dose" value={fertilization.dose_kg_ha ? `${formatSoilDecimal(fertilization.dose_kg_ha)} kg/ha` : "Não informada"} />
        <ContextItem label="Quantidade total" value={`${formatSoilDecimal(fertilization.total_quantity_kg)} kg/talhão`} />
        <ContextItem label="Cobertura/parcela" value={fertilization.coverage_label ?? "Não informada"} />
        <ContextItem label="hh/hm" value={fertilization.labor_type && fertilization.labor_quantity ? `${fertilization.labor_type} · ${formatSoilDecimal(fertilization.labor_quantity)}` : "Não informado"} />
        <ContextItem label="Combustível" value={fertilization.fuel_l ? `${formatSoilDecimal(fertilization.fuel_l)} L` : "Não informado"} />
        <ContextItem label="Responsável" value={fertilization.responsible_name ?? "Não informado"} />
        <ContextItem label="Análise referência" value={fertilization.soil_analysis_id ? analysisById[fertilization.soil_analysis_id] ?? "Análise vinculada" : "Não vinculada"} />
        <ContextItem label="Lavoura" value={fertilization.planting_id ? plantingById[fertilization.planting_id] ?? "Lavoura" : "Não vinculada"} />
      </dl>
      {fertilization.notes && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{fertilization.notes}</p>}
    </div>
  );
}

function FertilizationModal({ propertyId, context, fertilization, searchParams, onClose }: { propertyId: string; context: SoilFormContext; fertilization?: SoilFertilizationRecord; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  const action = fertilization ? updateSoilFertilizationAction : createSoilFertilizationAction;
  const [state, formAction, pending] = useActionState(action, initialSoilActionState);
  const clientId = useMemo(() => crypto.randomUUID(), []);
  const values = state.values ?? {};
  const selectedPlotId = values.plotId ?? fertilization?.plot_id ?? String(searchParams.plotId ?? "");
  const selectedPlot = context.plots.find((plot) => plot.id === selectedPlotId);
  const calculatedTotal = calculateSoilFertilizationTotal(Number(String(selectedPlot?.area_ha ?? "").replace(",", ".")) || null, Number(String(values.doseKgHa ?? fertilization?.dose_kg_ha ?? "").replace(",", ".")) || null);
  useEffect(() => { if (state.status === "success") onClose(); }, [state.status, onClose]);

  return (
    <Modal title={fertilization ? "Editar adubação via solo" : "Registrar adubação via solo"} onClose={onClose}>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="fertilizationId" value={fertilization?.id ?? ""} />
        <input type="hidden" name="clientId" value={fertilization ? "" : clientId} />
        {state.status === "error" && <SystemAlert tone="error">{state.message}</SystemAlert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Talhão" name="plotId" defaultValue={selectedPlotId} options={context.plots} error={state.fieldErrors?.plotId?.[0]} required />
          <SelectField label="Lavoura vinculada" name="plantingId" defaultValue={values.plantingId ?? fertilization?.planting_id ?? ""} options={context.plantings.filter((planting) => !selectedPlotId || planting.plot_id === selectedPlotId)} error={state.fieldErrors?.plantingId?.[0]} />
          <SelectField label="Safra" name="seasonId" defaultValue={values.seasonId ?? fertilization?.season_id ?? String(searchParams.seasonId ?? "")} options={context.seasons} error={state.fieldErrors?.seasonId?.[0]} />
          <SelectField label="Análise de solo de referência" name="soilAnalysisId" defaultValue={values.soilAnalysisId ?? fertilization?.soil_analysis_id ?? ""} options={context.analyses.filter((analysis) => !selectedPlotId || analysis.plot_id === selectedPlotId).map((analysis) => ({ id: analysis.id, name: analysis.label }))} error={state.fieldErrors?.soilAnalysisId?.[0]} />
          <Input label="Data de aplicação" name="appliedOn" type="date" defaultValue={values.appliedOn ?? fertilization?.applied_on ?? new Date().toISOString().slice(0, 10)} error={state.fieldErrors?.appliedOn?.[0]} required />
          <Input label="Nome do insumo/fertilizante" name="fertilizerName" defaultValue={values.fertilizerName ?? fertilization?.fertilizer_name ?? ""} error={state.fieldErrors?.fertilizerName?.[0]} required />
          <Input label="Dose (kg/ha)" name="doseKgHa" defaultValue={values.doseKgHa ?? fertilization?.dose_kg_ha ?? ""} error={state.fieldErrors?.doseKgHa?.[0]} inputMode="decimal" />
          <Input label="Quantidade total (kg/talhão)" name="totalQuantityKg" defaultValue={values.totalQuantityKg ?? fertilization?.total_quantity_kg ?? (calculatedTotal ? String(calculatedTotal) : "")} error={state.fieldErrors?.totalQuantityKg?.[0]} inputMode="decimal" required />
          <Input label="Cobertura/parcela" name="coverageLabel" placeholder="Ex.: 1ª cobertura" defaultValue={values.coverageLabel ?? fertilization?.coverage_label ?? ""} error={state.fieldErrors?.coverageLabel?.[0]} />
          <SelectField label="Tipo de demanda" name="laborType" defaultValue={values.laborType ?? fertilization?.labor_type ?? ""} options={[{ id: "hh", name: "hh - hora homem" }, { id: "hm", name: "hm - hora máquina" }]} error={state.fieldErrors?.laborType?.[0]} />
          <Input label="Quantidade hh/hm" name="laborQuantity" defaultValue={values.laborQuantity ?? fertilization?.labor_quantity ?? ""} error={state.fieldErrors?.laborQuantity?.[0]} inputMode="decimal" />
          <Input label="Combustível (L)" name="fuelL" defaultValue={values.fuelL ?? fertilization?.fuel_l ?? ""} error={state.fieldErrors?.fuelL?.[0]} inputMode="decimal" />
          <Input label="Responsável" name="responsibleName" defaultValue={values.responsibleName ?? fertilization?.responsible_name ?? ""} error={state.fieldErrors?.responsibleName?.[0]} />
        </div>
        <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">Se a dose e a área do talhão estiverem disponíveis, o sistema sugere a quantidade total em kg/talhão. Revise antes de salvar.</p>
        <label className="grid gap-1 text-sm font-medium">Observações<textarea name="notes" defaultValue={values.notes ?? fertilization?.notes ?? ""} rows={3} className="rounded-xl border border-stone-200 px-3 py-2 font-normal" /></label>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}><Save className="size-4" aria-hidden="true" />{pending ? "Salvando..." : "Salvar"}</Button></div>
      </form>
    </Modal>
  );
}

function FertilizationFilterModal({ context, searchParams, onClose }: { context: SoilFormContext; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  return (
    <Modal title="Filtrar adubações via solo" onClose={onClose}>
      <form action="/soil/soil-fertilizations" className="grid gap-4">
        <SelectField label="Talhão" name="plotId" defaultValue={String(searchParams.plotId ?? "")} options={context.plots} />
        <SelectField label="Lavoura" name="plantingId" defaultValue={String(searchParams.plantingId ?? "")} options={context.plantings} />
        <SelectField label="Safra" name="seasonId" defaultValue={String(searchParams.seasonId ?? "")} options={context.seasons} />
        <SelectField label="Análise de referência" name="soilAnalysisId" defaultValue={String(searchParams.soilAnalysisId ?? "")} options={context.analyses.map((analysis) => ({ id: analysis.id, name: analysis.label }))} />
        <Input label="Insumo/fertilizante" name="fertilizerName" defaultValue={String(searchParams.fertilizerName ?? "")} />
        <div className="grid gap-3 sm:grid-cols-2"><Input label="De" name="from" type="date" defaultValue={String(searchParams.from ?? "")} /><Input label="Até" name="to" type="date" defaultValue={String(searchParams.to ?? "")} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showDeleted" value="1" defaultChecked={Boolean(searchParams.showDeleted)} />Mostrar registros apagados logicamente</label>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Aplicar filtros</Button></div>
      </form>
    </Modal>
  );
}

function DeleteFertilizationButton({ fertilizationId }: { fertilizationId: string }) {
  const [state, action, pending] = useActionState(deleteSoilFertilizationAction, initialSoilActionState);
  return <form action={action}><input type="hidden" name="fertilizationId" value={fertilizationId} /><Button type="submit" variant="ghost" size="sm" disabled={pending} onClick={(event) => { if (!confirm("Apagar esta adubação? Ela ficará no histórico e poderá ser restaurada.")) event.preventDefault(); }}><Trash2 className="size-4" aria-hidden="true" />Apagar</Button>{state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}</form>;
}

function RestoreFertilizationButton({ fertilizationId }: { fertilizationId: string }) {
  const [state, action, pending] = useActionState(restoreSoilFertilizationAction, initialSoilActionState);
  return <form action={action}><input type="hidden" name="fertilizationId" value={fertilizationId} /><Button type="submit" variant="secondary" size="sm" disabled={pending}>Restaurar</Button>{state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}</form>;
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
