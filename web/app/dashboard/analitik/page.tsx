"use client";

import { useEffect, useState } from "react";
import { BarChart3, ChartNoAxesCombined, Rocket } from "lucide-react";
import { Segmented, StudioHero, StudioPage } from "@/app/dashboard/_studio";
import { GrowthCenter } from "@/app/dashboard/buyume/growth-center";
import { AnalyticsOverview } from "./overview";
import css from "./analitik.module.css";

type HubView = "insights" | "actions";

const VIEWS = [
  { value: "insights", label: "Performans", icon: BarChart3 },
  { value: "actions", label: "Büyüme aksiyonları", icon: Rocket },
] as const;

export default function AnalyticsPage() {
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
    <StudioPage label="Analiz ve büyüme">
      <StudioHero
        eyebrow="Tek büyüme merkezi"
        icon={ChartNoAxesCombined}
        title="Analizden aksiyona, aynı yerde."
        description="Performansı okuyun veya doğrudan uygulanabilir büyüme fırsatlarına geçin."
        mascot="thinking"
      />
      <div className={css.hubSwitch}>
        <Segmented label="Analiz ve büyüme görünümü" options={VIEWS} value={view} onChange={changeView} className={css.hubSeg} />
      </div>
      {view === "insights" ? <AnalyticsOverview /> : <GrowthCenter embedded />}
    </StudioPage>
  );
}
