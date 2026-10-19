"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { useBusinessContext } from "@/features/businesses/business-context";
import { useSubscriptionPlan } from "@/features/subscriptions/subscription-plan-context";
import { useLiveOperationsAvailable } from "@/features/live-queue/use-live-operations-available";
import { DASHBOARD_ROUTE_ENTITLEMENTS } from "@/constants/subscription-entitlements";
import { openQuickAppointment } from "@/components/dashboard/dashboard-events";
import { dashTokensClassName } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import {
  Activity, BarChart3, BellRing, Bot, CalendarDays, CalendarPlus, Clipboard, Clock3, CornerDownLeft, CreditCard, Headphones, House,
  LayoutPanelTop, ListChecks, Palette, Plus, ReceiptText, Scissors, Search, Settings2, Share2, Star, UserPlus, UsersRound, WandSparkles, X,
} from "lucide-react";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import styles from "./command-center.module.css";

type PaletteCommand = {
  id: string;
  label: string;
  description: string;
  group: "Hızlı işlemler" | "Sayfalar" | "Kişiselleştirme"; // i18n-ignore (anahtar; gösterirken t())
  icon: ElementType;
  keywords: string;
  /** Sayfa komutlarında paket/yetki filtrelemesi bu rotaya göre yapılır. */
  href?: string;
  run: () => void | Promise<void>;
};

const STAFF_BASE = ["/dashboard/takvim", "/dashboard/randevular", "/dashboard/destek"];

