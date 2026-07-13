"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type React from "react";

import { Edit2, Plus, Save, Sliders, Trash2, X } from "@/components/icons";
import { SystemAlert } from "@/components/atoms/system-alert";
import { Button } from "@/components/ui/button";
import { climateStatusLabel, describeClimateControl, formatMillimeters } from "@/modules/climate-water/domain/rules";
import { initialClimateActionState } from "@/modules/climate-water/presentation/action-state";
import {
  createDailyWeatherAction,
  createMeasurementPointAction,
  createRainfallAction,
  deleteClimateReadingAction,
  restoreClimateReadingAction,
  updateDailyWeatherAction,
  updateRainfallAction,
} from "@/modules/climate-water/presentation/actions";
import type { ClimateControlType, ClimateFormContext, ClimateReading, ClimateSummary } from "@/modules/climate-water/domain/types";

type Lookup = Record<string, string>;

interface ClimateOverviewProps {
  canManage: boolean;
  propertyName: string;
  activeSeasonName: string | null;
  summary: ClimateSummary;
}

interface ClimateListProps {
  canManage: boolean;
  propertyId: string;
  propertyName: string;
  controlType: ClimateControlType;
  readings: ClimateReading[];
  context: ClimateFormContext;
  searchParams: Record<string, string | boolean | undefined>;
}

