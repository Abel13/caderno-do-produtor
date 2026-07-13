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
type FieldErrors = NonNullable<OperationsActionState["fieldErrors"]>;

const fieldLabels: Record<string, string> = {
  propertyId: "Propriedade",
  recordId: "Registro",
  recordType: "Tipo",
  occurredAt: "Data e hora",
  plotId: "Talhão",
  plantingId: "Lavoura",
  seasonId: "Safra",
  status: "Situação",
  payload: "Medida",
  payloadValue: "Valor da medida",
  payloadUnit: "Unidade",
  payloadComment: "Observação da medida",
  notes: "Notas",
  origin: "Origem",
  responsibleUserId: "Responsável",
  clientId: "Identificador de envio",
};

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
  const plantingById = useMemo(
    () => Object.fromEntries(plantings.map((planting) => [planting.id, planting.name])) as Lookup,
    [plantings],
  );
  const typeByCode = useMemo(
    () => Object.fromEntries(recordTypes.map((recordType) => [recordType.code, recordType])) as Record<string, OperationFormContext["recordTypes"][number]>,
    [recordTypes],
  );

  const statusLabel = (status: OperationalRecordSummary["status"]) =>
    status === "draft" ? "Rascunho" : status === "confirmed" ? "Confirmado" : status === "cancelled" ? "Cancelado" : "Em revisão";
  const statusDescription = (status: OperationalRecordSummary["status"]) =>
    status === "draft"
      ? "Ainda pode ser conferido antes de entrar como registro definitivo."
      : status === "confirmed"
        ? "Registro válido para compor o histórico da propriedade."
        : status === "cancelled"
          ? "Registro cancelado, mantido apenas para rastreabilidade."
          : "Registro vindo de revisão ou importação, aguardando conferência.";
  const statusClass = (status: OperationalRecordSummary["status"]) =>
    status === "confirmed"
      ? "bg-emerald-100 text-emerald-900"
      : status === "cancelled"
        ? "bg-red-100 text-red-900"
        : status === "review_required"
          ? "bg-amber-100 text-amber-900"
          : "bg-stone-100 text-stone-800";

  const payloadText = (record: OperationalRecordSummary) => {
    const payload = record.payload as Record<string, unknown> | null;
    const value = payload?.value;
    const defaultUnit = typeByCode[record.record_type]?.default_unit ?? "";
    const unit = payload?.value_unit ?? defaultUnit;
    if (typeof value === "number") {
      return `${value} ${String(unit || "").trim()}`.trim();
    }
    return defaultUnit ? `Sem valor informado (${defaultUnit})` : "Sem medida registrada";
  };
  const payloadComment = (record: OperationalRecordSummary) => {
    const payload = record.payload as Record<string, unknown> | null;
    return typeof payload?.comment === "string" && payload.comment.trim() ? payload.comment : null;
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
          <strong>Acesso para consulta:</strong> seu papel atual permite visualizar os registros desta propriedade, mas não criar, editar, apagar ou restaurar operações.
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
                    {typeByCode[record.record_type]?.label ?? record.record_type}
                  </p>
                  <p className="text-sm text-stone-600">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.occurred_at))}
                  </p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(record.status)}`}>{statusLabel(record.status)}</div>
              </div>
              <p className="mt-2 text-sm text-stone-600">{statusDescription(record.status)}</p>

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <ContextItem label="Talhão" value={record.plot_id ? plotById[record.plot_id] ?? "Não encontrado" : "Não informado"} />
                <ContextItem label="Lavoura" value={record.planting_id ? plantingById[record.planting_id] ?? "Não encontrada" : "Não informada"} />
                <ContextItem label="Safra" value={record.season_id ? seasonById[record.season_id] ?? "Não informada" : "Não informada"} />
                <ContextItem label="Medida" value={payloadText(record)} strong />
              </dl>

              {(payloadComment(record) || record.notes) && (
                <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
                  {payloadComment(record) && <p><span className="font-semibold">Medição:</span> {payloadComment(record)}</p>}
                  {record.notes && <p><span className="font-semibold">Notas:</span> {record.notes}</p>}
                </div>
              )}

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
          initialDefaults={{
            recordType: searchParams.recordType,
            seasonId: searchParams.seasonId,
            plotId: searchParams.plotId,
          }}
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

function ContextItem({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className={strong ? "font-semibold text-stone-900" : "text-stone-800"}>{value}</dd>
    </div>
  );
}

function EditRecordButton({ onEdit }: { onEdit: () => void }) {
  return <Button onClick={onEdit} variant="ghost" size="sm"><Edit2 className="size-4" aria-hidden="true"/>Editar</Button>;
}

function DeleteRecordButton({ recordId }: { recordId: string }) {
  const [state, action, pending] = useActionState(deleteOperationAction, initialOperationActionState);
  const [confirming, setConfirming] = useState(false);
  if (state.status === "success") return null;
  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" type="button" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" aria-hidden="true" />
        Apagar
      </Button>
    );
  }
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="recordId" value={recordId} />
      <Button size="sm" variant="ghost" type="submit" disabled={pending}>
        <Trash2 className="size-4" aria-hidden="true" />
        {pending ? "Apagando..." : "Confirmar exclusão"}
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setConfirming(false)} disabled={pending}>
        Cancelar
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
  initialDefaults,
  onClose,
  onSuccess,
}: {
  type: "create" | "edit";
  propertyId: string;
  context: OperationFormContext;
  initialRecord?: OperationalRecordSummary;
  initialDefaults?: { recordType?: string; seasonId?: string; plotId?: string };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const initialPayload = (initialRecord?.payload ?? {}) as Record<string, unknown>;
  const createState = useActionState(async (previous: OperationsActionState, formData: FormData) => {
    const result = type === "create" ? await createOperationAction(previous, formData) : await updateOperationAction(previous, formData);
    if (result.status === "success") onSuccess();
    return result;
  }, initialOperationActionState);

  const [state, action, pending] = createState;
  const [clientId] = useState(() => crypto.randomUUID());

  const values = state.values ?? {};
  const [recordType, setRecordType] = useState(values.recordType ?? (initialRecord ? initialRecord.record_type : initialDefaults?.recordType ?? context.recordTypes[0]?.code));
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
            <select
              name="recordType"
              value={recordType ?? ""}
              onChange={(event) => setRecordType(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-stone-300"
              required
            >
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
              <select name="plotId" defaultValue={values.plotId ?? initialRecord?.plot_id ?? initialDefaults?.plotId ?? ""} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
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
              <select name="seasonId" defaultValue={values.seasonId ?? initialRecord?.season_id ?? initialDefaults?.seasonId ?? ""} className="mt-1 h-11 w-full rounded-xl border border-stone-300">
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
                defaultValue={String(values.payloadValue ?? initialPayload.value ?? "")}
                placeholder={`Ex.: 15 ${selectedType?.default_unit ?? ""}`.trim()}
              />
            </label>
            <label className="block text-sm font-semibold">
              Unidade
              <input
                name="payloadUnit"
                className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3"
                defaultValue={values.payloadUnit ?? initialPayload.value_unit ?? selectedType?.default_unit ?? ""}
                placeholder={selectedType?.default_unit ? `Padrão: ${selectedType.default_unit}` : "Ex.: mm, kg, un"}
              />
              {selectedType?.default_unit && <span className="mt-1 block text-xs font-normal text-stone-500">Padrão deste tipo: {selectedType.default_unit}</span>}
            </label>
            <label className="block text-sm font-semibold">
              Observação no payload
              <input
                name="payloadComment"
                className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3"
                defaultValue={values.payloadComment ?? initialPayload.comment ?? ""}
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

          <input name="responsibleUserId" type="hidden" value={values.responsibleUserId ?? ""} />

          {state.message && <SystemAlert tone={state.status}>{state.message}</SystemAlert>}
          {state.fieldErrors && <FieldErrorList errors={state.fieldErrors} />}

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

function FieldErrorList({ errors }: { errors: FieldErrors }) {
  const items = Object.entries(errors)
    .flatMap(([field, messages]) => (messages ?? []).map((message) => ({ field, message })))
    .filter((item) => item.message);
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {items.map((item) => (
        <p key={`${item.field}-${item.message}`}>
          <span className="font-semibold">{fieldLabels[item.field] ?? item.field}:</span> {item.message}
        </p>
      ))}
    </div>
  );
}

function toDatetimeInputValue(value: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}
