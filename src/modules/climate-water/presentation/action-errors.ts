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
  irrigation_system_name_required: "Informe a identificação do sistema de irrigação usado na área.",
  irrigation_system_not_found: "Sistema de irrigação não encontrado para esta propriedade.",
  irrigation_efficiency_invalid: "A eficiência da irrigação deve estar entre 0 e 100%.",
  irrigation_flow_negative: "A vazão não pode ser negativa.",
  irrigation_pressure_negative: "A pressão não pode ser negativa.",
  irrigation_wetted_area_negative: "A área de molhamento não pode ser negativa.",
  irrigation_time_invalid: "O horário final não pode ser menor que o horário inicial.",
  irrigation_duration_required: "Informe o tempo total ou os horários de início e término.",
  irrigation_depth_negative: "A lâmina/precipitação da irrigação não pode ser negativa.",
  irrigation_frequency_invalid: "A frequência de irrigação deve ser maior que zero.",
  irrigation_volume_negative: "O volume médio aplicado não pode ser negativo.",
  irrigation_event_not_found: "Registro de irrigação não encontrado.",
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
