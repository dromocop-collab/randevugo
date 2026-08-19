"use client";

import { useState } from "react";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import { ArrowRight, Clock3, Layers3, Sparkles } from "lucide-react";

interface Props {
  services: Service[];
  categories?: ServiceCategory[];
  onSelectService?: (serviceId: string) => void;
}

export function StorefrontServices({ services, categories = [], onSelectService }: Props) {
  const [activeCat, setActiveCat] = useState<string>("all");

  if (services.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-10 text-center shadow-lg">
        <Layers3 className="mx-auto text-[var(--accent)]" size={36} strokeWidth={1.5} />
        <h2 className="mt-3 text-base font-bold text-[var(--text-1)]">Henüz hizmet eklenmemiş</h2>
        <p className="mt-1 text-xs text-[var(--text-3)]">İşletme yakında hizmetlerini ekleyecek.</p>
      </section>
    );
  }

  const getCategoryMeta = (catId: string) => categories.find((c) => c.id === catId);

  // Group by category
  const grouped: { cat: ServiceCategory | null; items: Service[] }[] = [];

  if (categories.length > 0) {
    for (const cat of categories) {
      const items = services.filter((s) => s.category === cat.id);
      if (items.length > 0) grouped.push({ cat, items });
    }
    const uncategorized = services.filter(
      (s) => !s.category || !categories.some((c) => c.id === s.category)
    );
    if (uncategorized.length > 0) grouped.push({ cat: null, items: uncategorized });
  } else {
    grouped.push({ cat: null, items: services });
  }

  const filteredServices =
    activeCat === "all"
      ? services
      : services.filter((s) => s.category === activeCat);

  const showCategoryFilter = categories.length > 0;

  return (
    <section className="storefront-services space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text-1)]">Hizmetler</h2>
        <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
          <Sparkles size={13} /> {services.length} hizmet
        </span>
      </div>

      {/* Category Filter Chips */}
      {showCategoryFilter && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCat("all")}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              activeCat === "all"
                ? "bg-[var(--accent)] text-white shadow-md"
                : "border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)] hover:border-[var(--accent)]/40"
            }`}
          >
            Tümü
          </button>
          {categories
            .filter((c) => services.some((s) => s.category === c.id))
            .map((cat) => {
              const isActive = activeCat === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(isActive ? "all" : cat.id)}
                  className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "text-white shadow-md"
                      : "border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)] hover:shadow-sm"
                  }`}
                  style={isActive ? { backgroundColor: cat.color } : undefined}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              );
            })}
        </div>
      )}

      {/* Service List */}
      {activeCat === "all" && showCategoryFilter ? (
        // Grouped view
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.cat?.id ?? "uncategorized"}>
              <div className="mb-2 flex items-center gap-2">
                {group.cat ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: group.cat.color + "15", color: group.cat.color }}
                  >
                    {group.cat.icon} {group.cat.name}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-[var(--text-3)]">Diğer</span>
                )}
                <span className="text-[10px] text-[var(--text-3)]">
                  {group.items.length} hizmet
                </span>
              </div>
              <div className="space-y-2">
                {group.items.map((service) => (
                  <ServiceItem
                    key={service.id}
                    service={service}
                    categoryMeta={getCategoryMeta(service.category)}
                    showCategoryBadge={false}
                    onSelect={onSelectService}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat / filtered view
        <div className="space-y-2">
          {filteredServices.map((service) => (
            <ServiceItem
              key={service.id}
              service={service}
              categoryMeta={getCategoryMeta(service.category)}
              showCategoryBadge={activeCat === "all"}
              onSelect={onSelectService}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ServiceItem({
  service,
  categoryMeta,
  showCategoryBadge,
  onSelect,
}: {
  service: Service;
  categoryMeta?: ServiceCategory;
  showCategoryBadge: boolean;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="storefront-service-card group flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 transition hover:border-[var(--accent)]/30 hover:shadow-lg sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[var(--text-1)] group-hover:text-[var(--accent)] transition">
            {service.name}
          </p>
          {showCategoryBadge && categoryMeta && (
            <span
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: categoryMeta.color + "15",
                color: categoryMeta.color,
              }}
            >
              {categoryMeta.icon} {categoryMeta.name}
            </span>
          )}
        </div>
        {service.description && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-3)] line-clamp-2">
            {service.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium text-[var(--text-2)]">
            <Clock3 size={13} /> {service.durationMinutes} dk
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="text-lg font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">
          {service.price.toLocaleString("tr-TR")} ₺
        </span>
        {onSelect && (
          <button
            onClick={() => onSelect(service.id)}
            className="rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition hover:shadow-xl hover:brightness-110 active:scale-[0.97]"
          >
            Randevu Al <ArrowRight className="inline ml-1" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
