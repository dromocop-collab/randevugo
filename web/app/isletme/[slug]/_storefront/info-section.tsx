"use client";

import { ArrowUpRight, AtSign, Camera, Clock3, Coffee, Globe2, Info, Mail, MapPin, MessageCircle, Music2, Navigation, Phone, PlayCircle, Share2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { SupportRequestModal } from "@/components/support/support-request-modal";
import type { Business, DaySchedule } from "@/types/business";
import { DAY_NAMES, WEEK_ORDER, mapsHref, socialLinks, telHref, websiteHref, whatsappHref } from "./utils";
import styles from "../storefront.module.css";

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  instagram: Camera, tiktok: Music2, facebook: AtSign, youtube: PlayCircle, twitter: AtSign, whatsapp: MessageCircle,
};

export function InfoSection({ business, workingHours, today }: { business: Business; workingHours: DaySchedule[]; today: number | null }) {
  const socials = socialLinks(business);
  const website = websiteHref(business.website);
  const whatsapp = business.socialMedia?.whatsapp ? whatsappHref(business.socialMedia.whatsapp) : null;
  const addressLine = [business.district, business.city].filter(Boolean).join(", ");
  const hours = WEEK_ORDER.map((day) => workingHours.find((item) => item.day === day) ?? null);
  const hasHours = workingHours.length > 0;

  return (
    <div className={styles.infoGrid}>
      {business.description && (
        <article className={`${styles.card} ${styles.infoWide}`}>
          <h3 className={styles.cardTitle}><Info size={18} aria-hidden="true" /> Hakkında</h3>
          <p className={styles.about}>{business.description}</p>
        </article>
      )}

      <article className={styles.card}>
        <h3 className={styles.cardTitle}><MapPin size={18} aria-hidden="true" /> Konum</h3>
        <a href={mapsHref(business)} target="_blank" rel="noopener noreferrer" className={styles.map} aria-label={`${business.name} konumunu Google Haritalar'da aç`}>
          <span className={styles.mapGrid} aria-hidden="true" />
          <span className={styles.mapPin} aria-hidden="true"><MapPin size={20} /></span>
          <span className={styles.mapCta}>Haritada aç <ArrowUpRight size={14} aria-hidden="true" /></span>
        </a>
        {business.address && <p className={styles.address}>{business.address}</p>}
        {addressLine && <p className={styles.addressSub}>{addressLine}</p>}
        <div className={styles.rowActions}>
          <a href={mapsHref(business)} target="_blank" rel="noopener noreferrer" className={`${styles.pill} ${styles.pillPrimary}`}><Navigation size={15} aria-hidden="true" /> Yol tarifi al</a>
          <button
            type="button"
            className={styles.pill}
            onClick={async () => {
              const text = [business.name, business.address, addressLine].filter(Boolean).join(", ");
              try { await navigator.clipboard.writeText(text); toast.success("Adres kopyalandı."); } catch { toast.error("Adres kopyalanamadı."); }
            }}
          >
            <Share2 size={15} aria-hidden="true" /> Adresi kopyala
          </button>
        </div>
      </article>

      <article className={styles.card}>
        <h3 className={styles.cardTitle}><Clock3 size={18} aria-hidden="true" /> Çalışma saatleri</h3>
        {hasHours ? (
          <ul className={styles.hours}>
            {hours.map((row, index) => {
              const day = WEEK_ORDER[index];
              const isToday = today === day;
              const open = !!row?.isOpen;
              return (
                <li key={day} className={`${styles.hoursRow} ${isToday ? styles.hoursToday : ""}`} aria-current={isToday ? "date" : undefined}>
                  <span>{DAY_NAMES[day]}{isToday && <em>BUGÜN</em>}</span>
                  {open ? (
                    <b>
                      {row!.start} – {row!.end}
                      {row!.breakStart && row!.breakEnd && <small><Coffee size={11} aria-hidden="true" /> Mola {row!.breakStart}–{row!.breakEnd}</small>}
                    </b>
                  ) : <b className={styles.hoursClosed}>Kapalı</b>}
                </li>
              );
            })}
          </ul>
        ) : <p className={styles.about}>İşletme çalışma saatlerini henüz eklemedi. Uygun saatleri randevu sayfasında görebilirsin.</p>}
      </article>

      <article className={styles.card}>
        <h3 className={styles.cardTitle}><Phone size={18} aria-hidden="true" /> İletişim</h3>
        <div className={styles.contactList}>
          {business.phone && (
            <a href={telHref(business.phone)} className={styles.contact}>
              <i><Phone size={18} aria-hidden="true" /></i><span><small>TELEFON</small><b>{business.phone}</b></span><ArrowUpRight size={16} aria-hidden="true" />
            </a>
          )}
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={styles.contact}>
              <i><MessageCircle size={18} aria-hidden="true" /></i><span><small>WHATSAPP</small><b>Mesaj yaz</b></span><ArrowUpRight size={16} aria-hidden="true" />
            </a>
          )}
          {business.email && (
            <a href={`mailto:${business.email}`} className={styles.contact}>
              <i><Mail size={18} aria-hidden="true" /></i><span><small>E-POSTA</small><b>{business.email}</b></span><ArrowUpRight size={16} aria-hidden="true" />
            </a>
          )}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className={styles.contact}>
              <i><Globe2 size={18} aria-hidden="true" /></i><span><small>WEB SİTESİ</small><b>{website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</b></span><ArrowUpRight size={16} aria-hidden="true" />
            </a>
          )}
        </div>
        <div className={styles.messageWrap}>
          <SupportRequestModal audience="storefront" businessId={business.id} businessName={business.name} triggerLabel="İşletmeye mesaj gönder" triggerClassName="storefront-info-msg" />
        </div>
      </article>

      {socials.length > 0 && (
        <article className={styles.card}>
          <h3 className={styles.cardTitle}><AtSign size={18} aria-hidden="true" /> Sosyal medya</h3>
          <div className={styles.socials}>
            {socials.map((link) => {
              const Icon = SOCIAL_ICONS[link.key] ?? Globe2;
              return <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" className={styles.social}><Icon size={16} aria-hidden="true" /> {link.label}</a>;
            })}
          </div>
        </article>
      )}
    </div>
  );
}
