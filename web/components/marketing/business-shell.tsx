"use client";

import Image from "next/image";
import Link from "@/i18n/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LaunchCampaign } from "@/components/marketing/launch-campaign";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";

const links = [
  { href: "/isletmeler", label: tk("İşletmeler için") },
  { href: "/ozellikler", label: tk("Özellikler") },
  { href: "/fiyatlar", label: tk("Fiyatlar") },
  { href: "/isletmeler/yardim", label: tk("Yardım Merkezi") },
];

export function BusinessHeader() {
  const t = useT();
  const { user, status } = useAuth();
  const signedIn = status === "authenticated" && Boolean(user);
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="business-header"><div className="business-nav">
    <Link href="/isletmeler" className="business-brand"><Image src="/logo.png" alt="SeninRandevun" width={38} height={38} priority /><span>Senin<b>Randevun</b><small>{t("İŞLETME")}</small></span></Link>
    <nav aria-label={t("İşletme menüsü")}>{links.map(item => <Link key={item.href} href={item.href}>{t(item.label)}</Link>)}</nav>
    <div className="business-nav-actions"><Link href="/" className="business-customer-link">{t("Müşteri sitesine dön")}</Link>{signedIn ? <Link href="/dashboard" className="business-nav-primary"><LayoutDashboard size={17} /> {t("Paneli aç")}</Link> : <><Link href="/isletmeler/giris" className="business-login"><LogIn size={16} /> {t("İşletme girişi")}</Link><Link href="/isletmeler/kayit" className="business-nav-primary"><span>{t("İlk ay ücretsiz")}</span><ArrowUpRight size={17} /></Link></>}</div>
    <button type="button" className="business-menu-trigger" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? t("Menüyü kapat") : t("Menüyü aç")}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button>
  </div><div className={`business-mobile-menu ${menuOpen ? "open" : ""}`}>{links.map(item => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{t(item.label)}<ArrowRight size={15}/></Link>)}<Link href="/" onClick={() => setMenuOpen(false)}>{t("Müşteri sitesine dön")}<ArrowRight size={15}/></Link>{!signedIn && <Link href="/isletmeler/giris" onClick={() => setMenuOpen(false)}>{t("İşletme girişi")}<LogIn size={15}/></Link>}</div></header>;
}

export function BusinessFooter() {
  const t = useT();
  return <footer className="business-footer"><div><Link href="/isletmeler" className="business-brand"><Image src="/logo.png" alt="" width={36} height={36} /><span>Senin<b>Randevun</b><small>{t("İŞLETME")}</small></span></Link><p>{t("Randevudan tahsilata, işletmenizin yönetim merkezi.")}</p></div><div><strong>{t("ÜRÜN")}</strong><Link href="/ozellikler">{t("Özellikler")}</Link><Link href="/fiyatlar">{t("Fiyatlar")}</Link><Link href="/isletmeler/kayit">{t("İlk ay ücretsiz")}</Link></div><div><strong>{t("İŞLETMENİZ")}</strong><Link href="/isletmeler/giris">{t("İşletme girişi")}</Link><Link href="/dashboard">{t("Yönetim paneli")}</Link><Link href="/isletmeler/yardim">{t("İşletme yardımı")}</Link></div><div><strong>{t("MÜŞTERİLER")}</strong><Link href="/">{t("Mağaza ara")}</Link><Link href="/kesfet">{t("Keşfet")}</Link><Link href="/yardim-merkezi">{t("Müşteri yardımı")}</Link></div><div className="business-footer-bottom"><span>© {new Date().getFullYear()} SeninRandevun</span><span>{t("KVKK odaklı · Güvenli bulut altyapısı")}</span></div></footer>;
}

export function BusinessPage({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`business-marketing ${className}`}><LaunchCampaign showTicker /><BusinessHeader />{children}<BusinessFooter /></div>; }
