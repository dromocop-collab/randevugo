import type { PaymentProviderKey } from "@/types/subscription";

export interface PaymentProvider {
  key: PaymentProviderKey;

  /** Initiate checkout — returns a URL to redirect the user */
  createCheckout(payload: {
    businessId: string;
    returnUrl: string;
  }): Promise<{ checkoutUrl: string }>;

  /** Cancel an existing subscription */
  cancelSubscription(payload: {
    paymentSubscriptionId: string;
  }): Promise<{ success: boolean }>;

  /** Verify webhook signature */
  verifyWebhook(payload: unknown): boolean;
}

/**
 * Manual / placeholder provider.
 * Used when no real payment gateway is configured.
 * Does NOT send the user to a checkout page.
 */
export const manualPaymentProvider: PaymentProvider = {
  key: "manual",
  async createCheckout() {
    return { checkoutUrl: "" };
  },
  async cancelSubscription() {
    return { success: true };
  },
  verifyWebhook() {
    return false;
  },
};

/**
 * Get the active payment provider.
 * When iyzico/PayTR adapters are implemented, this factory
 * selects the correct provider based on environment config.
 */
export function getPaymentProvider(): PaymentProvider {
  // Future: check env for configured provider
  // if (process.env.IYZICO_API_KEY) return iyzicoProvider;
  // if (process.env.PAYTR_MERCHANT_ID) return paytrProvider;
  return manualPaymentProvider;
}
