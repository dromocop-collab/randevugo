export type PlanType = "FREE" | "PRO" | "BUSINESS";

export const PLAN_LIMITS: Record<
  PlanType,
  {
    maxStaff: number;
    canUseDeposits: boolean;
    canUseAdvancedAnalytics: boolean;
    canUseMultiBranch: boolean;
    canUseApi: boolean;
  }
> = {
  FREE: {
    maxStaff: 1,
    canUseDeposits: false,
    canUseAdvancedAnalytics: false,
    canUseMultiBranch: false,
    canUseApi: false,
  },
  PRO: {
    maxStaff: 25,
    canUseDeposits: true,
    canUseAdvancedAnalytics: true,
    canUseMultiBranch: false,
    canUseApi: false,
  },
  BUSINESS: {
    maxStaff: 250,
    canUseDeposits: true,
    canUseAdvancedAnalytics: true,
    canUseMultiBranch: true,
    canUseApi: true,
  },
};
