import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import type { BillingProfile } from "./subscription-repository";

export type AdminPaymentRow = {
  merchantOid: string;
  businessId: string;
  businessName: string;
  kind: "plan" | "sms_pack";
  label: string;
  billingCycle: "monthly" | "yearly" | null;
  smsCount: number | null;
  amountKurus: number;
  vat: { grossKurus: number; netKurus: number; vatKurus: number; rate: number };
  status: string;
  testMode: boolean;
  createdAt: string | null;
  paidAt: string | null;
  paymentType: string | null;
  failedReason: string | null;
  billing: BillingProfile | null;
  billingTaxIdMasked: string | null;
  invoice: { status: "pending" | "issued" | "none"; number: string | null; date: string | null; url: string | null; method: string | null };
};

function callable<I, O>(name: string) {
  return httpsCallable<I, O>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

export async function listAdminPayments(): Promise<{ rows: AdminPaymentRow[]; einvoiceProvider: string | null }> {
  return (await callable<Record<string, never>, { rows: AdminPaymentRow[]; einvoiceProvider: string | null }>("listSubscriptionPayments")({})).data;
}

export async function markPaymentInvoice(input: { merchantOid: string; number?: string; date?: string; url?: string; clear?: boolean }): Promise<void> {
  await callable<typeof input, { success: boolean }>("markPaymentInvoice")(input);
}
