"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Gift } from "lucide-react";
import { useT } from "@/i18n/client";
import { CampaignWheelModal } from "@/features/campaign-wheel/campaign-wheel-modal";
import { sliceColor, wheelIsLive, type PublicWheel } from "@/features/campaign-wheel/wheel-domain";
import styles from "../storefront.module.css";

/** Vitrinde çark daveti: küçük, kendi kendine dönen çark + çağrı. ?cark=1 bağlantısı pencereyi doğrudan açar. */
export function CampaignWheelBanner({ wheel, businessId, businessName, businessSlug }: { wheel: PublicWheel; businessId: string; businessName: string; businessSlug: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // Tarih kontrolü (sunucu da çevirmede tekrar denetler).
  const [now] = useState(() => Date.now());
  const live = wheelIsLive(wheel, now);

  useEffect(() => {
    // ?cark=1 bağlantısıyla gelen (Instagram biyografisi, hikaye) pencereyi doğrudan açık bulur.
    if (live && new URLSearchParams(window.location.search).get("cark") === "1") queueMicrotask(() => setOpen(true));
  }, [live]);

  const conic = useMemo(() => {
    const step = 360 / wheel.slices.length;
    return `conic-gradient(${wheel.slices.map((slice, index) => `${sliceColor(slice, index)} ${index * step}deg ${(index + 1) * step}deg`).join(", ")})`;
  }, [wheel.slices]);

  const best = useMemo(() => {
    const prizes = wheel.slices.filter((slice) => slice.type !== "none").map((slice) => slice.label);
    return prizes.slice(0, 3).join(" · ");
  }, [wheel.slices]);

  if (!live) return null;

  return (
    <>
      <section className={styles.wheelBanner} aria-label={t("Kampanya çarkı")}>
        <button type="button" className={styles.wheelMini} onClick={() => setOpen(true)} aria-label={t("Çarkı aç")}>
          <span className={styles.wheelMiniDisc} style={{ background: conic }} aria-hidden="true" />
          <span className={styles.wheelMiniHub} aria-hidden="true"><Gift size={16} /></span>
          <span className={styles.wheelMiniPin} aria-hidden="true" />
        </button>
        <div className={styles.wheelCopy}>
          <span className={styles.liveTag}><i aria-hidden="true" /> {t("KAMPANYA")}</span>
          <h2>{wheel.title}</h2>
          <p>{wheel.subtitle || t("Çarkı çevir, kazandığın indirim randevunda otomatik uygulansın.")}</p>
          {best ? <p className={styles.wheelPrizes}>{best}</p> : null}
        </div>
        <button type="button" className={styles.liveBtn} onClick={() => setOpen(true)}>
          <Gift size={17} aria-hidden="true" /> {t("Çarkı çevir")} <ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>
      <CampaignWheelModal open={open} onClose={() => setOpen(false)} businessId={businessId} businessName={businessName} businessSlug={businessSlug} wheel={wheel} />
    </>
  );
}
