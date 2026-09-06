import Image from "next/image";
import { BadgeCheck, BellRing, CalendarCheck2, ChevronRight, Heart, MapPin, Search, Star } from "lucide-react";

export function IosAppVisual({ compact = false }: { compact?: boolean }) {
  return <div className={`ios-app-visual ${compact ? "compact" : ""}`} aria-label="SeninRandevun iOS uygulaması önizlemesi">
    <div className="ios-device-glow"/>
    <div className="ios-device">
      <div className="ios-device-island"/><div className="ios-status"><b>9:41</b><span>● ● ▰</span></div>
      <div className="ios-screen-head"><div><Image src="/icon-192.png" alt="" width={38} height={38}/><span><small>HOŞ GELDİN</small><b>SeninRandevun</b></span></div><button aria-label="Bildirimler"><BellRing size={17}/><i/></button></div>
      <section className="ios-discover-card"><small>SANA ÖZEL KEŞİF</small><h3>İyi hissettiren<br/>hizmeti keşfet.</h3><div><Search size={14}/><span>Hizmet veya işletme ara…</span></div></section>
      <div className="ios-mini-categories"><span>💇<small>Kuaför</small></span><span>💈<small>Berber</small></span><span>✨<small>Bakım</small></span><span>•••<small>Tümü</small></span></div>
      <section className="ios-appointment"><header><span>YAKLAŞAN RANDEVU</span><b>Bugün</b></header><article><div className="ios-app-date"><b>15:30</b><small>45 dk</small></div><div><b>Cilt bakım randevusu</b><span><MapPin size={10}/> Fethiye · 1,8 km</span></div><ChevronRight size={15}/></article></section>
      <nav className="ios-tabbar"><span className="active"><Search size={16}/><small>Keşfet</small></span><span><CalendarCheck2 size={16}/><small>Randevular</small></span><span><Heart size={16}/><small>Favoriler</small></span></nav>
    </div>
    <div className="ios-float-card ios-float-rating"><Star size={15} fill="currentColor"/><span><b>4.9 puan</b><small>Gerçek yorumlar</small></span></div>
    <div className="ios-float-card ios-float-approved"><BadgeCheck size={17}/><span><b>App Store&apos;da</b><small>Onaylandı · Yayında</small></span></div>
  </div>;
}

