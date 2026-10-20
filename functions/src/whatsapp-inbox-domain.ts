import { createHash } from "crypto";

// WhatsApp gelen kutusu (süper admin) — saf yardımcılar. Test: whatsapp-inbox-domain.test.mjs
// API numarasına yazılan her mesaj whatsappConversations/{id}/messages altına kaydedilir; ilk mesaja (24 saatte bir)
// otomatik cevap gider, süper admin panelden 24 saatlik müşteri hizmetleri penceresinde ücretsiz cevap yazar.

export const INBOX_WINDOW_MS = 24 * 3_600_000;
export const AUTO_REPLY_COOLDOWN_MS = 24 * 3_600_000;
export const INBOX_MEDIA_MAX_BYTES = 16 * 1024 * 1024;
export const DEFAULT_AUTO_REPLY =
  "Merhaba{{ad}} 👋 Bu numara Senin Randevun bildirim hattıdır. Randevunu değiştirmek veya iptal etmek için mesajdaki bağlantıyı kullanabilirsin. " +
  "Başka bir konuda yardım gerekiyorsa buraya yazman yeterli; ekibimiz en kısa sürede dönüş yapacak.";

export type InboxMessageType =
  | "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "contacts" | "reaction" | "button" | "interactive" | "unsupported";

export type InboxMedia = { id: string; kind: "image" | "audio" | "video" | "document" | "sticker"; mimeType: string; fileName: string | null; voice: boolean };

export type IncomingMessage = {
  messageId: string;
  from: string;
  profileName: string | null;
  timestamp: number;
  type: InboxMessageType;
  text: string | null;
  media: InboxMedia | null;
  contextId: string | null;
  location: { latitude: number; longitude: number; name: string | null; address: string | null } | null;
  reaction: { emoji: string; messageId: string } | null;
};

const KNOWN_TYPES = new Set<InboxMessageType>(["text", "image", "audio", "video", "document", "sticker", "location", "contacts", "reaction", "button", "interactive"]);
const MEDIA_TYPES = new Set(["image", "audio", "video", "document", "sticker"]);

const str = (value: unknown, max: number) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

/** Webhook gövdesindeki tüm gelen mesajlar (her tür). Numara yalnız rakam (E.164, + olmadan). */
export function extractIncomingMessages(body: unknown, now = Date.now()): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  const entries = (body as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const entry of entries) {
    for (const change of ((entry as { changes?: unknown[] })?.changes ?? [])) {
      const value = (change as { value?: { messages?: unknown[]; contacts?: unknown[] } })?.value;
      if (!value || !Array.isArray(value.messages)) continue;
      const names = new Map<string, string>();
      for (const contact of (Array.isArray(value.contacts) ? value.contacts : [])) {
        const row = contact as { wa_id?: unknown; profile?: { name?: unknown } };
        const name = str(row.profile?.name, 80);
        if (typeof row.wa_id === "string" && name) names.set(row.wa_id, name);
      }
      for (const raw of value.messages) {
        const row = raw as Record<string, unknown> & { id?: unknown; from?: unknown; type?: unknown; timestamp?: unknown; context?: { id?: unknown } };
        if (typeof row.id !== "string" || typeof row.from !== "string") continue;
        const from = row.from.replace(/\D/g, "");
        if (!/^\d{8,15}$/.test(from)) continue;
        const rawType = String(row.type ?? "");
        const type: InboxMessageType = KNOWN_TYPES.has(rawType as InboxMessageType) ? rawType as InboxMessageType : "unsupported";
        const seconds = Number(row.timestamp);
        const part = (row[rawType] ?? {}) as Record<string, unknown>;
        let text: string | null = null;
        let media: InboxMedia | null = null;
        let location: IncomingMessage["location"] = null;
        let reaction: IncomingMessage["reaction"] = null;
        if (type === "text") text = str((part as { body?: unknown }).body, 4096);
        else if (MEDIA_TYPES.has(type) && typeof part.id === "string") {
          media = {
            id: part.id, kind: type as InboxMedia["kind"], mimeType: str(part.mime_type, 100) ?? "application/octet-stream",
            fileName: str(part.filename, 160), voice: part.voice === true,
          };
          text = str(part.caption, 1024);
        } else if (type === "location") {
          const latitude = Number(part.latitude); const longitude = Number(part.longitude);
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) location = { latitude, longitude, name: str(part.name, 120), address: str(part.address, 200) };
        } else if (type === "reaction") {
          if (typeof part.message_id === "string") reaction = { emoji: str(part.emoji, 16) ?? "", messageId: part.message_id };
        } else if (type === "button") text = str((part as { text?: unknown }).text ?? (part as { payload?: unknown }).payload, 256);
        else if (type === "interactive") {
          const reply = (part.button_reply ?? part.list_reply) as { title?: unknown } | undefined;
          text = str(reply?.title, 256);
        } else if (type === "contacts") {
          const first = Array.isArray(row.contacts) ? row.contacts[0] as { name?: { formatted_name?: unknown }; phones?: Array<{ phone?: unknown }> } : undefined;
          text = [str(first?.name?.formatted_name, 80), str(first?.phones?.[0]?.phone, 30)].filter(Boolean).join(" · ") || null;
        }
        out.push({
          messageId: row.id, from, profileName: names.get(row.from) ?? null,
          timestamp: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : now,
          type, text, media, contextId: typeof row.context?.id === "string" ? row.context.id : null, location, reaction,
        });
      }
    }
  }
  return out;
}

