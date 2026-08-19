"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, LayoutDashboard, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { href: "/isletmeler", label: "İşletmeler için" },
  { href: "/ozellikler", label: "Özellikler" },
  { href: "/fiyatlar", label: "Fiyatlar" },
  { href: "/isletmeler/yardim", label: "Yardım Merkezi" },
];

export function BusinessHeader() {
  const { user, status } = useAuth();
  const signedIn = status === "authenticated" && Boolean(user);
  return <header className="business-header"><div className="business-nav">
    <Link href="/isletmeler" className="business-brand"><Image src="/logo.png" alt="SeninRandevun" width={38} height={38} priority /><span>Senin<b>Randevun</b><small>İŞLETME</small></span></Link>
    <nav aria-label="İşletme menüsü">{links.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
    <div className="business-nav-actions"><Link href="/" className="business-customer-link">Müşteri sitesine dön</Link>{signedIn ? <Link href="/dashboard" className="business-nav-primary"><LayoutDashboard size={17} /> Paneli aç</Link> : <><Link href="/isletmeler/giris" className="business-login"><LogIn size={16} /> İşletme girişi</Link><Link href="/isletmeler/kayit" className="business-nav-primary"><span>14 gün ücretsiz</span><ArrowUpRight size={17} /></Link></>}</div>
  </div></header>;
}

export function BusinessFooter() {
  return <footer className="business-footer"><div><Link href="/isletmeler" className="business-brand"><Image src="/logo.png" alt="" width={36} height={36} /><span>Senin<b>Randevun</b><small>İŞLETME</small></span></Link><p>Randevudan müşteri sadakatine, işletmenizin büyüme merkezi.</p></div><div><strong>ÜRÜN</strong><Link href="/ozellikler">Özellikler</Link><Link href="/fiyatlar">Fiyatlar</Link><Link href="/isletmeler/kayit">Ücretsiz deneme</Link></div><div><strong>İŞLETMENİZ</strong><Link href="/isletmeler/giris">İşletme girişi</Link><Link href="/dashboard">Yönetim paneli</Link><Link href="/isletmeler/yardim">İşletme yardımı</Link></div><div><strong>MÜŞTERİLER</strong><Link href="/">Mağaza ara</Link><Link href="/kesfet">Keşfet</Link><Link href="/yardim-merkezi">Müşteri yardımı</Link></div><div className="business-footer-bottom"><span>© {new Date().getFullYear()} SeninRandevun</span><span>KVKK odaklı · Güvenli bulut altyapısı</span></div></footer>;
}

export function BusinessPage({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`business-marketing ${className}`}><BusinessHeader />{children}<BusinessFooter /></div>; }
