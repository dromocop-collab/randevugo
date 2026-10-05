import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Apple, ArrowRight, BellRing, CalendarCheck2, Check, Clock3, Heart, ListOrdered, MapPin, Play, Search, ShieldCheck, Smartphone, Star } from "lucide-react";
import { AppStoreButton, PlayStoreButton } from "@/components/marketing/app-store-button";
import { APP_STORE_URL, PLAY_STORE_AVAILABLE } from "@/lib/app-store";
import { APP_STORE_QR_TARGET, AppStoreQr } from "./app-store-qr";
import { Crumbs, SectionHead, cx } from "./ui";
import mp from "./mp.module.css";
import s from "./mobile-app.module.css";

const features = [
  { icon: MapPin, title: "Yakınındakileri keşfet", text: "Şehrindeki işletmeleri kategori, hizmet ve konuma göre bul." },
  { icon: CalendarCheck2, title: "Gerçek müsaitliği gör", text: "Telefonla saat sormadan hizmeti, uzmanı ve sana uyan zamanı seç." },
  { icon: BellRing, title: "Randevunu kaçırma", text: "Onay, değişiklik ve hatırlatma bildirimleri telefonuna gelsin." },
  { icon: ListOrdered, title: "Sıranı canlı takip et", text: "Canlı sıra kullanan işletmelerde sıranın ne zaman geleceğini gör." },
  { icon: Heart, title: "Favorilerin yanında", text: "Beğendiğin işletmelere ve hizmetlere tek dokunuşla dön." },
  { icon: Star, title: "Güvenle karar ver", text: "Gerçek değerlendirmeler ve ayrıntılı işletme profilleriyle karşılaştır." },
  { icon: Clock3, title: "Kolayca değiştir", text: "İşletmenin izin verdiği süre içinde randevunu taşı ya da iptal et." },
  { icon: ShieldCheck, title: "Güvenli hesap", text: "Randevuların web ve mobilde aynı hesapla senkron kalır." },
];

function IPhone() {
  return (
    <div className={cx(s.device, s.iphone)} aria-hidden="true">
      <div className={s.screen}>
        <span className={s.island} />
        <div className={s.status}><b>9:41</b><span /></div>
        <div className={s.appHead}><Image src="/icon-192.png" alt="" width={34} height={34} /><div><small>MERHABA</small><b>Bugün ne yaptıralım?</b></div></div>
        <div className={s.search}><Search size={14} /> Hizmet veya işletme ara</div>
        <div className={s.cats}>{["💈", "💅", "🧖", "🐾"].map((c) => <span key={c}>{c}</span>)}</div>
        <div className={s.biz}>
          <div className={s.bizCover} />
          <div className={s.bizBody}><b>Örnek Kuaför</b><small><Star size={10} /> 4,9 · 1,2 km</small><div className={s.slotRow}><span>10:30</span><span className={s.slotOn}>11:15</span><span>14:00</span></div></div>
        </div>
        <div className={s.tabbar}><Search size={15} /><CalendarCheck2 size={15} /><Heart size={15} /><Smartphone size={15} /></div>
      </div>
    </div>
  );
}

function AndroidPhone() {
  return (
    <div className={cx(s.device, s.android)} aria-hidden="true">
      <div className={s.screen}>
        <span className={s.punch} />
        <div className={s.status}><b>9:41</b><span /></div>
        <div className={s.appHead}><div><small>RANDEVULARIM</small><b>Yaklaşan</b></div></div>
        <div className={s.appt}><span className={s.date}><b>14</b><small>EKİ</small></span><div><b>Saç kesimi</b><small>11:15 · Elif</small></div><Check size={14} /></div>
        <div className={s.appt}><span className={s.date}><b>21</b><small>EKİ</small></span><div><b>Cilt bakımı</b><small>15:00 · Zeynep</small></div><Clock3 size={14} /></div>
        <div className={s.queueCard}><small>CANLI SIRA</small><b>Sıranız 2</b><span><i style={{ width: "66%" }} /></span></div>
        <div className={cx(s.tabbar, s.tabbarMd)}><Search size={15} /><CalendarCheck2 size={15} /><Heart size={15} /><Smartphone size={15} /></div>
      </div>
    </div>
  );
}

