"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, BellRing, Check, Cloud, CloudOff, Gauge, LayoutPanelTop, LoaderCircle, MousePointer2, Palette, Play, RotateCcw, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardAppearancePreferences, saveDashboardAppearancePreferences } from "@/features/users/appearance-preferences-repository";
import { Button, SegmentedControl, Sheet, Switch } from "@/components/dashboard/ui";
import { ModuleOrderEditor } from "@/components/dashboard/module-order-editor";
import { playNotificationChime, setSoundPreference, unlockNotificationAudio } from "@/features/push/notification-sound";
import { NotificationSoundGrid, SoundVolumeSlider, useSoundPreference } from "@/features/push/notification-sound-picker";
import { getSoundPreset } from "@/features/push/notification-sound-presets";
import { useDashboardDesign } from "@/features/dashboard-design/dashboard-design-context";
import { resolveHomeModules, resolveSkin } from "@/features/dashboard-design/design-domain";
import { cn } from "@/lib/utils/cn";
import type { ModuleSize } from "@/features/dashboard-layout/layout-domain";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import styles from "./topbar.module.css";

/* Android uygulamasıyla senkron temalar (users/{uid}/preferences/dashboardAppearance.skin).
   Renk değişkenleri globals.css :root[data-dashboard-skin] altında. */
export const dashboardSkins = [
  { id: "emerald", name: tk("Aurora"), note: tk("Canlı ve enerjik"), colors: ["#061d15", "#0b6b45", "#39c98b", "#bdf65e"] },
  { id: "midnight", name: tk("Gece"), note: tk("Odaklı ve güçlü"), colors: ["#07152f", "#2563eb", "#22d3ee"] },
  { id: "pearl", name: tk("İnci"), note: tk("Sade ve premium"), colors: ["#18202b", "#64748b", "#f5b942", "#fffdf8"] },
  { id: "ocean", name: tk("Okyanus"), note: tk("Ferah ve berrak"), colors: ["#083344", "#0891b2", "#67e8f9"] },
  { id: "violet", name: tk("Lavanta"), note: tk("Yaratıcı ve seçkin"), colors: ["#2e1065", "#7c3aed", "#9f7aea", "#c4b5fd"] },
  { id: "sunset", name: tk("Gün Batımı"), note: tk("Sıcak ve iddialı"), colors: ["#431407", "#ea580c", "#fde047"] },
  { id: "rose", name: tk("Gül"), note: tk("Zarif ve modern"), colors: ["#4c0519", "#be123c", "#e11d48", "#fda4af"] },
  { id: "graphite", name: tk("Grafit"), note: tk("Kurumsal ve net"), colors: ["#0f172a", "#334155", "#38bdf8"] },
  { id: "champagne", name: tk("Şampanya"), note: tk("Sıcak ve sofistike"), colors: ["#422006", "#a16207", "#f5b942", "#fde68a"] },
  { id: "forest", name: tk("Orman"), note: tk("Doğal ve prestijli"), colors: ["#052e16", "#166534", "#86efac"] },
  { id: "ruby", name: tk("Yakut"), note: tk("Güçlü ve seçkin"), colors: ["#4c0519", "#9f1239", "#e11d48", "#fbbf24"] },
  { id: "indigo", name: tk("İndigo"), note: tk("Teknolojik ve sakin"), colors: ["#1e1b4b", "#4338ca", "#a5b4fc"] },
] as const;

type DashboardSkin = (typeof dashboardSkins)[number]["id"];
type DashboardDensity = "comfortable" | "compact";
type DashboardMotion = "alive" | "calm";

const dashboardCursors = [
  { id: "normal", name: tk("Normal"), note: tk("Klasik sistem imleci") },
  { id: "orbit", name: tk("Yörünge"), note: tk("Marka halkası") },
  { id: "aurora", name: tk("Aurora"), note: tk("Turkuaz parıltı") },
  { id: "neon", name: tk("Neon"), note: tk("Canlı ve enerjik") },
  { id: "pearl", name: tk("İnci"), note: tk("Sade ve premium") },
  { id: "comet", name: tk("Kuyruklu yıldız"), note: tk("Hareketli ışık izi") },
] as const;

