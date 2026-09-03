"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Diamond, Gift, Sparkles, X } from "lucide-react";

const CAMPAIGN_STORAGE_KEY = "seninrandevun:first-year-free:seen:v1";
const announcement = "İlk yıl bizden · Yeni işletmelere özel";

export function LaunchCampaign() {
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
      <Link href="/isletmeler/kayit" className="campaign-ticker" aria-label="Yeni işletmelere ilk yıl ücretsiz kampanyasını incele">
        <span className="campaign-ticker-track" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <span key={item}>
              <b><Gift size={12} /> 12 AY HEDİYE</b>
              <strong>{announcement}</strong>
              <Diamond size={6} />
              <small>Kredi kartı gerekmez</small>
            </span>
          ))}
        </span>
        <span className="sr-only">{announcement}</span>
      </Link>

      {open && (
        <div className="campaign-modal-backdrop" role="presentation" onMouseDown={dismiss}>
          <section className="campaign-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="campaign-modal-close" onClick={dismiss} aria-label="Kampanya penceresini kapat"><X size={18} /></button>
            <div className="campaign-modal-art" aria-hidden="true"><span>12</span><small>AY</small><Gift size={28} /></div>
            <div className="campaign-modal-copy">
              <span><Sparkles size={14} /> YENİ İŞLETMELERE ÖZEL</span>
              <h2 id="campaign-title">SeninRandevun&apos;da<br /><em>ilk yıl bizden.</em></h2>
              <p>İşletme hesabınızı şimdi açın; tüm özellikleri kayıt tarihinizden itibaren 12 ay boyunca ücretsiz kullanın.</p>
              <ul>
                <li>✓ Kredi kartı gerekmez</li>
                <li>✓ Kurulum ücreti yok</li>
                <li>✓ Tüm özellikler açık</li>
              </ul>
              <Link href="/isletmeler/kayit" onClick={dismiss}>Ücretsiz hesabını aç <ArrowRight size={17} /></Link>
              <small>Kampanya yeni işletme kayıtları için geçerlidir. Ücretsiz dönem sonunda güncel abonelik koşulları uygulanır.</small>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
