import { ZodError } from "zod";
import type { ActionState } from "./action-state";

export function errorState(error: unknown): ActionState {
  if (error instanceof ZodError) return { status: "error", message: "Revise os campos destacados.", fieldErrors: error.flatten().fieldErrors };
  if (error instanceof Error) {
    const messages: Record<string, string> = {
      permission_denied: "Você não possui permissão para concluir esta operação.",
      invitation_not_found: "O convite não existe mais ou já foi processado.",
      membership_not_found: "O vínculo não existe mais ou já foi revogado.",
      owner_cannot_be_revoked: "O acesso do proprietário não pode ser revogado."
    };
    const domainCode = Object.keys(messages).find((code) => error.message.includes(code));
    if (domainCode) return { status: "error", message: messages[domainCode] };
  }
  return { status: "error", message: "Não foi possível concluir a operação. Tente novamente." };
}
