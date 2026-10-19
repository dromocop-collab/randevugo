import type { EntityBase } from "@/types/common";

export interface ServiceCategory extends EntityBase {
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  /** Dil kodu → kategori adı (ör. { en: { name: "Hair" } }). */
  translations?: Partial<Record<string, { name?: string; auto?: boolean; manual?: boolean; sourceHash?: string }>>;
  templateSource?: string;
  templateKey?: string;
}
