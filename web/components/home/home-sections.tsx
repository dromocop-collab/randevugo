import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, BellRing, Building2, CalendarCheck2, CalendarClock, Check, HeartHandshake, LockKeyhole, MapPin, MousePointerClick, Search, ShieldCheck, Smartphone, Sparkles, Star } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { AppStoreButtons } from "@/components/marketing/app-store-button";
import { PLAY_STORE_AVAILABLE } from "@/lib/app-store";
import type { Business } from "@/types/business";
import { FeaturedBusinessCard } from "./featured-business-card";
import styles from "./home.module.css";

/* ─────────────── Hero ─────────────── */

export function HomeHeroIntro() {
  return <>
    <span className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" /> Şehrindeki iyi hizmetleri keşfet</span>
    <h1 id="home-title" className={styles.title}>Aradığın hizmet,<br /><em>sana uygun zamanda.</em></h1>
    <p className={styles.lead}>Yakınındaki güvenilir işletmeleri keşfet, hizmetleri ve uygun saatleri karşılaştır, randevunu saniyeler içinde al. Müşteriler için tamamen ücretsiz.</p>
  </>;
}

export function HomeHeroArt() {
  return <div className={styles.art}>
    <div className={styles.photo}>
      <Image src="/images/home-hero-studio-v2.jpg" alt="Tablet üzerinden müşterisine uygun randevu saatini gösteren bakım uzmanı" fill preload sizes="(max-width: 1040px) calc(100vw - 32px), 560px" />
      <span className={styles.photoShade} aria-hidden="true" />
    </div>
    <div className={`${styles.floatCard} ${styles.floatTop}`} aria-hidden="true">
      <span className={styles.floatIcon}><Check size={15} /></span>
      <span><b>Randevun onaylandı</b><small>Bugün · 15:30 · Cilt bakımı</small></span>
    </div>
    <div className={`${styles.floatCard} ${styles.floatSlots}`} aria-hidden="true">
      <small>MÜSAİT SAATLER</small>
      <span className={styles.slotRow}><i>14:00</i><i className={styles.slotOn}>15:30</i><i>16:15</i></span>
    </div>
    <div className={styles.rovi}>
      <RoviMascot size={74} mood="wave" alt="Rovi, SeninRandevun rehberi" />
      <p><b>Merhaba, ben Rovi!</b> Sana uygun saati birlikte bulalım.</p>
    </div>
  </div>;
}

/* ─────────────── Nasıl çalışır ─────────────── */

const STEPS = [
  { no: "01", icon: Search, title: "Ara ve keşfet", text: "Hizmet, kategori veya şehirle sana uygun işletmeyi bul; profilleri ve yorumları karşılaştır." },
  { no: "02", icon: CalendarClock, title: "Saatini seç", text: "İşletmenin gerçek müsaitliği üzerinden programına uyan saati ve uzmanı seç." },
  { no: "03", icon: CalendarCheck2, title: "Randevun hazır", text: "Bilgilerini onayla; randevun oluşsun, hatırlatma zamanında gelsin." },
];

export function HomeHowItWorks() {
  return <section className={styles.section} aria-labelledby="home-how-title">
    <div className={styles.wrap}>
      <div className={styles.sectionHead} data-reveal="">
        <div><span className={styles.kicker}>3 KOLAY ADIM</span><h2 id="home-how-title">Telefon trafiği yok.<br />Sadece birkaç dokunuş.</h2></div>
        <div className={styles.headActions}><Link href="/online-randevu" className={styles.textLink}>Online randevu nasıl çalışır? <ArrowRight size={15} /></Link></div>
      </div>
      <ol className={styles.steps}>
        {STEPS.map(({ no, icon: Icon, title, text }, index) => <li key={no} className={styles.step} data-reveal="" style={{ "--i": index } as CSSProperties}>
          <div className={styles.stepTop}><span className={styles.stepIcon}><Icon size={21} aria-hidden="true" /></span><span className={styles.stepNo}>{no}</span></div>
          <h3>{title}</h3>
          <p>{text}</p>
          <div className={styles.stepDemo} aria-hidden="true">
            {index === 0 && <span className={styles.demoSearch}><Search size={13} /> Kuaför · Fethiye<i /></span>}
            {index === 1 && <span className={styles.demoSlots}><i>10:30</i><i className={styles.slotOn}>11:15</i><i>13:00</i><i>14:45</i></span>}
            {index === 2 && <span className={styles.demoDone}><Check size={14} /> Onaylandı<small><BellRing size={12} /> 1 saat önce hatırlatma</small></span>}
          </div>
        </li>)}
      </ol>
    </div>
  </section>;
}

