export interface SoilActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
}

export const initialSoilActionState: SoilActionState = { status: "idle" };
