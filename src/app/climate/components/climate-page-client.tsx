"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type React from "react";

import { Edit2, Plus, Save, Sliders, Trash2, X } from "@/components/icons";
import { SystemAlert } from "@/components/atoms/system-alert";
import { Button } from "@/components/ui/button";
import { climateStatusLabel, describeClimateControl, formatDuration, formatMillimeters } from "@/modules/climate-water/domain/rules";
import { initialClimateActionState } from "@/modules/climate-water/presentation/action-state";
import {
  createDailyWeatherAction,
  createIrrigationEventAction,
  createIrrigationSystemAction,
  createMeasurementPointAction,
  createRainfallAction,
  deleteClimateReadingAction,
  deleteIrrigationEventAction,
  restoreClimateReadingAction,
  restoreIrrigationEventAction,
  updateDailyWeatherAction,
  updateIrrigationEventAction,
  updateIrrigationSystemAction,
  updateRainfallAction,
} from "@/modules/climate-water/presentation/actions";
import type { ClimateControlType, ClimateFormContext, ClimateReading, ClimateSummary, IrrigationEvent, IrrigationSystem } from "@/modules/climate-water/domain/types";

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

interface IrrigationPageProps {
  canManage: boolean;
  propertyId: string;
  propertyName: string;
  events: IrrigationEvent[];
  context: ClimateFormContext;
  searchParams: Record<string, string | boolean | undefined>;
}

