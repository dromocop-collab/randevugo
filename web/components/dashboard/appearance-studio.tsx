"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Cloud, CloudOff, Eye, EyeOff, Gauge, LayoutPanelTop, LoaderCircle, MousePointer2, Palette, RotateCcw, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardAppearancePreferences, saveDashboardAppearancePreferences } from "@/features/users/appearance-preferences-repository";
import { Button, SegmentedControl, Sheet } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import styles from "./topbar.module.css";

/* Android uygulamasıyla senkron temalar (users/{uid}/preferences/dashboardAppearance.skin).
   Renk değişkenleri globals.css :root[data-dashboard-skin] altında. */
export const dashboardSkins = [
  { id: "emerald", name: "Aurora", note: "Canlı ve enerjik", colors: ["#061d15", "#0b6b45", "#39c98b", "#bdf65e"] },
  { id: "midnight", name: "Gece", note: "Odaklı ve güçlü", colors: ["#07152f", "#2563eb", "#22d3ee"] },
  { id: "pearl", name: "İnci", note: "Sade ve premium", colors: ["#18202b", "#64748b", "#f5b942", "#fffdf8"] },
  { id: "ocean", name: "Okyanus", note: "Ferah ve berrak", colors: ["#083344", "#0891b2", "#67e8f9"] },
  { id: "violet", name: "Lavanta", note: "Yaratıcı ve seçkin", colors: ["#2e1065", "#7c3aed", "#9f7aea", "#c4b5fd"] },
  { id: "sunset", name: "Gün Batımı", note: "Sıcak ve iddialı", colors: ["#431407", "#ea580c", "#fde047"] },
  { id: "rose", name: "Gül", note: "Zarif ve modern", colors: ["#4c0519", "#be123c", "#e11d48", "#fda4af"] },
  { id: "graphite", name: "Grafit", note: "Kurumsal ve net", colors: ["#0f172a", "#334155", "#38bdf8"] },
  { id: "champagne", name: "Şampanya", note: "Sıcak ve sofistike", colors: ["#422006", "#a16207", "#f5b942", "#fde68a"] },
  { id: "forest", name: "Orman", note: "Doğal ve prestijli", colors: ["#052e16", "#166534", "#86efac"] },
  { id: "ruby", name: "Yakut", note: "Güçlü ve seçkin", colors: ["#4c0519", "#9f1239", "#e11d48", "#fbbf24"] },
  { id: "indigo", name: "İndigo", note: "Teknolojik ve sakin", colors: ["#1e1b4b", "#4338ca", "#a5b4fc"] },
] as const;

type DashboardSkin = (typeof dashboardSkins)[number]["id"];
type DashboardDensity = "comfortable" | "compact";
type DashboardMotion = "alive" | "calm";

const dashboardCursors = [
  { id: "normal", name: "Normal", note: "Klasik sistem imleci" },
  { id: "orbit", name: "Yörünge", note: "Marka halkası" },
  { id: "aurora", name: "Aurora", note: "Turkuaz parıltı" },
  { id: "neon", name: "Neon", note: "Canlı ve enerjik" },
  { id: "pearl", name: "İnci", note: "Sade ve premium" },
  { id: "comet", name: "Kuyruklu yıldız", note: "Hareketli ışık izi" },
] as const;

type DashboardCursor = (typeof dashboardCursors)[number]["id"];
type AppearanceSyncState = "loading" | "saved" | "offline";
type AppearanceSection = "colors" | "behavior" | "cursor" | "layout";

/** Ana panel (Bugün) modülleri; sırası/görünürlüğü burada düzenlenir, app/dashboard/page.tsx uygular. */
export const defaultDashboardModules = [
  { id: "command", label: "Hızlı işlemler" },
  { id: "insights", label: "Uyarılar ve fırsatlar" },
  { id: "profile", label: "Kurulum rehberi" },
  { id: "kpis", label: "Günün performansı" },
  { id: "operations", label: "Bugünün akışı" },
] as const;

export type DashboardModuleId = (typeof defaultDashboardModules)[number]["id"];
export type DashboardModulePreference = { id: DashboardModuleId; enabled: boolean };

