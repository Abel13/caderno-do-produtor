"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type React from "react";

import { Edit2, Plus, Save, Sliders, Trash2, X } from "@/components/icons";
import { SystemAlert } from "@/components/atoms/system-alert";
import { Button } from "@/components/ui/button";
import { formatDecimal, productionStatusLabel, summarizeProduction } from "@/modules/production/domain/rules";
import type { ProductionFormContext, ProductionOption, ProductionRecord } from "@/modules/production/domain/types";
import { initialProductionActionState } from "@/modules/production/presentation/action-state";
import {
  createProductionRecordAction,
  deleteProductionRecordAction,
  restoreProductionRecordAction,
  updateProductionRecordAction,
} from "@/modules/production/presentation/actions";

type Lookup = Record<string, string>;

interface ProductionPageProps {
  canManage: boolean;
  propertyId: string;
  propertyName: string;
  records: ProductionRecord[];
  context: ProductionFormContext;
  searchParams: Record<string, string | boolean | undefined>;
}

export function ProductionPageClient({ canManage, propertyId, propertyName, records, context, searchParams }: ProductionPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionRecord | null>(null);
  const plotById = useMemo(() => Object.fromEntries(context.plots.map((plot) => [plot.id, plot.name])) as Lookup, [context.plots]);
  const plantingById = useMemo(() => Object.fromEntries(context.plantings.map((planting) => [planting.id, planting.name])) as Lookup, [context.plantings]);
  const seasonById = useMemo(() => Object.fromEntries(context.seasons.map((season) => [season.id, `${season.name}${season.status ? ` (${season.status})` : ""}`])) as Lookup, [context.seasons]);
  const summary = useMemo(() => summarizeProduction(records), [records]);
  const activeFilters = [searchParams.plotId, searchParams.plantingId, searchParams.seasonId, searchParams.from, searchParams.to, searchParams.showDeleted ? "1" : ""].filter(Boolean).length;

  return (
    <div className="mt-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">{propertyName}</p>
            <h1 className="mt-1 text-2xl font-bold">Controle e acompanhamento de produção</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Preencha a ficha do caderno por talhão e safra: produção em sacas, produtividade, lote, beneficiamento, bebida, tipo e catação.
            </p>
            <p className="mt-2 text-xs font-semibold text-stone-500">{activeFilters ? `${activeFilters} filtro${activeFilters === 1 ? "" : "s"} aplicado${activeFilters === 1 ? "" : "s"}` : "Sem filtros aplicados"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilterOpen(true)}>
              <Sliders className="size-4" aria-hidden="true" />
              Filtrar
            </Button>
            {activeFilters > 0 && <a href="/production" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Limpar</a>}
          </div>
        </div>
      </section>

      {!canManage ? (
        <SystemAlert tone="warning" className="mt-4">
          Acesso para consulta: você pode ver a ficha de produção desta propriedade, mas não criar, editar ou apagar.
        </SystemAlert>
      ) : (
        <div className="mt-4">
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Registrar produção
          </Button>
        </div>
      )}

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Produção total" value={`${formatDecimal(summary.totalSc)} sc`} helper="Soma dos registros não apagados." />
        <Metric label="Produtividade média" value={`${formatDecimal(summary.averageProductivityScHa)} sc/ha`} helper="Calculada pela área registrada." />
        <Metric label="Linhas da ficha" value={String(summary.recordsCount)} helper="Registros ativos no filtro atual." />
      </section>

      <section className="mt-4 grid gap-3">
        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-stone-600">
            Nenhuma produção registrada. Quando a colheita de um talhão for apurada, use “Registrar produção” para preencher a linha correspondente da ficha.
          </div>
        ) : (
          records.map((record) => (
            <article key={record.id} className="rounded-2xl border bg-white p-4">
              <ProductionCard record={record} plotById={plotById} plantingById={plantingById} seasonById={seasonById} />
              <div className="mt-3 flex flex-wrap gap-2">
                {canManage && !record.operational_record.deleted_at && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(record)}>
                    <Edit2 className="size-4" aria-hidden="true" />
                    Editar
                  </Button>
                )}
                {canManage && !record.operational_record.deleted_at && <DeleteProductionButton productionId={record.id} />}
                {canManage && record.operational_record.deleted_at && <RestoreProductionButton productionId={record.id} />}
                {record.operational_record.deleted_at && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Apagado</span>}
              </div>
            </article>
          ))
        )}
      </section>

      {formOpen && <ProductionModal propertyId={propertyId} context={context} searchParams={searchParams} onClose={() => setFormOpen(false)} />}
      {editing && <ProductionModal propertyId={propertyId} context={context} record={editing} searchParams={searchParams} onClose={() => setEditing(null)} />}
      {filterOpen && <ProductionFilterModal context={context} searchParams={searchParams} onClose={() => setFilterOpen(false)} />}
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

