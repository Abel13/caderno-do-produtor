"use client";

import { useActionState, useMemo, useState } from "react";

import { Edit2, FileText, Plus, Save, Trash2 } from "@/components/icons";
import { SystemAlert } from "@/components/atoms/system-alert";
import { Button } from "@/components/ui/button";
import { createOperationAction, deleteOperationAction, restoreOperationAction, updateOperationAction } from "@/modules/operations/presentation/actions";
import { initialOperationActionState } from "@/modules/operations/presentation/action-state";
import type { OperationsActionState } from "@/modules/operations/presentation/action-state";
import type { OperationFormContext, OperationalRecordSummary, PlotOption, SeasonOption, PlantingOption } from "@/modules/operations/domain/types";

type Lookup = Record<string, string>;

interface OperationsPageClientProps {
  canManage: boolean;
  propertyId: string;
  propertyName: string;
  records: OperationalRecordSummary[];
  total: number;
  recordTypes: OperationFormContext["recordTypes"];
  plots: PlotOption[];
  plantings: PlantingOption[];
  seasons: SeasonOption[];
  searchParams: {
    recordType?: string;
    seasonId?: string;
    plotId?: string;
    status?: string;
    from?: string;
    to?: string;
    showDeleted?: boolean;
  };
}

export function OperationsPageClient({
  canManage,
  propertyId,
  propertyName,
  records,
  recordTypes,
  plots,
  plantings,
  seasons,
  searchParams,
  total,
}: OperationsPageClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OperationalRecordSummary | null>(null);

  const plotById = useMemo(
    () => Object.fromEntries(plots.map((plot) => [plot.id, plot.name])) as Lookup,
    [plots],
  );
  const seasonById = useMemo(
    () => Object.fromEntries(seasons.map((season) => [season.id, `${season.name} (${season.status})`])) as Lookup,
    [seasons],
  );

  const statusLabel = (status: OperationalRecordSummary["status"]) =>
    status === "draft" ? "Rascunho" : status === "confirmed" ? "Confirmado" : status === "cancelled" ? "Cancelado" : "Em revisão";

  const payloadText = (record: OperationalRecordSummary) => {
    const payload = record.payload as Record<string, unknown> | null;
    const value = payload?.value;
    const unit = payload?.value_unit ?? "";
    if (typeof value === "number") {
      return `${value} ${String(unit || "").trim()}`.trim();
    }
    return "Sem medida registrada";
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
          {propertyName}
        </div>
        <p className="text-sm text-stone-500">Registros por propriedade: {total}</p>
      </div>

      <section className="mt-4 rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-emerald-800" aria-hidden="true" />
          <h1 className="text-xl font-bold">Registros operacionais</h1>
        </div>
        <p className="mt-2 text-sm text-stone-600">
          Cada registro reúne área, responsável, situação e contexto de ocorrência para reutilização em módulos futuros.
        </p>

        <form method="get" className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Tipo
            <select name="recordType" defaultValue={searchParams.recordType} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
              <option value="">Todos</option>
              {recordTypes.map((recordType) => (
                <option key={recordType.code} value={recordType.code}>
                  {recordType.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Safra
            <select name="seasonId" defaultValue={searchParams.seasonId} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
              <option value="">Todas</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Talhão
            <select name="plotId" defaultValue={searchParams.plotId} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
              <option value="">Todos</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Situação
            <select name="status" defaultValue={searchParams.status} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
              <option value="">Todas</option>
              <option value="draft">Rascunho</option>
              <option value="confirmed">Confirmado</option>
              <option value="cancelled">Cancelado</option>
              <option value="review_required">Em revisão</option>
            </select>
          </label>
          <label className="text-sm">
            De
            <input name="from" type="date" defaultValue={searchParams.from} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3" />
          </label>
          <label className="text-sm">
            Até
            <input name="to" type="date" defaultValue={searchParams.to} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3" />
          </label>
          <label className="flex items-end text-sm">
            <input id="showDeleted" type="checkbox" name="showDeleted" value="1" defaultChecked={searchParams.showDeleted} />
            <span className="ml-2">Exibir apagados</span>
          </label>
          <div className="flex items-end">
            <Button type="submit">Aplicar filtro</Button>
          </div>
        </form>
      </section>

      {canManage && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Novo registro
          </Button>
          <SystemAlert tone="info" className="w-full sm:w-auto">
            Dica: use uma unidade clara (mm, kg, un). O formulário mantém seus dados após erros de rede.
          </SystemAlert>
        </div>
      )}

      {!canManage && (
        <SystemAlert tone="warning" className="mt-4">
          <strong>Consulta:</strong> técnico ou usuário sem permissão de edição. Você pode visualizar, não consegue salvar ou excluir.
        </SystemAlert>
      )}

      <section className="mt-4 grid gap-3">
        {records.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-stone-600">
            Nenhum registro encontrado com esse filtro.
          </p>
        ) : (
          records.map((record) => (
            <article key={record.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {recordTypes.find((type) => type.code === record.record_type)?.label ?? record.record_type}
                  </p>
                  <p className="text-sm text-stone-600">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.occurred_at))}
                  </p>
                </div>
                <div className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold">{statusLabel(record.status)}</div>
              </div>
              <p className="mt-2 text-sm text-stone-700">
                {record.plot_id ? `Talhão: ${plotById[record.plot_id] ?? "não informado"}` : "Talhão não informado"}
              </p>
              <p className="text-sm text-stone-700">
                {record.season_id ? `Safra: ${seasonById[record.season_id] ?? "não informada"}` : "Safra não informada"}
              </p>
              <p className="text-sm text-stone-700">
                Medida: <span className="font-semibold">{payloadText(record)}</span>
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {canManage && !record.deleted_at && <EditRecordButton onEdit={() => setEditingRecord(record)} />}
                {canManage && !record.deleted_at && <DeleteRecordButton recordId={record.id} />}
                {canManage && record.deleted_at && <RestoreRecordButton recordId={record.id} />}
                {record.deleted_at && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Apagado</span>}
              </div>
            </article>
          ))
        )}
      </section>

      {createOpen && (
        <OperationFormModal
          propertyId={propertyId}
          context={{ recordTypes, plots, plantings, seasons }}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
          type="create"
        />
      )}
      {editingRecord && (
        <OperationFormModal
          propertyId={propertyId}
          context={{ recordTypes, plots, plantings, seasons }}
          onClose={() => setEditingRecord(null)}
          onSuccess={() => setEditingRecord(null)}
          type="edit"
          initialRecord={editingRecord}
        />
      )}
    </div>
  );
}

