import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Clock3, Headphones, LayoutDashboard, LifeBuoy, Mail, MessageCircleMore, Phone, ShieldCheck, Store, UserRound } from "lucide-react";
import { SupportRequestModal } from "@/components/support/support-request-modal";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { Crumbs, SectionHead, cx } from "./ui";
import mp from "./mp.module.css";
import s from "./contact.module.css";

const channels = [
  { id: "whatsapp", icon: MessageCircleMore, eyebrow: "En hızlı kanal", label: "WhatsApp", value: "0530 478 82 98", note: "Hızlı mesaj gönderin", href: "https://wa.me/905304788298", cta: "Mesaj yaz", external: true },
  { id: "email", icon: Mail, eyebrow: "Detaylı talepler", label: "E-posta", value: "info@seninrandevun.com", note: "Genel sorular ve iş birlikleri", href: "mailto:info@seninrandevun.com", cta: "E-posta gönder", external: false },
  { id: "phone", icon: Phone, eyebrow: "Doğrudan görüşme", label: "Telefon", value: "0530 478 82 98", note: "Hafta içi 09:00–18:00", href: "tel:+905304788298", cta: "Hemen ara", external: false },
];

export function ContactPage() {
  return (
    <main className={mp.page}>
      <section className={mp.hero}>
        <div className={mp.heroGrid} aria-hidden="true" />
        <div className={cx(mp.shell, s.heroInner)}>
          <div className={s.heroCopy}>
            <Crumbs items={[{ href: "/", label: "Ana Sayfa" }, { label: "İletişim" }]} />
            <span className={cx(mp.eyebrow, mp.rise)}><Headphones size={13} aria-hidden="true" /> Bize ulaşın</span>
            <h1 className={cx(mp.title, mp.rise)} style={{ "--i": 1 } as CSSProperties}>Sorunuz varsa<br /><em>gerçek bir insan burada.</em></h1>
            <p className={cx(mp.lead, mp.rise)} style={{ "--i": 2 } as CSSProperties}>Kurulum, özellikler, ödeme veya işletmenize özel kullanım senaryoları için bize ulaşabilirsiniz.</p>
            <div className={mp.pills}>
              <span className={mp.pill}><Clock3 size={13} aria-hidden="true" /> Hafta içi 09:00–18:00</span>
              <span className={mp.pill}><ShieldCheck size={13} aria-hidden="true" /> Bilgileriniz yalnızca talebiniz için kullanılır</span>
            </div>
          </div>
          <div className={s.heroMascot} aria-hidden="true"><RoviMascot size={160} mood="happy" alt="" priority /></div>
        </div>
      </section>

      <div className={mp.shell}>
        <ul className={s.channels} aria-label="İletişim kanalları">
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
          <SectionHead id="mesaj-baslik" kicker="Mesaj bırakın" title={<>Size uygun kanaldan<br /><em>biz dönelim.</em></>} sub="Formu doldurun; mesajınız destek ekibimize ulaşır ve verdiğiniz telefon üzerinden size dönüş yapılır." />
          <div className={s.forms}>
            <article className={cx(mp.card, s.formCard, mp.reveal)}>
              <span className={s.formIcon}><Store size={20} aria-hidden="true" /></span>
              <h3>İşletme sahibiyim</h3>
              <p>Kurulum, abonelik, özellikler veya işletmenize özel ihtiyaçlar için.</p>
              <SupportRequestModal audience="business" triggerLabel="İşletme olarak yaz" triggerClassName={s.formBtn} />
            </article>
            <article className={cx(mp.card, s.formCard, mp.reveal)}>
              <span className={s.formIcon}><UserRound size={20} aria-hidden="true" /></span>
              <h3>Randevu alan müşteriyim</h3>
              <p>Hesabınız, randevularınız veya platformla ilgili sorularınız için.</p>
              <SupportRequestModal audience="customer" triggerLabel="Müşteri olarak yaz" triggerClassName={s.formBtn} />
            </article>
            <article className={cx(mp.card, s.formCard, s.formCardAlt, mp.reveal)}>
              <span className={s.formIcon}><LayoutDashboard size={20} aria-hidden="true" /></span>
              <h3>Panel kullanıcısıyım</h3>
              <p>Mevcut kullanıcılar panel içindeki Destek alanından talep oluşturabilir. Ekibimiz talebinizin durumunu aynı ekrandan paylaşır.</p>
              <Link href="/dashboard/destek" className={s.formLink}>Panelde Destek&apos;i aç <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
          </div>
        </section>

        <section className={cx(mp.section, s.selfServe)} aria-labelledby="kendin-baslik">
          <div className={cx(s.selfCard, mp.reveal)}>
            <div>
              <span className={mp.kicker}><LifeBuoy size={13} aria-hidden="true" /> Beklemeden çözün</span>
              <h2 className={mp.h2} id="kendin-baslik">Cevap belki zaten hazır.</h2>
              <p className={mp.sub}>Sık sorulan sorular ve adım adım rehberler yardım merkezlerimizde.</p>
            </div>
            <div className={s.selfLinks}>
              <Link href="/yardim-merkezi"><BookOpen size={18} aria-hidden="true" /><span><b>Müşteri yardım merkezi</b><small>Randevu, iptal, hesap</small></span><ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/isletmeler/yardim"><Store size={18} aria-hidden="true" /><span><b>İşletme yardım merkezi</b><small>Kurulum, ekip, abonelik</small></span><ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
