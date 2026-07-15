"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type React from "react";

import { Edit2, Plus, Save, Sliders, Trash2, X } from "@/components/icons";
import { SystemAlert } from "@/components/atoms/system-alert";
import { Button } from "@/components/ui/button";
import { formatSoilDecimal, summarizeFoliarFertilizations } from "@/modules/soil-nutrition/domain/rules";
import type { FoliarFertilizationComponent, FoliarFertilizationRecord, SoilFormContext, SoilOption } from "@/modules/soil-nutrition/domain/types";
import { initialSoilActionState } from "@/modules/soil-nutrition/presentation/action-state";
import { createFoliarFertilizationAction, deleteFoliarFertilizationAction, restoreFoliarFertilizationAction, updateFoliarFertilizationAction } from "@/modules/soil-nutrition/presentation/actions";

type Lookup = Record<string, string>;
type ComponentFormRow = Partial<FoliarFertilizationComponent> & { rowId: string };

interface FoliarFertilizationsPageProps {
  canManage: boolean;
  propertyId: string;
  propertyName: string;
  fertilizations: FoliarFertilizationRecord[];
  context: SoilFormContext;
  searchParams: Record<string, string | boolean | undefined>;
}

export function FoliarFertilizationsPageClient({ canManage, propertyId, propertyName, fertilizations, context, searchParams }: FoliarFertilizationsPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<FoliarFertilizationRecord | null>(null);
  const plotById = useMemo(() => Object.fromEntries(context.plots.map((plot) => [plot.id, plot.name])) as Lookup, [context.plots]);
  const plantingById = useMemo(() => Object.fromEntries(context.plantings.map((planting) => [planting.id, planting.name])) as Lookup, [context.plantings]);
  const seasonById = useMemo(() => Object.fromEntries(context.seasons.map((season) => [season.id, `${season.name}${season.status ? ` (${season.status})` : ""}`])) as Lookup, [context.seasons]);
  const summary = useMemo(() => summarizeFoliarFertilizations(fertilizations), [fertilizations]);
  const activeFilters = [searchParams.plotId, searchParams.plantingId, searchParams.seasonId, searchParams.purpose, searchParams.productName, searchParams.from, searchParams.to, searchParams.showDeleted ? "1" : ""].filter(Boolean).length;

  return (
    <div className="mt-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">{propertyName}</p>
            <h1 className="mt-1 text-2xl font-bold">Controle de adubação via folha</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Registre aplicações foliares realizadas com talhão, mistura de produtos, volume de calda, condições climáticas, responsável, hh/hm e combustível.
            </p>
            <p className="mt-2 text-xs font-semibold text-stone-500">{activeFilters ? `${activeFilters} filtro${activeFilters === 1 ? "" : "s"} aplicado${activeFilters === 1 ? "" : "s"}` : "Sem filtros aplicados"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilterOpen(true)}><Sliders className="size-4" aria-hidden="true" />Filtrar</Button>
            {activeFilters > 0 && <a href="/soil/foliar-fertilizations" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Limpar</a>}
          </div>
        </div>
      </section>

      {!canManage ? (
        <SystemAlert tone="warning" className="mt-4">Acesso para consulta: você pode ver adubações via folha desta propriedade, mas não criar, editar ou apagar.</SystemAlert>
      ) : (
        <div className="mt-4"><Button type="button" onClick={() => setFormOpen(true)}><Plus className="size-4" aria-hidden="true" />Registrar adubação foliar</Button></div>
      )}

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Aplicações" value={String(summary.fertilizationsCount)} helper="Registros ativos no filtro atual." />
        <Metric label="Volume de calda" value={`${formatSoilDecimal(summary.totalSprayVolumeLHa)} L/ha`} helper="Soma dos volumes informados." />
        <Metric label="Última aplicação" value={summary.latestAppliedOn ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${summary.latestAppliedOn}T12:00:00`)) : "—"} helper="Data mais recente no filtro." />
      </section>

      <section className="mt-4 grid gap-3">
        {fertilizations.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-stone-600">Nenhuma adubação via folha registrada. Use “Registrar adubação foliar” para preencher a primeira ficha.</div>
        ) : fertilizations.map((fertilization) => (
          <article key={fertilization.id} className="rounded-2xl border bg-white p-4">
            <FoliarFertilizationCard fertilization={fertilization} plotById={plotById} plantingById={plantingById} seasonById={seasonById} />
            <div className="mt-3 flex flex-wrap gap-2">
              {canManage && !fertilization.operational_record.deleted_at && <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(fertilization)}><Edit2 className="size-4" aria-hidden="true" />Editar</Button>}
              {canManage && !fertilization.operational_record.deleted_at && <DeleteFoliarFertilizationButton foliarFertilizationId={fertilization.id} />}
              {canManage && fertilization.operational_record.deleted_at && <RestoreFoliarFertilizationButton foliarFertilizationId={fertilization.id} />}
              {fertilization.operational_record.deleted_at && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Apagado</span>}
            </div>
          </article>
        ))}
      </section>

      {formOpen && <FoliarFertilizationModal propertyId={propertyId} context={context} searchParams={searchParams} onClose={() => setFormOpen(false)} />}
      {editing && <FoliarFertilizationModal propertyId={propertyId} context={context} fertilization={editing} searchParams={searchParams} onClose={() => setEditing(null)} />}
      {filterOpen && <FoliarFertilizationFilterModal context={context} searchParams={searchParams} onClose={() => setFilterOpen(false)} />}
    </div>
  );
}

function FoliarFertilizationCard({ fertilization, plotById, plantingById, seasonById }: { fertilization: FoliarFertilizationRecord; plotById: Lookup; plantingById: Lookup; seasonById: Lookup }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-emerald-800">{plotById[fertilization.plot_id] ?? "Talhão"}{fertilization.season_id ? ` · ${seasonById[fertilization.season_id] ?? "Safra"}` : ""}</p>
          <h2 className="text-lg font-bold">{fertilization.purpose}</h2>
          <p className="text-sm text-stone-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(`${fertilization.applied_on}T12:00:00`))}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">Confirmado</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <ContextItem label="Volume de calda" value={fertilization.spray_volume_l_ha ? `${formatSoilDecimal(fertilization.spray_volume_l_ha)} L/ha` : "Não informado"} />
        <ContextItem label="Temperatura" value={fertilization.temperature_c ? `${formatSoilDecimal(fertilization.temperature_c, 1)} °C` : "Não informada"} />
        <ContextItem label="Umidade" value={fertilization.humidity_pct ? `${formatSoilDecimal(fertilization.humidity_pct, 1)}%` : "Não informada"} />
        <ContextItem label="Vento" value={fertilization.wind_speed_km_h ? `${formatSoilDecimal(fertilization.wind_speed_km_h, 1)} km/h` : "Não informado"} />
        <ContextItem label="hh/hm" value={fertilization.labor_type && fertilization.labor_quantity ? `${fertilization.labor_type} · ${formatSoilDecimal(fertilization.labor_quantity)}` : "Não informado"} />
        <ContextItem label="Combustível" value={fertilization.fuel_l ? `${formatSoilDecimal(fertilization.fuel_l)} L` : "Não informado"} />
        <ContextItem label="Responsável" value={fertilization.responsible_name ?? "Não informado"} />
        <ContextItem label="Lavoura" value={fertilization.planting_id ? plantingById[fertilization.planting_id] ?? "Lavoura" : "Não vinculada"} />
      </dl>
      <div className="mt-3 rounded-xl bg-stone-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Componentes da mistura</p>
        <ul className="mt-2 grid gap-2">
          {fertilization.components.map((component) => (
            <li key={component.id} className="rounded-lg bg-white p-3 text-sm">
              <span className="font-semibold">{component.product_name}</span>
              <span className="text-stone-600"> · {formatSoilDecimal(component.dose_value)} {component.dose_unit}</span>
              {component.total_quantity && <span className="text-stone-600"> · total {formatSoilDecimal(component.total_quantity)}</span>}
              {component.notes && <p className="mt-1 text-xs text-stone-500">{component.notes}</p>}
            </li>
          ))}
        </ul>
      </div>
      {fertilization.weather_notes && <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{fertilization.weather_notes}</p>}
      {fertilization.notes && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{fertilization.notes}</p>}
    </div>
  );
}

function FoliarFertilizationModal({ propertyId, context, fertilization, searchParams, onClose }: { propertyId: string; context: SoilFormContext; fertilization?: FoliarFertilizationRecord; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  const action = fertilization ? updateFoliarFertilizationAction : createFoliarFertilizationAction;
  const [state, formAction, pending] = useActionState(action, initialSoilActionState);
  const clientId = useMemo(() => crypto.randomUUID(), []);
  const values = state.values ?? {};
  const selectedPlotId = values.plotId ?? fertilization?.plot_id ?? String(searchParams.plotId ?? "");
  const [components, setComponents] = useState<ComponentFormRow[]>(
    fertilization?.components.length
      ? fertilization.components.map((component, index) => ({ ...component, rowId: component.id || `component-${index}` }))
      : [{ rowId: "component-0", product_name: "", dose_value: "", dose_unit: "", total_quantity: "", notes: "" }],
  );
  useEffect(() => { if (state.status === "success") onClose(); }, [state.status, onClose]);

  return (
    <Modal title={fertilization ? "Editar adubação via folha" : "Registrar adubação via folha"} onClose={onClose}>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="foliarFertilizationId" value={fertilization?.id ?? ""} />
        <input type="hidden" name="clientId" value={fertilization ? "" : clientId} />
        {state.status === "error" && <SystemAlert tone="error">{state.message}</SystemAlert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Talhão" name="plotId" defaultValue={selectedPlotId} options={context.plots} error={state.fieldErrors?.plotId?.[0]} required />
          <SelectField label="Lavoura vinculada" name="plantingId" defaultValue={values.plantingId ?? fertilization?.planting_id ?? ""} options={context.plantings.filter((planting) => !selectedPlotId || planting.plot_id === selectedPlotId)} error={state.fieldErrors?.plantingId?.[0]} />
          <SelectField label="Safra" name="seasonId" defaultValue={values.seasonId ?? fertilization?.season_id ?? String(searchParams.seasonId ?? "")} options={context.seasons} error={state.fieldErrors?.seasonId?.[0]} />
          <Input label="Data de aplicação" name="appliedOn" type="date" defaultValue={values.appliedOn ?? fertilization?.applied_on ?? new Date().toISOString().slice(0, 10)} error={state.fieldErrors?.appliedOn?.[0]} required />
          <Input label="Finalidade" name="purpose" placeholder="Ex.: Nutrição foliar pós-florada" defaultValue={values.purpose ?? fertilization?.purpose ?? ""} error={state.fieldErrors?.purpose?.[0]} required />
          <Input label="Volume de calda (L/ha)" name="sprayVolumeLHa" defaultValue={values.sprayVolumeLHa ?? fertilization?.spray_volume_l_ha ?? ""} error={state.fieldErrors?.sprayVolumeLHa?.[0]} inputMode="decimal" />
          <Input label="Temperatura (°C)" name="temperatureC" defaultValue={values.temperatureC ?? fertilization?.temperature_c ?? ""} error={state.fieldErrors?.temperatureC?.[0]} inputMode="decimal" />
          <Input label="Umidade (%)" name="humidityPct" defaultValue={values.humidityPct ?? fertilization?.humidity_pct ?? ""} error={state.fieldErrors?.humidityPct?.[0]} inputMode="decimal" />
          <Input label="Vento (km/h)" name="windSpeedKmH" defaultValue={values.windSpeedKmH ?? fertilization?.wind_speed_km_h ?? ""} error={state.fieldErrors?.windSpeedKmH?.[0]} inputMode="decimal" />
          <SelectField label="Tipo de demanda" name="laborType" defaultValue={values.laborType ?? fertilization?.labor_type ?? ""} options={[{ id: "hh", name: "hh - hora homem" }, { id: "hm", name: "hm - hora máquina" }]} error={state.fieldErrors?.laborType?.[0]} />
          <Input label="Quantidade hh/hm" name="laborQuantity" defaultValue={values.laborQuantity ?? fertilization?.labor_quantity ?? ""} error={state.fieldErrors?.laborQuantity?.[0]} inputMode="decimal" />
          <Input label="Combustível (L)" name="fuelL" defaultValue={values.fuelL ?? fertilization?.fuel_l ?? ""} error={state.fieldErrors?.fuelL?.[0]} inputMode="decimal" />
          <Input label="Responsável" name="responsibleName" defaultValue={values.responsibleName ?? fertilization?.responsible_name ?? ""} error={state.fieldErrors?.responsibleName?.[0]} />
        </div>

        <section className="rounded-xl border border-stone-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Componentes da mistura</h3>
              <p className="text-xs text-stone-500">Informe cada produto separadamente, com dose/concentração e unidade.</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setComponents((items) => [...items, { rowId: crypto.randomUUID(), product_name: "", dose_value: "", dose_unit: "", total_quantity: "", notes: "" }])}>
              <Plus className="size-4" aria-hidden="true" />Adicionar
            </Button>
          </div>
          {state.fieldErrors?.components?.[0] && <p className="mt-2 text-xs text-red-700">{state.fieldErrors.components[0]}</p>}
          <div className="mt-3 grid gap-3">
            {components.map((component, index) => (
              <div key={component.rowId} className="rounded-xl bg-stone-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Componente {index + 1}</span>
                  {components.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setComponents((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Produto" name="componentProductName" defaultValue={component.product_name ?? ""} required />
                  <Input label="Dose/concentração" name="componentDoseValue" defaultValue={component.dose_value ?? ""} inputMode="decimal" required />
                  <Input label="Unidade da dose" name="componentDoseUnit" placeholder="Ex.: mL/100 L, kg/ha, %" defaultValue={component.dose_unit ?? ""} required />
                  <Input label="Quantidade total" name="componentTotalQuantity" defaultValue={component.total_quantity ?? ""} inputMode="decimal" />
                </div>
                <label className="mt-3 grid gap-1 text-sm font-medium">Observação do componente<textarea name="componentNotes" defaultValue={component.notes ?? ""} rows={2} className="rounded-xl border border-stone-200 px-3 py-2 font-normal" /></label>
              </div>
            ))}
          </div>
        </section>

        <label className="grid gap-1 text-sm font-medium">Condições climáticas observadas<textarea name="weatherNotes" defaultValue={values.weatherNotes ?? fertilization?.weather_notes ?? ""} rows={2} className="rounded-xl border border-stone-200 px-3 py-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium">Observações gerais<textarea name="notes" defaultValue={values.notes ?? fertilization?.notes ?? ""} rows={3} className="rounded-xl border border-stone-200 px-3 py-2 font-normal" /></label>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}><Save className="size-4" aria-hidden="true" />{pending ? "Salvando..." : "Salvar"}</Button></div>
      </form>
    </Modal>
  );
}

function FoliarFertilizationFilterModal({ context, searchParams, onClose }: { context: SoilFormContext; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  return (
    <Modal title="Filtrar adubações via folha" onClose={onClose}>
      <form action="/soil/foliar-fertilizations" className="grid gap-4">
        <SelectField label="Talhão" name="plotId" defaultValue={String(searchParams.plotId ?? "")} options={context.plots} />
        <SelectField label="Lavoura" name="plantingId" defaultValue={String(searchParams.plantingId ?? "")} options={context.plantings} />
        <SelectField label="Safra" name="seasonId" defaultValue={String(searchParams.seasonId ?? "")} options={context.seasons} />
        <Input label="Finalidade" name="purpose" defaultValue={String(searchParams.purpose ?? "")} />
        <Input label="Produto" name="productName" defaultValue={String(searchParams.productName ?? "")} />
        <div className="grid gap-3 sm:grid-cols-2"><Input label="De" name="from" type="date" defaultValue={String(searchParams.from ?? "")} /><Input label="Até" name="to" type="date" defaultValue={String(searchParams.to ?? "")} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showDeleted" value="1" defaultChecked={Boolean(searchParams.showDeleted)} />Mostrar registros apagados logicamente</label>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Aplicar filtros</Button></div>
      </form>
    </Modal>
  );
}

function DeleteFoliarFertilizationButton({ foliarFertilizationId }: { foliarFertilizationId: string }) {
  const [state, action, pending] = useActionState(deleteFoliarFertilizationAction, initialSoilActionState);
  return <form action={action}><input type="hidden" name="foliarFertilizationId" value={foliarFertilizationId} /><Button type="submit" variant="ghost" size="sm" disabled={pending} onClick={(event) => { if (!confirm("Apagar esta adubação foliar? Ela ficará no histórico e poderá ser restaurada.")) event.preventDefault(); }}><Trash2 className="size-4" aria-hidden="true" />Apagar</Button>{state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}</form>;
}

function RestoreFoliarFertilizationButton({ foliarFertilizationId }: { foliarFertilizationId: string }) {
  const [state, action, pending] = useActionState(restoreFoliarFertilizationAction, initialSoilActionState);
  return <form action={action}><input type="hidden" name="foliarFertilizationId" value={foliarFertilizationId} /><Button type="submit" variant="secondary" size="sm" disabled={pending}>Restaurar</Button>{state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}</form>;
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
