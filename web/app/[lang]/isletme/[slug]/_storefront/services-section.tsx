"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "@/i18n/link";
import { CalendarCheck2, CheckCircle2, Clock3, Layers3, Search, ShieldCheck, Sparkles, Wallet, X } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";
import { formatDuration, formatPrice, initials, normalizeSearchText } from "./utils";
import { useIntlLocale, useLocale, useT } from "@/i18n/client";
import type { TFunction } from "@/i18n/config";
import { ServiceThumb } from "@/components/booking/booking-parts";
import { localizedCategoryName, localizedServiceDescription, localizedServiceName, localizedVariantName, priceTypeOf, servicePriceLabel, variantPriceLabel, variantsOf } from "@/features/services/service-pricing";
import styles from "../storefront.module.css";

type Group = { id: string; name: string; icon: string; color: string; items: Service[] };

const DEFAULT_COLOR = "#1f7a4a";

/** Vitrin fiyat etiketi: eski (sabit, seçeneksiz) hizmetler birebir eskisi gibi ("Ücretsiz" dahil). */
function priceLabel(service: Service, t: TFunction, intlLocale: string) {
  if (priceTypeOf(service) === "fixed" && variantsOf(service).length === 0 && !(service.price > 0)) return t("Ücretsiz");
  return servicePriceLabel(service, t, (value) => formatPrice(value, service.currency, intlLocale));
}

interface Props {
  services: Service[];
  categories: ServiceCategory[];
  staff: Staff[];
  bookingHref: string;
  businessName: string;
}

