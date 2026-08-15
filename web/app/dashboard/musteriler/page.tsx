"use client";

import { useEffect, useState, useMemo } from "react";
import { useBusiness } from "@/hooks/use-business";
import { listCustomers } from "@/features/customers/customer-repository";
import { createOrUpdateCustomer } from "@/features/customers/customer-repository";
import { listAppointments } from "@/features/appointments/appointment-repository";
import type { Customer } from "@/types/customer";
import type { Appointment } from "@/types/appointments";
import { formatMoney } from "@/lib/utils/date";
import { toast } from "sonner";

type SortKey = "name" | "appointments" | "spent" | "lastVisit";
type SortDir = "asc" | "desc";

export default function CustomersPage() {
  const { businessId } = useBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      listCustomers(businessId),
      listAppointments(businessId),
    ]).then(([custs, appts]) => {
      setCustomers(custs);
      setAppointments(appts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [businessId]);

  // Build customer appointment map
  const customerApptsMap = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((a) => {
      const phone = a.customerPhone?.trim();
      if (phone) {
        if (!map[phone]) map[phone] = [];
        map[phone].push(a);
      }
    });
    return map;
  }, [appointments]);

  const filtered = useMemo(() => {
    let list = [...customers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.fullName.localeCompare(b.fullName, "tr"); break;
        case "appointments": cmp = a.totalAppointments - b.totalAppointments; break;
        case "spent": cmp = a.totalSpent - b.totalSpent; break;
        case "lastVisit":
          cmp = new Date(a.lastVisitAt || 0).getTime() - new Date(b.lastVisitAt || 0).getTime();
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [customers, search, sortKey, sortDir]);

  const selectedCustomer = selectedId ? customers.find((c) => c.id === selectedId) : null;
  const selectedAppts = selectedCustomer
    ? (customerApptsMap[selectedCustomer.phone] || []).sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
      )
    : [];

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const avgAppointments = totalCustomers > 0
    ? Math.round(customers.reduce((s, c) => s + c.totalAppointments, 0) / totalCustomers * 10) / 10
    : 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-1)]">
            Müşteriler / CRM
          </h1>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Müşteri kartları, randevu geçmişi ve istatistikler
          </p>
        </div>
        {/* Sync button */}
        {customers.length === 0 && appointments.length > 0 && (
          <button
            onClick={async () => {
              if (!businessId) return;
              setSyncing(true);
              try {
                const phones = new Map<string, { name: string; phone: string; email?: string }>();
                appointments.forEach((a) => {
                  const phone = a.customerPhone?.trim();
                  if (phone && !phones.has(phone)) {
                    phones.set(phone, {
                      name: a.customerName || "Müşteri",
                      phone,
                      email: a.customerEmail || undefined,
                    });
                  }
                });
                let count = 0;
                for (const entry of phones.values()) {
                  await createOrUpdateCustomer(businessId, {
                    fullName: entry.name,
                    phone: entry.phone,
                    email: entry.email,
                  });
                  count++;
                }
                const refreshed = await listCustomers(businessId);
                setCustomers(refreshed);
                toast.success(`${count} müşteri senkronize edildi! ✅`);
              } catch {
                toast.error("Senkronizasyon başarısız");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
          >
            {syncing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {syncing ? "Senkronize ediliyor..." : "Randevulardan Senkronize Et"}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Toplam Müşteri", value: totalCustomers.toString(), icon: "👥", color: "text-sky-600", bg: "bg-sky-500/5" },
          { label: "Toplam Gelir", value: formatMoney(totalRevenue), icon: "💰", color: "text-emerald-600", bg: "bg-emerald-500/5" },
          { label: "Ort. Randevu", value: avgAppointments.toString(), icon: "📊", color: "text-violet-600", bg: "bg-violet-500/5" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border border-[var(--border)] ${stat.bg} p-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">{stat.label}</span>
              <span className="text-lg opacity-60">{stat.icon}</span>
            </div>
            <p className={`mt-1.5 text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="İsim, telefon veya e-posta ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <div className="flex gap-1.5">
          {([
            { key: "name" as SortKey, label: "İsim" },
            { key: "appointments" as SortKey, label: "Randevu" },
            { key: "spent" as SortKey, label: "Harcama" },
            { key: "lastVisit" as SortKey, label: "Son Ziyaret" },
          ]).map((s) => (
            <button
              key={s.key}
              onClick={() => toggleSort(s.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                sortKey === s.key
                  ? "bg-[var(--accent)] text-white shadow-md"
                  : "bg-[var(--surface-2)] text-[var(--text-2)] hover:bg-[var(--surface-3)]"
              }`}
            >
              {s.label} {sortIcon(s.key)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-12 text-center">
          <span className="text-4xl">👥</span>
          <h3 className="mt-3 text-lg font-bold text-[var(--text-1)]">
            {search ? "Sonuç bulunamadı" : "Henüz müşteri yok"}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            {search
              ? "Farklı bir arama terimi deneyin."
              : "Randevular geldikçe müşteriler otomatik olarak burada listelenecek."}
          </p>
        </div>
      )}

      {/* Customer Grid + Detail Panel */}
      {filtered.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          {/* Customer list */}
          <div className="space-y-2">
            {filtered.map((customer) => {
              const isActive = selectedId === customer.id;
              return (
                <button
                  key={customer.id}
                  onClick={() => setSelectedId(isActive ? null : customer.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                    isActive
                      ? "border-[var(--accent)]/40 bg-[var(--accent)]/5 shadow-lg shadow-sky-500/10"
                      : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--accent)]/20 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-3)] text-sm font-bold text-white shadow-md">
                        {customer.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-1)]">{customer.fullName}</h3>
                        <p className="text-xs text-[var(--text-3)]">{customer.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-600">
                        📅 {customer.totalAppointments}
                      </span>
                      {customer.totalSpent > 0 && (
                        <p className="mt-1 text-xs font-semibold text-emerald-600">
                          {formatMoney(customer.totalSpent)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div className="mt-3 flex gap-2">
                    {customer.completedAppointments > 0 && (
                      <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                        ✅ {customer.completedAppointments} tamamlanan
                      </span>
                    )}
                    {customer.cancelledAppointments > 0 && (
                      <span className="rounded-lg bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                        ❌ {customer.cancelledAppointments} iptal
                      </span>
                    )}
                    {customer.lastVisitAt && (
                      <span className="rounded-lg bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                        🕐 {new Date(customer.lastVisitAt).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail Panel */}
          <div className="lg:sticky lg:top-28 lg:h-fit">
            {selectedCustomer ? (
              <div className="overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-[var(--surface-1)] shadow-xl">
                {/* Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent-3)]/10 p-6">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-3)] text-xl font-bold text-white shadow-lg">
                      {selectedCustomer.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-[var(--text-1)]">
                        {selectedCustomer.fullName}
                      </h2>
                      <p className="text-sm text-[var(--text-3)]">{selectedCustomer.phone}</p>
                      {selectedCustomer.email && (
                        <p className="text-xs text-[var(--text-3)]">{selectedCustomer.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 p-5">
                  {[
                    { label: "Toplam", value: selectedCustomer.totalAppointments, icon: "📅", color: "text-sky-600" },
                    { label: "Tamamlanan", value: selectedCustomer.completedAppointments, icon: "✅", color: "text-emerald-600" },
                    { label: "İptal", value: selectedCustomer.cancelledAppointments, icon: "❌", color: "text-rose-600" },
                    { label: "Harcama", value: formatMoney(selectedCustomer.totalSpent), icon: "💰", color: "text-amber-600" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-[var(--surface-2)] p-3 text-center">
                      <span className="text-lg">{s.icon}</span>
                      <p className={`mt-1 text-lg font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] font-medium text-[var(--text-3)]">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Appointment history */}
                <div className="border-t border-[var(--border)] p-5">
                  <h3 className="mb-3 text-sm font-bold text-[var(--text-1)]">
                    📋 Randevu Geçmişi ({selectedAppts.length})
                  </h3>
                  {selectedAppts.length === 0 ? (
                    <p className="text-xs text-[var(--text-3)]">Henüz randevu geçmişi yok.</p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {selectedAppts.map((appt) => (
                        <div
                          key={appt.id}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-[var(--text-1)]">
                              {appt.serviceName || "Hizmet"}
                            </p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              appt.status === "completed" ? "bg-emerald-500/10 text-emerald-600"
                              : appt.status === "confirmed" ? "bg-sky-500/10 text-sky-600"
                              : appt.status === "cancelled" ? "bg-rose-500/10 text-rose-600"
                              : "bg-amber-500/10 text-amber-600"
                            }`}>
                              {appt.status === "completed" ? "✓ Tamamlandı"
                               : appt.status === "confirmed" ? "✓ Onaylı"
                               : appt.status === "cancelled" ? "✗ İptal"
                               : "⏳ Bekliyor"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--text-3)]">
                            {new Date(appt.startAt).toLocaleString("tr-TR", {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                            {appt.staffName ? ` · ${appt.staffName}` : ""}
                            {appt.servicePrice ? ` · ${formatMoney(appt.servicePrice)}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] py-16 text-center">
                <span className="text-4xl">👈</span>
                <h3 className="mt-3 text-sm font-bold text-[var(--text-1)]">Müşteri Seçin</h3>
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  Detayları ve randevu geçmişini görüntüleyin
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
