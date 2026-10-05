"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck2, CheckCircle2, Clock3, Layers3, Search, ShieldCheck, Sparkles, Wallet, X } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";
import { formatDuration, formatPrice, initials, normalizeSearchText } from "./utils";
import styles from "../storefront.module.css";

type Group = { id: string; name: string; icon: string; color: string; items: Service[] };

const DEFAULT_COLOR = "#1f7a4a";

interface Props {
  services: Service[];
  categories: ServiceCategory[];
  staff: Staff[];
  bookingHref: string;
  businessName: string;
}

export function ServicesSection({ services, categories, staff, bookingHref, businessName }: Props) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [detail, setDetail] = useState<Service | null>(null);

  const bookable = useMemo(() => services.filter((service) => service.isActive !== false && service.isBookableOnline !== false), [services]);

  const groups = useMemo<Group[]>(() => {
    const sortedCats = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const bySort = (a: Service, b: Service) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "tr");
    const rows: Group[] = sortedCats
      .map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon || "✦",
        color: category.color || DEFAULT_COLOR,
        items: bookable.filter((service) => service.category === category.id).sort(bySort),
      }))
      .filter((group) => group.items.length > 0);
    const known = new Set(sortedCats.map((category) => category.id));
    const rest = bookable.filter((service) => !service.category || !known.has(service.category)).sort(bySort);
    if (rest.length > 0) rows.push({ id: "other", name: rows.length ? "Diğer hizmetler" : "Tüm hizmetler", icon: "✦", color: DEFAULT_COLOR, items: rest });
    return rows;
  }, [bookable, categories]);

  const safeCat = activeCat === "all" || groups.some((group) => group.id === activeCat) ? activeCat : "all";
  const needle = normalizeSearchText(query);
  const visible = groups
    .filter((group) => safeCat === "all" || group.id === safeCat)
    .map((group) => ({
      ...group,
      items: needle ? group.items.filter((service) => normalizeSearchText(`${service.name} ${service.description ?? ""} ${group.name}`).includes(needle)) : group.items,
    }))
    .filter((group) => group.items.length > 0);
  const visibleCount = visible.reduce((total, group) => total + group.items.length, 0);

  const hrefFor = (serviceId: string, staffId?: string) => `${bookingHref}?service=${encodeURIComponent(serviceId)}${staffId ? `&staff=${encodeURIComponent(staffId)}` : ""}`;

  if (bookable.length === 0) {
    return (
      <div className={styles.empty}>
        <RoviMascot size={92} mood="thinking" alt="Rovi düşünüyor" />
        <h3>Hizmet menüsü hazırlanıyor</h3>
        <p>{businessName} henüz online hizmet eklemedi. Yine de randevu sayfasından uygun saatlere göz atabilir ya da işletmeye mesaj gönderebilirsin.</p>
        <Link href={bookingHref} className={`${styles.pill} ${styles.pillPrimary}`} style={{ marginTop: 10 }}><CalendarCheck2 size={16} /> Randevu sayfasına git</Link>
      </div>
    );
  }

  return (
    <>
      {bookable.length > 5 && (
        <div className={styles.search} role="search">
          <Search size={20} aria-hidden="true" />
          <label htmlFor="storefront-service-search" className={styles.srOnly}>Hizmet ara</label>
          <input id="storefront-service-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hizmet ara (örn. saç kesimi)" autoComplete="off" enterKeyHint="search" />
          {query && <button type="button" className={styles.iconBtn} onClick={() => setQuery("")} aria-label="Aramayı temizle"><X size={17} /></button>}
        </div>
      )}

      {groups.length > 1 && (
        <div className={styles.chips} role="group" aria-label="Hizmet kategorileri">
          <button type="button" aria-pressed={safeCat === "all"} className={`${styles.chip} ${safeCat === "all" ? styles.chipActive : ""}`} onClick={() => setActiveCat("all")}>
            <span className={styles.chipIcon} aria-hidden="true"><Layers3 size={16} /></span>Tümü <small>{bookable.length}</small>
          </button>
          {groups.map((group) => (
            <button key={group.id} type="button" aria-pressed={safeCat === group.id} className={`${styles.chip} ${safeCat === group.id ? styles.chipActive : ""}`} style={{ "--cat": group.color } as CSSProperties} onClick={() => setActiveCat(safeCat === group.id ? "all" : group.id)}>
              <span className={styles.chipIcon} aria-hidden="true"><ServiceCategoryIcon icon={group.icon} name={group.name} size={16} /></span>
              {group.name} <small>{group.items.length}</small>
            </button>
          ))}
        </div>
      )}

      <p className={styles.srOnly} aria-live="polite">{visibleCount} hizmet gösteriliyor</p>

      <div className={styles.groups}>
        {visible.map((group) => (
          <section key={group.id} aria-labelledby={`svc-group-${group.id}`} style={{ "--cat": group.color } as CSSProperties}>
            {(groups.length > 1 || group.id !== "other") && (
              <header className={styles.groupHead}>
                <span className={styles.groupIcon} aria-hidden="true"><ServiceCategoryIcon icon={group.icon} name={group.name} size={18} /></span>
                <h3 id={`svc-group-${group.id}`}>{group.name}</h3>
                <span>{group.items.length} hizmet</span>
              </header>
            )}
            <div className={styles.serviceList}>
              {group.items.map((service, index) => (
                <article key={service.id} className={styles.service} style={{ "--i": Math.min(index, 8) } as CSSProperties}>
                  <button type="button" className={styles.serviceOpen} onClick={() => setDetail(service)} aria-label={`${service.name} detaylarını gör`} />
                  <div className={styles.serviceInfo}>
                    <h4>{service.name}</h4>
                    {service.description && <p>{service.description}</p>}
                    <div className={styles.serviceMeta}>
                      <span className={styles.metaTag}><Clock3 size={13} aria-hidden="true" /> {formatDuration(service.durationMinutes)}</span>
                      {service.requiresDeposit && service.depositAmount > 0 && <span className={`${styles.metaTag} ${styles.metaDeposit}`}><Wallet size={13} aria-hidden="true" /> Kapora {formatPrice(service.depositAmount, service.currency)}</span>}
                    </div>
                  </div>
                  <div className={styles.serviceSide}>
                    <span className={styles.servicePrice}>{service.price > 0 ? formatPrice(service.price, service.currency) : "Ücretsiz"}</span>
                    <Link href={hrefFor(service.id)} className={styles.selectBtn} aria-label={`${service.name} için randevu al`}>Seç</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {visible.length === 0 && (
          <div className={styles.noResults}>
            <Search size={24} aria-hidden="true" />
            <strong>“{query}” ile eşleşen hizmet yok</strong>
            <span>Daha kısa bir kelimeyle tekrar dene.</span>
            <button type="button" className={styles.pill} onClick={() => { setQuery(""); setActiveCat("all"); }}>Aramayı temizle</button>
          </div>
        )}
      </div>

      <div className={styles.assurance}>
        <span><CheckCircle2 size={15} aria-hidden="true" /> Şeffaf fiyat</span>
        <span><CalendarCheck2 size={15} aria-hidden="true" /> Anlık uygunluk</span>
        <span><ShieldCheck size={15} aria-hidden="true" /> Güvenli online randevu</span>
      </div>

      {detail && <ServiceSheet service={detail} staff={staff} groups={groups} hrefFor={hrefFor} onClose={() => setDetail(null)} />}
    </>
  );
}

function ServiceSheet({ service, staff, groups, hrefFor, onClose }: { service: Service; staff: Staff[]; groups: Group[]; hrefFor: (serviceId: string, staffId?: string) => string; onClose: () => void }) {
  const group = groups.find((item) => item.items.some((row) => row.id === service.id));
  const experts = staff.filter((member) => member.serviceIds?.includes(service.id) || service.assignableStaffIds?.includes(member.id));

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="service-sheet-title">
        <div className={styles.grabber} aria-hidden="true" />
        <header className={styles.sheetHead}>
          <div>
            <small>{group?.name?.toLocaleUpperCase("tr-TR") ?? "HİZMET"}</small>
            <h3 id="service-sheet-title">{service.name}</h3>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Kapat" autoFocus><X size={18} /></button>
        </header>
        <div className={styles.sheetBody}>
          {service.description ? <p>{service.description}</p> : <p>Detaylar için işletmeye mesaj gönderebilir ya da doğrudan randevu oluşturabilirsin.</p>}
          <div className={styles.facts}>
            <div className={styles.fact}><small>ÜCRET</small><b>{service.price > 0 ? formatPrice(service.price, service.currency) : "Ücretsiz"}</b></div>
            <div className={styles.fact}><small>SÜRE</small><b>{formatDuration(service.durationMinutes)}</b></div>
            {service.requiresDeposit && service.depositAmount > 0 && <div className={styles.fact}><small>KAPORA</small><b>{formatPrice(service.depositAmount, service.currency)}</b></div>}
            <div className={styles.fact}><small>RANDEVU</small><b><Sparkles size={14} aria-hidden="true" /> Online</b></div>
          </div>
          {experts.length > 0 && <>
            <span className={styles.sheetLabel}>UZMAN SEÇEREK RANDEVU AL</span>
            <div className={styles.sheetStaff}>
              {experts.map((member) => (
                <Link key={member.id} href={hrefFor(service.id, member.id)}>
                  <span className={styles.miniAvatar}>{member.photoUrl ? <Image src={member.photoUrl} alt="" fill sizes="32px" /> : initials(member.fullName)}</span>
                  {member.fullName}
                </Link>
              ))}
            </div>
          </>}
        </div>
        <footer className={styles.sheetFoot}>
          <Link href={hrefFor(service.id)} className={`${styles.pill} ${styles.pillPrimary}`}><CalendarCheck2 size={17} /> Bu hizmetle randevu al</Link>
        </footer>
      </section>
    </div>
  );
}
