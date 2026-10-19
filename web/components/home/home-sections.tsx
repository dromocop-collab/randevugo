import Link from "@/i18n/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, BellRing, Building2, CalendarCheck2, CalendarClock, Check, HeartHandshake, LockKeyhole, MapPin, MousePointerClick, Search, ShieldCheck, Smartphone, Sparkles, Star } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { AppStoreButtons } from "@/components/marketing/app-store-button";
import { PLAY_STORE_AVAILABLE } from "@/lib/app-store";
import type { Business } from "@/types/business";
import { FeaturedBusinessCard } from "./featured-business-card";
import { tk } from "@/i18n/config";
import { getIntlLocale, getT } from "@/i18n/server";
import styles from "./home.module.css";

/* ─────────────── Hero ─────────────── */

export async function HomeHeroIntro() {
  const t = await getT();
  return <>
    <span className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" /> {t("Şehrindeki iyi hizmetleri keşfet")}</span>
    <h1 id="home-title" className={styles.title}>{t("Aradığın hizmet,")}<br /><em>{t("sana uygun zamanda.")}</em></h1>
    <p className={styles.lead}>{t("Yakınındaki güvenilir işletmeleri keşfet, hizmetleri ve uygun saatleri karşılaştır, randevunu saniyeler içinde al. Müşteriler için tamamen ücretsiz.")}</p>
  </>;
}

export async function HomeHeroArt() {
  const t = await getT();
  return <div className={styles.art}>
    <div className={styles.photo}>
      <Image src="/images/home-hero-studio-v2.jpg" alt={t("Tablet üzerinden müşterisine uygun randevu saatini gösteren bakım uzmanı")} fill preload sizes="(max-width: 1040px) calc(100vw - 32px), 560px" />
      <span className={styles.photoShade} aria-hidden="true" />
    </div>
    <div className={`${styles.floatCard} ${styles.floatTop}`} aria-hidden="true">
      <span className={styles.floatIcon}><Check size={15} /></span>
      <span><b>{t("Randevun onaylandı")}</b><small>{t("Bugün · 15:30 · Cilt bakımı")}</small></span>
    </div>
    <div className={`${styles.floatCard} ${styles.floatSlots}`} aria-hidden="true">
      <small>{t("MÜSAİT SAATLER")}</small>
      <span className={styles.slotRow}><i>14:00</i><i className={styles.slotOn}>15:30</i><i>16:15</i></span>
    </div>
    <div className={styles.rovi}>
      <RoviMascot size={74} mood="wave" alt={t("Rovi, SeninRandevun rehberi")} />
      <p><b>{t("Merhaba, ben Rovi!")}</b> {t("Sana uygun saati birlikte bulalım.")}</p>
    </div>
  </div>;
}

/* ─────────────── Nasıl çalışır ─────────────── */

const STEPS = [
  { no: "01", icon: Search, title: tk("Ara ve keşfet"), text: tk("Hizmet, kategori veya şehirle sana uygun işletmeyi bul; profilleri ve yorumları karşılaştır.") },
  { no: "02", icon: CalendarClock, title: tk("Saatini seç"), text: tk("İşletmenin gerçek müsaitliği üzerinden programına uyan saati ve uzmanı seç.") },
  { no: "03", icon: CalendarCheck2, title: tk("Randevun hazır"), text: tk("Bilgilerini onayla; randevun oluşsun, hatırlatma zamanında gelsin.") },
];

export async function HomeHowItWorks() {
  const t = await getT();
  return <section className={styles.section} aria-labelledby="home-how-title">
    <div className={styles.wrap}>
      <div className={styles.sectionHead} data-reveal="">
        <div><span className={styles.kicker}>{t("3 KOLAY ADIM")}</span><h2 id="home-how-title">{t("Telefon trafiği yok.")}<br />{t("Sadece birkaç dokunuş.")}</h2></div>
        <div className={styles.headActions}><Link href="/online-randevu" className={styles.textLink}>{t("Online randevu nasıl çalışır?")} <ArrowRight size={15} /></Link></div>
      </div>
      <ol className={styles.steps}>
        {STEPS.map(({ no, icon: Icon, title, text }, index) => <li key={no} className={styles.step} data-reveal="" style={{ "--i": index } as CSSProperties}>
          <div className={styles.stepTop}><span className={styles.stepIcon}><Icon size={21} aria-hidden="true" /></span><span className={styles.stepNo}>{no}</span></div>
          <h3>{t(title)}</h3>
          <p>{t(text)}</p>
          <div className={styles.stepDemo} aria-hidden="true">
            {index === 0 && <span className={styles.demoSearch}><Search size={13} /> {t("Kuaför · Fethiye")}<i /></span>}
            {index === 1 && <span className={styles.demoSlots}><i>10:30</i><i className={styles.slotOn}>11:15</i><i>13:00</i><i>14:45</i></span>}
            {index === 2 && <span className={styles.demoDone}><Check size={14} /> {t("Onaylandı")}<small><BellRing size={12} /> {t("1 saat önce hatırlatma")}</small></span>}
          </div>
        </li>)}
      </ol>
    </div>
  </section>;
}