export function ClimateOverview({ canManage, propertyName, activeSeasonName, summary }: ClimateOverviewProps) {
  return (
    <div className="mt-6 grid gap-4">
      <section className="rounded-2xl bg-emerald-900 p-5 text-white">
        <p className="text-sm font-semibold text-emerald-100">CLIMA E ÁGUA</p>
        <h1 className="mt-1 text-3xl font-bold">Chuva da propriedade</h1>
        <p className="mt-2 max-w-2xl text-sm text-emerald-50">
          Comece registrando chuva. Irrigação entra na próxima subetapa, usando o mesmo histórico climático.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {canManage && (
            <>
              <a href="/climate/rainfall" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-stone-800">Registrar chuva</a>
              <a href="/climate/daily-weather" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white ring-1 ring-emerald-300">Clima diário</a>
            </>
          )}
          {!canManage && <span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold">Acesso para consulta</span>}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Propriedade" value={propertyName} helper="Contexto ativo dos registros." />
        <Metric label="Chuva no mês" value={`${formatMillimeters(summary.monthRainfallMm)} mm`} helper="Soma dos registros não apagados." />
        <Metric label="Chuva na safra" value={`${formatMillimeters(summary.seasonRainfallMm)} mm`} helper={activeSeasonName ?? "Nenhuma safra ativa selecionada."} />
        <Metric label="Fichas climáticas" value={String(summary.dailyWeatherCount)} helper="Registros completos de temperatura e umidade." />
      </section>

      {summary.recentReadings.length === 0 ? (
        <SystemAlert tone="info">
          Ainda não há chuva registrada. Cadastre um pluviômetro/local e informe a primeira leitura para começar o histórico.
        </SystemAlert>
      ) : (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-bold">Últimos registros</h2>
          <div className="mt-3 divide-y divide-stone-100">
            {summary.recentReadings.map((reading) => <ReadingRow key={reading.id} reading={reading} pointById={{}} plotById={{}} seasonById={{}} />)}
          </div>
        </section>
      )}
    </div>
  );
}

export function ClimateListPage({ canManage, propertyId, propertyName, controlType, readings, context, searchParams }: ClimateListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [pointOpen, setPointOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<ClimateReading | null>(null);
  const pointById = useMemo(() => Object.fromEntries(context.measurementPoints.map((point) => [point.id, point.name])) as Lookup, [context.measurementPoints]);
  const plotById = useMemo(() => Object.fromEntries(context.plots.map((plot) => [plot.id, plot.name])) as Lookup, [context.plots]);
  const seasonById = useMemo(() => Object.fromEntries(context.seasons.map((season) => [season.id, `${season.name}${season.status ? ` (${season.status})` : ""}`])) as Lookup, [context.seasons]);
  const title = controlType === "rainfall" ? "Controle pluviométrico simples" : "Controle climático diário";
  const activeFilters = [searchParams.measurementPointId, searchParams.seasonId, searchParams.plotId, searchParams.from, searchParams.to, searchParams.showDeleted ? "1" : ""].filter(Boolean).length;

  return (
    <div className="mt-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">{propertyName}</p>
            <h1 className="mt-1 text-2xl font-bold">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">{describeClimateControl(controlType)}</p>
            <p className="mt-2 text-xs font-semibold text-stone-500">{activeFilters ? `${activeFilters} filtro${activeFilters === 1 ? "" : "s"} aplicado${activeFilters === 1 ? "" : "s"}` : "Sem filtros aplicados"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilterOpen(true)}>
              <Sliders className="size-4" aria-hidden="true" />
              Filtrar
            </Button>
            {activeFilters > 0 && <a href={controlType === "rainfall" ? "/climate/rainfall" : "/climate/daily-weather"} className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Limpar</a>}
          </div>
        </div>
      </section>

      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Novo registro
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPointOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Cadastrar pluviômetro/local
          </Button>
        </div>
      ) : (
        <SystemAlert tone="warning" className="mt-4">
          Acesso para consulta: você pode ver os registros climáticos desta propriedade, mas não criar, editar ou apagar.
        </SystemAlert>
      )}

      {context.measurementPoints.length === 0 && canManage && (
        <SystemAlert tone="info" className="mt-4">
          Cadastre um pluviômetro ou local de leitura para organizar os registros. Se houver apenas um ponto, ele pode ficar implícito; com vários pontos, a escolha será obrigatória.
        </SystemAlert>
      )}

      <section className="mt-4 grid gap-3">
        {readings.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-stone-600">
            Nenhum registro encontrado. Use “Novo registro” para começar ou ajuste os filtros.
          </div>
        ) : (
          readings.map((reading) => (
            <article key={reading.id} className="rounded-2xl border bg-white p-4">
              <ReadingRow reading={reading} pointById={pointById} plotById={plotById} seasonById={seasonById} />
              <div className="mt-3 flex flex-wrap gap-2">
                {canManage && !reading.operational_record.deleted_at && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(reading)}>
                    <Edit2 className="size-4" aria-hidden="true" />
                    Editar
                  </Button>
                )}
                {canManage && !reading.operational_record.deleted_at && <DeleteReadingButton readingId={reading.id} />}
                {canManage && reading.operational_record.deleted_at && <RestoreReadingButton readingId={reading.id} />}
                {reading.operational_record.deleted_at && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Apagado</span>}
              </div>
            </article>
          ))
        )}
      </section>

      {formOpen && (
        <ClimateFormModal
          type={controlType}
          propertyId={propertyId}
          context={context}
          onClose={() => setFormOpen(false)}
        />
      )}
      {editing && (
        <ClimateFormModal
          type={controlType}
          propertyId={propertyId}
          context={context}
          reading={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {pointOpen && <MeasurementPointModal propertyId={propertyId} onClose={() => setPointOpen(false)} />}
      {filterOpen && <ClimateFilterModal type={controlType} context={context} searchParams={searchParams} onClose={() => setFilterOpen(false)} />}
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-2xl border bg-white p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-stone-500">{helper}</p>
    </article>
  );
}

function ReadingRow({ reading, pointById, plotById, seasonById }: { reading: ClimateReading; pointById: Lookup; plotById: Lookup; seasonById: Lookup }) {
  return (
    <div className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{formatMillimeters(reading.rainfall_mm)} mm</p>
          <p className="text-sm text-stone-600">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(`${reading.occurred_on}T00:00:00`))}</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{climateStatusLabel(reading.operational_record.status)}</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <ContextItem label="Pluviômetro/local" value={reading.measurement_point_id ? pointById[reading.measurement_point_id] ?? "Não encontrado" : "Não informado"} />
        <ContextItem label="Talhão" value={reading.plot_id ? plotById[reading.plot_id] ?? "Não encontrado" : "Não informado"} />
        <ContextItem label="Safra" value={reading.season_id ? seasonById[reading.season_id] ?? "Não informada" : "Não informada"} />
        {reading.control_type === "daily_weather" && <ContextItem label="Umidade" value={reading.relative_humidity_pct ? `${formatMillimeters(reading.relative_humidity_pct)}%` : "Não informada"} />}
      </dl>
      {reading.control_type === "daily_weather" && (
        <p className="mt-2 text-sm text-stone-600">
          Temperatura: mín. {reading.temperature_min_c ?? "—"} °C · média {reading.temperature_avg_c ?? "—"} °C · máx. {reading.temperature_max_c ?? "—"} °C
        </p>
      )}
      {(reading.harmful_occurrences || reading.notes) && (
        <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
          {reading.harmful_occurrences && <p><span className="font-semibold">Ocorrências:</span> {reading.harmful_occurrences}</p>}
          {reading.notes && <p><span className="font-semibold">Observações:</span> {reading.notes}</p>}
        </div>
      )}
    </div>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="font-medium text-stone-700">{value}</dd>
    </div>
  );
}

