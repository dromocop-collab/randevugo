import Image from "next/image";
import Link from "@/i18n/link";
import type { CSSProperties } from "react";
import { Apple, ArrowRight, BellRing, CalendarCheck2, Check, Clock3, Heart, ListOrdered, MapPin, Play, Search, ShieldCheck, Smartphone, Star } from "lucide-react";
import { AppStoreButton, PlayStoreButton } from "@/components/marketing/app-store-button";
import { APP_STORE_URL, PLAY_STORE_AVAILABLE } from "@/lib/app-store";
import { APP_STORE_QR_TARGET, AppStoreQr } from "./app-store-qr";
import { Crumbs, SectionHead, cx } from "./ui";
import mp from "./mp.module.css";
import s from "./mobile-app.module.css";
import { tk } from "@/i18n/config";
import { getT } from "@/i18n/server";

const features = [
  { icon: MapPin, title: tk("Yakınındakileri keşfet"), text: tk("Şehrindeki işletmeleri kategori, hizmet ve konuma göre bul.") },
  { icon: CalendarCheck2, title: tk("Gerçek müsaitliği gör"), text: tk("Telefonla saat sormadan hizmeti, uzmanı ve sana uyan zamanı seç.") },
  { icon: BellRing, title: tk("Randevunu kaçırma"), text: tk("Onay, değişiklik ve hatırlatma bildirimleri telefonuna gelsin.") },
  { icon: ListOrdered, title: tk("Sıranı canlı takip et"), text: tk("Canlı sıra kullanan işletmelerde sıranın ne zaman geleceğini gör.") },
  { icon: Heart, title: tk("Favorilerin yanında"), text: tk("Beğendiğin işletmelere ve hizmetlere tek dokunuşla dön.") },
  { icon: Star, title: tk("Güvenle karar ver"), text: tk("Gerçek değerlendirmeler ve ayrıntılı işletme profilleriyle karşılaştır.") },
  { icon: Clock3, title: tk("Kolayca değiştir"), text: tk("İşletmenin izin verdiği süre içinde randevunu taşı ya da iptal et.") },
  { icon: ShieldCheck, title: tk("Güvenli hesap"), text: tk("Randevuların web ve mobilde aynı hesapla senkron kalır.") },
];

async function IPhone() {
  const t = await getT();
  return (
    <div className={cx(s.device, s.iphone)} aria-hidden="true">
      <div className={s.screen}>
        <span className={s.island} />
        <div className={s.status}><b>9:41</b><span /></div>
        <div className={s.appHead}><Image src="/icon-192.png" alt="" width={34} height={34} /><div><small>{t("MERHABA")}</small><b>{t("Bugün ne yaptıralım?")}</b></div></div>
        <div className={s.search}><Search size={14} /> {t("Hizmet veya işletme ara")}</div>
        <div className={s.cats}>{["💈", "💅", "🧖", "🐾"].map((c) => <span key={c}>{c}</span>)}</div>
        <div className={s.biz}>
          <div className={s.bizCover} />
          <div className={s.bizBody}><b>{t("Örnek Kuaför")}</b><small><Star size={10} /> {t("4,9 · 1,2 km")}</small><div className={s.slotRow}><span>10:30</span><span className={s.slotOn}>11:15</span><span>14:00</span></div></div>
        </div>
        <div className={s.tabbar}><Search size={15} /><CalendarCheck2 size={15} /><Heart size={15} /><Smartphone size={15} /></div>
      </div>
    </div>
  );
}

async function AndroidPhone() {
  const t = await getT();
  return (
    <div className={cx(s.device, s.android)} aria-hidden="true">
      <div className={s.screen}>
        <span className={s.punch} />
        <div className={s.status}><b>9:41</b><span /></div>
        <div className={s.appHead}><div><small>{t("RANDEVULARIM")}</small><b>{t("Yaklaşan")}</b></div></div>
        <div className={s.appt}><span className={s.date}><b>14</b><small>{t("EKİ")}</small></span><div><b>{t("Saç kesimi")}</b><small>11:15 · Elif</small></div><Check size={14} /></div>
        <div className={s.appt}><span className={s.date}><b>21</b><small>{t("EKİ")}</small></span><div><b>{t("Cilt bakımı")}</b><small>15:00 · Zeynep</small></div><Clock3 size={14} /></div>
        <div className={s.queueCard}><small>{t("CANLI SIRA")}</small><b>{t("Sıranız {position}", { position: 2 })}</b><span><i style={{ width: "66%" }} /></span></div>
        <div className={cx(s.tabbar, s.tabbarMd)}><Search size={15} /><CalendarCheck2 size={15} /><Heart size={15} /><Smartphone size={15} /></div>
      </div>
    </div>
  );
}

