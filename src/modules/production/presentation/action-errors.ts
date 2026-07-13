import { ZodError } from "zod";
import type { ProductionActionState } from "./action-state";

const messages: Record<string, string> = {
  permission_denied: "Seu usuário não tem permissão para alterar a ficha de produção desta propriedade.",
  production_record_not_found: "Registro de produção não encontrado.",
  production_record_deleted: "Este registro de produção está apagado logicamente.",
  operational_record_deleted: "Este registro está apagado logicamente. Restaure antes de editar.",
  production_context_mismatch: "Talhão, lavoura ou safra não pertencem à propriedade ativa.",
  record_context_mismatch: "Talhão, lavoura ou safra não pertencem à propriedade ativa.",
  production_area_inactive: "O talhão ou a lavoura selecionada está inativo/encerrado para esta produção.",
  production_invalid_quantity: "Revise área, produção, produtividade e catação. Os valores precisam ser válidos.",
  production_plot_required: "Selecione o talhão.",
  production_season_required: "Selecione a safra.",
  occurred_at_required: "Informe a data da colheita.",
  occurred_at_invalid: "A data da colheita não pode ser futura.",
  season_closed_record: "A safra está encerrada e não aceita novos registros ou alterações comuns.",
};

function codeFromError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function productionErrorState(error: unknown): ProductionActionState {
  if (error instanceof ZodError) {
    return {
      status: "error",
      message: "Não foi possível salvar. Revise os campos destacados.",
      fieldErrors: error.flatten().fieldErrors,
    };
  }
  const text = codeFromError(error);
  const code = Object.keys(messages).find((item) => text.includes(item));
  return {
    status: "error",
    message: code ? messages[code] : "Não foi possível salvar. Os dados foram mantidos para você tentar novamente.",
  };
}