export function normalizeDashboardModules(value: unknown): DashboardModulePreference[] {
  const fallback = defaultDashboardModules.map((item) => ({ id: item.id, enabled: true }));
  if (!Array.isArray(value)) return fallback;
  const valid = value.filter((item): item is { id: DashboardModuleId; enabled?: boolean } => Boolean(item && typeof item === "object" && "id" in item && defaultDashboardModules.some((module) => module.id === (item as { id?: string }).id)));
  if (!valid.length) return fallback;
  return [
    ...valid.map((item) => ({ id: item.id, enabled: item.enabled !== false })),
    ...defaultDashboardModules.filter((module) => !valid.some((item) => item.id === module.id)).map((item) => ({ id: item.id, enabled: true })),
  ];
}

/** Görünüm stüdyosu: tema, yoğunluk, hareket, imleç ve ana panel düzeni. Hesaba (ve Android'e) senkron. */
export function AppearanceStudio({ triggerClassName, showLabel = false }: { triggerClassName?: string; showLabel?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [appearanceSection, setAppearanceSection] = useState<AppearanceSection | null>("colors");
  const [skin, setSkin] = useState<DashboardSkin>("emerald");
  const [density, setDensity] = useState<DashboardDensity>("comfortable");
  const [motion, setMotion] = useState<DashboardMotion>("alive");
  const [cursor, setCursor] = useState<DashboardCursor>("orbit");
  const [syncState, setSyncState] = useState<AppearanceSyncState>("loading");
  const [modulePreferences, setModulePreferences] = useState<DashboardModulePreference[]>(defaultDashboardModules.map((item) => ({ id: item.id, enabled: true })));
  const skinReadyRef = useRef(false);
  const accountReadyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let storedSkin: string | null = null, storedDensity: string | null = null, storedMotion: string | null = null, storedCursor: string | null = null, storedModules: string | null = null;
    try {
      storedSkin = window.localStorage.getItem("sr-dashboard-skin");
      storedDensity = window.localStorage.getItem("sr-dashboard-density");
      storedMotion = window.localStorage.getItem("sr-dashboard-motion");
      storedCursor = window.localStorage.getItem("sr-dashboard-cursor");
      storedModules = window.localStorage.getItem("sr-dashboard-modules");
    } catch { /* depolama kapalı olabilir */ }
    const savedSkin = dashboardSkins.some((item) => item.id === storedSkin) ? storedSkin as DashboardSkin : "emerald";
    const savedDensity = storedDensity === "compact" ? "compact" : "comfortable";
    const savedMotion = storedMotion === "calm" ? "calm" : "alive";
    const savedCursor = dashboardCursors.some((item) => item.id === storedCursor) ? storedCursor as DashboardCursor : "orbit";
    let savedModules: DashboardModulePreference[] = defaultDashboardModules.map((item) => ({ id: item.id, enabled: true }));
    try {
      savedModules = normalizeDashboardModules(JSON.parse(storedModules ?? "[]"));
    } catch { /* Geçersiz eski tercih güvenli varsayılana döner. */ }
    document.documentElement.dataset.dashboardSkin = savedSkin;
    document.documentElement.dataset.dashboardDensity = savedDensity;
    document.documentElement.dataset.dashboardMotion = savedMotion;
    document.documentElement.dataset.dashboardCursor = savedCursor;
    skinReadyRef.current = true;
    queueMicrotask(() => {
      setSkin(savedSkin);
      setDensity(savedDensity);
      setMotion(savedMotion);
      setCursor(savedCursor);
      setModulePreferences(savedModules);
    });
  }, []);

  useEffect(() => {
    if (!user?.uid || !skinReadyRef.current) return;
    let cancelled = false;
    accountReadyRef.current = false;
    queueMicrotask(() => { if (!cancelled) setSyncState("loading"); });
    void getDashboardAppearancePreferences(user.uid).then((remote) => {
      if (cancelled) return;
      if (remote) {
        const remoteSkin = dashboardSkins.some((item) => item.id === remote.skin) ? remote.skin as DashboardSkin : skin;
        const remoteDensity = remote.density === "compact" ? "compact" : "comfortable";
        const remoteMotion = remote.motion === "calm" ? "calm" : "alive";
        const remoteCursor = dashboardCursors.some((item) => item.id === remote.cursor) ? remote.cursor as DashboardCursor : cursor;
        setSkin(remoteSkin);
        setDensity(remoteDensity);
        setMotion(remoteMotion);
        setCursor(remoteCursor);
        setModulePreferences(normalizeDashboardModules(remote.modules));
      }
      accountReadyRef.current = true;
      setSyncState("saved");
      if (!remote) setModulePreferences((items) => [...items]);
    }).catch(() => {
      if (!cancelled) {
        accountReadyRef.current = true;
        setSyncState("offline");
      }
    });
    return () => { cancelled = true; };
    // İlk hesap yüklemesi yalnızca kullanıcı değiştiğinde çalışır; güncel tercihler ayrı etkide kaydedilir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!skinReadyRef.current) return;
    document.documentElement.dataset.dashboardSkin = skin;
    document.documentElement.dataset.dashboardDensity = density;
    document.documentElement.dataset.dashboardMotion = motion;
    document.documentElement.dataset.dashboardCursor = cursor;
    try {
      window.localStorage.setItem("sr-dashboard-skin", skin);
      window.localStorage.setItem("sr-dashboard-density", density);
      window.localStorage.setItem("sr-dashboard-motion", motion);
      window.localStorage.setItem("sr-dashboard-cursor", cursor);
      window.localStorage.setItem("sr-dashboard-modules", JSON.stringify(modulePreferences));
    } catch { /* depolama kapalı olabilir */ }
    window.dispatchEvent(new Event("sr-dashboard-cursor-change"));
    window.dispatchEvent(new CustomEvent("sr-dashboard-layout-change", { detail: modulePreferences }));
    if (!accountReadyRef.current || !user?.uid) return;
    queueMicrotask(() => setSyncState("loading"));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDashboardAppearancePreferences(user.uid, { skin, density, motion, cursor, modules: modulePreferences })
        .then(() => setSyncState("saved"))
        .catch(() => setSyncState("offline"));
    }, 450);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [skin, density, motion, cursor, modulePreferences, user?.uid]);

  useEffect(() => {
    const openStudio = () => { setAppearanceSection("colors"); setOpen(true); };
    const openLayout = () => { setAppearanceSection("layout"); setOpen(true); };
    window.addEventListener("sr-dashboard-open-appearance", openStudio);
    window.addEventListener("sr-dashboard-open-layout", openLayout);
    return () => {
      window.removeEventListener("sr-dashboard-open-appearance", openStudio);
      window.removeEventListener("sr-dashboard-open-layout", openLayout);
    };
  }, []);

  function resetAppearance() {
    setSkin("emerald");
    setDensity("comfortable");
    setMotion("alive");
    setCursor("orbit");
    setModulePreferences(defaultDashboardModules.map((item) => ({ id: item.id, enabled: true })));
  }

  function moveModule(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= modulePreferences.length) return;
    setModulePreferences((items) => {
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const activeSkin = dashboardSkins.find((item) => item.id === skin);
  // Oturum yoksa tercih yalnızca bu cihazda tutulur.
  const shownSync: AppearanceSyncState = user?.uid ? syncState : "offline";
  const section = (id: AppearanceSection, icon: typeof Palette, title: string, note: string, body: React.ReactNode) => {
    const Icon = icon;
    const expanded = appearanceSection === id;
    return (
      <section className={cn(styles.accordion, expanded && styles.accordionOpen)}>
        <button type="button" className={styles.accordionTrigger} aria-expanded={expanded} onClick={() => setAppearanceSection((value) => value === id ? null : id)}>
          <i><Icon size={15} aria-hidden /></i>
          <span><b>{title}</b><small>{note}</small></span>
          <ArrowDown size={15} className={styles.accordionChevron} aria-hidden />
        </button>
        {expanded && <div className={styles.accordionBody}>{body}</div>}
      </section>
    );
  };

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)} aria-label="Panel görünümünü değiştir" title="Görünüm">
        <Palette size={18} aria-hidden />{showLabel && <span>Görünüm</span>}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        placement="side"
        title="Görünüm stüdyosu"
        description="Tercihlerin hesabına kaydedilir; web ve mobil uygulamada aynı görünürsün."
        footer={<>
          <span className={cn(styles.syncState, styles[`sync-${shownSync}`])}>
            {shownSync === "loading" ? <LoaderCircle size={13} className={styles.spin} aria-hidden /> : shownSync === "offline" ? <CloudOff size={13} aria-hidden /> : <Cloud size={13} aria-hidden />}
            {shownSync === "loading" ? "Hesaba kaydediliyor" : shownSync === "offline" ? "Yerelde saklandı" : "Hesabınla senkronize"}
          </span>
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetAppearance}>Sıfırla</Button>
        </>}
      >
        <div className={styles.skinPreview} aria-hidden="true">
          <i />
          <span><b>{activeSkin?.name}</b><small>Canlı panel önizlemesi</small></span>
          <em><i /><i /><i /></em>
        </div>
        <div className={styles.accordions}>
          {section("colors", Palette, "Renk atmosferi", `${dashboardSkins.length} paletten görünümünü seç`, (
            <div className={styles.skinGrid}>
              {dashboardSkins.map((item) => (
                <button type="button" key={item.id} onClick={() => setSkin(item.id)} className={cn(styles.skinOption, skin === item.id && styles.skinOptionActive)} aria-pressed={skin === item.id}>
                  <i>{item.colors.map((color) => <b key={color} style={{ background: color }} />)}</i>
                  <span>{item.name}<small>{item.note}</small></span>
                  {skin === item.id && <Check size={15} aria-hidden />}
                </button>
              ))}
            </div>
          ))}
          {section("behavior", Gauge, "Panel davranışı", "Yerleşim ve hareket yoğunluğu", (
            <div className={styles.behavior}>
              <div><span><Gauge size={13} aria-hidden /> Yerleşim</span><SegmentedControl stretch ariaLabel="Yerleşim yoğunluğu" value={density} onChange={setDensity} options={[{ value: "comfortable", label: "Rahat" }, { value: "compact", label: "Kompakt" }]} /></div>
              <div><span><Zap size={13} aria-hidden /> Hareket</span><SegmentedControl stretch ariaLabel="Hareket" value={motion} onChange={setMotion} options={[{ value: "alive", label: "Canlı" }, { value: "calm", label: "Sakin" }]} /></div>
            </div>
          ))}
          {section("cursor", MousePointer2, "Mouse imleci", "Normal ve 5 özel imleç", (
            <div className={styles.skinGrid}>
              {dashboardCursors.map((item) => (
                <button type="button" key={item.id} className={cn(styles.skinOption, cursor === item.id && styles.skinOptionActive)} onClick={() => setCursor(item.id)} aria-pressed={cursor === item.id}>
                  <i data-cursor-preview={item.id} className={styles.cursorPreview}><b /><em /></i>
                  <span>{item.name}<small>{item.note}</small></span>
                  {cursor === item.id && <Check size={14} aria-hidden />}
                </button>
              ))}
            </div>
          ))}
          {section("layout", LayoutPanelTop, "Ana panel düzeni", "Bugün ekranındaki modülleri sırala veya gizle", (
            <ol className={styles.moduleList}>
              {modulePreferences.map((item, index) => {
                const label = defaultDashboardModules.find((module) => module.id === item.id)?.label;
                return (
                  <li key={item.id} className={cn(!item.enabled && styles.moduleOff)}>
                    <button type="button" className={styles.moduleToggle} onClick={() => setModulePreferences((items) => items.map((entry) => entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry))} aria-label={`${label} modülünü ${item.enabled ? "gizle" : "göster"}`} aria-pressed={item.enabled}>
                      {item.enabled ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
                    </button>
                    <span>{label}</span>
                    <div>
                      <button type="button" disabled={index === 0} onClick={() => moveModule(index, -1)} aria-label={`${label} yukarı taşı`}><ArrowUp size={14} aria-hidden /></button>
                      <button type="button" disabled={index === modulePreferences.length - 1} onClick={() => moveModule(index, 1)} aria-label={`${label} aşağı taşı`}><ArrowDown size={14} aria-hidden /></button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ))}
        </div>
      </Sheet>
    </>
  );
}
