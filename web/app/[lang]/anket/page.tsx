import Link from "@/i18n/link";
import { ArrowUpRight, BellRing, CalendarCheck2, Compass, ShieldCheck } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";
import { breadcrumbJsonLd, graph, webPageJsonLd } from "@/lib/seo/schema";
import { absoluteUrl } from "@/lib/seo/site";
import { SurveyExperience } from "./anket-client";
import { TrackedLink } from "./tracked-link";
import styles from "./anket.module.css";
import { tk } from "@/i18n/config";

const TITLE = tk("Randevu Karakter Testi: Sen Hangi İşletmecisin?");
const DESCRIPTION = tk("Telefon Ninjası mı, Defter Ustası mı, Gece Kuşu mu? 8 eğlenceli soruyu cevapla, randevu karakterini öğren ve haftada kaç saat kazanabileceğini gör.");

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t(TITLE),
    description: t(DESCRIPTION),
    pathname: "/anket",
    keywords: [t("randevu karakter testi"), t("işletme testi"), t("kuaför randevu"), t("berber randevu"), t("online randevu sistemi"), t("randevu hatırlatma")],
    // Aynı klasördeki opengraph-image.tsx kullanılsın.
    image: null,
    locale: await getLocale(),
  });
}

export default async function SurveyPage() {
  const t = await getT();
  const pageUrl = absoluteUrl("/anket");
  const jsonLd = graph(
    webPageJsonLd({ path: "/anket", name: t(TITLE), description: t(DESCRIPTION), breadcrumbId: `${pageUrl}#breadcrumb` }),
    breadcrumbJsonLd([{ name: t("Ana Sayfa"), path: "/" }, { name: t("Randevu Karakter Testi"), path: "/anket" }], `${pageUrl}#breadcrumb`),
  );

  return (
    <div className="marketing-page min-h-screen">
      <MarketingHeader />
      <main>
        <SurveyExperience />

        {/* Sunucuda çizilen kısa tanıtım: test oynanmadan da sayfanın ne sunduğu anlaşılır. */}
        <section className={styles.about} aria-labelledby="anket-about-title">
          <div className={styles.aboutInner}>
            <span className={styles.aboutKicker}>{t("Neden bu test?")}</span>
            <h2 id="anket-about-title" className={styles.aboutTitle}>{t("Randevu trafiği, fark etmeden haftanı yiyor olabilir.")}</h2>
            <p className={styles.aboutText}>
              {t("Kuaförden berbere, kliniğe, diyetisyene, kursa kadar pek çok işletme günün önemli bir kısmını telefon, WhatsApp ve DM ile randevu ayarlamaya harcıyor. SeninRandevun bu işi senin yerine 7/24 yapar. Lansmana özel ilk ay ücretsiz.")}
            </p>
            <div className={styles.aboutGrid}>
              <article className={styles.aboutCard}>
                <span className={styles.aboutIcon}><CalendarCheck2 size={20} aria-hidden="true" /></span>
                <h3>{t("7/24 online randevu")}</h3>
                <p>{t("Müşterilerin paylaştığın bağlantıdan boş saati görür ve randevusunu kendisi alır.")}</p>
              </article>
              <article className={styles.aboutCard}>
                <span className={styles.aboutIcon}><BellRing size={20} aria-hidden="true" /></span>
                <h3>{t("SMS ve bildirim hatırlatma")}</h3>
                <p>{t("Randevudan önce otomatik hatırlatma gider; unutulan ve gelinmeyen randevular azalır.")}</p>
              </article>
              <article className={styles.aboutCard}>
                <span className={styles.aboutIcon}><ShieldCheck size={20} aria-hidden="true" /></span>
                <h3>{t("Çakışmayan takvim")}</h3>
                <p>{t("Personel, hizmet süresi ve çalışma saatleri hesaba katılır; dolu saat seçilemez.")}</p>
              </article>
            </div>
            <div className={styles.aboutLinks}>
              <TrackedLink event="cta_signup" href="/isletmeler/kayit" className={`${styles.aboutLink} ${styles.aboutLinkPrimary}`}>{t("İşletmeni ücretsiz aç")} <ArrowUpRight size={15} aria-hidden="true" /></TrackedLink>
              <Link href="/ozellikler" className={styles.aboutLink}>{t("Tüm özellikler")}</Link>
              <TrackedLink event="cta_customer" href="/kesfet" className={styles.aboutLink}><Compass size={15} aria-hidden="true" /> {t("Müşteriysen: işletme keşfet")}</TrackedLink>
            </div>
          </div>
        </section>
        <JsonLd data={jsonLd} />
      </main>
      <MarketingFooter />
    </div>
  );
}
