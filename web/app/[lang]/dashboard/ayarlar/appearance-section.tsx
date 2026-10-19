"use client";

import { useEffect, useState } from "react";
import { Moon, MonitorSmartphone, Palette, Sparkles } from "lucide-react";
import { Notice, Panel, cx, studio as k } from "../_studio";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import st from "./settings.module.css";

/* Renk atmosferi seçimi ve hesap senkronu (Android ile ortak) üst çubuktaki
   "Görünüm stüdyosu"nda yaşar. Burada aynı tercihi okuyup canlı önizleriz ve
   o stüdyoyu açarız; tercih mantığı tek yerde kalır. */
const SKIN_NAMES: Record<string, string> = {
  emerald: "Aurora", midnight: tk("Gece"), pearl: tk("İnci"), ocean: tk("Okyanus"), violet: tk("Lavanta"), sunset: tk("Gün Batımı"),
  rose: tk("Gül"), graphite: tk("Grafit"), champagne: tk("Şampanya"), forest: tk("Orman"), ruby: tk("Yakut"), indigo: tk("İndigo"),
};

// i18n-ignore — eski Türkçe aria-label yedeği; asıl eşleşme sınıf ve data özniteliğiyle.
const TRIGGER_SELECTOR = ".dashboard-skin-trigger, [data-dashboard-appearance-trigger], button[aria-label='Panel görünümünü değiştir']"; // i18n-ignore

function readSkin() {
  if (typeof document === "undefined") return "emerald";
  return document.documentElement.dataset.dashboardSkin || "emerald";
}

export function AppearanceSection() {
  const t = useT();
  const [skin, setSkin] = useState("emerald");
  const [density, setDensity] = useState("comfortable");
  const [motion, setMotion] = useState("alive");
  const [hasTrigger, setHasTrigger] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      setSkin(readSkin());
      setDensity(root.dataset.dashboardDensity || "comfortable");
      setMotion(root.dataset.dashboardMotion || "alive");
      setHasTrigger(Boolean(document.querySelector(TRIGGER_SELECTOR)));
    };
    const frame = requestAnimationFrame(sync);
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-dashboard-skin", "data-dashboard-density", "data-dashboard-motion"] });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  function openStudio() {
    const trigger = document.querySelector<HTMLElement>(TRIGGER_SELECTOR);
    if (!trigger) return;
    trigger.scrollIntoView({ block: "nearest", behavior: "smooth" });
    trigger.click();
  }

  return (
    <>
      <div className={st.skinPreview} aria-hidden>
        <div className={st.skinPreviewInner}>
          <span className={st.skinBadge}><Sparkles size={13} /> {t("Canlı önizleme")}</span>
          <b>{t(SKIN_NAMES[skin] ?? skin)}</b>
          <small>{t("Panelin tüm vurguları bu atmosferden gelir.")}</small>
          <div className={st.skinSwatches}><i /><i /><i /><i /></div>
        </div>
        <div className={st.skinBars}><i /><i /><i /><i /><i /></div>
      </div>

      <Panel title={t("Renk atmosferi")} icon={Palette} description={t("12 palet arasından seç; tercih hesabına kaydedilir ve web ile Android uygulamada aynı görünür.")}
        actions={hasTrigger ? <button type="button" className={cx(k.btn, k.btnPrimary)} onClick={openStudio}><Palette size={16} aria-hidden /> {t("Görünüm stüdyosunu aç")}</button> : null}>
        <div className={k.group}>
          <div className={k.row}><span className={k.statIcon}><Palette size={16} aria-hidden /></span><span className={k.rowText}><b>{t("Aktif palet")}</b><small>{t(SKIN_NAMES[skin] ?? skin)}</small></span></div>
          <div className={k.row}><span className={k.statIcon}><MonitorSmartphone size={16} aria-hidden /></span><span className={k.rowText}><b>{t("Yerleşim")}</b><small>{density === "compact" ? t("Kompakt") : t("Rahat")}</small></span></div>
          <div className={k.row}><span className={k.statIcon}><Moon size={16} aria-hidden /></span><span className={k.rowText}><b>{t("Hareket")}</b><small>{motion === "calm" ? t("Sakin") : t("Canlı")}</small></span></div>
        </div>
        {!hasTrigger && (
          <div style={{ marginTop: 12 }}>
            <Notice tone="accent" icon={Sparkles}>{t("Üst çubuktaki Görünüm düğmesinden paletini değiştirebilirsin.")}</Notice>
          </div>
        )}
      </Panel>
    </>
  );
}
