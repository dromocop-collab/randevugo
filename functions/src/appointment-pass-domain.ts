// Randevu için takvim (.ics) ve Apple Cüzdan kartı içerikleri (saf fonksiyonlar, imzalama index.ts'de).

export type PassAppointment = {
  token: string;
  appointmentId: string;
  status: string;
  businessName: string;
  serviceName: string;
  staffName: string;
  address: string;
  phone: string;
  start: Date;
  end: Date;
  totalPrice: number | null;
  timeZone: string;
  manageUrl: string;
};

export const SITE_ORIGIN = "https://seninrandevun.com";

export function shortAppointmentCode(token: string): string {
  return token.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
}

function utcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545: satırlar 75 oktetten uzun olmamalı; devam satırları boşlukla başlar. */
function foldIcsLine(line: string) {
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char) > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = char;
    } else current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function eventTitle(item: PassAppointment) {
  return `${item.serviceName || "Randevu"} · ${item.businessName}`;
}

export function buildAppointmentIcs(item: PassAppointment, now = new Date()): string {
  const description = [
    item.staffName ? `Uzman: ${item.staffName}` : "",
    item.phone ? `Telefon: ${item.phone}` : "",
    `Randevu kodu: ${shortAppointmentCode(item.token)}`,
    `Randevuyu yönet: ${item.manageUrl}`,
  ].filter(Boolean).join("\n");
  const cancelled = item.status === "cancelled" || item.status === "no_show";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SeninRandevun//Randevu//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${item.appointmentId}@seninrandevun.com`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(item.start)}`,
    `DTEND:${utcStamp(item.end)}`,
    `SUMMARY:${escapeIcsText(eventTitle(item))}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    item.address ? `LOCATION:${escapeIcsText(item.address)}` : "",
    `URL:${item.manageUrl}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Randevunuz 1 saat sonra",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Yarın randevunuz var",
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

function formatInZone(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("tr-TR", { timeZone, ...options }).format(date);
}

/** pass.json içeriği (eventTicket). Sertifika ve görseller imzalama sırasında eklenir. */
export function buildWalletPassJson(item: PassAppointment, ids: { passTypeIdentifier: string; teamIdentifier: string }) {
  const code = shortAppointmentCode(item.token);
  const cancelled = item.status === "cancelled" || item.status === "no_show";
  const dateText = formatInZone(item.start, item.timeZone, { day: "numeric", month: "long", weekday: "long" });
  const timeText = formatInZone(item.start, item.timeZone, { hour: "2-digit", minute: "2-digit" });
  const minutes = Math.max(0, Math.round((item.end.getTime() - item.start.getTime()) / 60000));
  const back = [
    { key: "manage", label: "Randevuyu yönet", value: item.manageUrl, attributedValue: `<a href="${item.manageUrl}">Saati değiştir veya iptal et</a>` },
    item.address ? { key: "address", label: "Adres", value: item.address } : null,
    item.phone ? { key: "phone", label: "Telefon", value: item.phone } : null,
    { key: "backCode", label: "Randevu kodu", value: code },
    { key: "info", label: "Bilgi", value: "Değişiklik ve iptal işlemlerini randevu sayfanızdan yapabilirsiniz. SeninRandevun ile alındı." },
  ].filter(Boolean);

  return {
    formatVersion: 1,
    passTypeIdentifier: ids.passTypeIdentifier,
    teamIdentifier: ids.teamIdentifier,
    serialNumber: item.appointmentId,
    organizationName: "SeninRandevun",
    description: `${item.businessName} randevusu`,
    logoText: item.businessName.slice(0, 28),
    backgroundColor: "rgb(17, 74, 44)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(215, 255, 112)",
    voided: cancelled,
    eventTicket: {
      headerFields: [{ key: "time", label: cancelled ? "DURUM" : "SAAT", value: cancelled ? "İptal" : timeText }],
      primaryFields: [{ key: "service", label: "HİZMET", value: item.serviceName || "Randevu" }],
      secondaryFields: [
        { key: "date", label: "TARİH", value: dateText },
        { key: "staff", label: "UZMAN", value: item.staffName || "İşletme ekibi", textAlignment: "PKTextAlignmentRight" },
      ],
      auxiliaryFields: [
        { key: "duration", label: "SÜRE", value: minutes ? `${minutes} dk` : "—" },
        { key: "price", label: "TUTAR", value: item.totalPrice != null ? `${item.totalPrice.toLocaleString("tr-TR")} ₺` : "İşletmede" },
        { key: "code", label: "KOD", value: code, textAlignment: "PKTextAlignmentRight" },
      ],
      backFields: back,
    },
    barcodes: [{ format: "PKBarcodeFormatQR", message: item.manageUrl, messageEncoding: "iso-8859-1", altText: code }],
    relevantDate: new Date(item.start.getTime() - 60 * 60 * 1000).toISOString(),
    expirationDate: new Date(item.end.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    semantics: {
      eventName: item.serviceName || "Randevu",
      eventStartDate: item.start.toISOString(),
      eventEndDate: item.end.toISOString(),
      venueName: item.businessName,
      ...(item.phone ? { venuePhoneNumber: item.phone } : {}),
    },
  };
}
