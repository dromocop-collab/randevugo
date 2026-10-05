export interface CalendarEventInput {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  url?: string;
}

function utcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545: satırlar 75 oktetten uzun olmamalı; devam satırları boşlukla başlar. */
function foldIcsLine(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (encoder.encode(current + char).length > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = char;
    } else current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(event: CalendarEventInput) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SeninRandevun//Randevu//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@seninrandevun.com`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : "",
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : "",
    event.url ? `URL:${event.url}` : "",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Randevu hatırlatması",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function downloadIcs(event: CalendarEventInput, fileName = "randevu.ics") {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function googleCalendarUrl(event: CalendarEventInput) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utcStamp(event.start)}/${utcStamp(event.end)}`,
  });
  const details = [event.description, event.url].filter(Boolean).join("\n\n");
  if (details) params.set("details", details);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: CalendarEventInput) {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
  });
  const body = [event.description, event.url].filter(Boolean).join("\n\n");
  if (body) params.set("body", body);
  if (event.location) params.set("location", event.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Android: telefonun kendi takvim uygulamasında (Google/Samsung) yeni etkinlik ekranını açar. */
export function androidCalendarIntent(event: CalendarEventInput, fallbackUrl: string) {
  const extra = (key: string, value?: string) => (value ? `S.${key}=${encodeURIComponent(value)};` : "");
  return "intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.item/event;"
    + extra("title", event.title)
    + extra("description", [event.description, event.url].filter(Boolean).join("\n\n"))
    + extra("eventLocation", event.location)
    + `l.beginTime=${event.start.getTime()};l.endTime=${event.end.getTime()};`
    + extra("browser_fallback_url", fallbackUrl)
    + "end";
}

export type CalendarPlatform = "apple" | "android" | "desktop";

export function detectCalendarPlatform(): CalendarPlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  // iPadOS 13+ kendini Mac olarak tanıtır; dokunmatik ekranla ayırt edilir.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "apple";
  return "desktop";
}

/** Apple Cüzdan kartı eklenebilen cihaz: iPhone/iPad veya Mac'te Safari. */
export function supportsAppleWallet() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (detectCalendarPlatform() === "apple") return true;
  return /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
}

export function appointmentIcsPath(publicToken: string) {
  return `/api/randevu/${encodeURIComponent(publicToken)}/takvim.ics`;
}

/**
 * Cihazın kendi takvimini açar: iPhone'da Apple Takvim ekleme sayfası (sunucudan text/calendar),
 * Android'de telefon takviminin yeni etkinlik ekranı, masaüstünde .ics indirme.
 * Dönen değer: dosya indirildiyse "download" (kullanıcıya bilgi vermek için).
 */
export function addToDeviceCalendar(event: CalendarEventInput, options: { publicToken?: string; fileName: string }): "opened" | "download" {
  const platform = detectCalendarPlatform();
  const icsUrl = options.publicToken ? new URL(appointmentIcsPath(options.publicToken), window.location.origin).href : null;
  if (platform === "apple" && icsUrl) {
    window.location.assign(icsUrl);
    return "opened";
  }
  if (platform === "android") {
    let left = false;
    const onHide = () => { if (document.hidden) left = true; };
    document.addEventListener("visibilitychange", onHide);
    window.location.assign(androidCalendarIntent(event, icsUrl ?? window.location.href));
    // Takvim uygulaması açılmadıysa dosyayı indir (açılınca sayfa arka plana düşer).
    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      if (!left && !document.hidden) downloadIcs(event, options.fileName);
    }, 1600);
    return "opened";
  }
  downloadIcs(event, options.fileName);
  return "download";
}
