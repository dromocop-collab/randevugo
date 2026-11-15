// Push görünümü (APNs) — saf yardımcı. Test: push-domain.test.mjs
// Bildirim merkezinde gruplama (thread-id) ve önem düzeyi (interruption-level) data alanlarından çıkarılır.

export type ApnsPresentation = { threadId: string; interruptionLevel: "active" | "time-sensitive" };

/** Sıra "çağrıldın / sıran geliyor" ve boşalan saat bildirimleri zamana duyarlıdır (Odak modunu delebilir). */
const TIME_SENSITIVE_QUEUE = new Set(["called", "almost_ready"]);

const clean = (value: unknown) => String(value ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);

export function apnsPresentation(data: Record<string, string>): ApnsPresentation {
  const kind = clean(data.kind);
  const business = clean(data.businessId);
  let threadId: string;
  if (data.audience === "admin") threadId = `admin-${clean(data.route) || "genel"}`;
  else if (kind === "live_queue") threadId = `queue-${clean(data.entryId) || business}`;
  else if (kind.startsWith("appointment_") || data.route === "appointment") threadId = `appointments-${clean(data.audience) || "user"}-${business || "all"}`;
  else if (kind === "availability_alert") threadId = `availability-${business}`;
  else if (kind.startsWith("platform_")) threadId = "platform";
  else threadId = [kind || "genel", business].filter(Boolean).join("-");
  const urgent = (kind === "live_queue" && TIME_SENSITIVE_QUEUE.has(String(data.eventKind ?? ""))) || kind === "availability_alert";
  return { threadId: threadId.slice(0, 64), interruptionLevel: urgent ? "time-sensitive" : "active" };
}