/** Konuşma belgesi kimliği: numaranın özeti (adres çubuğunda telefon görünmesin). */
export function conversationId(phone: string): string {
  return createHash("sha256").update(`wa-inbox:${phone}`).digest("hex").slice(0, 24);
}

export function messageDocId(messageId: string): string {
  return createHash("sha256").update(messageId).digest("hex").slice(0, 40);
}

/** Listede görünen kısa önizleme. */
export function inboxPreview(message: Pick<IncomingMessage, "type" | "text" | "media" | "reaction" | "location">): string {
  const caption = message.text ? ` ${message.text}` : "";
  switch (message.type) {
    case "text": return (message.text ?? "").slice(0, 140);
    case "image": return `📷 Fotoğraf${caption}`.slice(0, 140);
    case "video": return `🎬 Video${caption}`.slice(0, 140);
    case "audio": return message.media?.voice ? "🎤 Sesli mesaj" : "🎵 Ses dosyası";
    case "document": return `📄 ${message.media?.fileName ?? "Belge"}`.slice(0, 140);
    case "sticker": return "🏷️ Çıkartma";
    case "location": return `📍 Konum${message.location?.name ? `: ${message.location.name}` : ""}`.slice(0, 140);
    case "contacts": return `👤 Kişi kartı${caption}`.slice(0, 140);
    case "reaction": return message.reaction?.emoji ? `${message.reaction.emoji} tepki verdi` : "Tepkiyi kaldırdı";
    case "button":
    case "interactive": return `🔘 ${message.text ?? "Düğme"}`.slice(0, 140);
    default: return "Desteklenmeyen mesaj türü";
  }
}

/** 24 saatlik müşteri hizmetleri penceresi (son gelen mesajdan itibaren). */
export function windowState(lastInboundAt: number | null | undefined, now = Date.now()) {
  if (!lastInboundAt) return { open: false, expiresAt: null as number | null, remainingMs: 0 };
  const expiresAt = lastInboundAt + INBOX_WINDOW_MS;
  return { open: expiresAt > now, expiresAt, remainingMs: Math.max(0, expiresAt - now) };
}

/**
 * Otomatik cevap gitsin mi? Yalnız müşterinin kendiliğinden yazdığı mesajlara (düğme / tepki değil),
 * 24 saatte en fazla bir kez ve son 24 saatte bir yönetici cevap yazmadıysa.
 */
export function shouldAutoReply(input: {
  enabled: boolean; type: InboxMessageType; lastAutoReplyAt: number | null; lastManualReplyAt: number | null; now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if (!input.enabled) return false;
  if (["reaction", "button", "interactive", "unsupported"].includes(input.type)) return false;
  if (input.lastAutoReplyAt && now - input.lastAutoReplyAt < AUTO_REPLY_COOLDOWN_MS) return false;
  if (input.lastManualReplyAt && now - input.lastManualReplyAt < INBOX_WINDOW_MS) return false;
  return true;
}

/** Otomatik cevap metni: {{ad}} → ", Ayşe" (ad yoksa boş). */
export function renderAutoReply(template: string | null | undefined, profileName: string | null): string {
  const text = (template && template.trim() ? template : DEFAULT_AUTO_REPLY).slice(0, 1000);
  const first = (profileName ?? "").trim().split(/\s+/)[0]?.replace(/[^\p{L}\p{N}'-]/gu, "").slice(0, 30) ?? "";
  return text.replace(/\{\{\s*ad\s*\}\}/gi, first ? `, ${first}` : "");
}

/** Hazır cevaplar: en fazla 12, başlık 40 / metin 1000 karakter. */
export function sanitizeQuickReplies(value: unknown): Array<{ title: string; text: string }> {
  if (!Array.isArray(value)) return [];
  return value.map((row) => ({
    title: String((row as { title?: unknown })?.title ?? "").trim().slice(0, 40),
    text: String((row as { text?: unknown })?.text ?? "").trim().slice(0, 1000),
  })).filter((row) => row.title && row.text).slice(0, 12);
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac",
  "audio/amr": "amr", "video/mp4": "mp4", "video/3gpp": "3gp", "application/pdf": "pdf", "text/plain": "txt",
};

/** Depolama dosya uzantısı (mime "audio/ogg; codecs=opus" gibi gelebilir). */
export function mediaExtension(mimeType: string, fileName?: string | null): string {
  const base = mimeType.split(";")[0]!.trim().toLowerCase();
  if (EXTENSIONS[base]) return EXTENSIONS[base]!;
  const fromName = fileName && /\.([a-z0-9]{1,5})$/i.exec(fileName)?.[1];
  return fromName ? fromName.toLowerCase() : "bin";
}

/** Ekranda gösterilecek numara: 905321234567 → +90 532 123 45 67 (TR değilse +rakamlar). */
export function formatInboxPhone(phone: string): string {
  const match = /^90(5\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return match ? `+90 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : `+${phone}`;
}
