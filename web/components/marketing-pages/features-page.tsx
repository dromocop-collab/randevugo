import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, BarChart3, BellRing, Bot, CalendarDays, Check, ClipboardList, Gift, GitBranch, Globe2, Hourglass, ListOrdered, MessageSquareQuote, QrCode, ReceiptText, ShieldCheck, Smartphone, Sparkles, UsersRound, Workflow, Zap, Contact } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { SectionNav } from "./section-nav";
import { AnalyticsMockup, AppsMockup, BookingMockup, CalendarMockup, CheckoutMockup, CrmMockup, FieldsMockup, QueueMockup, ReminderMockup, TeamMockup } from "./feature-mockups";
import { Crumbs, PageCta, SectionHead, cx } from "./ui";
import mp from "./mp.module.css";
import s from "./features.module.css";

type Feature = { id: string; nav: string; icon: ReactNode; kicker: string; title: ReactNode; text: string; points: string[]; visual: ReactNode };

const features: Feature[] = [
  { id: "takvim", nav: "Takvim", icon: <CalendarDays size={15} aria-hidden="true" />, kicker: "Akıllı takvim", title: <>Her dakika görünür,<br /><em>her randevu yerinde.</em></>, text: "Günlük, haftalık ve aylık görünümlerde tüm ekibinizi tek ekranda izleyin. Çalışma saatleri, molalar, izinler ve hizmet süreleri otomatik hesaba katılır.", points: ["Çakışan randevuları engeller", "Çalışan bazlı müsaitlik ve özel günler", "Hızlı randevu ekleme ve taşıma", "Durum ve ödeme takibi"], visual: <CalendarMockup /> },
  { id: "online-randevu", nav: "Online randevu", icon: <Globe2 size={15} aria-hidden="true" />, kicker: "Online randevu", title: <>Siz kapalıyken bile<br /><em>randevu gelir.</em></>, text: "İşletmenize özel mağaza sayfası; hizmetlerinizi, fiyatlarınızı, ekibinizi ve gerçek müsait saatleri tek bağlantıda sunar. Müşteri telefon açmadan 7/24 randevu oluşturur.", points: ["Paylaşılabilir mağaza linki ve QR", "Keşfet'te görünürlük", "Hizmet → uzman → saat akışı", "Müşteri iptal ve saat değişikliği kurallarını siz belirlersiniz"], visual: <BookingMockup /> },
  { id: "hatirlatma", nav: "SMS & bildirim", icon: <BellRing size={15} aria-hidden="true" />, kicker: "SMS + anlık bildirim", title: <>Hatırlatmayı sistem yapsın,<br /><em>koltuk boş kalmasın.</em></>, text: "Randevu onayı, değişiklik, iptal ve hatırlatma mesajları otomatik gider. Müşteriye SMS ve uygulama bildirimi, ekibinize anlık panel bildirimi ulaşır.", points: ["SMS onay ve hatırlatma", "Randevudan 1 saat önce anlık bildirim", "Yeni / iptal / değişiklik bildirimleri", "Müşteriye randevu yönetim bağlantısı"], visual: <ReminderMockup /> },
  { id: "canli-sira", nav: "Canlı sıra", icon: <ListOrdered size={15} aria-hidden="true" />, kicker: "Canlı sıra", title: <>Randevusuz gelenler de<br /><em>düzenli beklesin.</em></>, text: "Kapıdan gelen müşterileri dijital sıraya alın; müşteri sırasını telefonundan canlı takip etsin, siz sıradakini tek dokunuşla çağırın.", points: ["Müşteri için canlı sıra ekranı", "Tahmini bekleme süresi", "Bekleme listesi ve “şimdi müsait” akışı", "Yoğun saatlerde salon rahatlar"], visual: <QueueMockup /> },
  { id: "ekip", nav: "Ekip paneli", icon: <UsersRound size={15} aria-hidden="true" />, kicker: "Ekip ve çalışan paneli", title: <>Herkes kendi işini görür,<br /><em>siz hepsini.</em></>, text: "İşletme sahibi, yönetici, müdür ve çalışan rolleriyle doğru bilgiyi doğru kişiye açın. Çalışanlar yalnızca kendi takvimini ve randevularını yönetir.", points: ["4 rol: Sahip, Yönetici, Müdür, Çalışan", "Çalışana hizmet ve saat atama", "Çalışan hesabı otomatik bağlanır", "Şube bazında ekip yönetimi"], visual: <TeamMockup /> },
  { id: "musteri-crm", nav: "Müşteri CRM", icon: <Contact size={15} aria-hidden="true" />, kicker: "Müşteri CRM", title: <>Her ziyaretle<br /><em>daha iyi tanıyın.</em></>, text: "Ziyaret geçmişi, yaklaşan randevular, notlar, paketler ve sadakat puanı tek müşteri kartında. Müşteri profili randevuyla birlikte otomatik oluşur.", points: ["Otomatik müşteri profili", "Geçmiş ve gelecek randevular", "Özel notlar ve tercihler", "Sadakat puanı altyapısı"], visual: <CrmMockup /> },
  { id: "kasa-paket", nav: "Kasa & paket", icon: <ReceiptText size={15} aria-hidden="true" />, kicker: "Kasa, paket ve seans", title: <>Ödemeyi alın,<br /><em>kasa kendini tutsun.</em></>, text: "Hizmet, ürün, indirim ve ödeme yöntemini tek ekranda kapatın. Seans paketleri satın, kalan seansları takip edin; gelir-gider hareketleri kasaya işlensin.", points: ["Kasa & tahsilat", "Paket ve seans takibi", "Ürün ve stok hareketleri", "Gelir & gider listesi"], visual: <CheckoutMockup /> },
  { id: "analitik", nav: "Analitik", icon: <BarChart3 size={15} aria-hidden="true" />, kicker: "Analiz & büyüme", title: <>Veriyi izlemeyin,<br /><em>doğru kararı görün.</em></>, text: "Doluluk, randevu, iptal, gelir, hizmet ve ekip performansını anlaşılır kartlar ve trendlerle takip edin; hangi gün ve hizmetin büyüdüğünü ilk siz görün.", points: ["Canlı KPI kartları", "Haftalık doluluk trendi", "Popüler hizmetler", "Ekip performansı"], visual: <AnalyticsMockup /> },
  { id: "randevu-alanlari", nav: "Özel alanlar", icon: <ClipboardList size={15} aria-hidden="true" />, kicker: "İşletmeye özel randevu alanları", title: <>Randevu formunu<br /><em>işinize göre kurun.</em></>, text: "Kişi sayısı, evcil hayvan türü, ilk ziyaret bilgisi gibi işinize özel soruları randevu formuna ekleyin; cevaplar randevu kartında hazır beklesin. Alanlarınız ekibimizin kısa onayının ardından formda yayına girer.", points: ["Sayı, seçim, metin, uzun metin ve onay kutusu", "Zorunlu / isteğe bağlı alanlar", "Belirli hizmetlere özel alanlar", "Hazır şablonlarla hızlı kurulum"], visual: <FieldsMockup /> },
  { id: "mobil", nav: "iOS & Android", icon: <Smartphone size={15} aria-hidden="true" />, kicker: "iOS & Android uygulaması", title: <>İşletmeniz<br /><em>cebinizde.</em></>, text: "Takvim, randevular, canlı sıra ve bildirimler iPhone ve Android uygulamasında da sizinle. Web paneli de mobil tarayıcıda tam ekran çalışır.", points: ["iPhone uygulaması App Store'da", "Android uygulaması", "Anlık randevu bildirimleri", "Panel ile anında senkron"], visual: <AppsMockup /> },
];