export async function MobileAppPage() {
  const t = await getT();
  return (
    <main className={mp.page}>
      <section className={mp.hero}>
        <div className={mp.heroGrid} aria-hidden="true" />
        <div className={cx(mp.shell, s.heroInner)}>
          <div className={s.heroCopy}>
            <Crumbs ariaLabel={t("İçerik haritası")} items={[{ href: "/", label: t("Ana Sayfa") }, { label: t("Mobil uygulama") }]} />
            <span className={cx(mp.eyebrow, mp.rise)}><Smartphone size={13} aria-hidden="true" /> {t("iPhone ve Android")}</span>
            <h1 className={cx(mp.title, mp.rise)} style={{ "--i": 1 } as CSSProperties}>{t("Randevunun en kolay hâli,")}<br /><em>{t("artık cebinde.")}</em></h1>
            <p className={cx(mp.lead, mp.rise)} style={{ "--i": 2 } as CSSProperties}>{t("Yakınındaki iyi hizmetleri keşfet, gerçek müsait saatleri karşılaştır ve randevularını telefonundan yönet. Ücretsiz.")}</p>
            <div className={cx(s.stores, mp.rise)} style={{ "--i": 3 } as CSSProperties}>
              <AppStoreButton />
              <PlayStoreButton />
            </div>
            <ul className={s.storeNotes}>
              <li><Apple size={14} aria-hidden="true" /> {t("iPhone: App Store'da yayında")}</li>
              <li><Play size={13} aria-hidden="true" /> {PLAY_STORE_AVAILABLE ? t("Android: Google Play'de yayında") : t("Android: Google Play'de çok yakında")}</li>
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
        <section className={s.proof} aria-label={t("Öne çıkanlar")}>
          {[[t("Ücretsiz"), t("Müşteriler için")], ["iPhone + Android", t("Tek hesap")], ["7/24", t("Keşif ve randevu")], [t("Canlı"), t("Gerçek müsaitlik")]].map(([title, note], i) => (
            <div key={title} className={mp.rise} style={{ "--i": i } as CSSProperties}><b>{title}</b><small>{note}</small></div>
          ))}
        </section>

        <section className={mp.section} aria-labelledby="ozellik-baslik">
          <SectionHead id="ozellik-baslik" center kicker={t("Mobilde her şey daha yakın")} title={<>{t("Planını değil,")}<br /><em>{t("anını yaşa.")}</em></>} sub={t("Keşiften randevu sonrasına kadar ihtiyacın olan bütün adımlar tek, hızlı ve modern deneyimde.")} />
          <ul className={s.features}>
            {features.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className={cx(mp.card, mp.reveal)}>
                <span className={s.fIcon}><Icon size={20} aria-hidden="true" /></span>
                <i className={s.fNum}>{String(i + 1).padStart(2, "0")}</i>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={cx(mp.section, s.download)} aria-labelledby="indir-baslik">
          <div className={cx(s.downloadCard, mp.reveal)}>
            <div className={s.downloadCopy}>
              <span className={mp.kicker}>{t("İndir")}</span>
              <h2 className={mp.h2} id="indir-baslik">{t("Hangi telefonu kullanırsan kullan.")}</h2>
              <p className={mp.sub}>{t("Uygulamayı ücretsiz indir, sana uygun işletmeyi keşfet ve ilk randevunu oluştur. Web'de açtığın hesapla giriş yapabilirsin.")}</p>
              <div className={s.platforms}>
                <article className={s.platform}>
                  <span className={s.pIcon}><Apple size={20} fill="currentColor" aria-hidden="true" /></span>
                  <div><b>iPhone</b><small>{t("App Store'da yayında")}</small></div>
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={s.pLink}>{t("İndir")} <ArrowRight size={14} aria-hidden="true" /></a>
                </article>
                <article className={cx(s.platform, !PLAY_STORE_AVAILABLE && s.soon)}>
                  <span className={s.pIcon}><Play size={18} fill="currentColor" aria-hidden="true" /></span>
                  <div><b>Android</b><small>{PLAY_STORE_AVAILABLE ? t("Google Play'de yayında") : t("Google Play'de çok yakında")}</small></div>
                  {PLAY_STORE_AVAILABLE ? <PlayStoreButton compact /> : <span className={s.soonTag}>{t("Yakında")}</span>}
                </article>
              </div>
            </div>
            {APP_STORE_URL === APP_STORE_QR_TARGET && (
              <div className={s.qrBox}>
                <AppStoreQr className={s.qr} />
                <b>{t("iPhone kamerasıyla okut")}</b>
                <small>{t("App Store sayfası açılır")}</small>
              </div>
            )}
          </div>
        </section>

        <p className={s.footnote}>{t("Mağaza kullanılabilirliği ülke ve cihazınıza göre değişebilir. Ekran görselleri temsilîdir.")} {t("Uygulamayı indirmeden de")} <Link href="/kesfet">{t("web'de keşfedebilirsin")}</Link>.</p>
      </div>
    </main>
  );
}