type DashboardCursor = (typeof dashboardCursors)[number]["id"];
type AppearanceSyncState = "loading" | "saved" | "offline";
type AppearanceSection = "colors" | "behavior" | "cursor" | "sound" | "layout";

/** Ana panel (Bugün) modülleri; sırası/görünürlüğü burada düzenlenir, app/dashboard/page.tsx uygular. */
export const defaultDashboardModules = [
  { id: "operations", label: tk("Bugünün akışı"), size: "wide", note: tk("Geniş sütun") },
  { id: "command", label: tk("Hızlı işlemler"), size: "side", note: tk("Yan sütun") },
  { id: "insights", label: tk("Uyarılar ve fırsatlar"), size: "side", note: tk("Yan sütun") },
  { id: "kpis", label: tk("Günün performansı"), size: "full", note: tk("Tam genişlik") },
  { id: "profile", label: tk("Kurulum rehberi"), size: "full", note: tk("Tam genişlik") },
] as const;

export function dashboardModuleSize(id: string): ModuleSize {
  return defaultDashboardModules.find((item) => item.id === id)?.size ?? "side";
}

export type DashboardModuleId = (typeof defaultDashboardModules)[number]["id"];
export type DashboardModulePreference = { id: DashboardModuleId; enabled: boolean };

/** Kullanıcı varsayılan düzeni değiştirdi mi? (eski kayıtlarda "seçti" işareti yok; varsayılandan farkına bakılır.) */
export function modulesCustomized(value: DashboardModulePreference[]): boolean {
  return value.length !== defaultDashboardModules.length || value.some((item, index) => item.id !== defaultDashboardModules[index]?.id || !item.enabled);
}