/* ─────────────── Güven ─────────────── */

const TRUST_BADGES = [
  { icon: HeartHandshake, title: "Müşteriler için ücretsiz", text: "Keşfetmek ve online randevu almak her zaman ücretsiz." },
  { icon: BellRing, title: "Zamanında hatırlatma", text: "Randevundan önce bildirim ve hatırlatmalarla haberdar ol." },
  { icon: MousePointerClick, title: "Kolay değişiklik", text: "İşletmenin kurallarına göre randevunu iptal et veya taşı." },
  { icon: LockKeyhole, title: "Verilerin güvende", text: "KVKK odaklı süreçler ve güvenli bulut altyapısı." },
];

/** Puan/yorum yalnızca gerçek veriden gelir; yoksa sadece güven rozetleri görünür. */
export function HomeTrust({ businesses }: { businesses: Business[] }) {
  const rated = businesses.filter((business) => (business.reviewCount ?? 0) > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3);
  const totalReviews = rated.reduce((sum, business) => sum + (business.reviewCount ?? 0), 0);

  return <section className={styles.section} aria-labelledby="home-trust-title">
    <div className={styles.wrap}>
      <div className={styles.sectionHead} data-reveal="">
        <div><span className={styles.kicker}>GÜVENLE SEÇ</span><h2 id="home-trust-title">{rated.length ? "Müşterilerin puanladığı yerler." : "Kontrol her zaman sende."}</h2>
          <p>{rated.length ? `Öne çıkan işletmelerin müşterilerden aldığı ${totalReviews.toLocaleString("tr-TR")} değerlendirmeye göre.` : "Detaylı işletme profilleri, gerçek müsaitlik ve şeffaf kurallarla kararını rahatça ver."}</p></div>
      </div>
      {rated.length > 0 && <div className={styles.ratedGrid} data-reveal="">
        {rated.map((business, index) => <FeaturedBusinessCard key={business.id} business={business} index={index} />)}
      </div>}
      <ul className={styles.badges}>
        {TRUST_BADGES.map(({ icon: Icon, title, text }, index) => <li key={title} data-reveal="" style={{ "--i": index } as CSSProperties}>
          <span><Icon size={20} aria-hidden="true" /></span><strong>{title}</strong><p>{text}</p>
        </li>)}
      </ul>
    </div>
  </section>;
}

/* ─────────────── Mobil uygulama ─────────────── */