export function MobileAppPage() {
  return (
    <main className={mp.page}>
      <section className={mp.hero}>
        <div className={mp.heroGrid} aria-hidden="true" />
        <div className={cx(mp.shell, s.heroInner)}>
          <div className={s.heroCopy}>
            <Crumbs items={[{ href: "/", label: "Ana Sayfa" }, { label: "Mobil uygulama" }]} />
            <span className={cx(mp.eyebrow, mp.rise)}><Smartphone size={13} aria-hidden="true" /> iPhone ve Android</span>
            <h1 className={cx(mp.title, mp.rise)} style={{ "--i": 1 } as CSSProperties}>Randevunun en kolay hâli,<br /><em>artık cebinde.</em></h1>
            <p className={cx(mp.lead, mp.rise)} style={{ "--i": 2 } as CSSProperties}>Yakınındaki iyi hizmetleri keşfet, gerçek müsait saatleri karşılaştır ve randevularını telefonundan yönet. Ücretsiz.</p>
            <div className={cx(s.stores, mp.rise)} style={{ "--i": 3 } as CSSProperties}>
              <AppStoreButton />
              <PlayStoreButton />
            </div>
            <ul className={s.storeNotes}>
              <li><Apple size={14} aria-hidden="true" /> iPhone: App Store&apos;da yayında</li>
              <li><Play size={13} aria-hidden="true" /> Android: {PLAY_STORE_AVAILABLE ? "Google Play'de yayında" : "Google Play'de çok yakında"}</li>
            </ul>
          </div>
          <div className={s.devices}>
            <div className={s.glow} aria-hidden="true" />
            <AndroidPhone />
            <IPhone />
          </div>
        </div>
      </section>

      <div className={mp.shell}>
        <section className={s.proof} aria-label="Öne çıkanlar">
          {[["Ücretsiz", "Müşteriler için"], ["iPhone + Android", "Tek hesap"], ["7/24", "Keşif ve randevu"], ["Canlı", "Gerçek müsaitlik"]].map(([b, t], i) => (
            <div key={b} className={mp.rise} style={{ "--i": i } as CSSProperties}><b>{b}</b><small>{t}</small></div>
          ))}
        </section>

        <section className={mp.section} aria-labelledby="ozellik-baslik">
          <SectionHead id="ozellik-baslik" center kicker="Mobilde her şey daha yakın" title={<>Planını değil,<br /><em>anını yaşa.</em></>} sub="Keşiften randevu sonrasına kadar ihtiyacın olan bütün adımlar tek, hızlı ve modern deneyimde." />
          <ul className={s.features}>
            {features.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className={cx(mp.card, mp.reveal)}>
                <span className={s.fIcon}><Icon size={20} aria-hidden="true" /></span>
                <i className={s.fNum}>{String(i + 1).padStart(2, "0")}</i>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={cx(mp.section, s.download)} aria-labelledby="indir-baslik">
          <div className={cx(s.downloadCard, mp.reveal)}>
            <div className={s.downloadCopy}>
              <span className={mp.kicker}>İndir</span>
              <h2 className={mp.h2} id="indir-baslik">Hangi telefonu kullanırsan kullan.</h2>
              <p className={mp.sub}>Uygulamayı ücretsiz indir, sana uygun işletmeyi keşfet ve ilk randevunu oluştur. Web&apos;de açtığın hesapla giriş yapabilirsin.</p>
              <div className={s.platforms}>
                <article className={s.platform}>
                  <span className={s.pIcon}><Apple size={20} fill="currentColor" aria-hidden="true" /></span>
                  <div><b>iPhone</b><small>App Store&apos;da yayında</small></div>
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={s.pLink}>İndir <ArrowRight size={14} aria-hidden="true" /></a>
                </article>
                <article className={cx(s.platform, !PLAY_STORE_AVAILABLE && s.soon)}>
                  <span className={s.pIcon}><Play size={18} fill="currentColor" aria-hidden="true" /></span>
                  <div><b>Android</b><small>{PLAY_STORE_AVAILABLE ? "Google Play'de yayında" : "Google Play'de çok yakında"}</small></div>
                  {PLAY_STORE_AVAILABLE ? <PlayStoreButton compact /> : <span className={s.soonTag}>Yakında</span>}
                </article>
              </div>
            </div>
            {APP_STORE_URL === APP_STORE_QR_TARGET && (
              <div className={s.qrBox}>
                <AppStoreQr className={s.qr} />
                <b>iPhone kamerasıyla okut</b>
                <small>App Store sayfası açılır</small>
              </div>
            )}
          </div>
        </section>

        <p className={s.footnote}>Mağaza kullanılabilirliği ülke ve cihazınıza göre değişebilir. Ekran görselleri temsilîdir. Uygulamayı indirmeden de <Link href="/kesfet">web&apos;de keşfedebilirsin</Link>.</p>
      </div>
    </main>
  );
}