function EditRecordButton({ onEdit }: { onEdit: () => void }) {
  return <Button onClick={onEdit} variant="ghost" size="sm"><Edit2 className="size-4" aria-hidden="true"/>Editar</Button>;
}

function DeleteRecordButton({ recordId }: { recordId: string }) {
  const [state, action, pending] = useActionState(deleteOperationAction, initialOperationActionState);
  if (state.status === "success") return null;
  return (
    <form action={action} className="inline">
      <input type="hidden" name="recordId" value={recordId} />
      <Button size="sm" variant="ghost" type="submit" disabled={pending}>
        <Trash2 className="size-4" aria-hidden="true" />
        {pending ? "Apagando..." : "Apagar"}
      </Button>
      {state.message && <SystemAlert tone={state.status}>{state.message}</SystemAlert>}
    </form>
  );
}

function RestoreRecordButton({ recordId }: { recordId: string }) {
  const [state, action, pending] = useActionState(restoreOperationAction, initialOperationActionState);
  if (state.status === "success") return null;
  return (
    <form action={action} className="inline">
      <input type="hidden" name="recordId" value={recordId} />
      <Button size="sm" variant="ghost" type="submit" disabled={pending}>
        Restaurar
      </Button>
      {state.message && <SystemAlert tone={state.status}>{state.message}</SystemAlert>}
    </form>
  );
}

