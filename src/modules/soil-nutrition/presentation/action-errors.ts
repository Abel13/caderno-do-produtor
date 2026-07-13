import { ZodError } from "zod";
import type { SoilActionState } from "./action-state";

const messages: Record<string, string> = {
  permission_denied: "Seu usuário não tem permissão para alterar análises de solo desta propriedade.",
  soil_analysis_not_found: "Análise de solo não encontrada.",
  soil_analysis_deleted: "Esta análise de solo está apagada logicamente.",
  operational_record_deleted: "Este registro está apagado logicamente. Restaure antes de editar.",
  soil_analysis_context_mismatch: "Talhão, lavoura ou safra não pertencem à propriedade ativa.",
  soil_analysis_invalid_depth: "Informe a profundidade da coleta.",
  soil_analysis_invalid_parameter: "Revise os parâmetros da análise. Há valores fora da faixa permitida.",
  occurred_at_required: "Informe a data da coleta.",
  occurred_at_invalid: "A data da coleta não pode ser futura.",
  season_closed_record: "A safra está encerrada e não aceita novos registros ou alterações comuns.",
};

function codeFromError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function soilErrorState(error: unknown): SoilActionState {
  if (error instanceof ZodError) {
    return { status: "error", message: "Não foi possível salvar. Revise os campos destacados.", fieldErrors: error.flatten().fieldErrors };
  }
  const text = codeFromError(error);
  const code = Object.keys(messages).find((item) => text.includes(item));
  return { status: "error", message: code ? messages[code] : "Não foi possível salvar. Os dados foram mantidos para você tentar novamente." };
}
