"use client";

import Link from "@/i18n/link";
import Image from "next/image";
import { ReactNode, useEffect, useState, type CSSProperties } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import { BarChart3, BellRing, CalendarCheck2, Check, Clock3, Compass, Heart, LockKeyhole, MapPin, MessageCircleMore, ShieldCheck, Smartphone, Sparkles, Star, Store, TrendingUp, UsersRound, Zap, type LucideIcon } from "lucide-react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  variant?: "business" | "customer";
}

const TRUST_ITEMS = [
  { icon: LockKeyhole, label: "256-bit SSL", desc: tk("Bankacılık düzeyinde şifreleme") },
  { icon: ShieldCheck, label: tk("Tenant İzolasyonu"), desc: tk("Her işletme izole ortamda") },
  { icon: Zap, label: tk("%99.99 Uptime"), desc: tk("Firebase altyapı garantisi") },
  { icon: Smartphone, label: tk("7/24 Erişim"), desc: tk("Tüm cihazlardan erişin") },
];

const PRODUCT_SCENES = [
  { label: tk("Canlı takvim"), value: tk("%84 doluluk"), tone: "mint", icon: CalendarCheck2 },
  { label: tk("Akıllı büyüme"), value: tk("+%27 bu ay"), tone: "lime", icon: TrendingUp },
  { label: tk("Müşteri bağı"), value: tk("4.9 memnuniyet"), tone: "violet", icon: Heart },
] as const;

const WEEK_DAYS = [tk("Pzt"), tk("Sal"), tk("Çar"), tk("Per"), tk("Cum")];

function ProductShowcase() {
  const t = useT();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % PRODUCT_SCENES.length), 4200);
    return () => window.clearInterval(timer);
  }, []);

  const scene = PRODUCT_SCENES[active];
  const SceneIcon = scene.icon;

  return (
    <div className={`auth-product-showcase tone-${scene.tone}`}>
      <div className="auth-product-topline">
        <span><i /> {"SENINRANDEVUN LIVE"}</span>
        <small>{t("Şimdi güncellendi")}</small>
      </div>
      <div className="auth-product-canvas">
        <div className="auth-mini-sidebar" aria-hidden="true">
          <span className="active"><CalendarCheck2 size={13} /></span><span><UsersRound size={13} /></span><span><BarChart3 size={13} /></span>
        </div>
        <div className="auth-scene-copy" key={scene.label}>
          <span className="auth-scene-icon"><SceneIcon size={18} /></span>
          <small>{t(scene.label)}</small>
          <strong>{t(scene.value)}</strong>
          <p>{t("Tüm operasyonunuz tek ekranda, gerçek zamanlı.")}</p>
        </div>
        <div className="auth-scene-visual" key={`${scene.label}-visual`} aria-hidden="true">
          {active === 0 && <div className="auth-calendar-demo"><div>{WEEK_DAYS.map((day) => <small key={day}>{t(day)}</small>)}</div><div>{[1,2,3,4,5,6,7,8,9,10].map((item) => <i key={item} className={item === 3 || item === 7 ? "busy" : item === 9 ? "focus" : ""} />)}</div></div>}
          {active === 1 && <div className="auth-chart-demo"><b>+27%</b><div>{[38,52,46,72,62,88,96].map((height,index) => <i key={height + index} style={{ "--bar-height": `${height}%`, "--bar-delay": `${index * 70}ms` } as CSSProperties} />)}</div></div>}
          {active === 2 && <div className="auth-customer-demo"><span><UsersRound size={18} /></span><span><Star size={14} fill="currentColor" /> 4.9</span><div><i /><i /><i /></div><small>{t("+128 sadık müşteri")}</small></div>}
        </div>
        <div className="auth-floating-note"><MessageCircleMore size={14} /><span><b>{t("Yeni randevu")}</b><small>{t("Bugün · {time}", { time: "14:30" })}</small></span><Check size={12} /></div>
      </div>
      <div className="auth-product-tabs" role="tablist" aria-label={t("Ürün özellikleri")}>
        {PRODUCT_SCENES.map((item, index) => <button key={item.label} type="button" role="tab" aria-selected={active === index} onClick={() => setActive(index)}><i /><span>{t(item.label)}</span></button>)}
      </div>
    </div>
  );
}

