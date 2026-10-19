"use client";

import Link from "@/i18n/link";
import { useEffect, useState } from "react";
import { ArrowRight, Diamond, Gift, Sparkles, X } from "lucide-react";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";

const CAMPAIGN_STORAGE_KEY = "seninrandevun:three-months-free:seen:v1";
const announcement = tk("İlk ay bizden · Lansmana özel");

export function LaunchCampaign({ showTicker = false }: { showTicker?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(CAMPAIGN_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const dismiss = () => {
    window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <>
      {showTicker && (
        <Link href="/isletmeler/kayit" className="campaign-ticker" aria-label={t("Lansmana özel ilk ay ücretsiz kampanyasını incele")}>
          <span className="campaign-ticker-track" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <span key={item}>
                <b><Gift size={12} /> {t("1 AY HEDİYE")}</b>
                <strong>{t(announcement)}</strong>
                <Diamond size={6} />
                <small>{t("Kredi kartı gerekmez")}</small>
              </span>
            ))}
          </span>
          <span className="sr-only">{t(announcement)}</span>
        </Link>
      )}

      {open && (
        <div className="campaign-modal-backdrop" role="presentation" onMouseDown={dismiss}>
          <section className="campaign-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="campaign-modal-close" onClick={dismiss} aria-label={t("Kampanya penceresini kapat")}><X size={18} /></button>
            <div className="campaign-modal-art" aria-hidden="true"><span>30</span><small>{t("GÜN")}</small><Gift size={28} /></div>
            <div className="campaign-modal-copy">
              <span><Sparkles size={14} /> {t("YENİ İŞLETMELERE ÖZEL")}</span>
              <h2 id="campaign-title">{t("SeninRandevun'da")}<br /><em>{t("ilk ay bizden.")}</em></h2>
              <p>{t("İşletme hesabınızı şimdi açın; tüm özellikleri kayıt tarihinizden itibaren 30 gün boyunca ücretsiz kullanın.")}</p>
              <ul>
                <li>✓ {t("Kredi kartı gerekmez")}</li>
                <li>✓ {t("Kurulum ücreti yok")}</li>
                <li>✓ {t("Kurulum desteği dahil")}</li>
              </ul>
              <Link href="/isletmeler/kayit" onClick={dismiss}>{t("Ücretsiz hesabını aç")} <ArrowRight size={17} /></Link>
              <small>{t("Kampanya lansman döneminde açılan işletme hesapları için geçerlidir. Ücretsiz dönem sonunda güncel abonelik koşulları uygulanır.")}</small>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