export function DashboardCommandCenter() {
  const t = useT();
  const router = useRouter();
  const { businesses, businessId, access } = useBusinessContext();
  const { can } = useSubscriptionPlan();
  const showLiveOperations = useLiveOperationsAvailable();
  const activeBusiness = businesses.find((item) => item.id === businessId) ?? businesses[0];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const go = (href: string) => () => router.push(href);
  const commands: PaletteCommand[] = [
    { id: "new-appointment", label: tk("Yeni randevu oluştur"), description: tk("Tarih ve saat seçerek hızlı kayıt aç"), group: tk("Hızlı işlemler"), icon: CalendarPlus, keywords: tk("randevu ekle yeni kayıt rezervasyon"), href: "/dashboard/takvim", run: () => openQuickAppointment() },
    { id: "new-customer", label: tk("Müşteri ekle"), description: tk("Yeni müşteri kaydı oluştur"), group: tk("Hızlı işlemler"), icon: UserPlus, keywords: tk("müşteri ekle yeni kişi crm"), href: "/dashboard/musteriler", run: go("/dashboard/musteriler?new=1") },
    { id: "live-queue", label: tk("Sıradaki müşteriyi çağır"), description: tk("Canlı sıra ekranını aç"), group: tk("Hızlı işlemler"), icon: Activity, keywords: tk("sıra çağır canlı kuyruk bekleyen"), href: "/dashboard/canli-operasyon", run: go("/dashboard/canli-operasyon") },
    { id: "assistant", label: tk("İşletme asistanına sor"), description: tk("Canlı işletme verileriyle analiz başlat"), group: tk("Hızlı işlemler"), icon: Bot, keywords: tk("asistan yapay zeka analiz sor rovi"), href: "/dashboard/asistan", run: go("/dashboard/asistan") },
    { id: "automation", label: tk("Yeni otomasyon oluştur"), description: tk("Tekrarlanan operasyonları otomatikleştir"), group: tk("Hızlı işlemler"), icon: WandSparkles, keywords: tk("otomasyon kural bildirim akış"), href: "/dashboard/otomasyonlar", run: go("/dashboard/otomasyonlar?create=1") },
    { id: "new-store", label: tk("Yeni şube kur"), description: tk("Firma ağına yeni bir şube ekle"), group: tk("Hızlı işlemler"), icon: Plus, keywords: tk("şube mağaza işletme ekle"), href: "/dashboard/subeler", run: go("/dashboard/subeler") },
    { id: "copy-store", label: tk("Mağaza linkini kopyala"), description: activeBusiness?.slug ? `seninrandevun.com/isletme/${activeBusiness.slug}` : tk("Önce mağaza profilini tamamlayın"), group: tk("Hızlı işlemler"), icon: Clipboard, keywords: tk("link url mağaza kopyala paylaş"), run: async () => {
      if (!activeBusiness?.slug) { toast.error(t("Mağaza bağlantısı henüz hazır değil.")); return; }
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/isletme/${activeBusiness.slug}`);
        toast.success(t("Mağaza linki kopyalandı."));
      } catch { toast.error(t("Bağlantı kopyalanamadı.")); }
    } },
    { id: "instagram-share", label: tk("Instagram için görsel"), description: tk("Hikâye/gönderi görseli: hizmetler, fiyatlar ve QR kod"), group: tk("Hızlı işlemler"), icon: Share2, keywords: tk("instagram hikaye story gönderi paylaş görsel qr reklam"), run: () => {
      if (!activeBusiness?.slug) { toast.error(t("Mağaza bağlantısı henüz hazır değil.")); return; }
      router.push(`/isletme/${encodeURIComponent(activeBusiness.slug)}?paylas=instagram`);
    } },
    { id: "home", label: tk("Bugün"), description: tk("Günün özeti ve sıradaki randevular"), group: tk("Sayfalar"), icon: House, keywords: tk("ana sayfa genel bakış özet bugün"), href: "/dashboard", run: go("/dashboard") },
    { id: "calendar", label: tk("Takvim"), description: tk("Günlük ve haftalık programı görüntüle"), group: tk("Sayfalar"), icon: CalendarDays, keywords: tk("takvim randevu program gün hafta"), href: "/dashboard/takvim", run: go("/dashboard/takvim") },
    { id: "appointments", label: tk("Randevular"), description: tk("Tüm kayıtları ve durumları yönet"), group: tk("Sayfalar"), icon: ListChecks, keywords: tk("randevular müşteri rezervasyon liste onay"), href: "/dashboard/randevular", run: go("/dashboard/randevular") },
    { id: "pending", label: tk("Onay bekleyen randevular"), description: tk("Bekleyen kayıtları tek tek onaylayın"), group: tk("Sayfalar"), icon: Clock3, keywords: tk("bekleyen onay pending"), href: "/dashboard/randevular", run: go("/dashboard/randevular?status=pending") },
    { id: "operations", label: tk("Kasa ve operasyon"), description: tk("Adisyon, stok, paket, finans ve sadakati yönet"), group: tk("Sayfalar"), icon: ReceiptText, keywords: tk("kasa adisyon stok ürün paket finans gelir gider sadakat"), href: "/dashboard/operasyon", run: go("/dashboard/operasyon") },
    { id: "customers", label: tk("Müşteriler"), description: tk("Müşteri 360 profillerini görüntüle"), group: tk("Sayfalar"), icon: UsersRound, keywords: tk("müşteri crm kişi"), href: "/dashboard/musteriler", run: go("/dashboard/musteriler") },
    { id: "waitlist", label: tk("Bekleme listesi"), description: tk("Boşalan saatler için bekleyen müşteriler"), group: tk("Sayfalar"), icon: BellRing, keywords: tk("bekleme liste waitlist"), href: "/dashboard/bekleme-listesi", run: go("/dashboard/bekleme-listesi") },
    { id: "services", label: tk("Hizmetler"), description: tk("Kategori, süre ve fiyatları düzenle"), group: tk("Sayfalar"), icon: Scissors, keywords: tk("hizmet kategori fiyat süre"), href: "/dashboard/hizmetler", run: go("/dashboard/hizmetler") },
    { id: "staff", label: tk("Çalışanlar"), description: tk("Ekip ve uzmanlıkları yönet"), group: tk("Sayfalar"), icon: UsersRound, keywords: tk("çalışan personel ekip"), href: "/dashboard/calisanlar", run: go("/dashboard/calisanlar") },
    { id: "hours", label: tk("Çalışma saatleri"), description: tk("Açık günler, molalar ve özel günler"), group: tk("Sayfalar"), icon: Clock3, keywords: tk("saat mesai mola tatil"), href: "/dashboard/calisma-saatleri", run: go("/dashboard/calisma-saatleri") },
    { id: "analytics", label: tk("Analiz & Büyüme"), description: tk("Gelir, performans ve büyüme fırsatları"), group: tk("Sayfalar"), icon: BarChart3, keywords: tk("analiz büyüme gelir fırsat rapor performans"), href: "/dashboard/analitik", run: go("/dashboard/analitik") },
    { id: "reviews", label: tk("Yorumlar"), description: tk("Müşteri değerlendirmelerini yönet"), group: tk("Sayfalar"), icon: Star, keywords: tk("yorum puan değerlendirme"), href: "/dashboard/yorumlar", run: go("/dashboard/yorumlar") },
    { id: "subscription", label: tk("Abonelik"), description: tk("Paketinizi ve ödemeleri yönetin"), group: tk("Sayfalar"), icon: CreditCard, keywords: tk("abonelik paket ödeme fatura"), href: "/dashboard/abonelik", run: go("/dashboard/abonelik") },
    { id: "support", label: tk("Destek"), description: tk("Ekibimize yazın"), group: tk("Sayfalar"), icon: Headphones, keywords: tk("destek yardım talep"), href: "/dashboard/destek", run: go("/dashboard/destek") },
    { id: "settings", label: tk("İşletme ayarları"), description: tk("Profil ve çalışma ayarlarını düzenle"), group: tk("Sayfalar"), icon: Settings2, keywords: tk("ayar profil işletme logo"), href: "/dashboard/ayarlar", run: go("/dashboard/ayarlar") },
    { id: "appearance", label: tk("Görünüm stüdyosunu aç"), description: tk("Renk, yoğunluk ve hareketi değiştir"), group: tk("Kişiselleştirme"), icon: Palette, keywords: tk("tema renk görünüm atmosfer koyu"), run: () => { window.dispatchEvent(new Event("sr-dashboard-open-appearance")); } },
    { id: "layout", label: tk("Ana paneli düzenle"), description: tk("Bugün ekranındaki modülleri sırala veya gizle"), group: tk("Kişiselleştirme"), icon: LayoutPanelTop, keywords: tk("panel kart modül düzen gizle"), run: () => { window.dispatchEvent(new Event("sr-dashboard-open-layout")); } },
  ];

  const filtered = (() => {
    const isStaff = access?.role === "staff";
    const canOps = !isStaff || !!(access?.permissions.manageCheckout || access?.permissions.manageCatalog || access?.permissions.managePackages || access?.permissions.manageFinance);
    const staffAllowed = new Set([...STAFF_BASE, ...(access?.permissions.viewCustomers ? ["/dashboard/musteriler"] : []), ...(canOps ? ["/dashboard/operasyon"] : [])]);
    const available = commands.filter((item) => {
      if (item.href === "/dashboard/canli-operasyon" && !showLiveOperations) return false;
      if (item.href === "/dashboard/operasyon" && !canOps) return false;
      if (item.id === "new-customer" && isStaff) return false;
      const entitlement = item.href ? DASHBOARD_ROUTE_ENTITLEMENTS[item.href] : undefined;
      if (entitlement && !can(entitlement)) return false;
      if (isStaff) return item.href ? staffAllowed.has(item.href) : item.group === "Kişiselleştirme"; // i18n-ignore
      return true;
    });
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    // Arama hem Türkçe anahtar kelimelerle hem de etkin dildeki metinlerle eşleşir.
    const haystack = (item: PaletteCommand) => `${item.label} ${t(item.label)} ${item.description} ${t(item.description)} ${item.keywords} ${t(item.keywords)}`;
    const matches = normalized ? available.filter((item) => haystack(item).toLocaleLowerCase("tr-TR").includes(normalized)) : available;
    return [...matches].sort((a, b) => Number(recent.includes(b.id)) - Number(recent.includes(a.id)));
  })();

  function openPalette() {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closePalette() {
    setOpen(false);
    requestAnimationFrame(() => returnFocusRef.current?.focus?.({ preventScroll: true }));
  }

  useEffect(() => {
    queueMicrotask(() => {
      try { setRecent(JSON.parse(window.localStorage.getItem("sr-command-recent") ?? "[]") as string[]); } catch { setRecent([]); }
    });
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("tr-TR") === "k") {
        event.preventDefault();
        setOpen((value) => {
          if (value) return false;
          returnFocusRef.current = document.activeElement as HTMLElement | null;
          queueMicrotask(() => {
            setQuery("");
            setActiveIndex(0);
            requestAnimationFrame(() => inputRef.current?.focus());
          });
          return true;
        });
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const syncViewport = () => {
      document.documentElement.style.setProperty("--command-vh", `${window.visualViewport?.height ?? window.innerHeight}px`);
      document.documentElement.style.setProperty("--command-top", `${window.visualViewport?.offsetTop ?? 0}px`);
    };
    document.body.style.overflow = "hidden";
    syncViewport();
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.removeProperty("--command-vh");
      document.documentElement.style.removeProperty("--command-top");
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  async function execute(command: PaletteCommand) {
    const next = [command.id, ...recent.filter((item) => item !== command.id)].slice(0, 5);
    setRecent(next);
    try { window.localStorage.setItem("sr-command-recent", JSON.stringify(next)); } catch { /* yok say */ }
    setOpen(false);
    await command.run();
  }

  const activeId = filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined;

  return <>
    <button type="button" className={styles.trigger} onClick={openPalette} aria-label={t("Ara veya komut çalıştır (⌘K)")}>
      <Search size={17} aria-hidden />
      <span className={styles.triggerText}>{t("Ara veya komut çalıştır…")}</span>
      <kbd className={styles.triggerKbd}>⌘K</kbd>
    </button>
    {open && typeof document !== "undefined" && createPortal(
      <div className={cn(dashTokensClassName, styles.overlay)} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePalette(); }}>
        <section
          ref={dialogRef}
          className={styles.palette}
          role="dialog"
          aria-modal="true"
          aria-label={t("İşletme komuta merkezi")}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.preventDefault(); closePalette(); }
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.min(value + 1, filtered.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(value - 1, 0)); }
            if (event.key === "Enter" && filtered[activeIndex]) { event.preventDefault(); void execute(filtered[activeIndex]); }
            if (event.key === "Tab") {
              // Odak diyalog içinde kalır: arama kutusu ↔ kapat düğmesi.
              const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("input, header button") ?? []);
              if (focusables.length) {
                event.preventDefault();
                const index = focusables.indexOf(document.activeElement as HTMLElement);
                focusables[(index + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length].focus();
              }
            }
          }}
        >
          <header className={styles.head}>
            <Search size={19} aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
              placeholder={t("Sayfa, işlem veya komut ara…")}
              role="combobox"
              aria-expanded="true"
              aria-controls="dashboard-command-list"
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              enterKeyHint="go"
            />
            <kbd className={styles.esc}>ESC</kbd>
            <button type="button" className={styles.close} onClick={closePalette} aria-label={t("Kapat")}><X size={17} /></button>
          </header>
          <div className={styles.results} ref={listRef} id="dashboard-command-list" role="listbox" aria-label={t("Komutlar")}>
            {filtered.length ? filtered.map((command, index) => {
              const Icon = command.icon;
              const showGroup = index === 0 || filtered[index - 1].group !== command.group || (recent.includes(filtered[index - 1].id) && !recent.includes(command.id) && !query);
              const isRecent = recent.includes(command.id) && !query;
              return (
                <div key={command.id} role="presentation">
                  {showGroup && <p className={styles.group}>{isRecent ? t("Son kullanılanlar") : t(command.group)}</p>}
                  <button
                    id={`cmd-${command.id}`}
                    data-index={index}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    tabIndex={-1}
                    className={cn(styles.item, index === activeIndex && styles.itemActive)}
                    onMouseMove={() => { if (activeIndex !== index) setActiveIndex(index); }}
                    onClick={() => void execute(command)}
                  >
                    <i className={styles.itemIcon}><Icon size={18} aria-hidden /></i>
                    <span className={styles.itemText}><b>{t(command.label)}</b><small>{t(command.description)}</small></span>
                    {index === activeIndex && <em className={styles.itemEnter}><CornerDownLeft size={13} aria-hidden /></em>}
                  </button>
                </div>
              );
            }) : (
              <div className={styles.empty}><Search size={26} aria-hidden /><b>{t("Sonuç bulunamadı")}</b><span>{t("Başka bir ifade veya sayfa adı deneyin.")}</span></div>
            )}
          </div>
          <footer className={styles.foot}><span><kbd>↑</kbd><kbd>↓</kbd> {t("gezin")}</span><span><kbd>↵</kbd> {t("çalıştır")}</span><span><kbd>⌘K</kbd> {t("aç/kapat")}</span></footer>
        </section>
      </div>,
      document.body,
    )}
  </>;
}
