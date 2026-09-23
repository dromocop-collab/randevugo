"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/auth-service";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useBusinessContext } from "@/features/businesses/business-context";
import { ArrowDown, ArrowUp, Check, CirclePlus, Clock3, Cloud, CloudOff, Compass, Eye, EyeOff, ExternalLink, Gauge, LayoutPanelTop, LoaderCircle, LogOut, MousePointer2, Palette, RotateCcw, Sparkles, Store, UserRound, Zap } from "lucide-react";
import { NotificationCenter } from "@/components/dashboard/notification-center";
import { DashboardCommandCenter } from "@/components/dashboard/command-center";
import { getDashboardAppearancePreferences, saveDashboardAppearancePreferences } from "@/features/users/appearance-preferences-repository";

const dashboardSkins = [
  { id: "emerald", name: "Aurora", note: "Canlı ve enerjik", colors: ["#0b6b45", "#bdf65e"] },
  { id: "midnight", name: "Gece", note: "Odaklı ve güçlü", colors: ["#172554", "#22d3ee"] },
  { id: "pearl", name: "İnci", note: "Sade ve premium", colors: ["#64748b", "#f59e0b"] },
  { id: "ocean", name: "Okyanus", note: "Ferah ve berrak", colors: ["#0891b2", "#67e8f9"] },
  { id: "violet", name: "Lavanta", note: "Yaratıcı ve seçkin", colors: ["#7c3aed", "#c4b5fd"] },
  { id: "sunset", name: "Gün Batımı", note: "Sıcak ve iddialı", colors: ["#ea580c", "#fde047"] },
  { id: "rose", name: "Gül", note: "Zarif ve modern", colors: ["#e11d48", "#fda4af"] },
  { id: "graphite", name: "Grafit", note: "Kurumsal ve net", colors: ["#334155", "#38bdf8"] },
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

const defaultDashboardModules = [
  { id: "command", label: "Komuta merkezi" },
  { id: "insights", label: "İşletme nabzı" },
  { id: "profile", label: "Profil durumu" },
  { id: "kpis", label: "Performans kartları" },
  { id: "operations", label: "Operasyon akışı" },
] as const;

type DashboardModuleId = (typeof defaultDashboardModules)[number]["id"];
type DashboardModulePreference = { id: DashboardModuleId; enabled: boolean };

export function DashboardTopBar() {
  const { user } = useAuth();
  const { businesses, businessId, setBusinessId, access } = useBusinessContext();
  const isStaff = access?.role === "staff";
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses[0];
  const router = useRouter();
  const [skinOpen, setSkinOpen] = useState(false);
  const [skin, setSkin] = useState<DashboardSkin>("emerald");
  const [density, setDensity] = useState<DashboardDensity>("comfortable");
  const [motion, setMotion] = useState<DashboardMotion>("alive");
  const [cursor, setCursor] = useState<DashboardCursor>("orbit");
  const [syncState, setSyncState] = useState<AppearanceSyncState>("loading");
  const [modulePreferences, setModulePreferences] = useState<DashboardModulePreference[]>(defaultDashboardModules.map((item) => ({ id: item.id, enabled: true })));
  const skinPanelRef = useRef<HTMLDivElement>(null);
  const skinReadyRef = useRef(false);
  const accountReadyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function normalizeModules(value: unknown): DashboardModulePreference[] {
    const fallback = defaultDashboardModules.map((item) => ({ id: item.id, enabled: true }));
    if (!Array.isArray(value)) return fallback;
    const valid = value.filter((item): item is { id: DashboardModuleId; enabled?: boolean } => Boolean(item && typeof item === "object" && "id" in item && defaultDashboardModules.some((module) => module.id === (item as { id?: string }).id)));
    if (!valid.length) return fallback;
    return [
      ...valid.map((item) => ({ id: item.id, enabled: item.enabled !== false })),
      ...defaultDashboardModules.filter((module) => !valid.some((item) => item.id === module.id)).map((item) => ({ id: item.id, enabled: true })),
    ];
  }

  useEffect(() => {
    const storedSkin = window.localStorage.getItem("sr-dashboard-skin");
    const savedSkin = dashboardSkins.some((item) => item.id === storedSkin) ? storedSkin as DashboardSkin : "emerald";
    const savedDensity = window.localStorage.getItem("sr-dashboard-density") === "compact" ? "compact" : "comfortable";
    const savedMotion = window.localStorage.getItem("sr-dashboard-motion") === "calm" ? "calm" : "alive";
    const storedCursor = window.localStorage.getItem("sr-dashboard-cursor");
    const savedCursor = dashboardCursors.some((item) => item.id === storedCursor) ? storedCursor as DashboardCursor : "orbit";
    const storedModules = window.localStorage.getItem("sr-dashboard-modules");
    let savedModules: DashboardModulePreference[] = defaultDashboardModules.map((item) => ({ id: item.id, enabled: true }));
    try {
      savedModules = normalizeModules(JSON.parse(storedModules ?? "[]"));
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
    setSyncState("loading");
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
        setModulePreferences(normalizeModules(remote.modules));
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
    window.localStorage.setItem("sr-dashboard-skin", skin);
    window.localStorage.setItem("sr-dashboard-density", density);
    window.localStorage.setItem("sr-dashboard-motion", motion);
    window.localStorage.setItem("sr-dashboard-cursor", cursor);
    window.localStorage.setItem("sr-dashboard-modules", JSON.stringify(modulePreferences));
    window.dispatchEvent(new Event("sr-dashboard-cursor-change"));
    window.dispatchEvent(new CustomEvent("sr-dashboard-layout-change", { detail: modulePreferences }));
    if (!accountReadyRef.current || !user?.uid) return;
    setSyncState("loading");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDashboardAppearancePreferences(user.uid, { skin, density, motion, cursor, modules: modulePreferences })
        .then(() => setSyncState("saved"))
        .catch(() => setSyncState("offline"));
    }, 450);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [skin, density, motion, cursor, modulePreferences, user?.uid]);

  useEffect(() => {
    const openStudio = () => setSkinOpen(true);
    window.addEventListener("sr-dashboard-open-appearance", openStudio);
    window.addEventListener("sr-dashboard-open-layout", openStudio);
    return () => {
      window.removeEventListener("sr-dashboard-open-appearance", openStudio);
      window.removeEventListener("sr-dashboard-open-layout", openStudio);
    };
  }, []);

  useEffect(() => {
    if (!skinOpen) return;
    const close = (event: MouseEvent) => {
      if (!skinPanelRef.current?.contains(event.target as Node)) setSkinOpen(false);
    };
    const closeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSkinOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeWithKeyboard);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeWithKeyboard);
    };
  }, [skinOpen]);

  function chooseSkin(value: DashboardSkin) {
    setSkin(value);
  }

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

  return (
    <header className="dashboard-topbar dashboard-command-bar">
      <div className="dashboard-command-inner">
        <div className="dashboard-command-copy">
          <p><span /> {isStaff ? "ÇALIŞAN ÇALIŞMA ALANI" : "İŞLETME OS"} <i>CANLI</i></p>
          <h1>{isStaff ? "Kişisel randevu merkeziniz hazır." : "Operasyon merkeziniz hazır."}</h1>
        </div>
        <div className="dashboard-command-actions">
          {businesses.length > 1 && (
            <select
              value={activeBusiness?.id ?? ""}
              onChange={(e) => setBusinessId(e.target.value)}
              className="command-business-select h-8 max-w-[150px] truncate rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs font-medium text-[var(--text-1)] outline-none hover:bg-[var(--surface-3)] focus:border-[var(--accent)]"
              aria-label="İşletme değiştir"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.status === "pending_review" ? " · Onay bekliyor" : b.status === "rejected" ? " · Reddedildi" : ""}
                </option>
              ))}
            </select>
          )}
          {!isStaff && businesses.length < 10 && <Link href="/dashboard/subeler" className="command-link command-new-store"><CirclePlus size={17} /><span>Yeni şube</span></Link>}
          {activeBusiness?.status === "pending_review" && <span className="command-link command-pending text-amber-700"><Clock3 size={16} /><span>Süper admin onayı bekleniyor</span></span>}
          {!isStaff && <NotificationCenter key={businessId} businessId={businessId}/>}
          <DashboardCommandCenter />
          <div className="dashboard-skin-picker" ref={skinPanelRef}>
            <button type="button" className="command-link dashboard-skin-trigger" onClick={() => setSkinOpen((value) => !value)} aria-expanded={skinOpen} aria-label="Panel görünümünü değiştir"><Palette size={17}/><span>Görünüm</span></button>
            <div className={`dashboard-skin-menu ${skinOpen ? "open" : ""}`} role="dialog" aria-label="Panel görünümü ayarları">
              <header><span><Sparkles size={14}/> Görünüm stüdyosu</span><small>Tercihlerin hesabına kaydedilir ve giriş yaptığın tüm cihazlarda uygulanır.</small></header>
              <div className="dashboard-skin-preview" aria-hidden="true"><i/><span><b>{dashboardSkins.find((item) => item.id === skin)?.name}</b><small>Canlı panel önizlemesi</small></span><em><i/><i/><i/></em></div>
              <section className="dashboard-skin-section"><div className="dashboard-skin-section-title"><Palette size={13}/><span>Renk atmosferi</span><small>{dashboardSkins.length} palet</small></div><div className="dashboard-skin-grid">{dashboardSkins.map((item) => <button type="button" key={item.id} onClick={() => chooseSkin(item.id)} className={skin === item.id ? "active" : ""} aria-pressed={skin === item.id}><i>{item.colors.map((color) => <b key={color} style={{background:color}}/>)}</i><span>{item.name}<small>{item.note}</small></span>{skin === item.id && <Check size={15}/>}</button>)}</div></section>
              <section className="dashboard-skin-controls"><div><span><Gauge size={13}/> Yerleşim</span><div className="dashboard-segmented"><button type="button" className={density === "comfortable" ? "active" : ""} onClick={() => setDensity("comfortable")}>Rahat</button><button type="button" className={density === "compact" ? "active" : ""} onClick={() => setDensity("compact")}>Kompakt</button></div></div><div><span><Zap size={13}/> Hareket</span><div className="dashboard-segmented"><button type="button" className={motion === "alive" ? "active" : ""} onClick={() => setMotion("alive")}>Canlı</button><button type="button" className={motion === "calm" ? "active" : ""} onClick={() => setMotion("calm")}>Sakin</button></div></div></section>
              <section className="dashboard-cursor-section"><div className="dashboard-skin-section-title"><MousePointer2 size={13}/><span>Mouse imleci</span><small>Normal + 5 özel</small></div><div className="dashboard-cursor-grid">{dashboardCursors.map((item) => <button type="button" key={item.id} className={cursor === item.id ? "active" : ""} onClick={() => setCursor(item.id)} aria-pressed={cursor === item.id}><i data-cursor-preview={item.id}><b/><em/></i><span>{item.name}<small>{item.note}</small></span>{cursor === item.id && <Check size={14}/>}</button>)}</div></section>
              <section className="dashboard-module-editor"><div className="dashboard-skin-section-title"><LayoutPanelTop size={13}/><span>Ana panel düzeni</span><small>Sırala veya gizle</small></div><div>{modulePreferences.map((item, index) => <article key={item.id}><button type="button" onClick={() => setModulePreferences((items) => items.map((entry) => entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry))} aria-label={`${defaultDashboardModules.find((module) => module.id === item.id)?.label} modülünü ${item.enabled ? "gizle" : "göster"}`}>{item.enabled ? <Eye size={14}/> : <EyeOff size={14}/>}</button><span>{defaultDashboardModules.find((module) => module.id === item.id)?.label}</span><div><button type="button" disabled={index === 0} onClick={() => moveModule(index, -1)} aria-label="Yukarı taşı"><ArrowUp size={13}/></button><button type="button" disabled={index === modulePreferences.length - 1} onClick={() => moveModule(index, 1)} aria-label="Aşağı taşı"><ArrowDown size={13}/></button></div></article>)}</div></section>
              <footer><span className={`appearance-sync ${syncState}`}>{syncState === "loading" ? <LoaderCircle size={13}/> : syncState === "offline" ? <CloudOff size={13}/> : <Cloud size={13}/>} {syncState === "loading" ? "Hesaba kaydediliyor" : syncState === "offline" ? "Yerelde saklandı" : "Hesabınla senkronize"}</span><button type="button" onClick={resetAppearance}><RotateCcw size={13}/> Sıfırla</button></footer>
            </div>
          </div>
          <Link href="/kesfet" className="command-link command-link-discover"><Compass size={17} /><span>Keşfet</span></Link>
          {activeBusiness?.slug && <Link href={`/isletme/${activeBusiness.slug}`} className="command-link command-link-store"><Store size={17} /><span>Mağazamı gör</span><ExternalLink size={14} /></Link>}
          <Link href="/hesabim" className="command-account" title="Müşteri hesabına geç"><i><UserRound size={15} /></i><span><small>MÜŞTERİ MODU</small><b>{user?.email ?? ""}</b></span></Link>
          <Button
            variant="ghost"
            className="command-logout"
            onClick={async () => {
              await logout();
              router.push("/isletmeler/giris");
            }}
          >
            <LogOut size={16} /><span>Çıkış</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
