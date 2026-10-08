import Link from "next/link";
import { ArrowUpRight, BellRing, CalendarCheck2, Compass, ShieldCheck } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, graph, webPageJsonLd } from "@/lib/seo/schema";
import { absoluteUrl } from "@/lib/seo/site";
import { SurveyExperience } from "./anket-client";
import { TrackedLink } from "./tracked-link";
import styles from "./anket.module.css";

const TITLE = "Randevu Karakter Testi: Sen Hangi İşletmecisin?";
const DESCRIPTION = "Telefon Ninjası mı, Defter Ustası mı, Gece Kuşu mu? 8 eğlenceli soruyu cevapla, randevu karakterini öğren ve haftada kaç saat kazanabileceğini gör.";

export const metadata = createPublicMetadata({
  title: TITLE,
  description: DESCRIPTION,
  pathname: "/anket",
  keywords: ["randevu karakter testi", "işletme testi", "kuaför randevu", "berber randevu", "online randevu sistemi", "randevu hatırlatma"],
  // Aynı klasördeki opengraph-image.tsx kullanılsın.
  image: null,
});

export default function SurveyPage() {
  const pageUrl = absoluteUrl("/anket");
  const jsonLd = graph(
    webPageJsonLd({ path: "/anket", name: TITLE, description: DESCRIPTION, breadcrumbId: `${pageUrl}#breadcrumb` }),
    breadcrumbJsonLd([{ name: "Ana Sayfa", path: "/" }, { name: "Randevu Karakter Testi", path: "/anket" }], `${pageUrl}#breadcrumb`),
  );

  return (
    <div className="marketing-page min-h-screen">
      <MarketingHeader />
      <main>
        <SurveyExperience />

        {/* Sunucuda çizilen kısa tanıtım: test oynanmadan da sayfanın ne sunduğu anlaşılır. */}
        <section className={styles.about} aria-labelledby="anket-about-title">
          <div className={styles.aboutInner}>
            <span className={styles.aboutKicker}>Neden bu test?</span>
            <h2 id="anket-about-title" className={styles.aboutTitle}>Randevu trafiği, fark etmeden haftanı yiyor olabilir.</h2>
            <p className={styles.aboutText}>
              Kuaförden berbere, kliniğe, diyetisyene, kursa kadar pek çok işletme günün önemli bir kısmını telefon, WhatsApp ve DM ile
              randevu ayarlamaya harcıyor. SeninRandevun bu işi senin yerine 7/24 yapar. Lansmana özel ilk ay ücretsiz.
            </p>
            <div className={styles.aboutGrid}>
              <article className={styles.aboutCard}>
                <span className={styles.aboutIcon}><CalendarCheck2 size={20} aria-hidden="true" /></span>
                <h3>7/24 online randevu</h3>
                <p>Müşterilerin paylaştığın bağlantıdan boş saati görür ve randevusunu kendisi alır.</p>
              </article>
              <article className={styles.aboutCard}>
                <span className={styles.aboutIcon}><BellRing size={20} aria-hidden="true" /></span>
                <h3>SMS ve bildirim hatırlatma</h3>
                <p>Randevudan önce otomatik hatırlatma gider; unutulan ve gelinmeyen randevular azalır.</p>
              </article>
              <article className={styles.aboutCard}>
                <span className={styles.aboutIcon}><ShieldCheck size={20} aria-hidden="true" /></span>
                <h3>Çakışmayan takvim</h3>
                <p>Personel, hizmet süresi ve çalışma saatleri hesaba katılır; dolu saat seçilemez.</p>
              </article>
            </div>
            <div className={styles.aboutLinks}>
              <TrackedLink event="cta_signup" href="/isletmeler/kayit" className={`${styles.aboutLink} ${styles.aboutLinkPrimary}`}>İşletmeni ücretsiz aç <ArrowUpRight size={15} aria-hidden="true" /></TrackedLink>
              <Link href="/ozellikler" className={styles.aboutLink}>Tüm özellikler</Link>
              <TrackedLink event="cta_customer" href="/kesfet" className={styles.aboutLink}><Compass size={15} aria-hidden="true" /> Müşteriysen: işletme keşfet</TrackedLink>
            </div>
          </div>
        </section>
        <JsonLd data={jsonLd} />
      </main>
      <MarketingFooter />
    </div>
  );
}
