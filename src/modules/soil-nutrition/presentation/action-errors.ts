import { ZodError } from "zod";
import type { SoilActionState } from "./action-state";

const messages: Record<string, string> = {
  permission_denied: "Seu usuário não tem permissão para alterar fichas de solo desta propriedade.",
  soil_analysis_not_found: "Análise de solo não encontrada.",
  soil_analysis_deleted: "Esta análise de solo está apagada logicamente.",
  operational_record_deleted: "Este registro está apagado logicamente. Restaure antes de editar.",
  soil_analysis_context_mismatch: "Talhão, lavoura ou safra não pertencem à propriedade ativa.",
  soil_analysis_invalid_depth: "Informe a profundidade da coleta.",
  soil_analysis_invalid_parameter: "Revise os parâmetros da análise. Há valores fora da faixa permitida.",
  occurred_at_required: "Informe a data da coleta.",
  occurred_at_invalid: "A data da coleta não pode ser futura.",
  season_closed_record: "A safra está encerrada e não aceita novos registros ou alterações comuns.",
  soil_correction_not_found: "Correção do solo não encontrada.",
  soil_correction_deleted: "Esta correção do solo está apagada logicamente.",
  soil_correction_context_mismatch: "Talhão, lavoura, safra ou análise de solo não pertencem à propriedade ativa.",
  soil_correction_invalid_quantity: "Revise dose, quantidade, hh/hm, combustível e corretivo utilizado.",
  soil_correction_invalid_prnt: "O PRNT deve ser maior que zero e no máximo 200%.",
  soil_fertilization_not_found: "Adubação via solo não encontrada.",
  soil_fertilization_deleted: "Esta adubação via solo está apagada logicamente.",
  soil_fertilization_context_mismatch: "Talhão, lavoura, safra ou análise de solo não pertencem à propriedade ativa.",
  soil_fertilization_invalid_quantity: "Revise dose, quantidade, hh/hm, combustível e nome do insumo.",
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