function ProductionCard({ record, plotById, plantingById, seasonById }: { record: ProductionRecord; plotById: Lookup; plantingById: Lookup; seasonById: Lookup }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-emerald-800">{seasonById[record.season_id] ?? "Safra"}</p>
          <h2 className="text-lg font-bold">{plotById[record.plot_id] ?? "Talhão"}</h2>
          <p className="text-sm text-stone-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${record.harvested_on}T12:00:00`))}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">{productionStatusLabel(record.operational_record.status)}</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <ContextItem label="Área" value={`${formatDecimal(record.area_ha)} ha`} />
        <ContextItem label="Produção por área" value={`${formatDecimal(record.productivity_sc_ha)} sc/ha`} />
        <ContextItem label="Produção total" value={`${formatDecimal(record.total_sc)} sc`} />
        <ContextItem label="Lote" value={record.lot_code ?? "Não informado"} />
        <ContextItem label="Processo" value={record.processing_method ?? "Não informado"} />
        <ContextItem label="Bebida" value={record.beverage_classification ?? "Não informada"} />
        <ContextItem label="Tipo" value={record.coffee_type ?? "Não informado"} />
        <ContextItem label="% de catação" value={record.picking_percentage ? `${formatDecimal(record.picking_percentage)}%` : "Não informado"} />
        <ContextItem label="Lavoura" value={record.planting_id ? plantingById[record.planting_id] ?? "Lavoura" : "Não vinculada"} />
      </dl>
      {record.notes && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{record.notes}</p>}
    </div>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 font-medium text-stone-800">{value}</dd>
    </div>
  );
}

