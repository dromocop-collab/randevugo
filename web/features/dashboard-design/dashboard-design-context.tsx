"use client";

// Panel tasarımını canlı dinler (platformSettings/dashboardDesign) ve işletme paneline sağlar.
// Son bilinen belge cihazda saklanır: menü ilk boyamada da tasarıma göre gelir, bağlantı yokken de çalışır.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { I18nOverrides, useLocale } from "@/i18n/client";
import { EMPTY_DESIGN, parseDashboardDesign, textOverrideMap, type DashboardDesign } from "./design-domain";

export const DASHBOARD_DESIGN_DOC = ["platformSettings", "dashboardDesign"] as const;
const CACHE_KEY = "sr-dashboard-design";

type DesignValue = { design: DashboardDesign; ready: boolean };
const DashboardDesignContext = createContext<DesignValue>({ design: EMPTY_DESIGN, ready: false });

function readCache(): DashboardDesign {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? parseDashboardDesign(JSON.parse(raw)) : EMPTY_DESIGN;
  } catch {
    return EMPTY_DESIGN;
  }
}

export function DashboardDesignProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [value, setValue] = useState<DesignValue>({ design: EMPTY_DESIGN, ready: false });

  useEffect(() => {
    queueMicrotask(() => setValue((current) => (current.ready ? current : { design: readCache(), ready: false })));
    return onSnapshot(doc(getDb(), ...DASHBOARD_DESIGN_DOC), (snapshot) => {
      const raw = snapshot.exists() ? snapshot.data() : null;
      try {
        if (raw) window.localStorage.setItem(CACHE_KEY, JSON.stringify(raw, (key, item) => (key === "updatedAt" ? undefined : item)));
        else window.localStorage.removeItem(CACHE_KEY);
      } catch { /* depolama kapalı olabilir */ }
      setValue({ design: parseDashboardDesign(raw), ready: true });
    }, () => setValue((current) => ({ ...current, ready: true })));
  }, []);

  const overrides = useMemo(() => textOverrideMap(value.design, locale), [value.design, locale]);
  return (
    <DashboardDesignContext.Provider value={value}>
      <I18nOverrides overrides={overrides}>{children}</I18nOverrides>
    </DashboardDesignContext.Provider>
  );
}

export function useDashboardDesign(): DesignValue {
  return useContext(DashboardDesignContext);
}
