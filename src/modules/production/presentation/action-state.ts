export interface ProductionActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
}

export const initialProductionActionState: ProductionActionState = { status: "idle" };
