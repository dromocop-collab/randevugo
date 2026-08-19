"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { useBusiness } from "@/hooks/use-business";
import {
  listAppointments,
  updateAppointmentStatus,
} from "@/features/appointments/appointment-repository";
import type { Appointment, AppointmentStatus } from "@/types/appointments";

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  pending: {
    label: "Beklemede",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: "⏳",
  },
  confirmed: {
    label: "Onaylandı",
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    icon: "✅",
  },
  completed: {
    label: "Tamamlandı",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: "🎉",
  },
  cancelled: {
    label: "İptal Edildi",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: "❌",
  },
  no_show: {
    label: "Gelmedi",
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
    icon: "👻",
  },
};

type FilterTab = "all" | AppointmentStatus;

const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: "all", label: "Tümü", icon: "📋" },
  { key: "pending", label: "Bekleyen", icon: "⏳" },
  { key: "confirmed", label: "Onaylı", icon: "✅" },
  { key: "completed", label: "Tamamlanan", icon: "🎉" },
  { key: "cancelled", label: "İptal", icon: "❌" },
  { key: "no_show", label: "Gelmedi", icon: "👻" },
];

export default function AppointmentsPage() {
  const { businessId } = useBusiness();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    listAppointments(businessId).then((rows) => {
      if (cancelled) return;
      setAppointments(rows);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const filtered = useMemo(
    () =>
      appointments.filter((a) =>
        activeTab === "all" ? true : a.status === activeTab
      ),
    [appointments, activeTab]
  );

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = appointments.filter((a) => {
      const d = new Date(a.startAt);
      return d >= today && d <= todayEnd;
    }).length;

    const pendingCount = appointments.filter((a) => a.status === "pending").length;
    const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
    const completedCount = appointments.filter((a) => a.status === "completed").length;
    const totalRevenue = appointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + (a.servicePrice ?? 0), 0);

    return { todayCount, pendingCount, confirmedCount, completedCount, totalRevenue };
  }, [appointments]);

  async function handleStatusChange(id: string, nextStatus: AppointmentStatus) {
    if (!businessId) return;
    setUpdatingId(id);
    try {
      await updateAppointmentStatus(businessId, id, nextStatus);
      const statusLabel = STATUS_CONFIG[nextStatus].label;
      toast.success(`Randevu ${statusLabel.toLowerCase()} olarak güncellendi`);
      setAppointments(await listAppointments(businessId));
    } catch {
      toast.error("Güncelleme başarısız oldu");
    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: tr });
    } catch {
      return dateStr;
    }
  }

  function formatTime(dateStr: string): string {
    try {
      return format(new Date(dateStr), "HH:mm");
    } catch {
      return "";
    }
  }

  function isToday(dateStr: string): boolean {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }

  function isPast(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }

  return (
    <div className="space-y-6">
      {/* ━━━ Stats Header ━━━ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {[
          { label: "Bugün", value: stats.todayCount, icon: "📅", accent: "from-sky-500 to-blue-600" },
          { label: "Bekleyen", value: stats.pendingCount, icon: "⏳", accent: "from-amber-500 to-orange-600" },
          { label: "Onaylı", value: stats.confirmedCount, icon: "✅", accent: "from-emerald-500 to-green-600" },
          { label: "Tamamlanan", value: stats.completedCount, icon: "🎉", accent: "from-purple-500 to-violet-600" },
          { label: "Toplam Gelir", value: `${stats.totalRevenue.toLocaleString("tr-TR")} ₺`, icon: "💰", accent: "from-pink-500 to-rose-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.accent} opacity-[0.03] transition-opacity group-hover:opacity-[0.07]`} />
            <div className="relative">
              <p className="text-xs font-medium text-[var(--text-3)]">{stat.icon} {stat.label}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--text-1)]">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ━━━ Filter Tabs ━━━ */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5 shadow-sm">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? appointments.length
              : appointments.filter((a) => a.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-md shadow-sky-500/20"
                  : "text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span
                className={`ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-[var(--surface-2)] text-[var(--text-3)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ━━━ Appointment Cards ━━━ */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-[var(--surface-2)]" />
                  <div className="h-3 w-48 rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-2)]">
            <span className="text-3xl">📭</span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--text-1)]">
            Randevu Bulunamadı
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[var(--text-3)]">
            {activeTab === "all"
              ? "Henüz randevu oluşturulmamış."
              : `"${FILTER_TABS.find((t) => t.key === activeTab)?.label}" durumunda randevu yok.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appointment, idx) => {
            const statusCfg = STATUS_CONFIG[appointment.status];
            const expanded = expandedId === appointment.id;
            const isUpdating = updatingId === appointment.id;
            const todayBadge = isToday(appointment.startAt);
            const past = isPast(appointment.startAt);

            return (
              <div
                key={appointment.id}
                style={{ animationDelay: `${idx * 50}ms` }}
                className="animate-[fadeInUp_0.4s_ease_forwards] opacity-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm transition-all duration-300 hover:shadow-lg"
              >
                {/* Main row */}
                <div
                  className="flex cursor-pointer items-center gap-4 p-4 sm:p-5"
                  onClick={() => setExpandedId(expanded ? null : appointment.id)}
                >
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-lg font-bold text-white shadow-md shadow-sky-500/20">
                    {appointment.customerName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-[var(--text-1)]">
                        {appointment.customerName}
                      </h3>
                      {todayBadge && (
                        <span className="shrink-0 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600">
                          BUGÜN
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-3)]">
                      <span className="flex items-center gap-1">
                        📅 {formatDate(appointment.startAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        🕐 {formatTime(appointment.startAt)}
                        {appointment.endAt && ` - ${formatTime(appointment.endAt)}`}
                      </span>
                      {appointment.serviceName && (
                        <span className="flex items-center gap-1">
                          💼 {appointment.serviceName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="hidden sm:block">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}
                    >
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  </div>

                  {/* Price */}
                  {appointment.servicePrice != null && appointment.servicePrice > 0 && (
                    <p className="hidden text-sm font-bold text-[var(--text-1)] sm:block">
                      {appointment.servicePrice.toLocaleString("tr-TR")} ₺
                    </p>
                  )}

                  {/* Expand arrow */}
                  <svg
                    className={`h-5 w-5 shrink-0 text-[var(--text-3)] transition-transform duration-300 ${
                      expanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Mobile Status Badge */}
                <div className="flex items-center gap-2 px-5 pb-2 sm:hidden">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.color}`}
                  >
                    {statusCfg.icon} {statusCfg.label}
                  </span>
                  {appointment.servicePrice != null && appointment.servicePrice > 0 && (
                    <span className="text-xs font-bold text-[var(--text-1)]">
                      {appointment.servicePrice.toLocaleString("tr-TR")} ₺
                    </span>
                  )}
                </div>

                {/* Expanded Details */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="border-t border-[var(--border)] px-5 pb-5 pt-4">
                    {/* Detail Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {appointment.staffName && (
                        <DetailItem icon="👤" label="Çalışan" value={appointment.staffName} />
                      )}
                      {appointment.serviceName && (
                        <DetailItem icon="💼" label="Hizmet" value={appointment.serviceName} />
                      )}
                      {appointment.serviceDurationMinutes && (
                        <DetailItem icon="⏱️" label="Süre" value={`${appointment.serviceDurationMinutes} dk`} />
                      )}
                      {appointment.customerPhone && (
                        <DetailItem icon="📞" label="Telefon" value={appointment.customerPhone} />
                      )}
                      {appointment.customerEmail && (
                        <DetailItem icon="📧" label="E-posta" value={appointment.customerEmail} />
                      )}
                      {appointment.source && (
                        <DetailItem
                          icon="📍"
                          label="Kaynak"
                          value={
                            appointment.source === "online"
                              ? "Online"
                              : appointment.source === "dashboard"
                              ? "Panel"
                              : appointment.source === "phone"
                              ? "Telefon"
                              : "Yürüyerek"
                          }
                        />
                      )}
                    </div>

                    {/* Notes */}
                    {appointment.notes && (
                      <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3">
                        <p className="text-xs font-medium text-[var(--text-3)]">📝 Not</p>
                        <p className="mt-0.5 text-sm text-[var(--text-1)]">{appointment.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {appointment.status !== "confirmed" && appointment.status !== "completed" && (
                        <ActionButton
                          onClick={() => handleStatusChange(appointment.id, "confirmed")}
                          disabled={isUpdating}
                          variant="confirm"
                        >
                          ✅ Onayla
                        </ActionButton>
                      )}
                      {appointment.status !== "completed" && (
                        <ActionButton
                          onClick={() => handleStatusChange(appointment.id, "completed")}
                          disabled={isUpdating}
                          variant="complete"
                        >
                          🎉 Tamamla
                        </ActionButton>
                      )}
                      {appointment.status !== "cancelled" && (
                        <ActionButton
                          onClick={() => handleStatusChange(appointment.id, "cancelled")}
                          disabled={isUpdating}
                          variant="cancel"
                        >
                          ❌ İptal Et
                        </ActionButton>
                      )}
                      {appointment.status !== "no_show" && !past && (
                        <ActionButton
                          onClick={() => handleStatusChange(appointment.id, "no_show")}
                          disabled={isUpdating}
                          variant="noshow"
                        >
                          👻 Gelmedi
                        </ActionButton>
                      )}
                      {appointment.customerPhone && (
                        <a
                          href={`tel:${appointment.customerPhone}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2 text-xs font-semibold text-[var(--text-2)] transition hover:bg-[var(--field-bg-hover)]"
                        >
                          📞 Ara
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline keyframes */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">
        {icon} {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-[var(--text-1)]">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: "confirm" | "complete" | "cancel" | "noshow";
  children: React.ReactNode;
}) {
  const styles = {
    confirm:
      "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100",
    complete:
      "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    cancel:
      "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    noshow:
      "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {disabled ? (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