function CustomerShowcase() {
  const t = useT();
  return (
    <div className="auth-customer-showcase" aria-label={t("Kişisel randevu merkezi önizlemesi")}>
      <div className="auth-customer-showcase__top">
        <span><Sparkles size={13}/> {t("KİŞİSEL RANDEVU MERKEZİN")}</span>
        <small><i/> {t("Planların hazır")}</small>
      </div>
      <div className="auth-customer-showcase__body">
        <article className="auth-customer-next">
          <div><span><CalendarCheck2 size={19}/></span><p><small>{t("SIRADAKİ RANDEVUN")}</small><strong>{t("Yarın · {time}", { time: "14:30" })}</strong></p></div>
          <h3>{t("Bakım günün yaklaşıyor.")}</h3>
          <p>{t("Detaylarını görüntüle, yol tarifini aç veya tek dokunuşla işletmeye ulaş.")}</p>
          <footer><span><MapPin size={13}/> {t("Sana yakın")}</span><b>{t("Hazır")} <Check size={12}/></b></footer>
        </article>
        <div className="auth-customer-quick">
          <article><span><Heart size={17}/></span><p><strong>{t("Favorilerin")}</strong><small>{t("Sevdiğin işletmeler")}</small></p><b>8</b></article>
          <article><span><BellRing size={17}/></span><p><strong>{t("Hatırlatmalar")}</strong><small>{t("Hiçbir planı kaçırma")}</small></p><b>2</b></article>
          <article><span><Compass size={17}/></span><p><strong>{t("Yeni yerler")}</strong><small>{t("Sana uygun seçenekler")}</small></p><b><Store size={14}/></b></article>
        </div>
      </div>
    </div>
  );
}

export function AuthShell({ eyebrow, title, subtitle, children, variant = "business" }: AuthShellProps) {
  const t = useT();
  const { user, status } = useAuth();
  const customer = variant === "customer";
  const trustItems = customer ? [
    { icon: Sparkles, label: t("Ücretsiz Hesap"), desc: t("Müşteriler için daima ücretsiz") },
    { icon: Heart, label: t("Favori Mağazalar"), desc: t("Sevdiğiniz yerler tek listede") },
    { icon: Clock3, label: t("Randevu Geçmişi"), desc: t("Geçmiş ve yaklaşan planlarınız") },
    { icon: CalendarCheck2, label: t("Hızlı Randevu"), desc: t("Saniyeler içinde yerinizi ayırın") },
  ] : TRUST_ITEMS.map((item) => ({ ...item, label: t(item.label), desc: t(item.desc) }));
  return (
    <main className={`auth-v2 auth-v2--${variant} relative mx-auto grid min-h-screen w-full max-w-[1500px] items-center gap-8 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8`}>
      {status === "authenticated" && user && <Link href={customer ? "/hesabim" : "/dashboard"} className="auth-session-pill"><span>✓</span><div><b>{t("Oturumunuz açık")}</b><small>{customer ? t("Hesabıma devam et →") : t("Panele devam et →")}</small></div></Link>}
      {/* Left — Branding Panel */}
      <section className="auth-story order-2 relative overflow-hidden rounded-[2.25rem] border border-[var(--border)] p-8 shadow-2xl backdrop-blur-xl lg:order-1 lg:p-12">
        {/* Glow orbs */}
        <div className="absolute -top-20 right-10 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute right-20 top-1/2 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />

        <div className="relative">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Image src="/logo.png" alt="SeninRandevun" width={40} height={40} className="rounded-xl shadow-lg transition group-hover:scale-105" />
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-1)]">
              Senin<span className="text-[var(--accent)]">Randevun</span>
            </span>
          </Link>

          {/* Badge */}
          <div className="mt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              {eyebrow}
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-[-.055em] text-[var(--text-1)] lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--text-2)]">
            {subtitle}
          </p>

          {customer ? <CustomerShowcase /> : <ProductShowcase />}

          {/* Trust Grid */}
          <div className="auth-trust-grid mt-10 grid grid-cols-2 gap-3">
            {trustItems.map((item) => {
              const Icon = item.icon as LucideIcon;
              return (
              <div
                key={item.label}
                className="group auth-trust-item rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-3.5 backdrop-blur transition hover:border-[var(--accent)]/30 hover:shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="auth-trust-icon"><Icon size={18} strokeWidth={1.9} /></span>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-1)]">{item.label}</p>
                    <p className="text-[10px] text-[var(--text-3)]">{item.desc}</p>
                  </div>
                </div>
              </div>
            )})}
          </div>

          <div className="auth-capability-strip mt-6">
            {(customer ? [["81", t("şehirde keşif")], ["7/24", t("randevu erişimi")], [t("Tek"), t("kişisel merkez")]] : [[t("30 gün"), t("tüm özellikler")], ["7/24", t("online randevu")], [t("Tek"), t("bağlı operasyon")]]).map(([value,label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
          </div>
        </div>
      </section>

      {/* Right — Form */}
      <section id="kayit-formu" className="auth-form-stage order-1 w-full max-w-xl scroll-mt-6 justify-self-center lg:order-2"><div className="auth-form-stage__head mb-6"><span>{t("GÜVENLİ HESAP ERİŞİMİ")}</span><h2>{customer ? t("Randevularınıza kaldığınız yerden devam edin.") : t("İşletmenize kaldığınız yerden devam edin.")}</h2><p>{customer ? t("Planlarınız ve favorileriniz sizi bekliyor.") : t("Canlı operasyon merkezinize tek adımda bağlanın.")}</p></div>{children}</section>
    </main>
  );
}
