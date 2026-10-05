import Link from "next/link";
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { DiscoverInteractive } from "./kesfet-client";
import styles from "./discover.module.css";

export default function DiscoverPage() {
  return (
    <div className="marketing-page min-h-screen">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-0 sm:pt-8 lg:px-8">
        {/* Hero — sunucuda çizilir (SEO) */}
        <section className={`${styles.page} ${styles.hero}`}>
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div>
              <span className={styles.eyebrow}><Sparkles size={13} /> KEŞFET</span>
              <h1 className={styles.heroTitle}>İyi hissettiren<br /><em>hizmeti bul.</em></h1>
              <p className={styles.heroText}>Yakınındaki güvenilir işletmeleri karşılaştır, gerçek yorumları incele ve uygun saatten saniyeler içinde randevunu al.</p>
              <div className={styles.heroStats}>
                <span className={styles.heroStat}><ShieldCheck size={15} /> Güvenli randevu</span>
                <span className={styles.heroStat}><BadgeCheck size={15} /> Gerçek yorumlar</span>
                <span className={styles.heroStat}><CalendarCheck2 size={15} /> 7/24 açık</span>
              </div>
            </div>
            <div className={styles.heroMascot}><RoviMascot size={118} mood="wave" alt="Rovi keşif rehberi" priority /></div>
          </div>
        </section>

        <DiscoverInteractive />

        {/* İşletme sahipleri için sade çağrı */}
        <section className={`${styles.page} ${styles.empty}`} style={{ marginTop: 36, borderStyle: "solid", justifyItems: "start", textAlign: "left" }}>
          <span className={styles.eyebrow} style={{ color: "var(--green-2)", borderColor: "var(--line)", background: "var(--soft)" }}><BriefcaseBusiness size={13} /> İŞLETME SAHİPLERİ İÇİN</span>
          <h3>İşletmeni burada listele, randevularını tek yerden yönet.</h3>
          <p>Takvim, ekip, müşteri ve kasa yönetimi tek profesyonel çalışma alanında. Lansmana özel ilk 3 ay ücretsiz.</p>
          <div className={styles.emptyActions} style={{ justifyContent: "flex-start" }}>
            <Link href="/isletmeler" className={`${styles.pill} ${styles.pillPrimary}`}>İşletme çözümleri <ArrowUpRight size={15} /></Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
