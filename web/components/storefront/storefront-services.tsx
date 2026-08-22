"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import {
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  Sparkles,
  Tag,
  WandSparkles,
} from "lucide-react";

interface Props {
  services: Service[];
  categories?: ServiceCategory[];
  onSelectService?: (serviceId: string) => void;
}

type ServiceGroup = {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: Service[];
  category?: ServiceCategory;
};

const DEFAULT_CATEGORY_COLOR = "#0b6b45";

export function StorefrontServices({ services, categories = [], onSelectService }: Props) {
  const [activeCat, setActiveCat] = useState("all");
  const categoryRailRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: -1 | 1) => {
    categoryRailRef.current?.scrollBy({
      left: direction * Math.max(260, categoryRailRef.current.clientWidth * 0.72),
      behavior: "smooth",
    });
  };

  const groups = useMemo<ServiceGroup[]>(() => {
    const categoryGroups: ServiceGroup[] = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon || "✦",
        color: category.color || DEFAULT_CATEGORY_COLOR,
        items: services.filter((service) => service.category === category.id),
        category,
      }))
      .filter((group) => group.items.length > 0);

    const uncategorized = services.filter(
      (service) =>
        !service.category || !categories.some((category) => category.id === service.category),
    );

    if (uncategorized.length > 0) {
      categoryGroups.push({
        id: "uncategorized",
        name: "Diğer hizmetler",
        icon: "✦",
        color: DEFAULT_CATEGORY_COLOR,
        items: uncategorized,
      });
    }

    return categoryGroups;
  }, [categories, services]);

  if (services.length === 0) {
    return (
      <section className="storefront-service-empty" aria-labelledby="empty-services-title">
        <div><Layers3 size={28} strokeWidth={1.7} /></div>
        <p>HİZMET MENÜSÜ HAZIRLANIYOR</p>
        <h2 id="empty-services-title">Yeni deneyimler yakında burada.</h2>
        <span>İşletme hizmetlerini ve online randevu seçeneklerini hazırlıyor.</span>
      </section>
    );
  }

  const safeActiveCat =
    activeCat === "all" || groups.some((group) => group.id === activeCat)
      ? activeCat
      : "all";
  const visibleGroups =
    safeActiveCat === "all"
      ? groups
      : groups.filter((group) => group.id === safeActiveCat);

  return (
    <section className="storefront-services-v3" aria-labelledby="service-menu-title">
      <header className="storefront-services-hero">
        <div className="storefront-services-title">
          <span><WandSparkles size={17} /> HİZMET MENÜSÜ</span>
          <h2 id="service-menu-title">Sana uygun deneyimi seç.</h2>
          <p>Hizmetleri karşılaştır, detayları incele ve uygun saatini ayır.</p>
        </div>
        <div className="storefront-services-count" aria-label={`${services.length} aktif hizmet`}>
          <small>AKTİF MENÜ</small>
          <strong>{String(services.length).padStart(2, "0")}</strong>
          <span>hizmet</span>
        </div>
      </header>

      {groups.length > 1 && (
        <div className="storefront-category-shell">
          <div className="storefront-category-intro">
            <span><Tag size={13} /> KATEGORİLER</span>
            <div className="storefront-category-controls">
              <small>Kaydır veya seç</small>
              <button type="button" onClick={() => scrollCategories(-1)} aria-label="Önceki kategoriler"><ChevronLeft size={17} /></button>
              <button type="button" onClick={() => scrollCategories(1)} aria-label="Sonraki kategoriler"><ChevronRight size={17} /></button>
            </div>
          </div>
          <div
            ref={categoryRailRef}
            className="storefront-category-rail"
            role="tablist"
            aria-label="Hizmet kategorileri"
            onWheel={(event) => {
              if (!categoryRailRef.current || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
              event.preventDefault();
              categoryRailRef.current.scrollLeft += event.deltaY;
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={safeActiveCat === "all"}
              className={`storefront-category-card all${safeActiveCat === "all" ? " active" : ""}`}
              onClick={(event) => {
                setActiveCat("all");
                event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}
            >
              <i><Layers3 size={18} /></i>
              <span><small>TÜM MENÜ</small><strong>Tümü</strong></span>
              <b>{services.length}</b>
            </button>

            {groups.map((group) => {
              const isActive = safeActiveCat === group.id;
              const style = { "--category-color": group.color } as CSSProperties;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`storefront-category-card${isActive ? " active" : ""}`}
                  style={style}
                  onClick={(event) => {
                    setActiveCat(isActive ? "all" : group.id);
                    event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                  }}
                >
                  <i aria-hidden="true"><ServiceCategoryIcon icon={group.icon} name={group.name} size={23} /></i>
                  <span><small>KATEGORİ</small><strong>{group.name}</strong></span>
                  <b>{group.items.length}</b>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div key={safeActiveCat} className="storefront-service-groups">
        {visibleGroups.map((group, groupIndex) => {
          const style = { "--category-color": group.color } as CSSProperties;
          return (
            <section
              key={group.id}
              className="storefront-service-group"
              style={{ ...style, animationDelay: `${groupIndex * 70}ms` }}
              aria-labelledby={`service-group-${group.id}`}
            >
              <header className="storefront-service-group-head">
                <div className="storefront-service-group-icon" aria-hidden="true"><ServiceCategoryIcon icon={group.icon} name={group.name} size={23} /></div>
                <div>
                  <span>SEÇİLİ KATEGORİ</span>
                  <h3 id={`service-group-${group.id}`}>{group.name}</h3>
                </div>
                <b>{group.items.length} hizmet</b>
              </header>

              <div className="storefront-service-grid">
                {group.items.map((service, index) => (
                  <ServiceItem
                    key={service.id}
                    service={service}
                    categoryMeta={group.category}
                    categoryColor={group.color}
                    index={index}
                    onSelect={onSelectService}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="storefront-services-assurance">
        <span><CheckCircle2 size={15} /> Şeffaf fiyat</span>
        <span><CalendarCheck2 size={15} /> Anlık uygunluk</span>
        <span><Sparkles size={15} /> Güvenli randevu</span>
      </footer>
    </section>
  );
}

function ServiceItem({
  service,
  categoryMeta,
  categoryColor,
  index,
  onSelect,
}: {
  service: Service;
  categoryMeta?: ServiceCategory;
  categoryColor: string;
  index: number;
  onSelect?: (id: string) => void;
}) {
  const style = {
    "--category-color": categoryColor,
    animationDelay: `${index * 55}ms`,
  } as CSSProperties;

  return (
    <article className="storefront-service-card-v3" style={style}>
      <div className="storefront-service-visual" aria-hidden="true">
        <span>{categoryMeta?.icon || "✦"}</span>
        <small>{String(index + 1).padStart(2, "0")}</small>
      </div>

      <div className="storefront-service-copy">
        <div className="storefront-service-kicker">
          <span>ONLINE RANDEVU</span>
          {service.isBookableOnline && <b><i /> Uygun</b>}
        </div>
        <h4>{service.name}</h4>
        {service.description && <p>{service.description}</p>}
        <div className="storefront-service-meta-v3">
          <span><Clock3 size={14} /> {formatDuration(service.durationMinutes)}</span>
          {service.requiresDeposit && <span><CheckCircle2 size={14} /> Ön ödeme</span>}
        </div>
      </div>

      <div className="storefront-service-action">
        <small>HİZMET BEDELİ</small>
        <strong>{formatPrice(service.price, service.currency)}</strong>
        {onSelect && (
          <button type="button" onClick={() => onSelect(service.id)}>
            <span>Randevu seç</span>
            <i><ArrowUpRight size={17} /></i>
          </button>
        )}
      </div>
    </article>
  );
}

function formatPrice(price: number, currency: Service["currency"]) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDuration(totalMinutes: number) {
  if (totalMinutes < 60) return `${totalMinutes} dk`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
}