/* ─────────────── Güven ─────────────── */

const TRUST_BADGES = [
  { icon: HeartHandshake, title: tk("Müşteriler için ücretsiz"), text: tk("Keşfetmek ve online randevu almak her zaman ücretsiz.") },
  { icon: BellRing, title: tk("Zamanında hatırlatma"), text: tk("Randevundan önce bildirim ve hatırlatmalarla haberdar ol.") },
  { icon: MousePointerClick, title: tk("Kolay değişiklik"), text: tk("İşletmenin kurallarına göre randevunu iptal et veya taşı.") },
  { icon: LockKeyhole, title: tk("Verilerin güvende"), text: tk("KVKK odaklı süreçler ve güvenli bulut altyapısı.") },
];

/** Puan/yorum yalnızca gerçek veriden gelir; yoksa sadece güven rozetleri görünür. */
export async function HomeTrust({ businesses }: { businesses: Business[] }) {
  const t = await getT();
  const intlLocale = await getIntlLocale();
  const rated = businesses.filter((business) => (business.reviewCount ?? 0) > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3);
  const totalReviews = rated.reduce((sum, business) => sum + (business.reviewCount ?? 0), 0);

  return <section className={styles.section} aria-labelledby="home-trust-title">
    <div className={styles.wrap}>
      <div className={styles.sectionHead} data-reveal="">
        <div><span className={styles.kicker}>{t("GÜVENLE SEÇ")}</span><h2 id="home-trust-title">{rated.length ? t("Müşterilerin puanladığı yerler.") : t("Kontrol her zaman sende.")}</h2>
          <p>{rated.length ? t("Öne çıkan işletmelerin müşterilerden aldığı {count} değerlendirmeye göre.", { count: totalReviews.toLocaleString(intlLocale) }) : t("Detaylı işletme profilleri, gerçek müsaitlik ve şeffaf kurallarla kararını rahatça ver.")}</p></div>
      </div>
      {rated.length > 0 && <div className={styles.ratedGrid} data-reveal="">
        {rated.map((business, index) => <FeaturedBusinessCard key={business.id} business={business} index={index} t={t} intlLocale={intlLocale} />)}
      </div>}
      <ul className={styles.badges}>
        {TRUST_BADGES.map(({ icon: Icon, title, text }, index) => <li key={title} data-reveal="" style={{ "--i": index } as CSSProperties}>
          <span><Icon size={20} aria-hidden="true" /></span><strong>{t(title)}</strong><p>{t(text)}</p>
        </li>)}
      </ul>
    </div>
  </section>;
}

/* ─────────────── Mobil uygulama ─────────────── */

