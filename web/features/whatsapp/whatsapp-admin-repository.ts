import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

// Süper admin › WhatsApp paneli. Sunucu: functions getWhatsAppOperations / updateWhatsAppChannel / sendWhatsAppTest.
// Gizli değerler (token, app secret, verify token) hiçbir zaman istemciye gelmez; yalnız var/yok bilgisi.

export type WhatsAppMessageType = "confirmation" | "reminder" | "cancellation" | "reschedule";

export type WhatsAppReadinessCheck = { key: string; label: string; ok: boolean; blocking: boolean; detail: string };

export type WhatsAppOperations = {
  settings: {
    enabled: boolean; phoneNumberId: string; wabaId: string; language: string; templates: Record<WhatsAppMessageType, string>;
    hasAccessToken: boolean; hasAppSecret: boolean; hasVerifyToken: boolean; updatedAt: string | null;
  };
  phone: {
    display_phone_number?: string; verified_name?: string; name_status?: string; code_verification_status?: string;
    quality_rating?: string; status?: string; messaging_limit_tier?: string; throughput?: { level?: string };
  } | null;
  templates: Array<{ name: string; status: string; language: string; category?: string; rejected_reason?: string }> | null;
  readiness: { ready: boolean; checks: WhatsAppReadinessCheck[] };
  metaErrors: string[];
  webhookUrl: string;
  optInBusinesses: number | null;
  stats: {
    total: number; byStatus: Record<string, number>; byType: Record<string, number>; errors: Record<string, number>;
    deliveryRate: number | null; readRate: number | null;
  };
  recent: Array<{
    id: string; type: string; businessId: string; businessName: string; phoneMasked: string; status: string;
    errorCode: number | null; errorTitle: string | null; createdAt: string | null; updatedAt: string | null;
  }>;
};

const fn = <I, O>(name: string) => httpsCallable<I, O>(getFunctions(getFirebaseApp(), "europe-west1"), name);

export async function getWhatsAppOperations() {
  return (await fn<Record<string, never>, WhatsAppOperations>("getWhatsAppOperations")({})).data;
}

export async function setWhatsAppChannel(enabled: boolean) {
  return (await fn<{ enabled: boolean }, { success: boolean; enabled: boolean }>("updateWhatsAppChannel")({ enabled })).data;
}

export async function sendWhatsAppTest(phone: string, type: WhatsAppMessageType) {
  return (await fn<{ phone: string; type: WhatsAppMessageType }, { success: boolean; messageId: string }>("sendWhatsAppTest")({ phone, type })).data;
}
