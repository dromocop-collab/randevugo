import type { EntityBase } from "@/types/common";

export interface ServiceCategory extends EntityBase {
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
}
