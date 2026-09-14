"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBusinessContext } from "@/features/businesses/business-context";
import { BarChart3, Bot, CalendarDays, Check, Clipboard, Command, LayoutPanelTop, Palette, Plus, Rocket, Scissors, Search, Settings2, UsersRound, WandSparkles, X } from "lucide-react";

type PaletteCommand = {
  id: string;
  label: string;
  description: string;
  group: "Hızlı işlemler" | "Sayfalar" | "Kişiselleştirme";
  icon: ElementType;
  keywords: string;
  run: () => void | Promise<void>;
};

export function DashboardCommandCenter() {
  const router = useRouter();
  const { businesses, businessId, access } = useBusinessContext();
  const activeBusiness = businesses.find((item) => item.id === businessId) ?? businesses[0];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: PaletteCommand[] = (() => {
    const go = (href: string) => () => router.push(href);
    return [
      { id: "calendar", label: "Takvimi aç", description: "Günlük ve haftalık programı görüntüle", group: "Hızlı işlemler", icon: CalendarDays, keywords: "takvim randevu program", run: go("/dashboard/takvim") },
      { id: "assistant", label: "İşletme asistanına sor", description: "Canlı işletme verileriyle analiz başlat", group: "Hızlı işlemler", icon: Bot, keywords: "asistan yapay zeka analiz sor", run: go("/dashboard/asistan") },
      { id: "automation", label: "Yeni otomasyon oluştur", description: "Tekrarlanan operasyonları otomatikleştir", group: "Hızlı işlemler", icon: WandSparkles, keywords: "otomasyon kural bildirim akış", run: go("/dashboard/otomasyonlar?create=1") },
      { id: "new-store", label: "Yeni mağaza kur", description: "Yeni bir işletme çalışma alanı aç", group: "Hızlı işlemler", icon: Plus, keywords: "mağaza işletme ekle", run: go("/onboarding") },
      { id: "copy-store", label: "Mağaza linkini kopyala", description: activeBusiness?.slug ? `seninrandevun.com/isletme/${activeBusiness.slug}` : "Önce mağaza profilini tamamlayın", group: "Hızlı işlemler", icon: Clipboard, keywords: "link url mağaza kopyala", run: async () => {
        if (!activeBusiness?.slug) return toast.error("Mağaza bağlantısı henüz hazır değil.");
        await navigator.clipboard.writeText(`${window.location.origin}/isletme/${activeBusiness.slug}`);
        toast.success("Mağaza linki kopyalandı.");
      } },
      { id: "appointments", label: "Randevular", description: "Tüm kayıtları ve durumları yönet", group: "Sayfalar", icon: CalendarDays, keywords: "randevular müşteri rezervasyon", run: go("/dashboard/randevular") },
      { id: "customers", label: "Müşteriler", description: "Müşteri 360 profillerini görüntüle", group: "Sayfalar", icon: UsersRound, keywords: "müşteri crm kişi", run: go("/dashboard/musteriler") },
      { id: "services", label: "Hizmetler", description: "Kategori, süre ve fiyatları düzenle", group: "Sayfalar", icon: Scissors, keywords: "hizmet kategori fiyat süre", run: go("/dashboard/hizmetler") },
      { id: "growth", label: "Büyüme merkezi", description: "Gelir ve doluluk fırsatlarını incele", group: "Sayfalar", icon: Rocket, keywords: "büyüme gelir fırsat", run: go("/dashboard/buyume") },
      { id: "analytics", label: "Büyüme analitiği", description: "Performans metriklerini karşılaştır", group: "Sayfalar", icon: BarChart3, keywords: "analitik rapor performans", run: go("/dashboard/analitik") },
      { id: "settings", label: "İşletme ayarları", description: "Profil ve çalışma ayarlarını düzenle", group: "Sayfalar", icon: Settings2, keywords: "ayar profil işletme", run: go("/dashboard/ayarlar") },
      { id: "appearance", label: "Görünüm stüdyosunu aç", description: "Renk, yoğunluk ve hareketi değiştir", group: "Kişiselleştirme", icon: Palette, keywords: "tema renk görünüm atmosfer", run: () => { window.dispatchEvent(new Event("sr-dashboard-open-appearance")); } },
      { id: "layout", label: "Ana paneli düzenle", description: "Modülleri sırala veya gizle", group: "Kişiselleştirme", icon: LayoutPanelTop, keywords: "panel kart modül düzen gizle", run: () => { window.dispatchEvent(new Event("sr-dashboard-open-layout")); } },
    ];
  })();

  const filtered = (() => {
    const availableCommands = access?.role === "staff"
      ? commands.filter((item) => ["calendar", "appointments", ...(access.permissions.viewCustomers ? ["customers"] : [])].includes(item.id))
      : commands;
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    const matches = normalized ? availableCommands.filter((item) => `${item.label} ${item.description} ${item.keywords}`.toLocaleLowerCase("tr-TR").includes(normalized)) : availableCommands;
    return [...matches].sort((a, b) => Number(recent.includes(b.id)) - Number(recent.includes(a.id)));
  })();

  useEffect(() => {
    queueMicrotask(() => {
      try { setRecent(JSON.parse(window.localStorage.getItem("sr-command-recent") ?? "[]") as string[]); } catch { setRecent([]); }
    });
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("tr-TR") === "k") {
        event.preventDefault();
        setOpen((value) => {
          if (value) return false;
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

  function openPalette() {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function execute(command: PaletteCommand) {
    const next = [command.id, ...recent.filter((item) => item !== command.id)].slice(0, 5);
    setRecent(next);
    window.localStorage.setItem("sr-command-recent", JSON.stringify(next));
    setOpen(false);
    await command.run();
  }

  return <>
    <button type="button" className="command-link dashboard-command-trigger" onClick={openPalette} aria-label="Komuta merkezini aç"><Command size={17}/><span>Komut</span><kbd>⌘K</kbd></button>
    {open && typeof document !== "undefined" && createPortal(<div className="dashboard-command-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="dashboard-command-palette" role="dialog" aria-modal="true" aria-label="İşletme komuta merkezi" onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
        if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.min(value + 1, filtered.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(value - 1, 0)); }
        if (event.key === "Enter" && filtered[activeIndex]) { event.preventDefault(); void execute(filtered[activeIndex]); }
      }}>
        <header><Search size={20}/><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} placeholder="Bir sayfa, müşteri işlemi veya komut ara…"/><kbd>ESC</kbd><button type="button" onClick={() => setOpen(false)} aria-label="Kapat"><X size={17}/></button></header>
        <div className="dashboard-command-results">{filtered.length ? filtered.map((command, index) => { const Icon = command.icon; const showGroup = index === 0 || filtered[index - 1].group !== command.group; return <div key={command.id}>{showGroup && <p>{recent.includes(command.id) && !query ? "SON KULLANILANLAR · " : ""}{command.group}</p>}<button type="button" className={index === activeIndex ? "active" : ""} onMouseEnter={() => setActiveIndex(index)} onClick={() => void execute(command)}><i><Icon size={18}/></i><span><b>{command.label}</b><small>{command.description}</small></span>{index === activeIndex && <em><Check size={13}/> Enter</em>}</button></div>; }) : <div className="dashboard-command-empty"><Search size={28}/><b>Sonuç bulunamadı</b><span>Başka bir ifade veya sayfa adı deneyin.</span></div>}</div>
        <footer><span><kbd>↑</kbd><kbd>↓</kbd> gezin</span><span><kbd>↵</kbd> çalıştır</span><span>Güvenli komutlar doğrudan, kritik işlemler onayla çalışır.</span></footer>
      </section>
    </div>, document.body)}
  </>;
}
