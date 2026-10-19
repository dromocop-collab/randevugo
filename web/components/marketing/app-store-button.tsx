import { Apple, ArrowUpRight, Play } from "lucide-react";
import { APP_STORE_URL, PLAY_STORE_AVAILABLE, PLAY_STORE_URL } from "@/lib/app-store";
import { getT } from "@/i18n/server";

export async function AppStoreButton({ compact = false }: { compact?: boolean }) {
  const t = await getT();
  return <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={`app-store-button ${compact ? "compact" : ""}`} aria-label={t("SeninRandevun uygulamasını App Store'da aç")}>
    <Apple size={compact ? 19 : 26} fill="currentColor" />
    <span><small>{t("ŞİMDİ İNDİRİN")}</small><b>App Store</b></span>
    <ArrowUpRight size={compact ? 13 : 16}/>
  </a>;
}

/** Google Play rozeti; uygulama mağazada yayınlanana kadar "Çok yakında" olarak tıklanamaz görünür. */
export async function PlayStoreButton({ compact = false }: { compact?: boolean }) {
  const t = await getT();
  const content = <>
    <Play size={compact ? 18 : 24} fill="currentColor" />
    <span><small>{PLAY_STORE_AVAILABLE ? t("ŞİMDİ İNDİRİN") : t("ÇOK YAKINDA")}</small><b>Google Play</b></span>
    {PLAY_STORE_AVAILABLE && <ArrowUpRight size={compact ? 13 : 16}/>}
  </>;
  return PLAY_STORE_AVAILABLE
    ? <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className={`app-store-button ${compact ? "compact" : ""}`} aria-label={t("SeninRandevun uygulamasını Google Play'de aç")}>{content}</a>
    : <span className={`app-store-button ${compact ? "compact" : ""}`} style={{ opacity: 0.72, cursor: "default" }} aria-label={t("SeninRandevun Android uygulaması Google Play'de çok yakında")}>{content}</span>;
}

/** iOS + Android rozetleri birlikte. */
export function AppStoreButtons({ compact = false }: { compact?: boolean }) {
  return <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 10 }}><AppStoreButton compact={compact} /><PlayStoreButton compact={compact} /></span>;
}
