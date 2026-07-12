export interface OperationsActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
}

export const initialOperationActionState: OperationsActionState = { status: "idle" };
