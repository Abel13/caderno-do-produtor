"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { SystemAlert } from "@/components/atoms/system-alert";
import { deletePlotAction, type StructureActionState } from "../actions";

const initial:StructureActionState={status:"idle"};
export function DeletePlotButton({ plotId }: { plotId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [state, action, pending] = useActionState(async (previous: StructureActionState, formData: FormData) => {
    const next = await deletePlotAction(previous, formData);
    if (next.status === "success") {
      setConfirm(false);
      return { ...next };
    }
    return next;
  }, initial);

  return (
    <div className="space-y-2">
      <form action={action}>
        <input type="hidden" name="plotId" value={plotId} />

        {!confirm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-red-700"
            onClick={() => setConfirm(true)}
          >
            Excluir
          </Button>
        )}

        {confirm ? (
          <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-3">
            <SystemAlert tone="warning">
              Exclusão permanente do registro de talhão é permitida apenas quando nunca houve uso histórico.
            </SystemAlert>
            <div className="flex gap-2">
              <Button type="submit" variant="ghost" size="sm" disabled={pending} className="text-red-700">
                {pending ? "Excluindo..." : "Confirmar exclusão"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </form>

      {state.message && <SystemAlert tone={state.status}>{state.message}</SystemAlert>}
    </div>
  );
}
