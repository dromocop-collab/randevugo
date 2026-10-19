import Link from "@/i18n/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Clock3, Headphones, LayoutDashboard, LifeBuoy, Mail, MapPin, MessageCircleMore, Phone, ShieldCheck, Store, UserRound } from "lucide-react";
import { SupportRequestModal } from "@/components/support/support-request-modal";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { Crumbs, SectionHead, cx } from "./ui";
import mp from "./mp.module.css";
import s from "./contact.module.css";
import { SELLER } from "@/lib/legal/seller";
import type { TFunction } from "@/i18n/config";
import { getT } from "@/i18n/server";

function buildChannels(t: TFunction) {
  return [
  { id: "whatsapp", icon: MessageCircleMore, eyebrow: t("En hızlı kanal"), label: "WhatsApp", value: "0530 478 82 98", note: t("Hızlı mesaj gönderin"), href: "https://wa.me/905304788298", cta: t("Mesaj yaz"), external: true },
  { id: "email", icon: Mail, eyebrow: t("Detaylı talepler"), label: t("E-posta"), value: "info@seninrandevun.com", note: t("Genel sorular ve iş birlikleri"), href: "mailto:info@seninrandevun.com", cta: t("E-posta gönder"), external: false },
  { id: "phone", icon: Phone, eyebrow: t("Doğrudan görüşme"), label: t("Telefon"), value: "0530 478 82 98", note: t("Hafta içi 09:00–18:00"), href: "tel:+905304788298", cta: t("Hemen ara"), external: false },
  { id: "address", icon: MapPin, eyebrow: t("Yazışma adresi"), label: t("Adres"), value: SELLER.address, note: SELLER.title, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SELLER.address)}`, cta: t("Haritada aç"), external: true },
];
}

export async function ContactPage() {
  const t = await getT();
  const channels = buildChannels(t);
  return (
    <main className={mp.page}>
      <section className={mp.hero}>
        <div className={mp.heroGrid} aria-hidden="true" />
        <div className={cx(mp.shell, s.heroInner)}>
          <div className={s.heroCopy}>
            <Crumbs ariaLabel={t("İçerik haritası")} items={[{ href: "/", label: t("Ana Sayfa") }, { label: t("İletişim") }]} />
            <span className={cx(mp.eyebrow, mp.rise)}><Headphones size={13} aria-hidden="true" /> {t("Bize ulaşın")}</span>
            <h1 className={cx(mp.title, mp.rise)} style={{ "--i": 1 } as CSSProperties}>{t("Bir mesaj")}<br /><em>{t("uzağınızdayız.")}</em></h1>
            <p className={cx(mp.lead, mp.rise)} style={{ "--i": 2 } as CSSProperties}>{t("Kurulumdan ödemeye, işletmenize özel ihtiyaçlara kadar her sorunuzda ekibimiz yanınızda. Size en uygun kanaldan yazın, hızlıca dönelim.")}</p>
            <div className={mp.pills}>
              <span className={mp.pill}><Clock3 size={13} aria-hidden="true" /> {t("Hafta içi 09:00–18:00")}</span>
              <span className={mp.pill}><ShieldCheck size={13} aria-hidden="true" /> {t("Bilgileriniz yalnızca talebiniz için kullanılır")}</span>
            </div>
          </div>
          <div className={s.heroMascot} aria-hidden="true"><RoviMascot size={160} mood="happy" alt="" priority /></div>
        </div>
      </section>

      <div className={mp.shell}>
        <ul className={s.channels} aria-label={t("İletişim kanalları")}>
          {channels.map(({ id, icon: Icon, eyebrow, label, value, note, href, cta, external }, i) => (
            <li key={id} className={mp.rise} style={{ "--i": i } as CSSProperties}>
              <a href={href} className={cx(s.channel, id === "whatsapp" && s.channelWa)} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                <span className={s.channelIcon}><Icon size={22} aria-hidden="true" /></span>
                <small>{eyebrow}</small>
                <b>{label}</b>
                <span className={s.value}>{value}</span>
                <span className={s.note}>{note}</span>
                <span className={s.channelCta}>{cta} <ArrowUpRight size={15} aria-hidden="true" /></span>
              </a>
            </li>
          ))}
        </ul>

        <section className={mp.section} aria-labelledby="mesaj-baslik">
          <SectionHead id="mesaj-baslik" kicker={t("Mesaj bırakın")} title={<>{t("Size uygun kanaldan")}<br /><em>{t("biz dönelim.")}</em></>} sub={t("Formu doldurun; mesajınız destek ekibimize ulaşır ve verdiğiniz telefon üzerinden size dönüş yapılır.")} />
          <div className={s.forms}>
            <article className={cx(mp.card, s.formCard, mp.reveal)}>
              <span className={s.formIcon}><Store size={20} aria-hidden="true" /></span>
              <h3>{t("İşletme sahibiyim")}</h3>
              <p>{t("Kurulum, abonelik, özellikler veya işletmenize özel ihtiyaçlar için.")}</p>
              <SupportRequestModal audience="business" triggerLabel={t("İşletme olarak yaz")} triggerClassName={s.formBtn} />
            </article>
            <article className={cx(mp.card, s.formCard, mp.reveal)}>
              <span className={s.formIcon}><UserRound size={20} aria-hidden="true" /></span>
              <h3>{t("Randevu alan müşteriyim")}</h3>
              <p>{t("Hesabınız, randevularınız veya platformla ilgili sorularınız için.")}</p>
              <SupportRequestModal audience="customer" triggerLabel={t("Müşteri olarak yaz")} triggerClassName={s.formBtn} />
            </article>
            <article className={cx(mp.card, s.formCard, s.formCardAlt, mp.reveal)}>
              <span className={s.formIcon}><LayoutDashboard size={20} aria-hidden="true" /></span>
              <h3>{t("Panel kullanıcısıyım")}</h3>
              <p>{t("Mevcut kullanıcılar panel içindeki Destek alanından talep oluşturabilir. Ekibimiz talebinizin durumunu aynı ekrandan paylaşır.")}</p>
              <Link href="/dashboard/destek" className={s.formLink}>{t("Panelde Destek'i aç")} <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
          </div>
        </section>

        <section className={cx(mp.section, s.selfServe)} aria-labelledby="kendin-baslik">
          <div className={cx(s.selfCard, mp.reveal)}>
            <div>
              <span className={mp.kicker}><LifeBuoy size={13} aria-hidden="true" /> {t("Beklemeden çözün")}</span>
              <h2 className={mp.h2} id="kendin-baslik">{t("Cevap belki zaten hazır.")}</h2>
              <p className={mp.sub}>{t("Sık sorulan sorular ve adım adım rehberler yardım merkezlerimizde.")}</p>
            </div>
            <div className={s.selfLinks}>
              <Link href="/yardim-merkezi"><BookOpen size={18} aria-hidden="true" /><span><b>{t("Müşteri yardım merkezi")}</b><small>{t("Randevu, iptal, hesap")}</small></span><ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/isletmeler/yardim"><Store size={18} aria-hidden="true" /><span><b>{t("İşletme yardım merkezi")}</b><small>{t("Kurulum, ekip, abonelik")}</small></span><ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