function ClimateFormModal({ type, propertyId, context, reading, onClose }: { type: ClimateControlType; propertyId: string; context: ClimateFormContext; reading?: ClimateReading; onClose: () => void }) {
  const action = type === "daily_weather" ? (reading ? updateDailyWeatherAction : createDailyWeatherAction) : (reading ? updateRainfallAction : createRainfallAction);
  const [state, formAction, pending] = useActionState(action, initialClimateActionState);
  const values = state.values ?? {};
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [onClose, state.status]);
  const field = (name: string, fallback = "") => values[name] ?? fallback;
  const today = new Date().toISOString().slice(0, 10);
  const title = reading ? "Editar registro" : type === "daily_weather" ? "Novo clima diário" : "Nova chuva";

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-stone-600">{describeClimateControl(type)}</p>
      {state.status === "error" && state.message && <SystemAlert tone="error" className="mt-3">{state.message}</SystemAlert>}
      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="readingId" value={reading?.id ?? ""} />
        <input type="hidden" name="clientId" value={field("clientId", crypto.randomUUID())} />
        <input type="hidden" name="status" value={field("status", reading?.operational_record.status ?? "confirmed")} />
        <Label text="Data" error={state.fieldErrors?.occurredOn?.[0]}>
          <input name="occurredOn" type="date" defaultValue={field("occurredOn", reading?.occurred_on ?? today)} className="h-11 rounded-xl border px-3" />
        </Label>
        <Label text="Pluviômetro/local" error={state.fieldErrors?.measurementPointId?.[0]}>
          <select name="measurementPointId" defaultValue={field("measurementPointId", reading?.measurement_point_id ?? "")} className="h-11 rounded-xl border px-3">
            <option value="">Sem ponto informado</option>
            {context.measurementPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
          </select>
        </Label>
        <Label text="Volume de chuva (mm)" error={state.fieldErrors?.rainfallMm?.[0]}>
          <input name="rainfallMm" inputMode="decimal" defaultValue={field("rainfallMm", reading?.rainfall_mm ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: 30" />
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Talhão">
            <select name="plotId" defaultValue={field("plotId", reading?.plot_id ?? "")} className="h-11 rounded-xl border px-3">
              <option value="">Não vincular</option>
              {context.plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
            </select>
          </Label>
          <Label text="Safra">
            <select name="seasonId" defaultValue={field("seasonId", reading?.season_id ?? "")} className="h-11 rounded-xl border px-3">
              <option value="">Não vincular</option>
              {context.seasons.map((season) => <option key={season.id} value={season.id}>{season.name} {season.status ? `(${season.status})` : ""}</option>)}
            </select>
          </Label>
        </div>
        {type === "daily_weather" && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Label text="Temp. mínima (°C)"><input name="temperatureMinC" inputMode="decimal" defaultValue={field("temperatureMinC", reading?.temperature_min_c ?? "")} className="h-11 rounded-xl border px-3" /></Label>
              <Label text="Temp. média (°C)" error={state.fieldErrors?.temperatureAvgC?.[0]}><input name="temperatureAvgC" inputMode="decimal" defaultValue={field("temperatureAvgC", reading?.temperature_avg_c ?? "")} className="h-11 rounded-xl border px-3" /></Label>
              <Label text="Temp. máxima (°C)"><input name="temperatureMaxC" inputMode="decimal" defaultValue={field("temperatureMaxC", reading?.temperature_max_c ?? "")} className="h-11 rounded-xl border px-3" /></Label>
            </div>
            <Label text="Umidade relativa (%)" error={state.fieldErrors?.relativeHumidityPct?.[0]}>
              <input name="relativeHumidityPct" inputMode="decimal" defaultValue={field("relativeHumidityPct", reading?.relative_humidity_pct ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: 75" />
            </Label>
            <Label text="Ocorrências prejudiciais">
              <input name="harmfulOccurrences" defaultValue={field("harmfulOccurrences", reading?.harmful_occurrences ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: geada, granizo, vendaval" />
            </Label>
          </>
        )}
        <Label text="Observações">
          <textarea name="notes" defaultValue={field("notes", reading?.notes ?? "")} className="min-h-24 rounded-xl border p-3" />
        </Label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>
            <Save className="size-4" aria-hidden="true" />
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MeasurementPointModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(createMeasurementPointAction, initialClimateActionState);
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [onClose, state.status]);
  return (
    <Modal title="Cadastrar pluviômetro/local" onClose={onClose}>
      {state.status === "error" && state.message && <SystemAlert tone="error">{state.message}</SystemAlert>}
      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="propertyId" value={propertyId} />
        <Label text="Nome" error={state.fieldErrors?.name?.[0]}>
          <input name="name" defaultValue={state.values?.name ?? ""} className="h-11 rounded-xl border px-3" placeholder="Ex.: Sede, Talhão 1, Pluviômetro principal" />
        </Label>
        <Label text="Descrição">
          <textarea name="description" defaultValue={state.values?.description ?? ""} className="min-h-24 rounded-xl border p-3" />
        </Label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

function ClimateFilterModal({ type, context, searchParams, onClose }: { type: ClimateControlType; context: ClimateFormContext; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  return (
    <Modal title="Filtrar registros" onClose={onClose}>
      <form method="get" action={type === "rainfall" ? "/climate/rainfall" : "/climate/daily-weather"} className="mt-4 grid gap-3">
        <Label text="Pluviômetro/local">
          <select name="measurementPointId" defaultValue={String(searchParams.measurementPointId ?? "")} className="h-11 rounded-xl border px-3">
            <option value="">Todos</option>
            {context.measurementPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
          </select>
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Safra">
            <select name="seasonId" defaultValue={String(searchParams.seasonId ?? "")} className="h-11 rounded-xl border px-3">
              <option value="">Todas</option>
              {context.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
            </select>
          </Label>
          <Label text="Talhão">
            <select name="plotId" defaultValue={String(searchParams.plotId ?? "")} className="h-11 rounded-xl border px-3">
              <option value="">Todos</option>
              {context.plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
            </select>
          </Label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="De"><input name="from" type="date" defaultValue={String(searchParams.from ?? "")} className="h-11 rounded-xl border px-3" /></Label>
          <Label text="Até"><input name="to" type="date" defaultValue={String(searchParams.to ?? "")} className="h-11 rounded-xl border px-3" /></Label>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-700">
          <input type="checkbox" name="showDeleted" value="1" defaultChecked={Boolean(searchParams.showDeleted)} />
          Mostrar apagados
        </label>
        <div className="flex justify-end gap-2">
          <a href={type === "rainfall" ? "/climate/rainfall" : "/climate/daily-weather"} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Limpar</a>
          <Button type="submit">Aplicar</Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteReadingButton({ readingId }: { readingId: string }) {
  const [state, action, pending] = useActionState(deleteClimateReadingAction, initialClimateActionState);
  return (
    <form action={action}>
      <input type="hidden" name="readingId" value={readingId} />
      {state.status === "error" && state.message && <span className="mr-2 text-xs text-red-700">{state.message}</span>}
      <Button type="submit" variant="ghost" size="sm" disabled={pending} onClick={(event) => !window.confirm("Apagar este registro? Ele ficará no histórico e poderá ser restaurado.") && event.preventDefault()}>
        <Trash2 className="size-4" aria-hidden="true" />
        Apagar
      </Button>
    </form>
  );
}

function RestoreReadingButton({ readingId }: { readingId: string }) {
  const [state, action, pending] = useActionState(restoreClimateReadingAction, initialClimateActionState);
  return (
    <form action={action}>
      <input type="hidden" name="readingId" value={readingId} />
      {state.status === "error" && state.message && <span className="mr-2 text-xs text-red-700">{state.message}</span>}
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>Restaurar</Button>
    </form>
  );
}

function Label({ text, error, children }: { text: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-700">
      <span>{text}</span>
      {children}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/40 p-4">
      <div className="mx-auto mt-8 max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-11 place-items-center rounded-xl hover:bg-stone-100">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