export async function HomeAppSection() {
  const t = await getT();
  return <section className={styles.section} aria-labelledby="home-app-title">
    <div className={styles.wrap}>
      <div className={styles.appPanel} data-reveal="">
        <div className={styles.appCopy}>
          <span className={styles.eyebrow}><Smartphone size={13} aria-hidden="true" /> {t("MOBİL UYGULAMA")}</span>
          <h2 id="home-app-title">SeninRandevun<br /><em>{t("artık cebinde.")}</em></h2>
          <p>{t("İşletmeleri keşfet, uygun saati seç ve bütün randevularını iPhone veya Android telefonundan yönet. Hatırlatmalar bildirim olarak gelsin.")}</p>
          <div className={styles.storeButtons}><AppStoreButtons compact /></div>
          <small className={styles.appNote}><BadgeCheck size={13} aria-hidden="true" /> {PLAY_STORE_AVAILABLE ? t("iPhone ve Android'de · Müşteriler için ücretsiz") : t("iPhone'da yayında · Android sürümü çok yakında Google Play'de")}</small>
          <Link href="/mobil-uygulama" className={styles.textLinkLight}>{t("Uygulamayı keşfet")} <ArrowRight size={15} /></Link>
        </div>
        <div className={styles.phoneStage} aria-hidden="true">
          <div className={styles.phone}>
            <span className={styles.island} />
            <div className={styles.phoneHead}><small>{t("HOŞ GELDİN")}</small><b>{t("Bugün ne yapalım?")}</b></div>
            <div className={styles.phoneSearch}><Search size={12} /> {t("Hizmet veya işletme ara…")}</div>
            <div className={styles.phoneCats}><span>💇<small>{t("Kuaför")}</small></span><span>💈<small>{t("Berber")}</small></span><span>💅<small>Nail</small></span><span>🧖<small>Spa</small></span></div>
            <div className={styles.phoneAppt}><small>{t("YAKLAŞAN RANDEVU")}</small><div><span><b>15:30</b><small>{t("{minutes} dk", { minutes: 45 })}</small></span><span><b>{t("Cilt bakımı")}</b><small><MapPin size={10} /> {t("Merkez")}</small></span></div></div>
            <div className={styles.phoneNotif}><BellRing size={12} /><span><b>{t("Hatırlatma")}</b><small>{t("Randevuna 1 saat kaldı")}</small></span></div>
            <nav className={styles.phoneTabs}><span className={styles.tabOn}><Search size={13} /></span><span><CalendarCheck2 size={13} /></span><span><Star size={13} /></span></nav>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ─────────────── İşletme CTA bandı ─────────────── */

export async function HomeBusinessBand() {
  const t = await getT();
  return <section className={styles.section} aria-labelledby="home-biz-title">
    <div className={styles.wrap}>
      <div className={styles.band} data-reveal="">
        <div>
          <span className={styles.kicker}><Building2 size={13} aria-hidden="true" /> {t("İŞLETMELER İÇİN")}</span>
          <h2 id="home-biz-title">{t("Takvimin düzenlensin.")}<br />{t("Günün sadeleşsin.")}</h2>
          <p>{t("Online randevu sayfanı oluştur; hizmetlerini, çalışanlarını, çalışma saatlerini ve müşteri ilişkilerini tek panelden yönet.")}</p>
          <ul><li><Check size={14} aria-hidden="true" /> {t("İlk ay ücretsiz")}</li><li><Check size={14} aria-hidden="true" /> {t("Kredi kartı gerekmez")}</li><li><Check size={14} aria-hidden="true" /> {t("Kolay kurulum")}</li></ul>
        </div>
        <div className={styles.bandActions}>
          <Link href="/isletmeler/kayit" className={styles.btnLime}>{t("Ücretsiz başla")} <ArrowUpRight size={16} /></Link>
          <Link href="/isletmeler" className={styles.btnGhostLight}>{t("İşletme özelliklerini gör")}</Link>
        </div>
        <RoviMascot size={120} mood="happy" alt="" className={styles.bandRovi} />
      </div>
    </div>
  </section>;
}

/* ─────────────── SSS ─────────────── */

export async function HomeFaq({ items }: { items: readonly (readonly string[])[] }) {
  const t = await getT();
  return <section className={styles.section} aria-labelledby="home-faq-title">
    <div className={`${styles.wrap} ${styles.faqLayout}`}>
      <div className={styles.faqIntro} data-reveal="">
        <span className={styles.kicker}>{t("MERAK ETTİKLERİN")}</span>
        <h2 id="home-faq-title">{t("Randevu almadan önce.")}</h2>
        <p>{t("SeninRandevun müşteriler için kolay, hızlı ve ücretsiz bir keşif deneyimidir.")}</p>
        <Link href="/yardim-merkezi" className={styles.textLink}>{t("Yardım merkezi")} <ArrowRight size={15} /></Link>
        <span className={styles.faqTrust}><ShieldCheck size={15} aria-hidden="true" /> {t("Sorun mu var?")} <Link href="/iletisim">{t("Bize yaz")}</Link></span>
      </div>
      <div className={styles.faqList}>
        {items.map(([question, answer], index) => <details key={question} className={styles.faqItem} data-reveal="" style={{ "--i": index } as CSSProperties}>
          <summary>{t(question)}<span aria-hidden="true" /></summary>
          <p>{t(answer)}</p>
        </details>)}
      </div>
    </div>
  </section>;
}
