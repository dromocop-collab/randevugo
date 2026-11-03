import Link from "@/i18n/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowUpRight, BellRing, CalendarCheck2, Check, Clock3, Gift, Globe2, Link2, MessageSquareText, Moon, Phone, Smartphone, UserPlus, UsersRound } from "lucide-react";
import { currencySymbol, formatPrice, loadPublicPlans } from "@/components/home/public-plans";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { SELLER } from "@/lib/legal/seller";
import base from "@/components/home/business.module.css";
import s from "./basla.module.css";
import { tk } from "@/i18n/config";
import { getIntlLocale, getLocale, getT } from "@/i18n/server";

// Reklamdan gelen işletme sahibi için kısa tanıtım sayfası (Meta reklam linki buraya gelir).
// Menü yok, tek hedef: kayıt. UTM/fbclid bu sayfada yakalanır (AttributionCapture) ve kayda taşınır.
// Aynı içerik /isletmeler'de olduğu için arama motoruna kapalı.

export const revalidate = 300;
const SIGNUP = "/isletmeler/kayit";

const BENEFITS = [
  { icon: Globe2, title: tk("7/24 online randevu"), text: tk("Sana özel randevu sayfası. Müşterin gece 23:00'te de, Pazar günü de telefonla aramadan uygun saati seçer.") },
  { icon: MessageSquareText, title: tk("Otomatik WhatsApp ve SMS hatırlatma"), text: tk("Onay ve hatırlatma mesajları kendiliğinden gider; unutan, gelmeyen müşteri azalır.") },
  { icon: UsersRound, title: tk("Takvim, ekip ve müşteriler tek ekranda"), text: tk("Çalışanların, hizmetlerin ve müşteri geçmişin cebinde. Defter ve mesaj grupları tarih olur.") },
] as const;

const STEPS = [
  { icon: UserPlus, title: tk("2 dakikada kaydol"), text: tk("İşletme türünü ve adını yaz, hesabın hazır.") },
  { icon: Clock3, title: tk("Hizmet ve saatlerini gir"), text: tk("Hazır şablonlar seçilir; değiştirmek istediğini düzenlersin.") },
  { icon: Link2, title: tk("Linkini paylaş, randevular gelsin"), text: tk("Instagram biyografine ve WhatsApp'a koy; randevular takvimine düşsün.") },
] as const;

const FAQ = [
  [tk("İlk ay gerçekten ücretsiz mi?"), tk("Evet. İlk ay tüm özellikler ücretsiz. Başlamak için kredi kartı gerekmez; süre bitince devam etmek istersen paket seçersin.")],
  [tk("Müşterilerim uygulama indirmek zorunda mı?"), tk("Hayır. Müşterilerin randevu sayfandan tarayıcıyla randevu alır; uygulama isteğe bağlı.")],
  [tk("Bilgisayarım yok, telefondan kullanabilir miyim?"), tk("Evet. Panel telefonda çalışır; iPhone ve Android uygulaması da var. Yeni randevu bildirimi anında cebine gelir.")],
  [tk("Kurulumda yardım alabilir miyim?"), tk("Evet. Kayıttan sonra WhatsApp'tan kurulum ipuçları gelir; istersen hizmet ve saatlerini senin için biz gireriz.")],
] as const;

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("Sen uyurken bile randevu gelsin"),
    description: t("Kuaför, berber ve güzellik salonları için online randevu: 7/24 randevu sayfası, otomatik WhatsApp ve SMS hatırlatma. İlk ay ücretsiz, kredi kartı gerekmez."),
    pathname: "/isletmeler/basla",
    noindex: true,
    locale: await getLocale(),
  });
}

