import { collection, doc, limit, limitToLast, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDownloadURL, ref } from "firebase/storage";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getDb } from "@/lib/firebase/firestore";
import { storage } from "@/lib/firebase/storage";

// Süper admin › WhatsApp gelen kutusu. Okuma canlı (Firestore kuralı: yalnız platform yöneticisi), yazma callable ile.
// Sunucu: functions whatsappWebhook → whatsappConversations/{id}/messages, whatsappInboxMessageCreated (medya, eşleştirme, otomatik cevap).

export type InboxMatch = {
  businessId: string | null; businessName?: string; businessSlug?: string | null; businessPhone?: string | null; appointmentId?: string;
  appointmentStartAt?: number | null; appointmentStatus?: string; customerName?: string; serviceName?: string; appointmentCount?: number; businessCount?: number;
};

export type InboxConversation = {
  id: string; phone: string; profileName: string | null; lastMessageAt: number | null; lastMessageText: string; lastDirection: "in" | "out";
  lastInboundAt: number | null; unreadCount: number; status: "open" | "closed"; match: InboxMatch | null; lastAutoReplyAt: number | null;
};

export type InboxMessage = {
  id: string; direction: "in" | "out"; type: string; text: string | null; createdAt: number | null; auto: boolean; sentByName: string | null;
  status: string | null; errorTitle: string | null; errorCode: number | null;
  media: { kind: string; mimeType: string; fileName: string | null; voice: boolean; status: string; storagePath: string | null; size: number | null } | null;
  location: { latitude: number; longitude: number; name: string | null; address: string | null } | null;
  reaction: { emoji: string; messageId: string } | null;
};

export type InboxSettings = { autoReplyEnabled: boolean; autoReplyText: string; quickReplies: Array<{ title: string; text: string }>; defaultAutoReply: string };

const ms = (value: unknown) => value && typeof (value as Timestamp).toMillis === "function" ? (value as Timestamp).toMillis() : null;

export function subscribeConversations(onData: (rows: InboxConversation[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(getDb(), "whatsappConversations"), orderBy("lastMessageAt", "desc"), limit(300)), (snapshot) => {
    onData(snapshot.docs.map((item) => {
      const data = item.data();
      const match = data.match && data.match.businessId ? { ...data.match, appointmentStartAt: ms(data.match.appointmentStartAt) } as InboxMatch : null;
      return {
        id: item.id, phone: String(data.phone ?? ""), profileName: typeof data.profileName === "string" ? data.profileName : null,
        lastMessageAt: ms(data.lastMessageAt), lastMessageText: String(data.lastMessageText ?? ""), lastDirection: data.lastDirection === "out" ? "out" : "in",
        lastInboundAt: ms(data.lastInboundAt), unreadCount: Number(data.unreadCount ?? 0), status: data.status === "closed" ? "closed" : "open",
        match, lastAutoReplyAt: ms(data.lastAutoReplyAt),
      };
    }));
  }, onError);
}

export function subscribeMessages(conversationId: string, onData: (rows: InboxMessage[]) => void, onError: (error: Error) => void) {
  const messages = collection(doc(getDb(), "whatsappConversations", conversationId), "messages");
  return onSnapshot(query(messages, orderBy("createdAt", "asc"), limitToLast(300)), (snapshot) => {
    onData(snapshot.docs.map((item) => {
      const data = item.data({ serverTimestamps: "estimate" });
      return {
        id: item.id, direction: data.direction === "out" ? "out" : "in", type: String(data.type ?? "text"),
        text: typeof data.text === "string" ? data.text : null, createdAt: ms(data.createdAt), auto: data.auto === true,
        sentByName: typeof data.sentByName === "string" ? data.sentByName : null,
        status: typeof data.status === "string" ? data.status : null, errorTitle: typeof data.errorTitle === "string" ? data.errorTitle : null,
        errorCode: typeof data.errorCode === "number" ? data.errorCode : null,
        media: data.media ?? null, location: data.location ?? null, reaction: data.reaction ?? null,
      };
    }));
  }, onError);
}

const mediaUrls = new Map<string, Promise<string>>();
export function inboxMediaUrl(storagePath: string) {
  let url = mediaUrls.get(storagePath);
  if (!url) {
    url = getDownloadURL(ref(storage, storagePath));
    url.catch(() => mediaUrls.delete(storagePath));
    mediaUrls.set(storagePath, url);
  }
  return url;
}

const fn = <I, O>(name: string) => httpsCallable<I, O>(getFunctions(getFirebaseApp(), "europe-west1"), name);

export async function sendInboxReply(conversationId: string, text: string) {
  await fn<{ conversationId: string; text: string }, { success: boolean }>("sendWhatsAppInboxReply")({ conversationId, text });
}

export async function updateConversation(conversationId: string, action: "read" | "close" | "reopen") {
  await fn<{ conversationId: string; action: string }, { success: boolean }>("updateWhatsAppConversation")({ conversationId, action });
}

export async function getInboxSettings() {
  return (await fn<Record<string, never>, InboxSettings>("getWhatsAppInboxSettings")({})).data;
}

export async function saveInboxSettings(input: Omit<InboxSettings, "defaultAutoReply">) {
  return (await fn<typeof input, InboxSettings>("updateWhatsAppInboxSettings")(input)).data;
}

/** +90 532 123 45 67 (TR değilse +rakamlar) — sunucudaki formatInboxPhone ile aynı. */
export function formatInboxPhone(phone: string) {
  const match = /^90(5\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return match ? `+90 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : `+${phone}`;
}

export function inboxWindow(lastInboundAt: number | null, now: number) {
  if (!lastInboundAt) return { open: false, remainingMs: 0 };
  const remainingMs = lastInboundAt + 24 * 3_600_000 - now;
  return { open: remainingMs > 0, remainingMs: Math.max(0, remainingMs) };
}
