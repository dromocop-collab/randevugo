"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/layout/theme-provider";

const productLinks = [
  { href: "/ozellikler", label: "Özellikler" },
  { href: "/kesfet", label: "İşletme keşfet" },
  { href: "/fiyatlar", label: "Fiyatlar" },
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
          <button type="button" onClick={toggleTheme} className="icon-action" aria-label={theme === "light" ? "Karanlık temayı aç" : "Açık temayı aç"}>{theme === "light" ? "◐" : "◑"}</button>
          {signedIn ? <Link href="/dashboard" className="primary-action">Paneli aç <span>→</span></Link> : <><Link href="/giris" className="login-action">Giriş</Link><Link href="/kayit" className="primary-action">14 gün ücretsiz <span>→</span></Link></>}
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/" className="brand-lockup"><Image src="/logo.png" alt="" width={36} height={36} className="brand-mark" /><span>Senin<span>Randevun</span></span></Link>
          <p>Randevudan müşteri sadakatine, işletmenizin büyüme merkezi.</p>
          <div className="footer-status"><i /> Sistemler aktif · 7/24 online</div>
        </div>
        <FooterColumn title="Ürün" links={[["Özellikler", "/ozellikler"], ["Fiyatlar", "/fiyatlar"], ["Online randevu", "/online-randevu"], ["İşletme keşfet", "/kesfet"]]} />
        <FooterColumn title="Şirket" links={[["Hakkımızda", "/hakkimizda"], ["İletişim", "/iletisim"], ["Yardım merkezi", "/yardim-merkezi"], ["Güvenlik", "/guvenlik"]]} />
        <FooterColumn title="Yasal" links={[["KVKK", "/kvkk"], ["Gizlilik", "/gizlilik"], ["Kullanım koşulları", "/kullanim-kosullari"], ["Çerez politikası", "/cerez-politikasi"]]} />
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} SeninRandevun</span><span>Türkiye&apos;de işletmeler için tasarlandı 🇹🇷</span></div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return <div className="footer-column"><strong>{title}</strong>{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>;
}

export function MarketingPage({ children }: { children: ReactNode }) {
  return <div className="marketing-page"><MarketingHeader />{children}<MarketingFooter /></div>;
}
