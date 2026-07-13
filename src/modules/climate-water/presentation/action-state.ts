export interface ClimateActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
}

export const initialClimateActionState: ClimateActionState = { status: "idle" };
