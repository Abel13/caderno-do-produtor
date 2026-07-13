import { ZodError } from "zod";
import type { OperationsActionState } from "./action-state";

const errorMessages: Record<string, string> = {
  permission_denied: "Você não tem permissão para registrar ou alterar operações.",
  record_property_required: "Selecione a propriedade ativa.",
  record_type_required: "Escolha o tipo de registro.",
  occurred_at_required: "Informe a data e horário da ocorrência.",
  occurred_at_invalid: "A data não pode ser futura.",
  record_context_mismatch: "Talhão, lavoura e safra precisam ser da mesma propriedade.",
  season_not_found: "A safra selecionada não existe mais.",
  season_closed_record: "Esta safra está encerrada. Não é possível alterar ou excluir registros nela.",
  operational_record_deleted: "Este registro já está apagado logicamente.",
  operational_record_not_found: "Registro não encontrado. Atualize a tela e tente novamente.",
  operational_record_not_deleted: "Esse registro ainda não está apagado.",
  client_id_conflict: "Conflito ao reprocessar este registro. Use um novo envio.",
};

function fieldErrorsFromSupabaseMessage(error: Error): Record<string, string[]> | undefined {
  const raw = error.message;
  if (raw.includes("unique")) return { clientId: ["Já existe uma tentativa de envio em andamento com este identificador de formulário."] };
  return undefined;
}

export function operationErrorState(error: unknown): OperationsActionState {
  if (error instanceof ZodError) {
    return {
      status: "error",
      message: "Revise os campos com erro.",
      fieldErrors: error.flatten().fieldErrors,
    };
  }

  if (error instanceof Error) {
    const code = Object.keys(errorMessages).find((candidate) => error.message.includes(candidate));
    if (code) return { status: "error", message: errorMessages[code] };
    const fieldErrors = fieldErrorsFromSupabaseMessage(error);
    if (fieldErrors) return { status: "error", message: "Atenção, não foi possível concluir este registro.", fieldErrors };
  }

  return {
    status: "error",
    message:
      "A operação foi rejeitada pelo servidor. Os dados foram preservados e você pode tentar novamente sem perder o que digitou.",
  };
}