export function ServicesSection({ services, categories, staff, bookingHref, businessName }: Props) {
  const t = useT();
  const locale = useLocale();
  const intlLocale = useIntlLocale();
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
        name: localizedCategoryName(category, locale),
        icon: category.icon || "✦",
        color: category.color || DEFAULT_COLOR,
        items: bookable.filter((service) => service.category === category.id).sort(bySort),
      }))
      .filter((group) => group.items.length > 0);
    const known = new Set(sortedCats.map((category) => category.id));
    const rest = bookable.filter((service) => !service.category || !known.has(service.category)).sort(bySort);
    if (rest.length > 0) rows.push({ id: "other", name: rows.length ? t("Diğer hizmetler") : t("Tüm hizmetler"), icon: "✦", color: DEFAULT_COLOR, items: rest });
    return rows;
  }, [bookable, categories, locale, t]);

  const safeCat = activeCat === "all" || groups.some((group) => group.id === activeCat) ? activeCat : "all";
  const needle = normalizeSearchText(query);
  const visible = groups
    .filter((group) => safeCat === "all" || group.id === safeCat)
    .map((group) => ({
      ...group,
      items: needle ? group.items.filter((service) => normalizeSearchText(`${service.name} ${service.description ?? ""} ${localizedServiceName(service, locale)} ${localizedServiceDescription(service, locale) ?? ""} ${group.name}`).includes(needle)) : group.items,
    }))
    .filter((group) => group.items.length > 0);
  const visibleCount = visible.reduce((total, group) => total + group.items.length, 0);

  const hrefFor = (serviceId: string, staffId?: string, variantId?: string) => `${bookingHref}?service=${encodeURIComponent(serviceId)}${variantId ? `&variant=${encodeURIComponent(variantId)}` : ""}${staffId ? `&staff=${encodeURIComponent(staffId)}` : ""}`;

  if (bookable.length === 0) {
    return (
      <div className={styles.empty}>
        <RoviMascot size={92} mood="thinking" alt={t("Rovi düşünüyor")} />
        <h3>{t("Hizmet menüsü hazırlanıyor")}</h3>
        <p>{t("{name} henüz online hizmet eklemedi. Yine de randevu sayfasından uygun saatlere göz atabilir ya da işletmeye mesaj gönderebilirsin.", { name: businessName })}</p>
        <Link href={bookingHref} className={`${styles.pill} ${styles.pillPrimary}`} style={{ marginTop: 10 }}><CalendarCheck2 size={16} /> {t("Randevu sayfasına git")}</Link>
      </div>
    );
  }

  return (
    <>
      {bookable.length > 5 && (
        <div className={styles.search} role="search">
          <Search size={20} aria-hidden="true" />
          <label htmlFor="storefront-service-search" className={styles.srOnly}>{t("Hizmet ara")}</label>
          <input id="storefront-service-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Hizmet ara (örn. saç kesimi)")} autoComplete="off" enterKeyHint="search" />
          {query && <button type="button" className={styles.iconBtn} onClick={() => setQuery("")} aria-label={t("Aramayı temizle")}><X size={17} /></button>}
        </div>
      )}

      {groups.length > 1 && (
        <div className={styles.chips} role="group" aria-label={t("Hizmet kategorileri")}>
          <button type="button" aria-pressed={safeCat === "all"} className={`${styles.chip} ${safeCat === "all" ? styles.chipActive : ""}`} onClick={() => setActiveCat("all")}>
            <span className={styles.chipIcon} aria-hidden="true"><Layers3 size={16} /></span>{t("Tümü")} <small>{bookable.length}</small>
          </button>
          {groups.map((group) => (
            <button key={group.id} type="button" aria-pressed={safeCat === group.id} className={`${styles.chip} ${safeCat === group.id ? styles.chipActive : ""}`} style={{ "--cat": group.color } as CSSProperties} onClick={() => setActiveCat(safeCat === group.id ? "all" : group.id)}>
              <span className={styles.chipIcon} aria-hidden="true"><ServiceCategoryIcon icon={group.icon} name={group.name} size={16} /></span>
              {group.name} <small>{group.items.length}</small>
            </button>
          ))}
        </div>
      )}

      <p className={styles.srOnly} aria-live="polite">{t("{count} hizmet gösteriliyor", { count: visibleCount })}</p>

      <div className={styles.groups}>
        {visible.map((group) => (
          <section key={group.id} aria-labelledby={`svc-group-${group.id}`} style={{ "--cat": group.color } as CSSProperties}>
            {(groups.length > 1 || group.id !== "other") && (
              <header className={styles.groupHead}>
                <span className={styles.groupIcon} aria-hidden="true"><ServiceCategoryIcon icon={group.icon} name={group.name} size={18} /></span>
                <h3 id={`svc-group-${group.id}`}>{group.name}</h3>
                <span>{t("{count} hizmet", { count: group.items.length })}</span>
              </header>
            )}
            <div className={styles.serviceList}>
              {group.items.map((service, index) => {
                const name = localizedServiceName(service, locale);
                const description = localizedServiceDescription(service, locale);
                const optionCount = variantsOf(service).length;
                return (
                <article key={service.id} className={`${styles.service} ${service.imageUrl ? styles.serviceWithThumb : ""}`} style={{ "--i": Math.min(index, 8) } as CSSProperties}>
                  <button type="button" className={styles.serviceOpen} onClick={() => setDetail(service)} aria-label={t("{name} detaylarını gör", { name })} />
                  {service.imageUrl && <span className={styles.serviceThumb} aria-hidden="true"><ServiceThumb url={service.imageUrl} size={56} /></span>}
                  <div className={styles.serviceInfo}>
                    <h4>{name}</h4>
                    {description && <p>{description}</p>}
                    <div className={styles.serviceMeta}>
                      <span className={styles.metaTag}><Clock3 size={13} aria-hidden="true" /> {formatDuration(service.durationMinutes, t)}</span>
                      {optionCount > 1 && <span className={styles.metaTag}>{t("{count} seçenek", { count: optionCount })}</span>}
                      {service.requiresDeposit && service.depositAmount > 0 && <span className={`${styles.metaTag} ${styles.metaDeposit}`}><Wallet size={13} aria-hidden="true" /> {t("Kapora {amount}", { amount: formatPrice(service.depositAmount, service.currency, intlLocale) })}</span>}
                    </div>
                  </div>
                  <div className={styles.serviceSide}>
                    <span className={styles.servicePrice}>{priceLabel(service, t, intlLocale)}</span>
                    <Link href={hrefFor(service.id)} className={styles.selectBtn} aria-label={t("{name} için randevu al", { name })}>{t("Seç")}</Link>
                  </div>
                </article>
                );
              })}
            </div>
          </section>
        ))}
        {visible.length === 0 && (
          <div className={styles.noResults}>
            <Search size={24} aria-hidden="true" />
            <strong>{t("“{query}” ile eşleşen hizmet yok", { query })}</strong>
            <span>{t("Daha kısa bir kelimeyle tekrar dene.")}</span>
            <button type="button" className={styles.pill} onClick={() => { setQuery(""); setActiveCat("all"); }}>{t("Aramayı temizle")}</button>
          </div>
        )}
      </div>

      <div className={styles.assurance}>
        <span><CheckCircle2 size={15} aria-hidden="true" /> {t("Şeffaf fiyat")}</span>
        <span><CalendarCheck2 size={15} aria-hidden="true" /> {t("Anlık uygunluk")}</span>
        <span><ShieldCheck size={15} aria-hidden="true" /> {t("Güvenli online randevu")}</span>
      </div>

      {detail && <ServiceSheet service={detail} staff={staff} groups={groups} hrefFor={hrefFor} onClose={() => setDetail(null)} />}
    </>
  );
}

