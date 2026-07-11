"use client";

import { useActionState } from "react";
import { updateProfileAction } from "../actions";
import { initialActionState } from "../action-state";

export function useProfileViewModel() {
  const [state, action, pending] = useActionState(updateProfileAction, initialActionState);
  return { state, action, pending, fieldError: (name: string) => state.fieldErrors?.[name]?.[0] };
}
