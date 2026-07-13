import { ZodError } from "zod";
import type { ClimateActionState } from "./action-state";

const messages: Record<string, string> = {
  permission_denied: "Seu usuário não tem permissão para alterar registros de chuva nesta propriedade.",
  rainfall_volume_required: "Informe o volume de chuva em milímetros.",
  rainfall_volume_negative: "O volume de chuva não pode ser negativo.",
  occurred_at_required: "Informe a data do registro.",
  occurred_at_invalid: "A data informada não pode ser futura.",
  measurement_point_required: "Escolha o pluviômetro ou local de medição.",
  measurement_point_not_found: "O pluviômetro informado não pertence à propriedade ativa.",
  measurement_point_name_required: "Informe o nome do pluviômetro ou local.",
  humidity_invalid: "A umidade deve estar entre 0 e 100%.",
  temperature_range_invalid: "Revise as temperaturas: mínima, média e máxima estão incoerentes.",
  record_context_mismatch: "O talhão, safra ou pluviômetro não pertence à propriedade ativa.",
  season_closed_record: "A safra está encerrada e não aceita novos registros ou alterações comuns.",
  climate_reading_not_found: "Registro de clima não encontrado.",
};

function codeFromError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function climateErrorState(error: unknown): ClimateActionState {
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
