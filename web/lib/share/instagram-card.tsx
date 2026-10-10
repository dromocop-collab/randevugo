/* eslint-disable @next/next/no-img-element -- ImageResponse (Satori) yalnızca düz <img> destekler. */
import { ImageResponse } from "next/og";
import { encodeQr, qrSvgPath } from "@/features/businesses/qr-code";
import { SHARE_SIZES, clampText, titleFontSize, type ShareFormat, type ShowcaseService } from "@/features/share/instagram-share-domain";
import { loadBrandIcon, loadFonts } from "@/lib/seo/og-card";

export type InstagramCardInput = {
  format: ShareFormat;
  name: string;
  /** Kategori adı (ör. "Kuaför"); büyük harfe burada Türkçe kurallarla çevrilir. */
  category: string;
  /** "Kadıköy, İstanbul" */
  place: string;
  /** "4,8" — puan yoksa null. */
  rating: string | null;
  reviewCount: number;
  verified: boolean;
  /** Online randevu açıksa kapakta rozet gösterilir. */
  onlineBooking: boolean;
  services: ShowcaseService[];
  /** Görselde yazan kısa adres. */
  displayUrl: string;
  /** QR kodun açtığı tam adres. */
  pageUrl: string;
  /** Kapak görseli (data URL). */
  cover: string | null;
  /** Logo (data URL). */
  logo: string | null;
  monogram: string;
};

const C = {
  ink: "#0b2a1b",
  lime: "#c9f45b",
  white: "#ffffff",
  muted: "rgba(255,255,255,0.68)",
  faint: "rgba(255,255,255,0.45)",
  line: "rgba(255,255,255,0.12)",
  frame: "#0a3a27",
};

type Dims = {
  padTop: number; padX: number; padBottom: number;
  coverH: number; logo: number; overlap: number; radius: number;
  eyebrow: number; place: number;
  services: number; serviceName: number; serviceMeta: number; servicePrice: number; rowPad: number; cardPadX: number; cardPadY: number;
  cta: number; url: number; qr: number; footerIcon: number; footerTitle: number; footerSub: number; gap: number;
};

const DIMS: Record<ShareFormat, Dims> = {
  story: {
    padTop: 140, padX: 72, padBottom: 130,
    coverH: 390, logo: 156, overlap: 78, radius: 48,
    eyebrow: 26, place: 30,
    services: 4, serviceName: 31, serviceMeta: 22, servicePrice: 34, rowPad: 14, cardPadX: 40, cardPadY: 24,
    cta: 38, url: 27, qr: 214, footerIcon: 64, footerTitle: 29, footerSub: 21, gap: 26,
  },
  post: {
    padTop: 54, padX: 60, padBottom: 46,
    coverH: 300, logo: 120, overlap: 60, radius: 40,
    eyebrow: 22, place: 25,
    services: 3, serviceName: 26, serviceMeta: 19, servicePrice: 28, rowPad: 12, cardPadX: 32, cardPadY: 20,
    cta: 30, url: 22, qr: 168, footerIcon: 52, footerTitle: 24, footerSub: 18, gap: 22,
  },
};

function StarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill={C.lime} />
    </svg>
  );
}

function CheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill={C.lime} />
      <path d="M7 12.5l3.2 3.2L17 9" stroke={C.ink} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.4 7.5 12.5 7.5 12.5s7.5-7.1 7.5-12.5A7.5 7.5 0 0 0 12 2zm0 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z" fill={C.lime} />
    </svg>
  );
}

function ArrowIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M5 12h13M13 6l6 6-6 6" stroke={C.ink} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" stroke={C.ink} strokeWidth="2.2" fill="none" />
      <path d="M3.5 10h17M8 3v4M16 3v4M9 14.5l2 2 4-4" stroke={C.ink} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Instagram Hikâye (1080×1920) veya dikey gönderi (1080×1350) tanıtım kartı. */