function ProductionModal({ propertyId, context, record, searchParams, onClose }: { propertyId: string; context: ProductionFormContext; record?: ProductionRecord; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  const action = record ? updateProductionRecordAction : createProductionRecordAction;
  const [state, formAction, pending] = useActionState(action, initialProductionActionState);
  const clientId = useMemo(() => crypto.randomUUID(), []);
  const values = state.values ?? {};
  const selectedPlotId = values.plotId ?? record?.plot_id ?? String(searchParams.plotId ?? "");
  const selectedPlanting = context.plantings.find((planting) => planting.id === (values.plantingId ?? record?.planting_id ?? ""));
  const selectedPlot = context.plots.find((plot) => plot.id === selectedPlotId);
  const defaultArea = values.areaHa ?? record?.area_ha ?? selectedPlanting?.area_ha ?? selectedPlot?.area_ha ?? "";

  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state.status, onClose]);

  return (
    <Modal title={record ? "Editar produção" : "Registrar produção"} onClose={onClose}>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="productionId" value={record?.id ?? ""} />
        <input type="hidden" name="clientId" value={record ? "" : clientId} />
        {state.status === "error" && <SystemAlert tone="error">{state.message}</SystemAlert>}
        <SelectField label="Talhão" name="plotId" defaultValue={selectedPlotId} options={context.plots} error={state.fieldErrors?.plotId?.[0]} required />
        <SelectField label="Lavoura vinculada" name="plantingId" defaultValue={values.plantingId ?? record?.planting_id ?? ""} options={context.plantings.filter((planting) => !selectedPlotId || planting.plot_id === selectedPlotId)} error={state.fieldErrors?.plantingId?.[0]} />
        <SelectField label="Safra" name="seasonId" defaultValue={values.seasonId ?? record?.season_id ?? String(searchParams.seasonId ?? "")} options={context.seasons} error={state.fieldErrors?.seasonId?.[0]} required />
        <Input label="Data da colheita" name="harvestedOn" type="date" defaultValue={values.harvestedOn ?? record?.harvested_on ?? new Date().toISOString().slice(0, 10)} error={state.fieldErrors?.harvestedOn?.[0]} required />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Área (ha)" name="areaHa" defaultValue={defaultArea} error={state.fieldErrors?.areaHa?.[0]} inputMode="decimal" required />
          <Input label="Produção por área (sc/ha)" name="productivityScHa" defaultValue={values.productivityScHa ?? record?.productivity_sc_ha ?? ""} error={state.fieldErrors?.productivityScHa?.[0]} inputMode="decimal" />
          <Input label="Produção total (sc/talhão)" name="totalSc" defaultValue={values.totalSc ?? record?.total_sc ?? ""} error={state.fieldErrors?.totalSc?.[0]} inputMode="decimal" />
        </div>
        <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">
          Informe a produção total ou a produção por hectare. Quando uma delas faltar, o sistema calcula usando a área.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Lote" name="lotCode" defaultValue={values.lotCode ?? record?.lot_code ?? ""} error={state.fieldErrors?.lotCode?.[0]} />
          <Input label="Processo de beneficiamento" name="processingMethod" defaultValue={values.processingMethod ?? record?.processing_method ?? ""} error={state.fieldErrors?.processingMethod?.[0]} placeholder="Ex.: via úmida, natural" />
          <Input label="Bebida" name="beverageClassification" defaultValue={values.beverageClassification ?? record?.beverage_classification ?? ""} error={state.fieldErrors?.beverageClassification?.[0]} placeholder="Ex.: dura, mole" />
          <Input label="Tipo do café" name="coffeeType" defaultValue={values.coffeeType ?? record?.coffee_type ?? ""} error={state.fieldErrors?.coffeeType?.[0]} />
          <Input label="% de catação" name="pickingPercentage" defaultValue={values.pickingPercentage ?? record?.picking_percentage ?? ""} error={state.fieldErrors?.pickingPercentage?.[0]} inputMode="decimal" />
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Observações
          <textarea name="notes" defaultValue={values.notes ?? record?.notes ?? ""} rows={3} className="rounded-xl border border-stone-200 px-3 py-2 font-normal" />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>
            <Save className="size-4" aria-hidden="true" />
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProductionFilterModal({ context, searchParams, onClose }: { context: ProductionFormContext; searchParams: Record<string, string | boolean | undefined>; onClose: () => void }) {
  return (
    <Modal title="Filtrar ficha de produção" onClose={onClose}>
      <form action="/production" className="grid gap-4">
        <SelectField label="Talhão" name="plotId" defaultValue={String(searchParams.plotId ?? "")} options={context.plots} />
        <SelectField label="Lavoura" name="plantingId" defaultValue={String(searchParams.plantingId ?? "")} options={context.plantings} />
        <SelectField label="Safra" name="seasonId" defaultValue={String(searchParams.seasonId ?? "")} options={context.seasons} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="De" name="from" type="date" defaultValue={String(searchParams.from ?? "")} />
          <Input label="Até" name="to" type="date" defaultValue={String(searchParams.to ?? "")} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showDeleted" value="1" defaultChecked={Boolean(searchParams.showDeleted)} />
          Mostrar registros apagados logicamente
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Aplicar filtros</Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteProductionButton({ productionId }: { productionId: string }) {
  const [state, action, pending] = useActionState(deleteProductionRecordAction, initialProductionActionState);
  return (
    <form action={action}>
      <input type="hidden" name="productionId" value={productionId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending} onClick={(event) => {
        if (!confirm("Apagar este registro da ficha? Ele ficará no histórico e poderá ser restaurado.")) event.preventDefault();
      }}>
        <Trash2 className="size-4" aria-hidden="true" />
        Apagar
      </Button>
      {state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}
    </form>
  );
}

function RestoreProductionButton({ productionId }: { productionId: string }) {
  const [state, action, pending] = useActionState(restoreProductionRecordAction, initialProductionActionState);
  return (
    <form action={action}>
      <input type="hidden" name="productionId" value={productionId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>Restaurar</Button>
      {state.status === "error" && <span className="ml-2 text-xs text-red-700">{state.message}</span>}
    </form>
  );
}

function SelectField({ label, name, defaultValue, options, error, required }: { label: string; name: string; defaultValue?: string; options: ProductionOption[]; error?: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} required={required} className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 py-2 font-normal">
        <option value="">{required ? "Selecione" : "Não informar"}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}{option.status ? ` (${option.status})` : ""}</option>
        ))}
      </select>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

function Input({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input {...props} className="min-h-11 rounded-xl border border-stone-200 px-3 py-2 font-normal" />
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/40 p-4">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Ficha do caderno</p>
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