/** Etkin (tasarım uygulanmış) ana panel düzeni — app/dashboard/page.tsx ilk boyamada bunu okur. */
export const EFFECTIVE_MODULES_KEY = "sr-dashboard-modules-effective";

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
  const t = useT();
  const { user } = useAuth();
  const { design } = useDashboardDesign();
  const [open, setOpen] = useState(false);
  // Kullanıcı bilinçli seçim yaptı mı? Yapmadıysa süper adminin varsayılanı uygulanır (Panel Tasarımı › Görünüm).
  const [skinPicked, setSkinPicked] = useState(false);
  const [modulesPicked, setModulesPicked] = useState(false);
  // Cihazdaki tercih okunmadan tasarım uygulanmasın (ilk karede yanlış tema yanıp sönmesin).
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [appearanceSection, setAppearanceSection] = useState<AppearanceSection | null>("colors");
  const [skin, setSkin] = useState<DashboardSkin>("emerald");
  const [density, setDensity] = useState<DashboardDensity>("comfortable");
  const [motion, setMotion] = useState<DashboardMotion>("alive");
  const [cursor, setCursor] = useState<DashboardCursor>("orbit");
  const [syncState, setSyncState] = useState<AppearanceSyncState>("loading");
  const soundPreference = useSoundPreference();
  const [modulePreferences, setModulePreferences] = useState<DashboardModulePreference[]>(defaultDashboardModules.map((item) => ({ id: item.id, enabled: true })));
  const skinReadyRef = useRef(false);
  const accountReadyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let storedSkin: string | null = null, storedDensity: string | null = null, storedMotion: string | null = null, storedCursor: string | null = null, storedModules: string | null = null;
    let storedSkinPicked: string | null = null, storedModulesPicked: string | null = null;
    try {
      storedSkinPicked = window.localStorage.getItem("sr-dashboard-skin-picked");
      storedModulesPicked = window.localStorage.getItem("sr-dashboard-modules-picked");
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
      // Eski kayıt: varsayılan dışı tema/düzen bilinçli seçimdir.
      setSkinPicked(storedSkinPicked ? storedSkinPicked === "1" : Boolean(storedSkin && storedSkin !== "emerald"));
      setModulesPicked(storedModulesPicked ? storedModulesPicked === "1" : Boolean(storedModules && modulesCustomized(savedModules)));
      setPrefsLoaded(true);
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
        const remoteModules = normalizeDashboardModules(remote.modules);
        setModulePreferences(remoteModules);
        setSkinPicked(typeof remote.skinPicked === "boolean" ? remote.skinPicked : Boolean(remote.skin && remote.skin !== "emerald"));
        setModulesPicked(typeof remote.modulesPicked === "boolean" ? remote.modulesPicked : Boolean(remote.modules && modulesCustomized(remoteModules)));
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

  const effectiveSkin = resolveSkin(skinPicked ? skin : null, design, skin) as DashboardSkin;
  const effectiveModules = resolveHomeModules(modulesPicked ? modulePreferences : null, design, normalizeDashboardModules);
  const effectiveModulesKey = JSON.stringify(effectiveModules);

  // Tasarım (tema/düzen) her değiştiğinde uygula; kullanıcının kendi tercihi ayrı saklanır.
  useEffect(() => {
    if (!prefsLoaded) return;
    document.documentElement.dataset.dashboardSkin = effectiveSkin;
    try {
      window.localStorage.setItem("sr-dashboard-skin-effective", effectiveSkin);
      window.localStorage.setItem(EFFECTIVE_MODULES_KEY, effectiveModulesKey);
    } catch { /* depolama kapalı olabilir */ }
    window.dispatchEvent(new CustomEvent("sr-dashboard-layout-change", { detail: JSON.parse(effectiveModulesKey) }));
  }, [effectiveSkin, effectiveModulesKey, prefsLoaded]);

  useEffect(() => {
    if (!skinReadyRef.current) return;
    document.documentElement.dataset.dashboardDensity = density;
    document.documentElement.dataset.dashboardMotion = motion;
    document.documentElement.dataset.dashboardCursor = cursor;
    try {
      window.localStorage.setItem("sr-dashboard-skin", skin);
      window.localStorage.setItem("sr-dashboard-density", density);
      window.localStorage.setItem("sr-dashboard-motion", motion);
      window.localStorage.setItem("sr-dashboard-cursor", cursor);
      window.localStorage.setItem("sr-dashboard-modules", JSON.stringify(modulePreferences));
      window.localStorage.setItem("sr-dashboard-skin-picked", skinPicked ? "1" : "0");
      window.localStorage.setItem("sr-dashboard-modules-picked", modulesPicked ? "1" : "0");
    } catch { /* depolama kapalı olabilir */ }
    window.dispatchEvent(new Event("sr-dashboard-cursor-change"));
    if (!accountReadyRef.current || !user?.uid) return;
    queueMicrotask(() => setSyncState("loading"));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDashboardAppearancePreferences(user.uid, { skin, density, motion, cursor, modules: modulePreferences, skinPicked, modulesPicked })
        .then(() => setSyncState("saved"))
        .catch(() => setSyncState("offline"));
    }, 450);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [skin, density, motion, cursor, modulePreferences, skinPicked, modulesPicked, user?.uid]);

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
    setSkinPicked(false);
    setModulesPicked(false);
  }

  const activeSkin = dashboardSkins.find((item) => item.id === effectiveSkin);
  const skinChoices = design.appearance.allowedSkins ? dashboardSkins.filter((item) => design.appearance.allowedSkins?.includes(item.id)) : dashboardSkins;
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
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)} aria-label={t("Panel görünümünü değiştir")} title={t("Görünüm")}>
        <Palette size={18} aria-hidden />{showLabel && <span>{t("Görünüm")}</span>}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        placement="side"
        title={t("Görünüm stüdyosu")}
        description={t("Tercihlerin hesabına kaydedilir; web ve mobil uygulamada aynı görünürsün.")}
        footer={<>
          <span className={cn(styles.syncState, styles[`sync-${shownSync}`])}>
            {shownSync === "loading" ? <LoaderCircle size={13} className={styles.spin} aria-hidden /> : shownSync === "offline" ? <CloudOff size={13} aria-hidden /> : <Cloud size={13} aria-hidden />}
            {shownSync === "loading" ? t("Hesaba kaydediliyor") : shownSync === "offline" ? t("Yerelde saklandı") : t("Hesabınla senkronize")}
          </span>
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetAppearance}>{t("Sıfırla")}</Button>
        </>}
      >
        <div className={styles.skinPreview} aria-hidden="true">
          <i />
          <span><b>{activeSkin ? t(activeSkin.name) : null}</b><small>{t("Canlı panel önizlemesi")}</small></span>
          <em><i /><i /><i /></em>
        </div>
        <div className={styles.accordions}>
          {section("colors", Palette, t("Renk atmosferi"), design.appearance.forceSkin ? t("Platform tarafından belirlendi") : t("{count} paletten görünümünü seç", { count: skinChoices.length }), design.appearance.forceSkin ? (
            <p className={styles.soundNote}>{t("Panel teması tüm işletmeler için platform tarafından belirlendi; şu an değiştirilemez.")}</p>
          ) : (
            <div className={styles.skinGrid}>
              {skinChoices.map((item) => (
                <button type="button" key={item.id} onClick={() => { setSkin(item.id); setSkinPicked(true); }} className={cn(styles.skinOption, effectiveSkin === item.id && styles.skinOptionActive)} aria-pressed={effectiveSkin === item.id}>
                  <i>{item.colors.map((color) => <b key={color} style={{ background: color }} />)}</i>
                  <span>{t(item.name)}<small>{t(item.note)}</small></span>
                  {effectiveSkin === item.id && <Check size={15} aria-hidden />}
                </button>
              ))}
            </div>
          ))}
          {section("behavior", Gauge, t("Panel davranışı"), t("Yerleşim ve hareket yoğunluğu"), (
            <div className={styles.behavior}>
              <div><span><Gauge size={13} aria-hidden /> {t("Yerleşim")}</span><SegmentedControl stretch ariaLabel={t("Yerleşim yoğunluğu")} value={density} onChange={setDensity} options={[{ value: "comfortable", label: t("Rahat") }, { value: "compact", label: t("Kompakt") }]} /></div>
              <div><span><Zap size={13} aria-hidden /> {t("Hareket")}</span><SegmentedControl stretch ariaLabel={t("Hareket")} value={motion} onChange={setMotion} options={[{ value: "alive", label: t("Canlı") }, { value: "calm", label: t("Sakin") }]} /></div>
            </div>
          ))}
          {section("cursor", MousePointer2, t("Mouse imleci"), t("Normal ve 5 özel imleç"), (
            <div className={styles.skinGrid}>
              {dashboardCursors.map((item) => (
                <button type="button" key={item.id} className={cn(styles.skinOption, cursor === item.id && styles.skinOptionActive)} onClick={() => setCursor(item.id)} aria-pressed={cursor === item.id}>
                  <i data-cursor-preview={item.id} className={styles.cursorPreview}><b /><em /></i>
                  <span>{t(item.name)}<small>{t(item.note)}</small></span>
                  {cursor === item.id && <Check size={14} aria-hidden />}
                </button>
              ))}
            </div>
          ))}
          {section("sound", BellRing, t("Bildirim sesi"), soundPreference.muted ? t("Kapalı · yalnız görsel bildirim") : t("{sound} · %{volume}", { sound: t(getSoundPreset(soundPreference.soundId).name), volume: Math.round(soundPreference.volume * 100) }), (
            <div className={styles.soundBody}>
              <div className={styles.soundTop}>
                <Switch checked={soundPreference.muted} onChange={(muted) => setSoundPreference({ muted })} label={t("Sesi kapat")} description={t("Kapalıyken bildirim yine görünür, yalnız ses çalmaz.")} />
                <Button size="sm" variant="primary" icon={Play} disabled={soundPreference.muted || soundPreference.volume === 0} onClick={() => { unlockNotificationAudio(); playNotificationChime({ force: true }); }}>{t("Test et")}</Button>
              </div>
              <SoundVolumeSlider preference={soundPreference} compact />
              <NotificationSoundGrid preference={soundPreference} />
              <p className={styles.soundNote}>{t("Yeni randevu geldiğinde panelde çalar; seçim hesabına kaydedilir. Telefon uygulaması bildirimleri telefonun kendi sesini kullanır.")}</p>
            </div>
          ))}
          {section("layout", LayoutPanelTop, t("Ana panel düzeni"), design.home.locked ? t("Platform tarafından belirlendi") : t("Bugün ekranındaki modülleri sırala veya gizle"), design.home.locked ? (
            <p className={styles.soundNote}>{t("Ana panel düzeni tüm işletmeler için platform tarafından belirlendi; şu an değiştirilemez.")}</p>
          ) : (
            <ModuleOrderEditor modules={effectiveModules} meta={defaultDashboardModules} onChange={(next) => { setModulePreferences(normalizeDashboardModules(next)); setModulesPicked(true); }} />
          ))}
        </div>
      </Sheet>
    </>
  );
}
