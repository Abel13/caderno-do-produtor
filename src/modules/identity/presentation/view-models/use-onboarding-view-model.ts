"use client";

import { useActionState } from "react";
import { completeOnboardingAction } from "../actions";
import { initialActionState } from "../action-state";

export function useOnboardingViewModel() {
  const [state, action, pending] = useActionState(completeOnboardingAction, initialActionState);
  return { state, action, pending, fieldError: (name: string) => state.fieldErrors?.[name]?.[0] };
}