function OperationFormModal({
  type,
  propertyId,
  context,
  initialRecord,
  onClose,
  onSuccess,
}: {
  type: "create" | "edit";
  propertyId: string;
  context: OperationFormContext;
  initialRecord?: OperationalRecordSummary;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createState = useActionState(async (previous: OperationsActionState, formData: FormData) => {
    const result = type === "create" ? await createOperationAction(previous, formData) : await updateOperationAction(previous, formData);
    if (result.status === "success") onSuccess();
    return result;
  }, initialOperationActionState);

  const [state, action, pending] = createState;
  const [clientId] = useState(() => crypto.randomUUID());

  const values = state.values ?? {};
  const recordType = values.recordType ?? (initialRecord ? initialRecord.record_type : context.recordTypes[0]?.code);
  const selectedType = context.recordTypes.find((item) => item.code === recordType) ?? context.recordTypes[0];

  const availablePlantings = context.plantings;

  const occurredAtDefault = (() => {
    if (values.occurredAt) return values.occurredAt;
    if (initialRecord) return toDatetimeInputValue(initialRecord.occurred_at);
    return "";
  })();

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-stone-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5">
        <h2 className="text-lg font-bold">
          {type === "create" ? "Novo registro operacional" : "Editar registro operacional"}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          {type === "create" ? "Preencha para registrar uma ocorrência da operação de campo." : "Ajuste e salve sem perder os dados."}
        </p>

        <form action={action} className="mt-4 space-y-4">
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="recordId" value={initialRecord?.id ?? ""} />
          <input type="hidden" name="origin" value="manual" />
          <input type="hidden" name="clientId" value={values.clientId ?? clientId} />

          <label className="block text-sm font-semibold">
            Tipo
            <select name="recordType" defaultValue={recordType} className="mt-1 h-11 w-full rounded-xl border border-stone-300" required>
              {context.recordTypes.map((recordTypeOption) => (
                <option key={recordTypeOption.code} value={recordTypeOption.code}>
                  {recordTypeOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Ocorrência
            <input
              name="occurredAt"
              type="datetime-local"
              required
              className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3"
              defaultValue={values.occurredAt ?? occurredAtDefault}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Situação
              <select name="status" defaultValue={values.status ?? initialRecord?.status ?? "draft"} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
                <option value="draft">Rascunho</option>
                <option value="confirmed">Confirmado</option>
                <option value="review_required">Em revisão</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Talhão (opcional)
              <select name="plotId" defaultValue={values.plotId ?? initialRecord?.plot_id ?? ""} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
                <option value="">Sem talhão</option>
                {context.plots.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Lavoura (opcional)
              <select name="plantingId" defaultValue={values.plantingId ?? initialRecord?.planting_id ?? ""} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
                <option value="">Sem lavoura</option>
                {availablePlantings.map((planting) => (
                  <option key={planting.id} value={planting.id}>
                    {planting.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Safra (opcional)
              <select name="seasonId" defaultValue={values.seasonId ?? initialRecord?.season_id ?? ""} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
                <option value="">Sem safra</option>
                {context.seasons
                  .filter((season) => season.status !== "closed")
                  .map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({season.status})
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold">
              Medida principal
              <input
                name="payloadValue"
                type="number"
                step="0.001"
                className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3"
                defaultValue={String(values.payloadValue ?? "")}
                placeholder={`Ex.: 15 ${selectedType?.default_unit ?? ""}`.trim()}
              />
            </label>
            <label className="block text-sm font-semibold">
              Unidade
              <input
                name="payloadUnit"
                className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3"
                defaultValue={values.payloadUnit ?? selectedType?.default_unit ?? ""}
                placeholder="Ex.: mm, kg, un"
              />
            </label>
            <label className="block text-sm font-semibold">
              Observação no payload
              <input
                name="payloadComment"
                className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3"
                defaultValue={values.payloadComment ?? ""}
                placeholder="Informação complementar da medição"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold">
            Notas
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              defaultValue={values.notes ?? initialRecord?.notes ?? ""}
              placeholder="Observações, decisões e contexto de campo"
            />
          </label>

          <label className="block text-sm font-semibold">
            Responsável (opcional)
            <input
              name="responsibleUserId"
              type="text"
              className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3"
              defaultValue={values.responsibleUserId ?? ""}
              placeholder="UUID do técnico responsável, se necessário"
            />
          </label>

          {state.message && <SystemAlert tone={state.status}>{state.message}</SystemAlert>}
          {state.fieldErrors && (
            <div className="space-y-1 text-sm text-red-700">
              {Object.entries(state.fieldErrors).map(([field, items]) => (
                <p key={field}>{`${field}: ${items?.join(", ")}`}</p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
              <Save className="size-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
          <p className="text-xs text-stone-500">
            {selectedType?.description ?? "Após salvar, o formulário fecha para não interromper sua produtividade."}
          </p>
        </form>
      </div>
    </div>
  );
}

function toDatetimeInputValue(value: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}
