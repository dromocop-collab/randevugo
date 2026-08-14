import type { PlanType } from "@/constants/plans";
import type { EntityBase } from "@/types/common";

export interface Subscription extends EntityBase {
  businessId: string;
  plan: PlanType;
  status: "active" | "trialing" | "cancelled";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  provider: "manual" | "stripe" | "iyzico";
}
