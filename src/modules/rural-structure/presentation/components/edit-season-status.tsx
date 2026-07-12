"use client";

import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SystemAlert } from "@/components/atoms/system-alert";
import { updateSeasonStatusAction, type StructureActionState } from "../actions";

function statusLabel(status: string) {
  if (status === "open") return "Aberta";
  if (status === "closed") return "Encerrada";
  return "Em planejamento";
}

function statusDescription(status: string) {
  if (status === "open") {
    return "A safra está ativa e permite novos registros operacionais.";
  }
  if (status === "closed") {
    return "A safra foi encerrada; não recebe alterações comuns.";
  }
  return "A safra ainda está em preparação e não deve receber operações produtivas.";
}

type SeasonStatus = "planning" | "open" | "closed";

const seasonTransitions: Record<SeasonStatus, { value: SeasonStatus; label: string }[]> = {
  planning: [
    { value: "open", label: "Abrir safra (ativa)" },
    { value: "closed", label: "Encerrar safra" },
  ],
  open: [{ value: "closed", label: "Encerrar safra" }],
  closed: [{ value: "open", label: "Reabrir safra (aberta novamente)" }],
};

const REOPEN_WARNING = "Confirmar reabertura da safra com justificativa obrigatória.";
const CLOSE_WARNING = "Esta ação irá fechar o ciclo de registro desta safra.";

export function EditSeasonStatus({
  seasonId,
  currentStatus,
  canReopen,
}: {
  seasonId: string;
  currentStatus: string;
  canReopen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (previous: StructureActionState, formData: FormData) => {
    const next = await updateSeasonStatusAction(previous, formData);
    if (next.status === "success") {
      setOpen(false);
      setBlockedMessage(null);
      setConfirmMessage(null);
    }
    return next;
  }, { status: "idle" });

  const selectedStatus = (state.values?.status as SeasonStatus | undefined) ?? (currentStatus as SeasonStatus);
  const options =
    (seasonTransitions[currentStatus as SeasonStatus] ?? []).filter(
      (option) => !(currentStatus === "closed" && option.value === "open" && !canReopen)
    );
  const hasOptions = options.length > 0;
  const showReason =
    (selectedStatus === "open" && currentStatus === "closed" && canReopen) ||
    (state.values?.reopenReason ? true : false);
  const blockedReopen = currentStatus === "closed" && selectedStatus === "open" && !canReopen;

  if (!open) {
    if (!hasOptions) {
      return <p className="mt-3 text-xs text-stone-600">Sem transição disponível para este status.</p>;
    }

    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(true);
          setBlockedMessage(null);
          setConfirmMessage(null);
        }}
      >
        Alterar situação
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <form
        ref={formRef}
        action={action}
        className="space-y-3"
        onSubmit={(event) => {
          if (blockedReopen) {
            event.preventDefault();
            setBlockedMessage("A safra encerrada só pode ser reaberta pelo proprietário.");
            return;
          }

          if (confirmMessage) return;

          const submitted = new FormData(event.currentTarget);
          const nextStatus = String(submitted.get("status") ?? "");
          if (nextStatus === "closed") {
            event.preventDefault();
            setConfirmMessage(CLOSE_WARNING);
            return;
          }
          if (nextStatus === "open" && currentStatus === "closed") {
            event.preventDefault();
            setConfirmMessage(REOPEN_WARNING);
            return;
          }
        }}
      >
        <input type="hidden" name="seasonId" value={seasonId} />
        <input type="hidden" name="seasonCurrentStatus" value={currentStatus} />

        <label className="block text-sm font-semibold">
          Situação atual
          <div className="mt-1 text-sm text-stone-600">{statusLabel(currentStatus)}</div>
          <p className="text-xs text-stone-500">{statusDescription(currentStatus)}</p>
        </label>

        <label className="block text-sm font-semibold">
          Nova situação
          <select
            name="status"
            className="mt-1 h-12 w-full rounded-xl border border-stone-300 bg-white px-3"
            defaultValue={state.values?.status ?? ""}
            required
            onChange={() => {
              setBlockedMessage(null);
              setConfirmMessage(null);
            }}
          >
            {options.length ? (
              <>
                <option value="">Selecione</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </>
            ) : (
              <option value="">Não há alterações disponíveis</option>
            )}
          </select>
        </label>

        {showReason && (
          <label className="block text-sm font-semibold">
            Justificativa para reabertura
            <textarea
              name="reopenReason"
              defaultValue={state.values?.reopenReason}
              required
              maxLength={500}
              rows={3}
              className="mt-1 min-h-24 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
              placeholder="Explique por que a safra precisa voltar ao estado aberto."
            />
          </label>
        )}

        <p className="text-xs text-stone-500">
          {canReopen
            ? "Ao reabrir, informe a justificativa e, se necessário, ajuste o novo período na tela de cadastro."
            : "Somente proprietário pode reabrir safra encerrada."}
        </p>

        {blockedMessage && <SystemAlert tone="error">{blockedMessage}</SystemAlert>}
        {state.message && <SystemAlert tone={state.status}>{state.message}</SystemAlert>}

        {confirmMessage ? (
          <div className="space-y-2 rounded-xl bg-stone-100 p-2">
            <SystemAlert tone="warning">{confirmMessage}</SystemAlert>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmMessage(null)}
                disabled={pending}
              >
                Revisar situação
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setConfirmMessage(null);
                  formRef.current?.requestSubmit();
                }}
              >
                Confirmar mudança
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending || options.length === 0}>{pending ? "Salvando..." : "Salvar situação"}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
