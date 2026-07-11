"use client";

import { useActionState, useState } from "react";
import { createInvitationAction } from "../actions";
import { initialActionState } from "../action-state";

export function useAccessViewModel() {
  const [role, setRole] = useState<"manager" | "technician">("technician");
  const [state, action, pending] = useActionState(createInvitationAction, initialActionState);
  return { role, setRole, state, action, pending, fieldError: (name: string) => state.fieldErrors?.[name]?.[0] };
}