export default async function AdLandingPage() {
  const t = await getT();
  const intlLocale = await getIntlLocale();
  const plans = await loadPublicPlans();
  const cheapest = plans.length ? plans.reduce((low, plan) => (plan.monthlyPrice < low.monthlyPrice ? plan : low)) : null;
  const priceText = cheapest && cheapest.monthlyPrice > 0
    ? t("Deneme bitince aylık {price}{symbol}'den başlar. Taahhüt yok, istediğin zaman bırak.", { price: formatPrice(cheapest.monthlyPrice, intlLocale), symbol: currencySymbol(cheapest.currency) })
    : t("Taahhüt yok, istediğin zaman bırak.");
  const phoneHref = `tel:+90${SELLER.phone.replace(/\D/g, "").replace(/^0/, "")}`;

  return (
    <div className={`${base.page} ${s.page}`}>
      <header className={s.top}>
        <div className={`${base.wrap} ${s.topInner}`}>
          <Link href="/" className={s.brand} aria-label={t("SeninRandevun ana sayfa")}><Image src="/logo.png" alt="" width={30} height={30} priority /> SeninRandevun</Link>
          <a className={s.call} href={phoneHref}><Phone size={14} aria-hidden="true" /> {t("Bizi ara")}</a>
        </div>
      </header>

      <main className={s.main}>
        <section className={base.hero} aria-labelledby="ad-title">
          <div className={base.heroBackdrop} aria-hidden="true"><span className={base.heroGrid} /><span className={`${base.heroGlow} ${base.glowA}`} /><span className={`${base.heroGlow} ${base.glowB}`} /></div>
          <div className={`${base.wrap} ${s.heroInner}`}>
            <div className={s.heroCopy}>
              <span className={base.eyebrow}><Gift size={13} aria-hidden="true" /> {t("KUAFÖR · BERBER · GÜZELLİK SALONU")}</span>
              <h1 id="ad-title" className={base.title}>{t("Sen uyurken bile")}<br /><em>{t("randevu gelsin.")}</em></h1>
              <p className={base.lead}>{t("Telefon başında beklemene gerek yok. Müşterin 7/24 kendi randevusunu alır, hatırlatma mesajı kendiliğinden gider.")}</p>
              <Link href={SIGNUP} className={`${base.btnLime} ${s.cta}`}>{t("Ücretsiz başla")} <ArrowUpRight size={18} aria-hidden="true" /></Link>
              <ul className={s.proof}>
                <li><Check size={14} aria-hidden="true" /> {t("İlk ay ücretsiz")}</li>
                <li><Check size={14} aria-hidden="true" /> {t("Kredi kartı gerekmez")}</li>
                <li><Check size={14} aria-hidden="true" /> {t("2 dakikada kurulum")}</li>
              </ul>
            </div>
            <div className={s.phone} aria-hidden="true">
              <div className={s.phoneScreen}>
                <span className={s.phoneTime}><Moon size={13} /> 23:42</span>
                <div className={s.notice} style={{ "--i": 0 } as CSSProperties}><span><CalendarCheck2 size={15} /></span><p><b>{t("Yeni randevu")}</b>{t("Ayşe K. · Saç kesimi · Yarın 10:00")}</p></div>
                <div className={s.notice} style={{ "--i": 1 } as CSSProperties}><span><CalendarCheck2 size={15} /></span><p><b>{t("Yeni randevu")}</b>{t("Mehmet T. · Sakal · Yarın 11:30")}</p></div>
                <div className={`${s.notice} ${s.noticeSoft}`} style={{ "--i": 2 } as CSSProperties}><span><BellRing size={15} /></span><p><b>{t("Hatırlatma gönderildi")}</b>{t("WhatsApp · Zeynep A. · 14:00")}</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${base.wrap} ${s.section}`} aria-labelledby="ad-benefits">
          <span className={base.kicker}>{t("NE KAZANIRSIN?")}</span>
          <h2 id="ad-benefits" className={s.h2}>{t("Daha az telefon, daha çok randevu.")}</h2>
          <ul className={s.benefits}>
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className={s.icon}><Icon size={20} aria-hidden="true" /></span>
                <div><h3>{t(title)}</h3><p>{t(text)}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${base.wrap} ${s.section}`} aria-labelledby="ad-steps">
          <span className={base.kicker}>{t("NASIL BAŞLARIM?")}</span>
          <h2 id="ad-steps" className={s.h2}>{t("Bugün kur, bugün randevu al.")}</h2>
          <ol className={s.steps}>
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title}>
                <span className={s.stepNo}>{index + 1}</span>
                <div><h3><Icon size={16} aria-hidden="true" /> {t(title)}</h3><p>{t(text)}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${base.wrap} ${s.section}`} aria-labelledby="ad-offer">
          <div className={s.offer}>
            <span className={s.offerBadge}><Gift size={14} aria-hidden="true" /> {t("Lansmana özel")}</span>
            <h2 id="ad-offer">{t("İlk ay tamamen ücretsiz")}</h2>
            <p>{priceText}</p>
            <Link href={SIGNUP} className={`${base.btnLime} ${s.cta}`}>{t("Ücretsiz başla")} <ArrowUpRight size={18} aria-hidden="true" /></Link>
            <small><Smartphone size={13} aria-hidden="true" /> {t("Web, iPhone ve Android'de çalışır")}</small>
          </div>
        </section>

        <section className={`${base.wrap} ${s.section}`} aria-labelledby="ad-faq">
          <h2 id="ad-faq" className={s.h2}>{t("Merak edilenler")}</h2>
          <div className={base.faqList}>
            {FAQ.map(([question, answer]) => (
              <details key={question} className={base.faqItem}>
                <summary>{t(question)}<span aria-hidden="true" /></summary>
                <p>{t(answer)}</p>
              </details>
            ))}
          </div>
          <p className={s.help}>{t("Sorun mu var?")} <a href={phoneHref}>{t("Bizi ara: {phone}", { phone: SELLER.phone })}</a></p>
        </section>
      </main>

      {/* Telefonda hep görünen başlat düğmesi */}
      <div className={s.sticky}>
        <Link href={SIGNUP} className={`${base.btnLime} ${s.stickyCta}`}>{t("Ücretsiz başla · İlk ay ücretsiz")} <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
