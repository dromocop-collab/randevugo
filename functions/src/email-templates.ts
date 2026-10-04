/**
 * SeninRandevun marka e-posta şablonları.
 *
 * E-posta istemcileri (Gmail, Outlook, iOS Mail) için tablo tabanlı, satır içi stil kullanan,
 * gradyan desteklemeyen istemcilerde düz renge düşen (bgcolor) bir düzen. Logo, sitede yayında
 * olan https://seninrandevun.com/apple-icon.png dosyasıdır (beyaz zeminli, 180px).
 */

const BRAND = {
  forest: "#093321",
  forestDeep: "#061D15",
  emerald: "#096E45",
  lime: "#C9F55C",
  cream: "#F7F5EB",
  mist: "#E8F2EB",
  ink: "#091A12",
  muted: "#5E7266",
  orange: "#F07A1A",
  site: "https://seninrandevun.com",
  logo: "https://seninrandevun.com/apple-icon.png",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** İstek zamanı, Türkiye saatiyle (güvenlik bilgisi olarak e-postada gösterilir). */
export function istanbulTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export interface BrandEmailInput {
  /** Gelen kutusu önizlemesinde görünen gizli metin. */
  preheader: string;
  eyebrow: string;
  title: string;
  greeting?: string;
  intro: string;
  /** 6 haneli kod gibi büyük gösterilecek değer. */
  code?: string;
  codeHint?: string;
  /** Süre / uyarı rozeti metni (ör. "5 dakika geçerli"). */
  badge?: string;
  cta?: { label: string; url: string };
  /** Anahtar–değer satırları (ör. İstek zamanı). */
  details?: Array<[string, string]>;
  securityNote: string;
  footerNote: string;
}

export interface RenderedEmail { html: string; text: string }

export function renderBrandEmail(input: BrandEmailInput): RenderedEmail {
  const e = escapeHtml;
  const digits = (input.code ?? "").split("");
  const codeCells = digits.map((d) =>
    `<td class="sr-d" align="center" valign="middle" width="50" height="62" style="width:50px;height:62px;background:${BRAND.mist};border:2px solid ${BRAND.emerald};border-radius:14px;font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:30px;font-weight:800;color:${BRAND.forest};">${e(d)}</td>`
  ).join(`<td class="sr-g" width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>`);

  const detailRows = (input.details ?? []).map(([k, v]) =>
    `<tr><td style="padding:6px 0;font-size:13px;color:${BRAND.muted};">${e(k)}</td><td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:${BRAND.ink};">${e(v)}</td></tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>${e(input.title)} · SeninRandevun</title>
<style>
  @media only screen and (max-width:620px){
    .sr-card{width:100% !important;border-radius:0 !important}
    .sr-pad{padding-left:24px !important;padding-right:24px !important}
    .sr-title{font-size:26px !important;line-height:32px !important}
    .sr-code td.sr-d{width:40px !important;height:52px !important;font-size:24px !important;border-radius:12px !important}
    .sr-code td.sr-g{width:6px !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${e(input.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.cream}" style="background:${BRAND.cream};">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="sr-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:580px;background:#FFFFFF;border-radius:28px;overflow:hidden;border:1px solid #E3E9E2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <!-- Hero -->
  <tr><td bgcolor="${BRAND.forest}" class="sr-pad" style="background:${BRAND.forest};background-image:linear-gradient(135deg,${BRAND.forestDeep} 0%,${BRAND.forest} 55%,${BRAND.emerald} 100%);padding:34px 40px 38px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:20px;padding:6px;">
              <a href="${BRAND.site}" style="text-decoration:none;"><img src="${BRAND.logo}" width="84" height="84" alt="SeninRandevun" style="display:block;width:84px;height:84px;border:0;border-radius:14px;" /></a>
            </td>
          </tr></table>
        </td>
        <td align="right" valign="top">
          <span style="display:inline-block;background:rgba(201,245,92,0.16);border:1px solid rgba(201,245,92,0.45);color:${BRAND.lime};font-size:11px;font-weight:800;letter-spacing:1.6px;padding:7px 12px;border-radius:999px;">GÜVENLİ</span>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:26px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:2px;color:${BRAND.lime};text-transform:uppercase;">${e(input.eyebrow)}</div>
        <div class="sr-title" style="margin-top:8px;font-size:30px;line-height:36px;font-weight:800;color:#FFFFFF;letter-spacing:-0.6px;">${e(input.title)}</div>
      </td></tr>
    </table>
  </td></tr>
  <!-- Lime çizgi -->
  <tr><td height="5" bgcolor="${BRAND.lime}" style="height:5px;line-height:5px;font-size:0;background:${BRAND.lime};background-image:linear-gradient(90deg,${BRAND.lime},${BRAND.orange});">&nbsp;</td></tr>

  <!-- Gövde -->
  <tr><td class="sr-pad" style="padding:34px 40px 8px;">
    ${input.greeting ? `<p style="margin:0 0 10px;font-size:16px;font-weight:700;color:${BRAND.ink};">${e(input.greeting)}</p>` : ""}
    <p style="margin:0;font-size:15px;line-height:24px;color:${BRAND.muted};">${e(input.intro)}</p>
  </td></tr>

  ${input.code ? `
  <tr><td align="center" class="sr-pad" style="padding:22px 40px 6px;">
    <table role="presentation" class="sr-code" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>${codeCells}</tr></table>
    ${input.codeHint ? `<p style="margin:14px 0 0;font-size:12px;color:${BRAND.muted};">${e(input.codeHint)} <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-weight:800;letter-spacing:3px;color:${BRAND.forest};background:${BRAND.mist};padding:3px 8px;border-radius:6px;">${e(input.code)}</span></p>` : ""}
  </td></tr>` : ""}

  ${input.badge ? `
  <tr><td align="center" class="sr-pad" style="padding:18px 40px 4px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="#FFF6EA" style="background:#FFF6EA;border:1px solid #F8CF9E;border-radius:999px;padding:10px 18px;font-size:13px;color:#8A4B0F;">⏱&nbsp; ${e(input.badge)}</td>
    </tr></table>
  </td></tr>` : ""}

  ${input.cta ? `
  <tr><td align="center" class="sr-pad" style="padding:24px 40px 4px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="${BRAND.emerald}" style="border-radius:16px;background:${BRAND.emerald};background-image:linear-gradient(90deg,${BRAND.emerald},${BRAND.forest});">
        <a href="${e(input.cta.url)}" style="display:inline-block;padding:16px 30px;font-size:16px;font-weight:800;color:#FFFFFF;text-decoration:none;border-radius:16px;">${e(input.cta.label)} &rarr;</a>
      </td>
    </tr></table>
  </td></tr>` : ""}

  ${detailRows ? `
  <tr><td class="sr-pad" style="padding:26px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #EEF2EC;border-bottom:1px solid #EEF2EC;">${detailRows}</table>
  </td></tr>` : ""}

  <!-- Güvenlik -->
  <tr><td class="sr-pad" style="padding:22px 40px 34px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="${BRAND.mist}" style="background:${BRAND.mist};border-radius:18px;padding:16px 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="top" style="font-size:18px;padding-right:12px;">🛡️</td>
          <td style="font-size:13px;line-height:20px;color:${BRAND.forest};">${e(input.securityNote)}</td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>

  <!-- Alt bilgi -->
  <tr><td bgcolor="${BRAND.forest}" class="sr-pad" style="background:${BRAND.forest};padding:26px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="font-size:15px;font-weight:800;color:#FFFFFF;">Senin<span style="color:${BRAND.lime};">Randevun</span></td></tr>
      <tr><td style="padding-top:4px;font-size:12px;color:rgba(255,255,255,0.7);">Zamanın değerli, randevun bizde.</td></tr>
      <tr><td style="padding-top:16px;font-size:12px;line-height:18px;color:rgba(255,255,255,0.6);">${e(input.footerNote)}</td></tr>
      <tr><td style="padding-top:14px;font-size:12px;">
        <a href="${BRAND.site}/yardim-merkezi" style="color:${BRAND.lime};text-decoration:none;font-weight:700;">Yardım merkezi</a>
        <span style="color:rgba(255,255,255,0.35);">&nbsp;·&nbsp;</span>
        <a href="${BRAND.site}/gizlilik" style="color:${BRAND.lime};text-decoration:none;font-weight:700;">Gizlilik</a>
        <span style="color:rgba(255,255,255,0.35);">&nbsp;·&nbsp;</span>
        <a href="${BRAND.site}/kvkk" style="color:${BRAND.lime};text-decoration:none;font-weight:700;">KVKK</a>
      </td></tr>
      <tr><td style="padding-top:14px;font-size:11px;color:rgba(255,255,255,0.45);">© ${new Date().getFullYear()} SeninRandevun · seninrandevun.com</td></tr>
    </table>
  </td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `SeninRandevun — ${input.title}`,
    "",
    input.greeting ?? "",
    input.intro,
    input.code ? `\nKodun: ${input.code}` : "",
    input.badge ? `(${input.badge})` : "",
    input.cta ? `\n${input.cta.label}: ${input.cta.url}` : "",
    ...(input.details ?? []).map(([k, v]) => `${k}: ${v}`),
    "",
    input.securityNote,
    "",
    input.footerNote,
    "seninrandevun.com",
  ].filter((line, i, all) => !(line === "" && all[i - 1] === "")).join("\n").trim();

  return { html, text };
}

/** E-posta doğrulama ve şifre sıfırlama kod e-postası (konu + html + düz metin). */
export function buildCodeEmail(code: string, type: "verify" | "reset", requestedAt: Date = new Date()) {
  const isVerify = type === "verify";
  const rendered = renderBrandEmail({
    preheader: isVerify
      ? `Doğrulama kodun: ${code} · 5 dakika geçerli`
      : `Şifre sıfırlama kodun: ${code} · 5 dakika geçerli`,
    eyebrow: isVerify ? "E-posta doğrulama" : "Şifre sıfırlama",
    title: isVerify ? "E-posta adresini doğrula" : "Yeni şifreni belirle",
    greeting: "Merhaba,",
    intro: isVerify
      ? "SeninRandevun hesabını güvenle kullanmaya başlaman için son bir adım kaldı. Aşağıdaki 6 haneli kodu uygulamadaki doğrulama alanına gir."
      : "Hesabın için bir şifre sıfırlama isteği aldık. Aşağıdaki 6 haneli kodu uygulamada gir ve yeni şifreni belirle.",
    code,
    codeHint: "Kopyalamak için:",
    badge: "Bu kod 5 dakika boyunca geçerlidir",
    details: [
      ["İstek zamanı", `${istanbulTime(requestedAt)} (TSİ)`],
      ["İşlem", isVerify ? "E-posta doğrulama" : "Şifre sıfırlama"],
    ],
    securityNote: isVerify
      ? "Bu kodu kimseyle paylaşma. SeninRandevun ekibi senden asla doğrulama kodu istemez."
      : "Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez. Şüpheli bir durum görürsen destek ekibimize yaz.",
    footerNote: "Bu e-postayı bir işlem talebi üzerine aldın. Talebi sen yapmadıysan herhangi bir şey yapmana gerek yok.",
  });
  const subject = isVerify
    ? `${code} · SeninRandevun doğrulama kodun`
    : `${code} · SeninRandevun şifre sıfırlama kodun`;
  return { subject, ...rendered };
}

/** Çalışan paneli daveti. */
export function buildStaffInviteEmail(staffName: string, businessName: string, resetUrl: string) {
  const rendered = renderBrandEmail({
    preheader: `${businessName} seni çalışan paneline davet etti`,
    eyebrow: "Çalışan daveti",
    title: "Çalışan panelin hazır",
    greeting: `Merhaba ${staffName || ""},`.replace(" ,", ","),
    intro: `${businessName} seni SeninRandevun çalışan paneline davet etti. Panelde sana atanan randevuları ve izin verilen alanları görebilirsin. Başlamak için şifreni belirle.`,
    cta: { label: "Şifremi belirle ve panele gir", url: resetUrl },
    details: [["İşletme", businessName], ["Davet zamanı", `${istanbulTime()} (TSİ)`]],
    securityNote: "Bu daveti beklemiyorsan bağlantıya tıklama ve işletmeyle iletişime geç.",
    footerNote: "Bu e-postayı bir işletme seni ekibine eklediği için aldın.",
  });
  return { subject: `${businessName} çalışan paneli daveti`, ...rendered };
}