export async function renderInstagramCard(input: InstagramCardInput, init?: { headers?: Record<string, string> }): Promise<ImageResponse> {
  const [fonts, icon] = await Promise.all([loadFonts(), loadBrandIcon()]);
  const d = DIMS[input.format];
  const size = SHARE_SIZES[input.format];
  const contentW = size.width - d.padX * 2;
  const name = clampText(input.name, 56);
  const titleSize = titleFontSize(name, input.format);
  const eyebrow = clampText(input.category, 32).toLocaleUpperCase("tr-TR");
  const qr = encodeQr(input.pageUrl);
  const qrPad = 2;
  const urlSize = input.displayUrl.length > 44 ? Math.round(d.url * 0.8) : input.displayUrl.length > 36 ? Math.round(d.url * 0.9) : d.url;
  const chip = { padding: input.format === "story" ? "10px 22px" : "8px 18px", fontSize: input.format === "story" ? 25 : 21 };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: `${d.padTop}px ${d.padX}px ${d.padBottom}px`,
          backgroundImage: "linear-gradient(165deg, #04140d 0%, #083522 38%, #0b5739 72%, #0f7349 100%)",
          color: C.white,
          fontFamily: fonts.length ? "Poppins" : undefined,
        }}
      >
        {/* Arka plan süsleri */}
        <div style={{ position: "absolute", right: -220, top: -180, width: 640, height: 640, borderRadius: 640, background: "rgba(201,244,91,0.13)", display: "flex" }} />
        <div style={{ position: "absolute", left: -260, bottom: -260, width: 720, height: 720, borderRadius: 720, border: "2px solid rgba(255,255,255,0.07)", display: "flex" }} />
        <div style={{ position: "absolute", left: -140, bottom: -140, width: 480, height: 480, borderRadius: 480, border: "2px solid rgba(201,244,91,0.10)", display: "flex" }} />

        {/* Kapak + logo + rozetler */}
        <div style={{ display: "flex", position: "relative", width: contentW, height: d.coverH + d.overlap, flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 0,
              top: 0,
              width: contentW,
              height: d.coverH,
              borderRadius: d.radius,
              overflow: "hidden",
              backgroundImage: "linear-gradient(135deg, #12603f 0%, #1f7a4a 55%, #2e9a5f 100%)",
              border: "2px solid rgba(255,255,255,0.14)",
            }}
          >
            {input.cover ? (
              <img src={input.cover} width={contentW} height={d.coverH} style={{ width: contentW, height: d.coverH, objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "flex-end", paddingRight: 70 }}>
                <div style={{ position: "absolute", left: -80, top: -120, width: 420, height: 420, borderRadius: 420, border: "2px solid rgba(255,255,255,0.12)", display: "flex" }} />
                <div style={{ position: "absolute", left: 60, top: 40, width: 260, height: 260, borderRadius: 260, background: "rgba(201,244,91,0.12)", display: "flex" }} />
                <div style={{ display: "flex", fontSize: Math.round(d.coverH * 0.5), fontWeight: 700, color: "rgba(201,244,91,0.85)", lineHeight: 1 }}>{input.monogram}</div>
              </div>
            )}
            <div style={{ position: "absolute", left: 0, top: 0, width: contentW, height: d.coverH, display: "flex", backgroundImage: "linear-gradient(180deg, rgba(4,20,13,0.35) 0%, rgba(4,20,13,0) 30%, rgba(4,20,13,0) 60%, rgba(4,20,13,0.55) 100%)" }} />
            {input.onlineBooking ? <div style={{ position: "absolute", left: 28, top: 28, display: "flex", alignItems: "center", gap: 12, padding: chip.padding, borderRadius: 999, background: "rgba(4,20,13,0.62)", border: "1.5px solid rgba(255,255,255,0.18)", fontSize: chip.fontSize, fontWeight: 600 }}>
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 14, background: C.lime }} />
              Online randevu açık
            </div> : null}
          </div>

          {/* Logo */}
          <div
            style={{
              position: "absolute",
              left: 36,
              top: d.coverH - d.overlap,
              width: d.logo,
              height: d.logo,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: Math.round(d.logo * 0.27),
              border: `6px solid ${C.frame}`,
              background: input.logo ? C.white : C.lime,
              overflow: "hidden",
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            }}
          >
            {input.logo ? (
              <img src={input.logo} width={d.logo - 12} height={d.logo - 12} style={{ width: d.logo - 12, height: d.logo - 12, objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ display: "flex", fontSize: Math.round(d.logo * 0.5), fontWeight: 700, color: C.ink }}>{input.monogram}</div>
            )}
          </div>

          {/* Puan / doğrulama */}
          <div style={{ position: "absolute", right: 0, bottom: 0, display: "flex", gap: 12 }}>
            {input.rating ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: chip.padding, borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.16)", fontSize: chip.fontSize, fontWeight: 600 }}>
                <StarIcon size={chip.fontSize + 4} />
                <span style={{ fontWeight: 700 }}>{input.rating}</span>
                {input.reviewCount > 0 ? <span style={{ color: C.muted }}>{`· ${input.reviewCount} yorum`}</span> : null}
              </div>
            ) : null}
            {input.verified ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: chip.padding, borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.16)", fontSize: chip.fontSize, fontWeight: 600 }}>
                <CheckIcon size={chip.fontSize + 4} />
                Doğrulanmış
              </div>
            ) : null}
          </div>
        </div>

        {/* Kimlik */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: d.gap - 4, flexShrink: 0 }}>
          <div style={{ display: "flex", color: C.lime, fontSize: d.eyebrow, fontWeight: 700, letterSpacing: 4 }}>{eyebrow}</div>
          <div style={{ display: "flex", marginTop: 8, fontSize: titleSize, fontWeight: 700, lineHeight: 1.06, letterSpacing: -1.5, maxHeight: titleSize * 1.06 * 2 + 4, overflow: "hidden" }}>{name}</div>
          {input.place ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: d.place, fontWeight: 600, color: C.muted }}>
              <PinIcon size={d.place + 2} />
              {clampText(input.place, 48)}
            </div>
          ) : null}
        </div>

        {/* Hizmetler */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: d.gap,
            padding: `${d.cardPadY}px ${d.cardPadX}px`,
            borderRadius: d.radius - 8,
            background: "rgba(255,255,255,0.07)",
            border: `1.5px solid ${C.line}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: d.rowPad - 4 }}>
            <div style={{ display: "flex", color: C.lime, fontSize: d.serviceMeta, fontWeight: 700, letterSpacing: 3 }}>HİZMETLER</div>
            <div style={{ display: "flex", color: C.faint, fontSize: d.serviceMeta, fontWeight: 600 }}>{input.services.some((item) => item.priceLabel) ? "başlayan fiyatlarla" : "online randevu"}</div>
          </div>
          {input.services.length > 0 ? (
            input.services.slice(0, d.services).map((service) => (
              <div key={service.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${d.rowPad}px 0`, borderTop: `1.5px solid ${C.line}`, gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", fontSize: d.serviceName, fontWeight: 600, lineHeight: 1.2 }}>{service.name}</div>
                  {service.durationLabel ? <div style={{ display: "flex", fontSize: d.serviceMeta, fontWeight: 600, color: C.faint, marginTop: 2 }}>{service.durationLabel}</div> : null}
                </div>
                <div style={{ display: "flex", fontSize: service.priceLabel ? d.servicePrice : d.serviceMeta, fontWeight: 700, color: service.priceLabel ? C.white : C.muted }}>{service.priceLabel ?? "Fiyat için sor"}</div>
              </div>
            ))
          ) : (
            <div style={{ display: "flex", padding: `${d.rowPad}px 0 4px`, borderTop: `1.5px solid ${C.line}`, fontSize: d.serviceName, fontWeight: 600, color: C.muted, lineHeight: 1.35 }}>
              Hizmetleri, fiyatları ve müsait saatleri incele; uygun saati seç.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexGrow: 1, minHeight: d.gap }} />

        {/* Harekete geçirici + QR */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignSelf: "flex-start", alignItems: "center", gap: 14, padding: input.format === "story" ? "22px 36px" : "16px 28px", borderRadius: 999, background: C.lime, color: C.ink, fontSize: d.cta, fontWeight: 700, boxShadow: "0 16px 40px rgba(201,244,91,0.25)" }}>
              <CalendarIcon size={d.cta + 2} />
              Online randevu al
              <ArrowIcon size={d.cta + 2} />
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: urlSize, fontWeight: 700, color: C.white }}>{input.displayUrl}</div>
            <div style={{ display: "flex", marginTop: 6, fontSize: d.serviceMeta, fontWeight: 600, color: C.faint }}>Bağlantıya dokun ya da QR kodu okut</div>
          </div>
          <div style={{ display: "flex", padding: 16, borderRadius: 30, background: C.white, boxShadow: "0 18px 44px rgba(0,0,0,0.3)" }}>
            <svg width={d.qr} height={d.qr} viewBox={`${-qrPad} ${-qrPad} ${qr.size + qrPad * 2} ${qr.size + qrPad * 2}`}>
              <rect x={-qrPad} y={-qrPad} width={qr.size + qrPad * 2} height={qr.size + qrPad * 2} fill="#ffffff" />
              <path d={qrSvgPath(qr)} fill={C.ink} />
            </svg>
          </div>
        </div>

        {/* SeninRandevun imzası */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: d.gap, flexShrink: 0 }}>
          {icon ? <img src={icon} width={d.footerIcon} height={d.footerIcon} style={{ borderRadius: Math.round(d.footerIcon * 0.28) }} alt="" /> : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: d.footerTitle, fontWeight: 700 }}>
              <span>Senin</span>
              <span style={{ color: C.lime }}>Randevun</span>
              <span style={{ color: C.muted, fontWeight: 600, marginLeft: 10 }}>ile online randevu</span>
            </div>
            <div style={{ display: "flex", fontSize: d.footerSub, fontWeight: 600, color: C.faint }}>seninrandevun.com · Ücretsiz, 7/24 randevu</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined, headers: init?.headers },
  );
}
