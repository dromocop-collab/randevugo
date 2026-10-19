"use client";

import { useEffect, useState } from "react";
import { BarChart3, ChartNoAxesCombined, Rocket } from "lucide-react";
import { Segmented, StudioHero, StudioPage } from "@/app/[lang]/dashboard/_studio";
import { GrowthCenter } from "@/app/[lang]/dashboard/buyume/growth-center";
import { AnalyticsOverview } from "./overview";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import css from "./analitik.module.css";

type HubView = "insights" | "actions";

const VIEWS = [
  { value: "insights", label: tk("Performans"), icon: BarChart3 },
  { value: "actions", label: tk("Büyüme aksiyonları"), icon: Rocket },
] as const;

export default function AnalyticsPage() {
  const t = useT();
  const [view, setView] = useState<HubView>("insights");
  useEffect(() => {
    const syncHash = () => setView(window.location.hash === "#growth-actions" ? "actions" : "insights");
    queueMicrotask(syncHash);
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  function changeView(next: HubView) {
    setView(next);
    window.history.replaceState(null, "", next === "actions" ? "#growth-actions" : window.location.pathname);
  }
  return (
    <StudioPage label={t("Analiz ve büyüme")}>
      <StudioHero
        eyebrow={t("Tek büyüme merkezi")}
        icon={ChartNoAxesCombined}
        title={t("Analizden aksiyona, aynı yerde.")}
        description={t("Performansı okuyun veya doğrudan uygulanabilir büyüme fırsatlarına geçin.")}
        mascot="thinking"
      />
      <div className={css.hubSwitch}>
        <Segmented label={t("Analiz ve büyüme görünümü")} options={VIEWS.map((item) => ({ ...item, label: t(item.label) }))} value={view} onChange={changeView} className={css.hubSeg} />
      </div>
      {view === "insights" ? <AnalyticsOverview /> : <GrowthCenter embedded />}
    </StudioPage>
  );
}
