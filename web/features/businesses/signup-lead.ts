import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { readAttribution } from "@/features/attribution/attribution";
import type { BusinessOnboardingDraft } from "@/features/businesses/onboarding-draft";

// Kayıt formu 2. adım (işletme adı + cep) → "yarım kayıt" (functions saveSignupLead). Kayıt bitmezse süper admin
// listeden ulaşır; ayar açıksa 30 dk sonra bir kez WhatsApp hatırlatması gider. Hata formu asla durdurmaz.
let lastSent = "";

export function saveSignupLead(draft: Partial<BusinessOnboardingDraft>) {
  if (typeof window === "undefined" || navigator.webdriver) return;
  if (String(getFirebaseApp().options.projectId ?? "").startsWith("demo-")) return;
  const attribution = readAttribution();
  const payload = {
    name: draft.name ?? "", phone: draft.phone ?? "", category: draft.category ?? "", city: draft.city ?? "", district: draft.district ?? "",
    source: attribution?.source ?? null, campaign: attribution?.campaign ?? null,
  };
  const key = JSON.stringify(payload);
  if (key === lastSent) return;
  lastSent = key;
  void httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "saveSignupLead")(payload).catch(() => undefined);
}
