import Link from "@/i18n/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, BarChart3, BellRing, Bot, CalendarDays, Check, ClipboardList, Gift, GitBranch, Globe2, Hourglass, ListOrdered, MessageSquareQuote, QrCode, ReceiptText, ShieldCheck, Smartphone, Sparkles, UsersRound, Workflow, Zap, Contact } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { SectionNav } from "./section-nav";
import { AnalyticsMockup, AppsMockup, BookingMockup, CalendarMockup, CheckoutMockup, CrmMockup, FieldsMockup, QueueMockup, ReminderMockup, TeamMockup } from "./feature-mockups";
import { Crumbs, PageCta, SectionHead, cx } from "./ui";
import mp from "./mp.module.css";
import s from "./features.module.css";
import type { TFunction } from "@/i18n/config";
import { getT } from "@/i18n/server";

type Feature = { id: string; nav: string; icon: ReactNode; kicker: string; title: ReactNode; text: string; points: string[]; visual: ReactNode };

function buildFeatures(t: TFunction): Feature[] {
  return [
  { id: "takvim", nav: t("Takvim"), icon: <CalendarDays size={15} aria-hidden="true" />, kicker: t("Akıllı takvim"), title: <>{t("Her dakika görünür,")}<br /><em>{t("her randevu yerinde.")}</em></>, text: t("Günlük, haftalık ve aylık görünümlerde tüm ekibinizi tek ekranda izleyin. Çalışma saatleri, molalar, izinler ve hizmet süreleri otomatik hesaba katılır."), points: [t("Çakışan randevuları engeller"), t("Çalışan bazlı müsaitlik ve özel günler"), t("Hızlı randevu ekleme ve taşıma"), t("Durum ve ödeme takibi")], visual: <CalendarMockup /> },
  { id: "online-randevu", nav: t("Online randevu"), icon: <Globe2 size={15} aria-hidden="true" />, kicker: t("Online randevu"), title: <>{t("Siz kapalıyken bile")}<br /><em>{t("randevu gelir.")}</em></>, text: t("İşletmenize özel mağaza sayfası; hizmetlerinizi, fiyatlarınızı, ekibinizi ve gerçek müsait saatleri tek bağlantıda sunar. Müşteri telefon açmadan 7/24 randevu oluşturur."), points: [t("Paylaşılabilir mağaza linki ve QR"), t("Keşfet'te görünürlük"), t("Hizmet → uzman → saat akışı"), t("Müşteri iptal ve saat değişikliği kurallarını siz belirlersiniz")], visual: <BookingMockup /> },
  { id: "hatirlatma", nav: t("SMS & bildirim"), icon: <BellRing size={15} aria-hidden="true" />, kicker: t("SMS + anlık bildirim"), title: <>{t("Hatırlatmayı sistem yapsın,")}<br /><em>{t("koltuk boş kalmasın.")}</em></>, text: t("Randevu onayı, değişiklik, iptal ve hatırlatma mesajları otomatik gider. Müşteriye SMS ve uygulama bildirimi, ekibinize anlık panel bildirimi ulaşır."), points: [t("SMS onay ve hatırlatma"), t("Randevudan 1 saat önce anlık bildirim"), t("Yeni / iptal / değişiklik bildirimleri"), t("Müşteriye randevu yönetim bağlantısı")], visual: <ReminderMockup /> },
  { id: "canli-sira", nav: t("Canlı sıra"), icon: <ListOrdered size={15} aria-hidden="true" />, kicker: t("Canlı sıra"), title: <>{t("Randevusuz gelenler de")}<br /><em>{t("düzenli beklesin.")}</em></>, text: t("Kapıdan gelen müşterileri dijital sıraya alın; müşteri sırasını telefonundan canlı takip etsin, siz sıradakini tek dokunuşla çağırın."), points: [t("Müşteri için canlı sıra ekranı"), t("Tahmini bekleme süresi"), t("Bekleme listesi ve “şimdi müsait” akışı"), t("Yoğun saatlerde salon rahatlar")], visual: <QueueMockup /> },
  { id: "ekip", nav: t("Ekip paneli"), icon: <UsersRound size={15} aria-hidden="true" />, kicker: t("Ekip ve çalışan paneli"), title: <>{t("Herkes kendi işini görür,")}<br /><em>{t("siz hepsini.")}</em></>, text: t("İşletme sahibi, yönetici, müdür ve çalışan rolleriyle doğru bilgiyi doğru kişiye açın. Çalışanlar yalnızca kendi takvimini ve randevularını yönetir."), points: [t("4 rol: Sahip, Yönetici, Müdür, Çalışan"), t("Çalışana hizmet ve saat atama"), t("Çalışan hesabı otomatik bağlanır"), t("Şube bazında ekip yönetimi")], visual: <TeamMockup /> },
  { id: "musteri-crm", nav: t("Müşteri CRM"), icon: <Contact size={15} aria-hidden="true" />, kicker: t("Müşteri CRM"), title: <>{t("Her ziyaretle")}<br /><em>{t("daha iyi tanıyın.")}</em></>, text: t("Ziyaret geçmişi, yaklaşan randevular, notlar, paketler ve sadakat puanı tek müşteri kartında. Müşteri profili randevuyla birlikte otomatik oluşur."), points: [t("Otomatik müşteri profili"), t("Geçmiş ve gelecek randevular"), t("Özel notlar ve tercihler"), t("Sadakat puanı altyapısı")], visual: <CrmMockup /> },
  { id: "kasa-paket", nav: t("Kasa & paket"), icon: <ReceiptText size={15} aria-hidden="true" />, kicker: t("Kasa, paket ve seans"), title: <>{t("Ödemeyi alın,")}<br /><em>{t("kasa kendini tutsun.")}</em></>, text: t("Hizmet, ürün, indirim ve ödeme yöntemini tek ekranda kapatın. Seans paketleri satın, kalan seansları takip edin; gelir-gider hareketleri kasaya işlensin."), points: [t("Kasa & tahsilat"), t("Paket ve seans takibi"), t("Ürün ve stok hareketleri"), t("Gelir & gider listesi")], visual: <CheckoutMockup /> },
  { id: "analitik", nav: t("Analitik"), icon: <BarChart3 size={15} aria-hidden="true" />, kicker: t("Analiz & büyüme"), title: <>{t("Veriyi izlemeyin,")}<br /><em>{t("doğru kararı görün.")}</em></>, text: t("Doluluk, randevu, iptal, gelir, hizmet ve ekip performansını anlaşılır kartlar ve trendlerle takip edin; hangi gün ve hizmetin büyüdüğünü ilk siz görün."), points: [t("Canlı KPI kartları"), t("Haftalık doluluk trendi"), t("Popüler hizmetler"), t("Ekip performansı")], visual: <AnalyticsMockup /> },
  { id: "randevu-alanlari", nav: t("Özel alanlar"), icon: <ClipboardList size={15} aria-hidden="true" />, kicker: t("İşletmeye özel randevu alanları"), title: <>{t("Randevu formunu")}<br /><em>{t("işinize göre kurun.")}</em></>, text: t("Kişi sayısı, evcil hayvan türü, ilk ziyaret bilgisi gibi işinize özel soruları randevu formuna ekleyin; cevaplar randevu kartında hazır beklesin. Alanlarınız ekibimizin kısa onayının ardından formda yayına girer."), points: [t("Sayı, seçim, metin, uzun metin ve onay kutusu"), t("Zorunlu / isteğe bağlı alanlar"), t("Belirli hizmetlere özel alanlar"), t("Hazır şablonlarla hızlı kurulum")], visual: <FieldsMockup /> },
  { id: "mobil", nav: t("iOS & Android"), icon: <Smartphone size={15} aria-hidden="true" />, kicker: t("iOS & Android uygulaması"), title: <>{t("İşletmeniz")}<br /><em>{t("cebinizde.")}</em></>, text: t("Takvim, randevular, canlı sıra ve bildirimler iPhone ve Android uygulamasında da sizinle. Web paneli de mobil tarayıcıda tam ekran çalışır."), points: [t("iPhone uygulaması App Store'da"), t("Android uygulaması"), t("Anlık randevu bildirimleri"), t("Panel ile anında senkron")], visual: <AppsMockup /> },
];
}