const extras = [
  { icon: Hourglass, title: "Bekleme listesi", text: "Dolu saatler için talep toplayın." },
  { icon: GitBranch, title: "Çoklu şube", text: "Şubeleri tek hesaptan yönetin." },
  { icon: MessageSquareQuote, title: "Yorumlar", text: "Değerlendirmelere yanıt verin." },
  { icon: Workflow, title: "Otomasyonlar", text: "Tekrarlayan işleri sisteme bırakın." },
  { icon: Bot, title: "İşletme asistanı", text: "Panel içinde yapay zekâ desteği." },
  { icon: QrCode, title: "QR randevu linki", text: "Vitrine, masaya, kartvizite." },
  { icon: ShieldCheck, title: "Rol bazlı güvenlik", text: "İşletme verisi izole tutulur." },
  { icon: Zap, title: "Şimdi müsait", text: "Boş saatlerinizi öne çıkarın." },
];

export function FeaturesPage() {
  return (
    <main className={mp.page}>
      <section className={mp.hero}>
        <div className={mp.heroGrid} aria-hidden="true" />
        <div className={cx(mp.shell, s.heroInner)}>
          <div className={s.heroCopy}>
            <Crumbs items={[{ href: "/isletmeler", label: "İşletmeler" }, { label: "Özellikler" }]} />
            <span className={cx(mp.eyebrow, mp.rise)}><Sparkles size={13} aria-hidden="true" /> Ürünün tamamı</span>
            <h1 className={cx(mp.title, mp.rise)} style={{ ["--i" as string]: 1 } as CSSProperties}>Randevudan kasaya,<br /><em>işletmenizin tamamı.</em></h1>
            <p className={cx(mp.lead, mp.rise)} style={{ ["--i" as string]: 2 } as CSSProperties}>Takvim, online randevu, hatırlatmalar, canlı sıra, ekip, müşteri, kasa ve analitik — hepsi tek akıcı panelde, web&apos;de ve cebinizde.</p>
            <div className={cx(mp.actions, mp.rise)} style={{ ["--i" as string]: 3 } as CSSProperties}>
              <Link href="/isletmeler/kayit" className={cx(mp.btn, mp.btnLime)}>İlk ay ücretsiz başla <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link href="/fiyatlar" className={cx(mp.btn, mp.btnGlass)}>Fiyatları gör</Link>
            </div>
            <div className={mp.pills}>
              <span className={mp.pill}><Check size={13} aria-hidden="true" /> Kredi kartı gerekmez</span>
              <span className={mp.pill}><Check size={13} aria-hidden="true" /> Tüm özellikler açık</span>
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

      <SectionNav label="Özellik bölümleri" items={features.map(({ id, nav, icon }) => ({ id, label: nav, icon }))} />

      <div className={mp.shell}>
        <section className={s.overview} aria-labelledby="ozet-baslik">
          <h2 id="ozet-baslik" className={mp.srOnly}>Özellik özeti</h2>
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
          <SectionHead id="dahasi-baslik" center kicker={<><Gift size={13} aria-hidden="true" /> Ve dahası</>} title={<>Büyüdükçe yanınızda<br /><em>olan detaylar.</em></>} sub="Tek abonelikte tüm özellikler açık; ihtiyaç duydukça kullanmaya başlayın." />
          <ul className={s.extras}>
            {extras.map(({ icon: Icon, title, text }) => (
              <li key={title} className={cx(mp.card, mp.reveal)}><span><Icon size={19} aria-hidden="true" /></span><b>{title}</b><small>{text}</small></li>
            ))}
          </ul>
        </section>

        <p className={s.disclaimer}>Ekran görselleri temsilîdir; isimler, saatler ve tutarlar örnek veridir.</p>

        <PageCta title={<>İşletmeniz daha akıcı<br /><em>çalışmaya hazır.</em></>} text="Çalışma alanınızı dakikalar içinde açın; ilk ay bizden, kredi kartı gerekmez.">
          <Link href="/isletmeler/kayit" className={cx(mp.btn, mp.btnLime)}>İlk ay ücretsiz <ArrowRight size={17} aria-hidden="true" /></Link>
          <Link href="/fiyatlar" className={cx(mp.btn, mp.btnGlass)}>Fiyatlar</Link>
        </PageCta>
      </div>
    </main>
  );
}
