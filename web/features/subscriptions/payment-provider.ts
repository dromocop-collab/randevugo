export interface PaymentProvider {
  key: string;
  createSubscriptionCheckout(payload: {
    businessId: string;
    plan: "FREE" | "PRO" | "BUSINESS";
  }): Promise<{ checkoutUrl: string }>;
}

export const manualPaymentProvider: PaymentProvider = {
  key: "manual",
  async createSubscriptionCheckout() {
    return { checkoutUrl: "" };
  },
};
