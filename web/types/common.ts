export interface EntityBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type AsyncState = "idle" | "loading" | "success" | "error";
