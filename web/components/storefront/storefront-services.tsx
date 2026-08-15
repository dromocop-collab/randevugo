"use client";

import type { Service } from "@/types/service";

interface Props {
  services: Service[];
  onSelectService?: (serviceId: string) => void;
}

export function StorefrontServices({ services, onSelectService }: Props) {
  if (services.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-10 text-center shadow-lg">
        <span className="text-4xl">📋</span>
        <h2 className="mt-3 text-base font-bold text-[var(--text-1)]">Henüz hizmet eklenmemiş</h2>
        <p className="mt-1 text-xs text-[var(--text-3)]">İşletme yakında hizmetlerini ekleyecek.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text-1)]">Hizmetler</h2>
        <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
          {services.length} hizmet
        </span>
      </div>
      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.id}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 transition hover:border-[var(--accent)]/30 hover:shadow-lg sm:p-5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[var(--text-1)] group-hover:text-[var(--accent)] transition">
                  {service.name}
                </p>
              </div>
              {service.description && (
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-3)] line-clamp-2">
                  {service.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium text-[var(--text-2)]">
                  🕐 {service.durationMinutes} dk
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-lg font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">
                {service.price.toLocaleString("tr-TR")} ₺
              </span>
              {onSelectService && (
                <button
                  onClick={() => onSelectService(service.id)}
                  className="rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition hover:shadow-xl hover:brightness-110 active:scale-[0.97]"
                >
                  Randevu Al →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
