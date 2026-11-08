import Link from "@/i18n/link";
import { ArrowRight, Compass, MapPin, Store, UsersRound } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { SuggestBusinessForm } from "@/features/discovery/suggest-business-form";
import { placeVars } from "@/lib/seo/text";
import type { Locale } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import s from "./empty-city.module.css";

/** Henüz işletmesi olmayan il: hata sayfası yerine müşteriye öneri, işletmeye "ilk sen ol" yolu (arama motoruna kapalı). */
export async function EmptyCity({ city }: { city: string }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const place = placeVars(city, locale as Locale);
  return (
    <MarketingPage>
      <main className="content-page">
        <section className="geo-seo-hero">
          <span><MapPin size={14} aria-hidden="true" /> {city.toLocaleUpperCase("tr-TR")} · {t("YAKINDA")}</span>
          <h1>{t("{inPlace} yakında.", place)}</h1>
          <p>{t("Bu şehirde henüz yayında işletme yok. Gittiğin işletmeyi öner, ya da işletmen varsa ilk sen başla.")}</p>
        </section>
        <div className={s.grid}>
          <section className={s.card} aria-labelledby="empty-city-suggest">
            <span className={s.icon}><UsersRound size={20} aria-hidden="true" /></span>
            <h2 id="empty-city-suggest">{t("Gittiğin işletmeyi öner")}</h2>
            <p>{t("Kuaförün, berberin ya da salonun burada olsun istiyorsan adını yaz, onlara biz ulaşalım.")}</p>
            <SuggestBusinessForm city={city} />
          </section>
          <section className={`${s.card} ${s.owner}`} aria-labelledby="empty-city-owner">
            <span className={s.icon}><Store size={20} aria-hidden="true" /></span>
            <h2 id="empty-city-owner">{t("İşletmen mi var? {place} için ilk sen başla.", place)}</h2>
            <p>{t("Müşterilerin senin linkinden 7/24 randevu alır, bunun için sitede başka işletme olması gerekmez. İlk ay ücretsiz, kredi kartı gerekmez.")}</p>
            <Link href="/isletmeler/basla" className={s.cta}>{t("Ücretsiz başla")} <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/kesfet" className={s.link}><Compass size={15} aria-hidden="true" /> {t("Diğer şehirlerdeki işletmeleri keşfet")}</Link>
          </section>
        </div>
      </main>
    </MarketingPage>
  );
}
