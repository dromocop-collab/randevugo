"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/layout/theme-provider";
import { ArrowRight, ArrowUpRight, BadgeCheck, CalendarCheck2, LogIn, Mail, MoonStar, ShieldCheck, Sparkles, SunMedium } from "lucide-react";

const productLinks = [
  { href: "/kesfet", label: "Mağazaları keşfet" },
  { href: "/#kategoriler", label: "Kategoriler" },
  { href: "/hesabim", label: "Randevularım" },
  { href: "/yardim-merkezi", label: "Yardım" },
];

export function MarketingHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, status } = useAuth();
  const signedIn = status === "authenticated" && Boolean(user);

  return (
    <header className="marketing-header">
      <div className="marketing-nav">
        <Link href="/" className="brand-lockup" aria-label="SeninRandevun ana sayfa">
          <Image src="/logo.png" alt="" width={38} height={38} className="brand-mark" priority />
          <span>Senin<span>Randevun</span></span>
        </Link>
        <nav className="marketing-links" aria-label="Ana menü">
          {productLinks.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="marketing-actions">
          <button type="button" onClick={toggleTheme} className="icon-action" aria-label={theme === "light" ? "Karanlık temayı aç" : "Açık temayı aç"}>{theme === "light" ? <MoonStar size={17} /> : <SunMedium size={17} />}</button>
          {signedIn ? <Link href="/hesabim" className="primary-action customer-account-action">Hesabım <ArrowUpRight size={15} /></Link> : <><Link href="/musteri/giris" className="login-action"><LogIn size={14} /> Giriş</Link><Link href="/isletmeler" className="primary-action">İşletmeler için <ArrowUpRight size={15} /></Link></>}
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="footer-glow footer-glow-one" /><div className="footer-glow footer-glow-two" />
      <section className="footer-conversion">
        <div><span><Sparkles size={14} /> RANDEVUNU KOLAYLAŞTIR</span><h2>İyi hizmetlere,<br /><em>tam zamanında.</em></h2></div>
        <div><p>Yakınındaki güvenilir işletmeleri keşfet. Gerçek müsaitliği gör, sana uyan saati seç ve planını saniyeler içinde tamamla.</p><Link href="/kesfet">Mağazaları keşfet <ArrowRight size={17} /></Link></div>
      </section>
      <div className="footer-proof-row"><span><BadgeCheck size={15} /> Doğrulanmış işletmeler</span><span><CalendarCheck2 size={15} /> 7/24 online randevu</span><span><ShieldCheck size={15} /> Güvenli deneyim</span></div>
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/" className="brand-lockup"><Image src="/logo.png" alt="" width={36} height={36} className="brand-mark" /><span>Senin<span>Randevun</span></span></Link>
          <p>Yakınındaki iyi hizmetleri keşfet, sana uygun saati seç ve randevunu anında al.</p>
          <div className="footer-status"><i /> Sistemler aktif · 7/24 online</div>
          <a href="mailto:info@seninrandevun.com" className="footer-email"><Mail size={14} /> info@seninrandevun.com</a>
        </div>
        <FooterColumn title="Keşfet" links={[["Tüm mağazalar", "/kesfet"], ["Kuaförler", "/kuafor-randevu"], ["Berberler", "/berber-randevu"], ["Güzellik merkezleri", "/guzellik-merkezi-randevu"], ["Online randevu", "/online-randevu"]]} />
        <FooterColumn title="İşletmeler" links={[["İşletmeler için", "/isletmeler"], ["Özellikler", "/ozellikler"], ["Fiyatlar", "/fiyatlar"], ["Ücretsiz kayıt", "/isletmeler/kayit"], ["İşletme yardımı", "/isletmeler/yardim"]]} />
        <FooterColumn title="SeninRandevun" links={[["Hakkımızda", "/hakkimizda"], ["İletişim", "/iletisim"], ["Müşteri yardımı", "/yardim-merkezi"], ["Güvenlik", "/guvenlik"]]} />
        <FooterColumn title="Yasal" links={[["KVKK", "/kvkk"], ["Gizlilik", "/gizlilik"], ["Kullanım koşulları", "/kullanim-kosullari"], ["Çerez politikası", "/cerez-politikasi"]]} />
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} SeninRandevun · Tüm hakları saklıdır.</span><a className="footer-dromocob" href="https://dromocob.tr" target="_blank" rel="noopener noreferrer" aria-label="DROMOCOB web sitesini ziyaret et"><i>D</i><span><small>TASARIM &amp; TEKNOLOJİ</small><strong>DROMOCOB</strong></span><ArrowUpRight size={15} /></a></div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return <div className="footer-column"><strong>{title}</strong>{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>;
}

export function MarketingPage({ children }: { children: ReactNode }) {
  return <div className="marketing-page"><MarketingHeader />{children}<MarketingFooter /></div>;
}