export function ClimateOverview({ canManage, propertyName, activeSeasonName, summary }: ClimateOverviewProps) {
  return (
    <div className="mt-6 grid gap-4">
      <section className="rounded-2xl bg-emerald-900 p-5 text-white">
        <p className="text-sm font-semibold text-emerald-100">CLIMA E ÁGUA</p>
        <h1 className="mt-1 text-3xl font-bold">Fichas de clima e água</h1>
        <p className="mt-2 max-w-2xl text-sm text-emerald-50">
          Preencha as fichas digitais de controle pluviométrico, clima diário e irrigação conforme o caderno.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {canManage && (
            <>
              <a href="/climate/rainfall" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-stone-800">Registrar chuva</a>
              <a href="/climate/daily-weather" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white ring-1 ring-emerald-300">Clima diário</a>
              <a href="/climate/irrigation" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white ring-1 ring-emerald-300">Irrigação</a>
            </>
          )}
          {!canManage && <span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold">Acesso para consulta</span>}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Propriedade" value={propertyName} helper="Contexto ativo dos registros." />
        <Metric label="Chuva no mês" value={`${formatMillimeters(summary.monthRainfallMm)} mm`} helper="Soma dos registros não apagados." />
        <Metric label="Chuva na safra" value={`${formatMillimeters(summary.seasonRainfallMm)} mm`} helper={activeSeasonName ?? "Nenhuma safra ativa selecionada."} />
        <Metric label="Irrigação no mês" value={`${formatMillimeters(summary.monthIrrigationMm)} mm`} helper="Lâmina preenchida na ficha de irrigação." />
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

export function IrrigationPageClient({ canManage, propertyId, propertyName, events, context, searchParams }: IrrigationPageProps) {
  const [eventOpen, setEventOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<IrrigationEvent | null>(null);
  const [editingSystem, setEditingSystem] = useState<IrrigationSystem | null>(null);
  const systemById = useMemo(() => Object.fromEntries(context.irrigationSystems.map((system) => [system.id, system.name])) as Lookup, [context.irrigationSystems]);
  const plotById = useMemo(() => Object.fromEntries(context.plots.map((plot) => [plot.id, plot.name])) as Lookup, [context.plots]);
  const seasonById = useMemo(() => Object.fromEntries(context.seasons.map((season) => [season.id, `${season.name}${season.status ? ` (${season.status})` : ""}`])) as Lookup, [context.seasons]);
  const activeFilters = [searchParams.irrigationSystemId, searchParams.seasonId, searchParams.plotId, searchParams.from, searchParams.to, searchParams.showDeleted ? "1" : ""].filter(Boolean).length;

  return (
    <div className="mt-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">{propertyName}</p>
            <h1 className="mt-1 text-2xl font-bold">Controle da Irrigação</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Preencha a ficha do caderno: primeiro registre as informações do sistema usado na área, depois lance cada irrigação realizada.
            </p>
            <p className="mt-2 text-xs font-semibold text-stone-500">{activeFilters ? `${activeFilters} filtro${activeFilters === 1 ? "" : "s"} aplicado${activeFilters === 1 ? "" : "s"}` : "Sem filtros aplicados"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilterOpen(true)}>
              <Sliders className="size-4" aria-hidden="true" />
              Filtrar
            </Button>
            {activeFilters > 0 && <a href="/climate/irrigation" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Limpar</a>}
          </div>
        </div>
      </section>

      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setEventOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Preencher irrigação
          </Button>
          <Button type="button" variant="secondary" onClick={() => setSystemOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Sistema usado na área
          </Button>
        </div>
      ) : (
        <SystemAlert tone="warning" className="mt-4">
          Acesso para consulta: você pode ver a ficha de irrigação desta propriedade, mas não criar, editar ou apagar.
        </SystemAlert>
      )}

      <section className="mt-4 rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Informações do sistema de irrigação usado nas áreas</h2>
            <p className="text-sm text-stone-500">Este bloco corresponde ao cabeçalho da ficha física.</p>
          </div>
        </div>
        {context.irrigationSystems.length === 0 ? (
          <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">Nenhum sistema cadastrado. Cadastre quando a propriedade usar irrigação.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {context.irrigationSystems.map((system) => (
              <article key={system.id} className="rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{system.name}</p>
                    <p className="text-sm text-stone-600">{system.system_type ?? "Sistema não informado"}{system.plot_id ? ` · ${plotById[system.plot_id] ?? "Talhão"}` : ""}</p>
                  </div>
                  {canManage && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSystem(system)}>
                      <Edit2 className="size-4" aria-hidden="true" />
                      Editar
                    </Button>
                  )}
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <ContextItem label="Fonte" value={system.water_source ?? "Não informada"} />
                  <ContextItem label="Vazão" value={system.flow_lh ? `${formatMillimeters(system.flow_lh)} L/h` : "Não informada"} />
                  <ContextItem label="Eficiência" value={system.efficiency_pct ? `${formatMillimeters(system.efficiency_pct)}%` : "Não informada"} />
                  <ContextItem label="Pressão" value={system.pressure_bar ? `${formatMillimeters(system.pressure_bar)} bar` : "Não informada"} />
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 grid gap-3">
        {events.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-stone-600">
            Nenhuma irrigação preenchida. Use “Preencher irrigação” para lançar uma linha da ficha.
          </div>
        ) : (
          events.map((event) => (
            <article key={event.id} className="rounded-2xl border bg-white p-4">
              <IrrigationEventRow event={event} systemById={systemById} plotById={plotById} seasonById={seasonById} />
              <div className="mt-3 flex flex-wrap gap-2">
                {canManage && !event.operational_record.deleted_at && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditingEvent(event)}>
                    <Edit2 className="size-4" aria-hidden="true" />
                    Editar
                  </Button>
                )}
                {canManage && !event.operational_record.deleted_at && <DeleteIrrigationEventButton eventId={event.id} />}
                {canManage && event.operational_record.deleted_at && <RestoreIrrigationEventButton eventId={event.id} />}
                {event.operational_record.deleted_at && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Apagado</span>}
              </div>
            </article>
          ))
        )}
      </section>

      {eventOpen && <IrrigationEventModal propertyId={propertyId} context={context} onClose={() => setEventOpen(false)} />}
      {editingEvent && <IrrigationEventModal propertyId={propertyId} context={context} event={editingEvent} onClose={() => setEditingEvent(null)} />}
      {systemOpen && <IrrigationSystemModal propertyId={propertyId} context={context} onClose={() => setSystemOpen(false)} />}
      {editingSystem && <IrrigationSystemModal propertyId={propertyId} context={context} system={editingSystem} onClose={() => setEditingSystem(null)} />}
      {filterOpen && <IrrigationFilterModal context={context} searchParams={searchParams} onClose={() => setFilterOpen(false)} />}
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

function IrrigationEventRow({ event, systemById, plotById, seasonById }: { event: IrrigationEvent; systemById: Lookup; plotById: Lookup; seasonById: Lookup }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{event.applied_mm ? `${formatMillimeters(event.applied_mm)} mm` : "Lâmina não informada"}</p>
          <p className="text-sm text-stone-600">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(`${event.occurred_on}T00:00:00`))}</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{climateStatusLabel(event.operational_record.status)}</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <ContextItem label="Talhão" value={event.plot_id ? plotById[event.plot_id] ?? "Não encontrado" : "Não informado"} />
        <ContextItem label="Sistema" value={event.irrigation_system_id ? systemById[event.irrigation_system_id] ?? "Não encontrado" : "Não informado"} />
        <ContextItem label="Safra" value={event.season_id ? seasonById[event.season_id] ?? "Não informada" : "Não informada"} />
        <ContextItem label="Tempo total" value={formatDuration(event.duration_minutes)} />
        <ContextItem label="Horário" value={event.started_at && event.ended_at ? `${event.started_at.slice(0, 5)} às ${event.ended_at.slice(0, 5)}` : "Não informado"} />
        <ContextItem label="Frequência" value={event.frequency_days ? `${event.frequency_days} dia${event.frequency_days === 1 ? "" : "s"}` : "Não informada"} />
        <ContextItem label="Volume médio" value={event.average_volume_l ? `${formatMillimeters(event.average_volume_l)} L` : "Não informado"} />
        <ContextItem label="Responsável" value={event.responsible_name ?? "Não informado"} />
      </dl>
      {event.notes && <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-700"><span className="font-semibold">Obs.:</span> {event.notes}</div>}
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

function IrrigationSystemModal({ propertyId, context, system, onClose }: { propertyId: string; context: ClimateFormContext; system?: IrrigationSystem; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(system ? updateIrrigationSystemAction : createIrrigationSystemAction, initialClimateActionState);
  const values = state.values ?? {};
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [onClose, state.status]);
  const field = (name: string, fallback = "") => values[name] ?? fallback;

  return (
    <Modal title={system ? "Editar sistema de irrigação" : "Sistema de irrigação usado na área"} onClose={onClose}>
      <p className="text-sm text-stone-600">Preencha as informações do cabeçalho da ficha: sistema, emissores, eficiência, vazão, motor, bomba, pressão e espaçamento.</p>
      {state.status === "error" && state.message && <SystemAlert tone="error" className="mt-3">{state.message}</SystemAlert>}
      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="systemId" value={system?.id ?? ""} />
        <Label text="Identificação do sistema" error={state.fieldErrors?.name?.[0]}>
          <input name="name" defaultValue={field("name", system?.name ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: Gotejamento Talhão 001" />
        </Label>
        <Label text="Talhão relacionado">
          <select name="plotId" defaultValue={field("plotId", system?.plot_id ?? "")} className="h-11 rounded-xl border px-3">
            <option value="">Uso geral da propriedade</option>
            {context.plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
          </select>
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Sistema de irrigação"><input name="systemType" defaultValue={field("systemType", system?.system_type ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: Gotejamento" /></Label>
          <Label text="Fonte de água"><input name="waterSource" defaultValue={field("waterSource", system?.water_source ?? "")} className="h-11 rounded-xl border px-3" /></Label>
          <Label text="Nº de emissores"><input name="emittersDescription" defaultValue={field("emittersDescription", system?.emitters_description ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: 1 un./planta" /></Label>
          <Label text="Eficiência (%)" error={state.fieldErrors?.efficiencyPct?.[0]}><input name="efficiencyPct" inputMode="decimal" defaultValue={field("efficiencyPct", system?.efficiency_pct ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: 92" /></Label>
          <Label text="Área de molhamento (m²)" error={state.fieldErrors?.wettedAreaM2?.[0]}><input name="wettedAreaM2" inputMode="decimal" defaultValue={field("wettedAreaM2", system?.wetted_area_m2 ?? "")} className="h-11 rounded-xl border px-3" /></Label>
          <Label text="Vazão (L/h)" error={state.fieldErrors?.flowLh?.[0]}><input name="flowLh" inputMode="decimal" defaultValue={field("flowLh", system?.flow_lh ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: 2,0" /></Label>
          <Label text="Motor"><input name="motorDescription" defaultValue={field("motorDescription", system?.motor_description ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: 12 cv trifásico" /></Label>
          <Label text="Bomba"><input name="pumpDescription" defaultValue={field("pumpDescription", system?.pump_description ?? "")} className="h-11 rounded-xl border px-3" /></Label>
          <Label text="Pressão de saída (bar)" error={state.fieldErrors?.pressureBar?.[0]}><input name="pressureBar" inputMode="decimal" defaultValue={field("pressureBar", system?.pressure_bar ?? "")} className="h-11 rounded-xl border px-3" /></Label>
          <Label text="Espaçamento"><input name="spacingDescription" defaultValue={field("spacingDescription", system?.spacing_description ?? "")} className="h-11 rounded-xl border px-3" placeholder="Ex.: 3,0 x 0,7" /></Label>
        </div>
        <Label text="Observações">
          <textarea name="notes" defaultValue={field("notes", system?.notes ?? "")} className="min-h-24 rounded-xl border p-3" />
        </Label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

function IrrigationEventModal({ propertyId, context, event, onClose }: { propertyId: string; context: ClimateFormContext; event?: IrrigationEvent; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(event ? updateIrrigationEventAction : createIrrigationEventAction, initialClimateActionState);
  const values = state.values ?? {};
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [onClose, state.status]);
  const field = (name: string, fallback = "") => values[name] ?? fallback;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal title={event ? "Editar irrigação" : "Preencher Controle da Irrigação"} onClose={onClose}>
      <p className="text-sm text-stone-600">Cada envio corresponde a uma linha da tabela do caderno. Informe o que foi realizado, sem criar agenda.</p>
      {state.status === "error" && state.message && <SystemAlert tone="error" className="mt-3">{state.message}</SystemAlert>}
      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="eventId" value={event?.id ?? ""} />
        <input type="hidden" name="clientId" value={field("clientId", crypto.randomUUID())} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Data" error={state.fieldErrors?.occurredOn?.[0]}>
            <input name="occurredOn" type="date" defaultValue={field("occurredOn", event?.occurred_on ?? today)} className="h-11 rounded-xl border px-3" />
          </Label>
          <Label text="Sistema usado">
            <select name="irrigationSystemId" defaultValue={field("irrigationSystemId", event?.irrigation_system_id ?? "")} className="h-11 rounded-xl border px-3">
              <option value="">Não vincular</option>
              {context.irrigationSystems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
            </select>
          </Label>
          <Label text="Talhão">
            <select name="plotId" defaultValue={field("plotId", event?.plot_id ?? "")} className="h-11 rounded-xl border px-3">
              <option value="">Não vincular</option>
              {context.plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
            </select>
          </Label>
          <Label text="Safra">
            <select name="seasonId" defaultValue={field("seasonId", event?.season_id ?? "")} className="h-11 rounded-xl border px-3">
              <option value="">Não vincular</option>
              {context.seasons.map((season) => <option key={season.id} value={season.id}>{season.name} {season.status ? `(${season.status})` : ""}</option>)}
            </select>
          </Label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Label text="Horário inicial"><input name="startedAt" type="time" defaultValue={field("startedAt", event?.started_at?.slice(0, 5) ?? "")} className="h-11 rounded-xl border px-3" /></Label>
          <Label text="Horário final" error={state.fieldErrors?.endedAt?.[0]}><input name="endedAt" type="time" defaultValue={field("endedAt", event?.ended_at?.slice(0, 5) ?? "")} className="h-11 rounded-xl border px-3" /></Label>
          <Label text="Tempo total (min)" error={state.fieldErrors?.durationMinutes?.[0]}><input name="durationMinutes" inputMode="numeric" defaultValue={field("durationMinutes", event?.duration_minutes ? String(event.duration_minutes) : "")} className="h-11 rounded-xl border px-3" placeholder="Ou use horários" /></Label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Label text="Precipitação/lâmina (mm)" error={state.fieldErrors?.appliedMm?.[0]}><input name="appliedMm" inputMode="decimal" defaultValue={field("appliedMm", event?.applied_mm ?? "")} className="h-11 rounded-xl border px-3" /></Label>
          <Label text="Frequência (dias)" error={state.fieldErrors?.frequencyDays?.[0]}><input name="frequencyDays" inputMode="numeric" defaultValue={field("frequencyDays", event?.frequency_days ? String(event.frequency_days) : "")} className="h-11 rounded-xl border px-3" /></Label>
          <Label text="Volume médio aplicado (L)" error={state.fieldErrors?.averageVolumeL?.[0]}><input name="averageVolumeL" inputMode="decimal" defaultValue={field("averageVolumeL", event?.average_volume_l ?? "")} className="h-11 rounded-xl border px-3" /></Label>
        </div>
        <Label text="Responsável">
          <input name="responsibleName" defaultValue={field("responsibleName", event?.responsible_name ?? "")} className="h-11 rounded-xl border px-3" />
        </Label>
        <Label text="Observações">
          <textarea name="notes" defaultValue={field("notes", event?.notes ?? "")} className="min-h-24 rounded-xl border p-3" />
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

function IrrigationFilterModal({ context, searchParams, onClose }: { context: ClimateFormContext; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  return (
    <Modal title="Filtrar ficha de irrigação" onClose={onClose}>
      <form method="get" action="/climate/irrigation" className="mt-4 grid gap-3">
        <Label text="Sistema usado">
          <select name="irrigationSystemId" defaultValue={String(searchParams.irrigationSystemId ?? "")} className="h-11 rounded-xl border px-3">
            <option value="">Todos</option>
            {context.irrigationSystems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
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
          <a href="/climate/irrigation" className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Limpar</a>
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

function DeleteIrrigationEventButton({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(deleteIrrigationEventAction, initialClimateActionState);
  return (
    <form action={action}>
      <input type="hidden" name="eventId" value={eventId} />
      {state.status === "error" && state.message && <span className="mr-2 text-xs text-red-700">{state.message}</span>}
      <Button type="submit" variant="ghost" size="sm" disabled={pending} onClick={(event) => !window.confirm("Apagar este registro de irrigação? Ele ficará no histórico e poderá ser restaurado.") && event.preventDefault()}>
        <Trash2 className="size-4" aria-hidden="true" />
        Apagar
      </Button>
    </form>
  );
}

function RestoreIrrigationEventButton({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(restoreIrrigationEventAction, initialClimateActionState);
  return (
    <form action={action}>
      <input type="hidden" name="eventId" value={eventId} />
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