export function HomeAppSection() {
  return <section className={styles.section} aria-labelledby="home-app-title">
    <div className={styles.wrap}>
      <div className={styles.appPanel} data-reveal="">
        <div className={styles.appCopy}>
          <span className={styles.eyebrow}><Smartphone size={13} aria-hidden="true" /> MOBİL UYGULAMA</span>
          <h2 id="home-app-title">SeninRandevun<br /><em>artık cebinde.</em></h2>
          <p>İşletmeleri keşfet, uygun saati seç ve bütün randevularını iPhone veya Android telefonundan yönet. Hatırlatmalar bildirim olarak gelsin.</p>
          <div className={styles.storeButtons}><AppStoreButtons compact /></div>
          <small className={styles.appNote}><BadgeCheck size={13} aria-hidden="true" /> {PLAY_STORE_AVAILABLE ? "iPhone ve Android'de · Müşteriler için ücretsiz" : "iPhone'da yayında · Android sürümü çok yakında Google Play'de"}</small>
          <Link href="/mobil-uygulama" className={styles.textLinkLight}>Uygulamayı keşfet <ArrowRight size={15} /></Link>
        </div>
        <div className={styles.phoneStage} aria-hidden="true">
          <div className={styles.phone}>
            <span className={styles.island} />
            <div className={styles.phoneHead}><small>HOŞ GELDİN</small><b>Bugün ne yapalım?</b></div>
            <div className={styles.phoneSearch}><Search size={12} /> Hizmet veya işletme ara…</div>
            <div className={styles.phoneCats}><span>💇<small>Kuaför</small></span><span>💈<small>Berber</small></span><span>💅<small>Nail</small></span><span>🧖<small>Spa</small></span></div>
            <div className={styles.phoneAppt}><small>YAKLAŞAN RANDEVU</small><div><span><b>15:30</b><small>45 dk</small></span><span><b>Cilt bakımı</b><small><MapPin size={10} /> Merkez</small></span></div></div>
            <div className={styles.phoneNotif}><BellRing size={12} /><span><b>Hatırlatma</b><small>Randevuna 1 saat kaldı</small></span></div>
            <nav className={styles.phoneTabs}><span className={styles.tabOn}><Search size={13} /></span><span><CalendarCheck2 size={13} /></span><span><Star size={13} /></span></nav>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ─────────────── İşletme CTA bandı ─────────────── */

export function HomeBusinessBand() {
  return <section className={styles.section} aria-labelledby="home-biz-title">
    <div className={styles.wrap}>
      <div className={styles.band} data-reveal="">
        <div>
          <span className={styles.kicker}><Building2 size={13} aria-hidden="true" /> İŞLETMELER İÇİN</span>
          <h2 id="home-biz-title">Takvimin düzenlensin.<br />Günün sadeleşsin.</h2>
          <p>Online randevu sayfanı oluştur; hizmetlerini, çalışanlarını, çalışma saatlerini ve müşteri ilişkilerini tek panelden yönet.</p>
          <ul><li><Check size={14} aria-hidden="true" /> İlk ay ücretsiz</li><li><Check size={14} aria-hidden="true" /> Kredi kartı gerekmez</li><li><Check size={14} aria-hidden="true" /> Kolay kurulum</li></ul>
        </div>
        <div className={styles.bandActions}>
          <Link href="/isletmeler/kayit" className={styles.btnLime}>Ücretsiz başla <ArrowUpRight size={16} /></Link>
          <Link href="/isletmeler" className={styles.btnGhostLight}>İşletme özelliklerini gör</Link>
        </div>
        <RoviMascot size={120} mood="happy" alt="" className={styles.bandRovi} />
      </div>
    </div>
  </section>;
}

/* ─────────────── SSS ─────────────── */

export function HomeFaq({ items }: { items: readonly (readonly string[])[] }) {
  return <section className={styles.section} aria-labelledby="home-faq-title">
    <div className={`${styles.wrap} ${styles.faqLayout}`}>
      <div className={styles.faqIntro} data-reveal="">
        <span className={styles.kicker}>MERAK ETTİKLERİN</span>
        <h2 id="home-faq-title">Randevu almadan önce.</h2>
        <p>SeninRandevun müşteriler için kolay, hızlı ve ücretsiz bir keşif deneyimidir.</p>
        <Link href="/yardim-merkezi" className={styles.textLink}>Yardım merkezi <ArrowRight size={15} /></Link>
        <span className={styles.faqTrust}><ShieldCheck size={15} aria-hidden="true" /> Sorun mu var? <Link href="/iletisim">Bize yaz</Link></span>
      </div>
      <div className={styles.faqList}>
        {items.map(([question, answer], index) => <details key={question} className={styles.faqItem} data-reveal="" style={{ "--i": index } as CSSProperties}>
          <summary>{question}<span aria-hidden="true" /></summary>
          <p>{answer}</p>
        </details>)}
      </div>
    </div>
  </section>;
}