function ServiceSheet({ service, staff, groups, hrefFor, onClose }: { service: Service; staff: Staff[]; groups: Group[]; hrefFor: (serviceId: string, staffId?: string, variantId?: string) => string; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const intlLocale = useIntlLocale();
  const name = localizedServiceName(service, locale);
  const description = localizedServiceDescription(service, locale);
  const options = variantsOf(service);
  const money = (value: number) => formatPrice(value, service.currency, intlLocale);
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
          <div className={styles.sheetTitleRow}>
            {service.imageUrl && <span className={styles.sheetThumb} aria-hidden="true"><ServiceThumb url={service.imageUrl} size={64} /></span>}
            <div>
              <small>{group?.name?.toLocaleUpperCase(group.id === "other" || locale !== "tr" ? intlLocale : "tr-TR") ?? t("HİZMET")}</small>
              <h3 id="service-sheet-title">{name}</h3>
            </div>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label={t("Kapat")} autoFocus><X size={18} /></button>
        </header>
        <div className={styles.sheetBody}>
          {description ? <p>{description}</p> : <p>{t("Detaylar için işletmeye mesaj gönderebilir ya da doğrudan randevu oluşturabilirsin.")}</p>}
          <div className={styles.facts}>
            <div className={styles.fact}><small>{t("ÜCRET")}</small><b>{priceLabel(service, t, intlLocale)}</b></div>
            <div className={styles.fact}><small>{t("SÜRE")}</small><b>{formatDuration(service.durationMinutes, t)}</b></div>
            {service.requiresDeposit && service.depositAmount > 0 && <div className={styles.fact}><small>{t("KAPORA")}</small><b>{formatPrice(service.depositAmount, service.currency, intlLocale)}</b></div>}
            <div className={styles.fact}><small>{t("RANDEVU")}</small><b><Sparkles size={14} aria-hidden="true" /> Online</b></div>
          </div>
          {options.length > 0 && <>
            <span className={styles.sheetLabel}>{t("SEÇENEKLER")}</span>
            <div className={styles.sheetVariants}>
              {options.map((option) => (
                <Link key={option.id} href={hrefFor(service.id, undefined, option.id)} aria-label={t("{name} için randevu al", { name: `${name} · ${localizedVariantName(service, option, locale)}` })}>
                  <span>{localizedVariantName(service, option, locale)}<small>{formatDuration(option.durationMinutes, t)}</small></span>
                  <b>{variantPriceLabel(service, option, t, money)}</b>
                </Link>
              ))}
            </div>
          </>}
          {experts.length > 0 && <>
            <span className={styles.sheetLabel}>{t("UZMAN SEÇEREK RANDEVU AL")}</span>
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
          <Link href={hrefFor(service.id)} className={`${styles.pill} ${styles.pillPrimary}`}><CalendarCheck2 size={17} /> {t("Bu hizmetle randevu al")}</Link>
        </footer>
      </section>
    </div>
  );
}