function buildExtras(t: TFunction) {
  return [
  { icon: Hourglass, title: t("Bekleme listesi"), text: t("Dolu saatler için talep toplayın.") },
  { icon: GitBranch, title: t("Çoklu şube"), text: t("Şubeleri tek hesaptan yönetin.") },
  { icon: MessageSquareQuote, title: t("Yorumlar"), text: t("Değerlendirmelere yanıt verin.") },
  { icon: Workflow, title: t("Otomasyonlar"), text: t("Tekrarlayan işleri sisteme bırakın.") },
  { icon: Bot, title: t("İşletme asistanı"), text: t("Panel içinde yapay zekâ desteği.") },
  { icon: QrCode, title: t("QR randevu linki"), text: t("Vitrine, masaya, kartvizite.") },
  { icon: ShieldCheck, title: t("Rol bazlı güvenlik"), text: t("İşletme verisi izole tutulur.") },
  { icon: Zap, title: t("Şimdi müsait"), text: t("Boş saatlerinizi öne çıkarın.") },
];
}

export async function FeaturesPage() {
  const t = await getT();
  const features = buildFeatures(t);
  const extras = buildExtras(t);
  return (
    <main className={mp.page}>
      <section className={mp.hero}>
        <div className={mp.heroGrid} aria-hidden="true" />
        <div className={cx(mp.shell, s.heroInner)}>
          <div className={s.heroCopy}>
            <Crumbs ariaLabel={t("İçerik haritası")} items={[{ href: "/isletmeler", label: t("İşletmeler") }, { label: t("Özellikler") }]} />
            <span className={cx(mp.eyebrow, mp.rise)}><Sparkles size={13} aria-hidden="true" /> {t("Ürünün tamamı")}</span>
            <h1 className={cx(mp.title, mp.rise)} style={{ ["--i" as string]: 1 } as CSSProperties}>{t("Randevudan kasaya,")}<br /><em>{t("işletmenizin tamamı.")}</em></h1>
            <p className={cx(mp.lead, mp.rise)} style={{ ["--i" as string]: 2 } as CSSProperties}>{t("Takvim, online randevu, hatırlatmalar, canlı sıra, ekip, müşteri, kasa ve analitik — hepsi tek akıcı panelde, web'de ve cebinizde.")}</p>
            <div className={cx(mp.actions, mp.rise)} style={{ ["--i" as string]: 3 } as CSSProperties}>
              <Link href="/isletmeler/kayit" className={cx(mp.btn, mp.btnLime)}>{t("İlk ay ücretsiz başla")} <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link href="/fiyatlar" className={cx(mp.btn, mp.btnGlass)}>{t("Fiyatları gör")}</Link>
            </div>
            <div className={mp.pills}>
              <span className={mp.pill}><Check size={13} aria-hidden="true" /> {t("Kredi kartı gerekmez")}</span>
              <span className={mp.pill}><Check size={13} aria-hidden="true" /> {t("Tüm özellikler açık")}</span>
              <span className={mp.pill}><Check size={13} aria-hidden="true" /> iOS · Android · Web</span>
            </div>
          </div>
          <div className={s.heroArt} aria-hidden="true">
            <div className={s.orbit}>
              {features.slice(0, 8).map((f, i) => <span key={f.id} className={s.orbitChip} style={{ ["--a" as string]: `${i * 45}deg` } as CSSProperties}>{f.icon}</span>)}
            </div>
            <div className={s.core}><RoviMascot size={130} mood="happy" alt="" priority /></div>
          </div>
        </div>
      </section>

      <SectionNav label={t("Özellik bölümleri")} items={features.map(({ id, nav, icon }) => ({ id, label: nav, icon }))} />

      <div className={mp.shell}>
        <section className={s.overview} aria-labelledby="ozet-baslik">
          <h2 id="ozet-baslik" className={mp.srOnly}>{t("Özellik özeti")}</h2>
          <ul>
            {features.map((f, i) => (
              <li key={f.id} className={mp.rise} style={{ ["--i" as string]: i } as CSSProperties}>
                <a href={`#${f.id}`}><span>{f.icon}</span><b>{f.kicker}</b><ArrowRight size={14} aria-hidden="true" /></a>
              </li>
            ))}
          </ul>
        </section>

        {features.map((f, i) => (
          <section key={f.id} id={f.id} className={cx(mp.section, s.feature, i % 2 === 1 && s.flip)} aria-labelledby={`${f.id}-baslik`}>
            <div className={cx(s.copy, mp.reveal)}>
              <span className={s.num}>{String(i + 1).padStart(2, "0")}</span>
              <span className={mp.kicker}>{f.icon} {f.kicker}</span>
              <h2 className={mp.h2} id={`${f.id}-baslik`}>{f.title}</h2>
              <p className={mp.sub}>{f.text}</p>
              <ul className={s.points}>{f.points.map((p) => <li key={p}><Check size={14} aria-hidden="true" />{p}</li>)}</ul>
            </div>
            <div className={cx(s.visual, mp.reveal)}>{f.visual}</div>
          </section>
        ))}

        <section className={mp.section} aria-labelledby="dahasi-baslik">
          <SectionHead id="dahasi-baslik" center kicker={<><Gift size={13} aria-hidden="true" /> {t("Ve dahası")}</>} title={<>{t("Büyüdükçe yanınızda")}<br /><em>{t("olan detaylar.")}</em></>} sub={t("Tek abonelikte tüm özellikler açık; ihtiyaç duydukça kullanmaya başlayın.")} />
          <ul className={s.extras}>
            {extras.map(({ icon: Icon, title, text }) => (
              <li key={title} className={cx(mp.card, mp.reveal)}><span><Icon size={19} aria-hidden="true" /></span><b>{title}</b><small>{text}</small></li>
            ))}
          </ul>
        </section>

        <p className={s.disclaimer}>{t("Ekran görselleri temsilîdir; isimler, saatler ve tutarlar örnek veridir.")}</p>

        <PageCta title={<>{t("İşletmeniz daha akıcı")}<br /><em>{t("çalışmaya hazır.")}</em></>} text={t("Çalışma alanınızı dakikalar içinde açın; ilk ay bizden, kredi kartı gerekmez.")}>
          <Link href="/isletmeler/kayit" className={cx(mp.btn, mp.btnLime)}>{t("İlk ay ücretsiz")} <ArrowRight size={17} aria-hidden="true" /></Link>
          <Link href="/fiyatlar" className={cx(mp.btn, mp.btnGlass)}>{t("Fiyatlar")}</Link>
        </PageCta>
      </div>
    </main>
  );
}
