/* eslint-disable @next/next/no-img-element -- ImageResponse (Satori) yalnızca düz <img> destekler. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** Paylaşım görseli ölçüsü (Open Graph / X önerilen oran 1.91:1). */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

type Font = { name: string; data: ArrayBuffer; weight: 600 | 700; style: "normal" };

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

let fontsPromise: Promise<Font[]> | null = null;

/** Türkçe karakterleri (ğ, ş, ı, İ, ₺) kapsayan Poppins; okunamazsa varsayılan yazı tipine düşer. */
function loadFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all([
    readFile(join(process.cwd(), "lib/seo/fonts/Poppins-SemiBold.ttf")),
    readFile(join(process.cwd(), "lib/seo/fonts/Poppins-Bold.ttf")),
  ])
    .then(([semi, bold]) => [
      { name: "Poppins", data: toArrayBuffer(semi), weight: 600 as const, style: "normal" as const },
      { name: "Poppins", data: toArrayBuffer(bold), weight: 700 as const, style: "normal" as const },
    ])
    .catch(() => []);
  return fontsPromise;
}

let iconPromise: Promise<string | null> | null = null;

function loadBrandIcon(): Promise<string | null> {
  iconPromise ??= readFile(join(process.cwd(), "public/icon-192.png"))
    .then((data) => `data:image/png;base64,${data.toString("base64")}`)
    .catch(() => null);
  return iconPromise;
}

/**
 * Uzak görseli (işletme kapağı/logosu) data URL'e çevirir. Yalnızca PNG/JPEG desteklenir;
 * zaman aşımı, büyük dosya veya hata durumunda null döner ve kart görselsiz çizilir.
 */
export async function fetchImageDataUrl(url: string | undefined, timeoutMs = 3500): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "force-cache" });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type !== "image/png" && type !== "image/jpeg" && type !== "image/jpg") return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > 4_000_000) return null;
    return `data:${type === "image/jpg" ? "image/jpeg" : type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type OgCardInput = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  chips?: string[];
  /** Sağ tarafta gösterilecek görsel (data URL). */
  image?: string | null;
  /** Görsel yoksa büyük harf monogram. */
  monogram?: string;
};

function clampText(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Marka stilinde (koyu yeşil + lime) paylaşım kartı. */
export async function renderOgCard(input: OgCardInput): Promise<ImageResponse> {
  const [fonts, icon] = await Promise.all([loadFonts(), loadBrandIcon()]);
  const title = clampText(input.title, 70);
  const titleSize = title.length > 46 ? 54 : title.length > 28 ? 64 : 76;
  const hasImage = Boolean(input.image);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(125deg, #082318 0%, #0b4a31 55%, #0b6b45 100%)",
          color: "#ffffff",
          fontFamily: fonts.length ? "Poppins" : undefined,
        }}
      >
        <div style={{ position: "absolute", right: -160, top: -160, width: 520, height: 520, borderRadius: 520, background: "rgba(201,244,91,0.16)", display: "flex" }} />
        <div style={{ position: "absolute", left: -120, bottom: -200, width: 420, height: 420, borderRadius: 420, border: "2px solid rgba(255,255,255,0.08)", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 60px 72px", width: hasImage ? 700 : 1060 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {icon ? <img src={icon} width={52} height={52} style={{ borderRadius: 14 }} alt="" /> : null}
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>SeninRandevun</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: "#c9f45b", fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{clampText(input.eyebrow, 48)}</div>
            <div style={{ display: "flex", marginTop: 18, fontSize: titleSize, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>{title}</div>
            {input.subtitle ? <div style={{ display: "flex", marginTop: 22, fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.75)", lineHeight: 1.35 }}>{clampText(input.subtitle, 110)}</div> : null}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {(input.chips ?? []).filter(Boolean).slice(0, 3).map((chip) => (
              <div key={chip} style={{ display: "flex", alignItems: "center", padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 24, fontWeight: 600 }}>{clampText(chip, 34)}</div>
            ))}
            <div style={{ display: "flex", alignItems: "center", padding: "10px 22px", borderRadius: 999, background: "#c9f45b", color: "#0b2a1b", fontSize: 24, fontWeight: 700 }}>Online randevu al</div>
          </div>
        </div>

        {hasImage ? (
          <div style={{ display: "flex", position: "absolute", right: 56, top: 56, width: 400, height: 518, borderRadius: 36, overflow: "hidden", border: "4px solid rgba(255,255,255,0.18)", background: "#0b2a1b" }}>
            <img src={input.image!} width={400} height={518} style={{ objectFit: "cover", width: 400, height: 518 }} alt="" />
          </div>
        ) : input.monogram ? (
          <div style={{ display: "flex", position: "absolute", right: 72, bottom: 64, width: 180, height: 180, borderRadius: 48, background: "rgba(201,244,91,0.18)", color: "#c9f45b", alignItems: "center", justifyContent: "center", fontSize: 110, fontWeight: 700 }}>{input.monogram}</div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
