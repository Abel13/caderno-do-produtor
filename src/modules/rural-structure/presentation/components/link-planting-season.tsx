"use client";

import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SystemAlert } from "@/components/atoms/system-alert";
import { SeasonSummary } from "@/modules/rural-structure/infrastructure/supabase/rural-structure-repository";
import { linkPlantingSeasonAction, type StructureActionState } from "../actions";

type ProductiveStatus = "forming" | "productive" | "renewing";

const PRODUCTIVE_STATUS_OPTIONS: { value: ProductiveStatus; label: string }[] = [
  { value: "forming", label: "Formação — lavoura jovem" },
  { value: "productive", label: "Produção — lavoura produtiva" },
  { value: "renewing", label: "Renovação — recuperação para produção" },
];

export function LinkPlantingSeason({
  plantingId,
  plantingAreaHa,
  plantingStatus,
  seasons,
}: {
  plantingId: string;
  plantingAreaHa: number;
  plantingStatus: string;
  seasons: Pick<SeasonSummary, "id" | "name" | "status">[];
}) {
  const [open, setOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (previous: StructureActionState, formData: FormData) => {
      const next = await linkPlantingSeasonAction(previous, formData);
      if (next.status === "success") {
        setOpen(false);
        setConfirmMessage(null);
      }
      return next;
    },
    { status: "idle" },
  );

  const availableSeasons = seasons.filter((season) => season.status === "planning" || season.status === "open");
  const initialStatus = state.values?.productiveStatus ?? (plantingStatus === "productive" ? "productive" : "forming");

  if (plantingStatus === "closed") {
    return <p className="mt-3 text-xs text-stone-500">Lavoura encerrada: não recebe vínculos no estado atual.</p>;
  }

  if (!open) {
    if (!availableSeasons.length) {
      return <p className="mt-3 text-xs text-stone-500">Ainda não há safra em planejamento/aberta para vínculo.</p>;
    }

    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Vincular à safra
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-stone-950/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`link-planting-${plantingId}`}
    >
      <form
        ref={formRef}
        action={action}
        className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-5 shadow-xl sm:p-7"
        onSubmit={(event) => {
          if (confirmMessage) return;
          if (!event.currentTarget.reportValidity()) return;
          event.preventDefault();
          setConfirmMessage("Confirma vincular esta lavoura à safra selecionada?");
        }}
      >
        <div>
          <h3 id={`link-planting-${plantingId}`} className="text-lg font-bold">
            Vincular lavoura à safra
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            Selecione uma safra e informe a área conduzida para o ciclo.
          </p>
        </div>

        <input type="hidden" name="plantingId" value={plantingId} />

        <label className="block text-sm font-semibold">
          Safra
          <select
            name="seasonId"
            className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
            defaultValue={state.values?.seasonId}
            required
            onChange={() => setConfirmMessage(null)}
            disabled={pending}
          >
            <option value="">Selecione a safra</option>
            {availableSeasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} ({season.status === "open" ? "aberta" : "planejamento"})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold">
          Área conduzida (ha)
          <input
            name="conductedAreaHa"
            type="number"
            step="0.0001"
            className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
            defaultValue={state.values?.conductedAreaHa ?? String(plantingAreaHa)}
            required
            onChange={() => setConfirmMessage(null)}
            disabled={pending}
          />
        </label>

        <label className="block text-sm font-semibold">
          Situação produtiva
          <select
            name="productiveStatus"
            className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
            defaultValue={initialStatus}
            required
            onChange={() => setConfirmMessage(null)}
            disabled={pending}
          >
            {PRODUCTIVE_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold">
          Meta (kg) <span className="font-normal text-stone-500">(opcional)</span>
          <input
            name="productionGoalKg"
            type="number"
            step="0.001"
            className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
            defaultValue={state.values?.productionGoalKg}
            placeholder="Opcional"
            onChange={() => setConfirmMessage(null)}
            disabled={pending}
          />
        </label>

        <label className="block text-sm font-semibold">
          Estimativa (kg) <span className="font-normal text-stone-500">(opcional)</span>
          <input
            name="productionEstimateKg"
            type="number"
            step="0.001"
            className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
            defaultValue={state.values?.productionEstimateKg}
            placeholder="Opcional"
            onChange={() => setConfirmMessage(null)}
            disabled={pending}
          />
        </label>

        <label className="block text-sm font-semibold">
          Observações <span className="font-normal text-stone-500">(opcional)</span>
          <textarea
            name="notes"
            className="mt-1 min-h-20 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
            defaultValue={state.values?.notes}
            rows={2}
            placeholder="Ex.: lavoura principal da fase inicial desta safra."
            onChange={() => setConfirmMessage(null)}
            disabled={pending}
          />
        </label>

        {state.message && <SystemAlert tone={state.status}>{state.message}</SystemAlert>}

        {confirmMessage ? (
          <div className="space-y-2 rounded-xl bg-stone-50 p-3">
            <SystemAlert tone="warning">{confirmMessage}</SystemAlert>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmMessage(null)}
                disabled={pending}
              >
                Revisar dados
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setConfirmMessage(null);
                  formRef.current?.requestSubmit();
                }}
                disabled={pending}
              >
                Confirmar vínculo
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending}>{pending ? "Vinculando..." : "Salvar vínculo"}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
