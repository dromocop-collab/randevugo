import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

// Süper admin › Yarım kayıtlar: signupLeads (functions saveSignupLead yazar; yönetici okur, takip durumunu değiştirir).

export type SignupLeadStatus = "open" | "contacted" | "closed" | "converted";

export type SignupLead = {
  id: string; phone: string; name: string; category: string; city: string; district: string;
  source: string | null; campaign: string | null; status: SignupLeadStatus; attempts: number;
  createdAt: number | null; updatedAt: number | null; convertedAt: number | null; businessId: string | null;
  reminderStatus: string | null; reminderReason: string | null; reminderSentAt: number | null; reminderError: string | null;
  note: string;
};

const ms = (value: unknown) => value instanceof Timestamp ? value.toMillis() : null;
const STATUSES: SignupLeadStatus[] = ["open", "contacted", "closed", "converted"];

export function subscribeSignupLeads(onData: (rows: SignupLead[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(getDb(), "signupLeads"), orderBy("createdAt", "desc"), limit(200)), (snapshot) => {
    onData(snapshot.docs.map((item) => {
      const data = item.data();
      const status = STATUSES.includes(data.status) ? data.status as SignupLeadStatus : "open";
      return {
        id: item.id, phone: String(data.phone ?? item.id), name: String(data.name ?? ""), category: String(data.category ?? ""),
        city: String(data.city ?? ""), district: String(data.district ?? ""),
        source: typeof data.source === "string" ? data.source : null, campaign: typeof data.campaign === "string" ? data.campaign : null,
        status, attempts: typeof data.attempts === "number" ? data.attempts : 1,
        createdAt: ms(data.createdAt), updatedAt: ms(data.updatedAt), convertedAt: ms(data.convertedAt),
        businessId: typeof data.businessId === "string" ? data.businessId : null,
        reminderStatus: typeof data.reminderStatus === "string" ? data.reminderStatus : null,
        reminderReason: typeof data.reminderReason === "string" ? data.reminderReason : null,
        reminderSentAt: ms(data.reminderSentAt), reminderError: typeof data.reminderError === "string" ? data.reminderError : null,
        note: String(data.note ?? ""),
      };
    }));
  }, onError);
}

/** Takip durumu: "Ulaşıldı" / "Kapat" / yeniden aç. Kapatılan ya da ulaşılana otomatik hatırlatma gitmez. */
export function setSignupLeadStatus(id: string, status: Exclude<SignupLeadStatus, "converted">, uid: string) {
  return updateDoc(doc(getDb(), "signupLeads", id), {
    status, handledBy: uid, handledAt: serverTimestamp(), updatedAt: serverTimestamp(),
    ...(status === "open" ? {} : { reminderDueAt: null }),
  });
}

export type SignupLeadSettings = {
  settings: { reminderEnabled: boolean };
  channelEnabled: boolean;
  signupBotEnabled: boolean;
  template: { name: string; status: string; category: string; rejectedReason: string | null } | null;
  templateError: string | null;
  templateName: string;
  preview: string;
  buttons: string[];
};

const call = <T,>(name: string, data?: unknown) =>
  httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), name)(data).then((result) => result.data as T);

export const getSignupLeadSettings = () => call<SignupLeadSettings>("getSignupLeadSettings");
export const updateSignupLeadSettings = (reminderEnabled: boolean) => call<{ settings: { reminderEnabled: boolean } }>("updateSignupLeadSettings", { reminderEnabled });

/** wa.me: yöneticinin kendi WhatsApp'ında, kişiye hazır mesajla sohbet açar (şablon gerekmez). */
export function leadWhatsAppLink(lead: Pick<SignupLead, "phone" | "name">) {
  const text = `Merhaba, Senin Randevun'dan yazıyorum 🙂 ${lead.name} için kaydına başlamıştın, tamamlamana yardımcı olayım mı? Birkaç bilgiyle hesabını hemen açabiliriz.`;
  return `https://wa.me/${lead.phone}?text=${encodeURIComponent(text)}`;
}

export function formatLeadPhone(phone: string) {
  const local = phone.startsWith("90") ? phone.slice(2) : phone;
  return /^5\d{9}$/.test(local) ? `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}` : phone;
}
