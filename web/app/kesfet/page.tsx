import Link from "next/link";
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarCheck2, ShieldCheck, Sparkles, Star } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { DiscoverInteractive } from "./kesfet-client";

export default function DiscoverPage() {
  return (
    <div className="marketing-page discover-v2 min-h-screen">
      <MarketingHeader />

      <main className="discover-main mx-auto w-full max-w-7xl px-4 py-12 lg:px-8">
        {/* Hero — server-rendered for SEO */}
        <div className="discover-hero mb-10">
          <div className="discover-hero-copy">
            <div className="discover-eyebrow"><Sparkles size={14} /> Sana özel keşif</div>
            <h1>İyi hissettiren<br /><em>hizmeti keşfet.</em></h1>
            <p>Yakınındaki güvenilir işletmeleri, gerçek müşteri puanlarını ve sana uygun hizmetleri tek yerde bul. Kararını ver, randevunu saniyeler içinde al.</p>
            <div className="discover-trust-row"><span><ShieldCheck size={15} /> Güvenilir işletmeler</span><span><Star size={15} /> Gerçek yorumlar</span><span><CalendarCheck2 size={15} /> 7/24 randevu</span></div>
          </div>
          <aside className="discover-business-portal">
            <div className="business-portal-icon"><BriefcaseBusiness size={23} /></div>
            <span>İŞLETME SAHİPLERİ İÇİN</span>
            <h2>Takviminizi değil,<br />işletmenizi büyütün.</h2>
            <p>Randevu, ekip, müşteri ve gelirinizi tek profesyonel çalışma alanında yönetin.</p>
            <Link href="/ozellikler">İşletme çözümlerini keşfet <ArrowUpRight size={16} /></Link>
            <small><BadgeCheck size={13} /> 14 gün ücretsiz · Kart gerekmez</small>
          </aside>
        </div>

        {/* Interactive search, filters, results — client component */}
        <DiscoverInteractive />
      </main>
      <MarketingFooter />
    </div>
  );
}
