import type { Metadata } from "next";
import Link from "@/i18n/link";
import { ArrowRight, MapPin } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, graph, localePath, type Crumb } from "@/lib/seo/schema";
import { districtRanking, getCity } from "@/lib/seo/seo-data";
import { joinList } from "@/lib/seo/text";
import { getLocale, getT } from "@/i18n/server";

export const revalidate = 3600;

// Muğla'nın asıl şehir sayfası /sehir/mugla; bu sayfa ilçe girişi olarak kalır ve kanonik olarak oraya işaret eder.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return createPublicMetadata({
    title: t("Muğla Online Randevu ve Yerel İşletmeler"),
    description: t("Muğla'daki kuaför, berber, güzellik, spa ve bakım işletmelerini ilçe ilçe keşfet; Fethiye ve diğer ilçelerde müsait saatleri görüp online randevu al."),
    pathname: "/sehir/mugla",
    locale: await getLocale(),
  });
}

export default async function MuglaPage() {
  const [city, t, locale] = await Promise.all([getCity("mugla"), getT(), getLocale()]);
  const crumbs: Crumb[] = [{ name: t("Ana Sayfa"), path: localePath("/", locale) }, { name: "Muğla", path: localePath("/mugla", locale) }]; // i18n-ignore — il adı
  const districts = city ? districtRanking(city.businesses) : [];
  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={graph(breadcrumbJsonLd(crumbs))} />
        <Breadcrumbs items={crumbs} />
        <section className="mt-10 rounded-[34px] bg-[linear-gradient(135deg,#eff7ec,#dfeee1)] p-8 sm:p-14">
          <MapPin className="text-[#0b6b45]" aria-hidden="true" />
          <h1 className="mt-5 text-5xl font-bold tracking-[-.055em] text-[#10241c] sm:text-7xl">{t("Muğla'da online randevu")}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#60756a]">{t("Muğla'nın ilçelerindeki gerçek işletmeleri, hizmetleri ve müsait saatleri tek yerde keşfedin.")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sehir/mugla" className="inline-flex items-center gap-3 rounded-full bg-[#0b6b45] px-6 py-4 text-sm font-bold text-white">{t("Muğla'daki tüm işletmeler")} <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/mugla/fethiye" className="inline-flex items-center gap-3 rounded-full border border-[#0b6b45]/25 bg-white px-6 py-4 text-sm font-bold text-[#0b6b45]">{t("Fethiye işletmeleri")} <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </section>
        {districts.length > 0 && (
          <p className="mt-8 max-w-3xl text-sm leading-7 text-[#60756a]">
            {t("Şu anda {districts} ilçelerinde online randevu alan işletmeler bulunuyor.", { districts: joinList(districts.slice(0, 8).map((item) => `${item.name} (${item.count})`), locale) })}
          </p>
        )}
      </main>
    </MarketingPage>
  );
}
