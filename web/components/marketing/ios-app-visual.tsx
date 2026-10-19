import Image from "next/image";
import { BadgeCheck, BellRing, CalendarCheck2, ChevronRight, Heart, MapPin, Search, Star } from "lucide-react";
import { getT } from "@/i18n/server";

export async function IosAppVisual({ compact = false }: { compact?: boolean }) {
  const t = await getT();
  return <div className={`ios-app-visual ${compact ? "compact" : ""}`} aria-label={t("SeninRandevun iOS uygulaması önizlemesi")}>
    <div className="ios-device-glow"/>
    <div className="ios-device">
      <div className="ios-device-island"/><div className="ios-status"><b>9:41</b><span>● ● ▰</span></div>
      <div className="ios-screen-head"><div><Image src="/icon-192.png" alt="" width={38} height={38}/><span><small>{t("HOŞ GELDİN")}</small><b>SeninRandevun</b></span></div><button aria-label={t("Bildirimler")}><BellRing size={17}/><i/></button></div>
      <section className="ios-discover-card"><small>{t("SANA ÖZEL KEŞİF")}</small><h3>{t("İyi hissettiren")}<br/>{t("hizmeti keşfet.")}</h3><div><Search size={14}/><span>{t("Hizmet veya işletme ara…")}</span></div></section>
      <div className="ios-mini-categories"><span>💇<small>{t("Kuaför")}</small></span><span>💈<small>{t("Berber")}</small></span><span>✨<small>{t("Bakım")}</small></span><span>•••<small>{t("Tümü")}</small></span></div>
      <section className="ios-appointment"><header><span>{t("YAKLAŞAN RANDEVU")}</span><b>{t("Bugün")}</b></header><article><div className="ios-app-date"><b>15:30</b><small>{t("{minutes} dk", { minutes: 45 })}</small></div><div><b>{t("Cilt bakım randevusu")}</b><span><MapPin size={10}/> {t("Fethiye · 1,8 km")}</span></div><ChevronRight size={15}/></article></section>
      <nav className="ios-tabbar"><span className="active"><Search size={16}/><small>{t("Keşfet")}</small></span><span><CalendarCheck2 size={16}/><small>{t("Randevular")}</small></span><span><Heart size={16}/><small>{t("Favoriler")}</small></span></nav>
    </div>
    <div className="ios-float-card ios-float-rating"><Star size={15} fill="currentColor"/><span><b>{t("4.9 puan")}</b><small>{t("Gerçek yorumlar")}</small></span></div>
    <div className="ios-float-card ios-float-approved"><BadgeCheck size={17}/><span><b>{t("App Store'da")}</b><small>{t("Onaylandı · Yayında")}</small></span></div>
  </div>;
}

