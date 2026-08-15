"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import { createStaff, listStaff, removeStaff, updateStaff } from "@/features/staff/staff-repository";
import { listServices } from "@/features/services/service-repository";
import { firstErrorMessage, staffCreateSchema } from "@/lib/validation/schemas";
import type { Staff } from "@/types/staff";
import type { Service } from "@/types/service";
import type { DaySchedule } from "@/types/business";

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0];

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}
const TIME_SLOTS = generateTimeSlots();

const defaultHours: DaySchedule[] = ORDERED_DAYS.map((day) => ({
  day,
  isOpen: day !== 0,
  start: "09:00",
  end: "19:00",
  breakStart: "13:00",
  breakEnd: "14:00",
}));

export default function StaffPage() {
  const { businessId } = useBusiness();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("Uzman");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    Promise.all([listStaff(businessId), listServices(businessId)]).then(
      ([staffRows, serviceRows]) => {
        if (cancelled) return;
        setStaff(staffRows);
        setServices(serviceRows);
        setLoading(false);
      }
    ).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [businessId]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!businessId) return;

    const validated = staffCreateSchema.safeParse({ name, phone, email });
    if (!validated.success) {
      toast.error(firstErrorMessage(validated.error));
      return;
    }

    const { name: safeName, phone: safePhone, email: safeEmail } = validated.data;

    await createStaff(businessId, {
      fullName: safeName,
      photoUrl: "",
      phone: safePhone,
      email: safeEmail,
      position,
      isActive: true,
      serviceIds: [],
      workingHours: defaultHours,
      leaveDates: [],
      appointmentCapacity: 1,
    });

    toast.success("Çalışan eklendi");
    setName("");
    setPhone("");
    setEmail("");
    setPosition("Uzman");
    setStaff(await listStaff(businessId));
  }

  if (loading) {
    return <LoadingState title="Çalışanlar yükleniyor" description="Lütfen bekleyin..." />;
  }

  return (
    <div className="space-y-4">
      {/* Create Staff Form */}
      <Card title="Yeni Çalışan Ekle" description="Ekibinize yeni bir üye ekleyin.">
        <form className="grid gap-3 sm:grid-cols-5" onSubmit={onCreate}>
          <Input label="Ad Soyad *" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ali Yılmaz" />
          <Input label="Telefon *" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="05XX" />
          <Input label="E-posta *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Pozisyon" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Uzman" />
          <div className="flex items-end">
            <Button className="w-full" type="submit">+ Ekle</Button>
          </div>
        </form>
      </Card>

      {/* Staff List */}
      {staff.length === 0 ? (
        <EmptyState title="Henüz çalışan yok" description="İlk ekip üyenizi yukarıdan ekleyin." />
      ) : (
        <div className="space-y-3">
          {staff.map((item) => (
            <StaffCard
              key={item.id}
              item={item}
              services={services}
              businessId={businessId!}
              isExpanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onRefresh={async () => setStaff(await listStaff(businessId!))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Staff Card Component ─── */

function StaffCard({
  item,
  services,
  businessId,
  isExpanded,
  onToggle,
  onRefresh,
}: {
  item: Staff;
  services: Service[];
  businessId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [editPosition, setEditPosition] = useState(item.position);
  const [editBio, setEditBio] = useState(item.bio ?? "");
  const [editCapacity, setEditCapacity] = useState(item.appointmentCapacity);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(item.serviceIds);
  const [staffHours, setStaffHours] = useState<DaySchedule[]>(() => {
    if (item.workingHours.length > 0) {
      return ORDERED_DAYS.map((day) => {
        const existing = item.workingHours.find((h) => h.day === day);
        return existing ?? { day, isOpen: false, start: "09:00", end: "19:00" };
      });
    }
    return defaultHours;
  });
  const [leaveDates, setLeaveDates] = useState<string[]>(item.leaveDates ?? []);
  const [newLeaveDate, setNewLeaveDate] = useState("");

  function updateHourDay(idx: number, patch: Partial<DaySchedule>) {
    setStaffHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateStaff(businessId, item.id, {
        position: editPosition,
        bio: editBio || undefined,
        appointmentCapacity: editCapacity,
        serviceIds: selectedServiceIds,
        workingHours: staffHours,
        leaveDates,
      });
      toast.success(`${item.fullName} güncellendi.`);
      onRefresh();
    } catch {
      toast.error("Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    await updateStaff(businessId, item.id, { isActive: !item.isActive });
    onRefresh();
  }

  async function handleDelete() {
    if (!confirm(`${item.fullName} silinecek. Emin misiniz?`)) return;
    await removeStaff(businessId, item.id);
    toast.success("Çalışan silindi.");
    onRefresh();
  }

  return (
    <div className={`rounded-2xl border transition ${isExpanded ? "border-[var(--accent)]/40 shadow-lg" : "border-[var(--border)]"} bg-[var(--surface-1)]`}>
      {/* Collapsed Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${item.isActive ? "bg-emerald-500" : "bg-gray-400"}`}>
            {item.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--text-1)]">{item.fullName}</p>
            <p className="truncate text-xs text-[var(--text-3)]">
              {item.position} · {item.phone}
              {!item.isActive && <span className="ml-2 text-rose-500">(Pasif)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.serviceIds.length > 0 && (
            <span className="hidden rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)] sm:inline">
              {item.serviceIds.length} hizmet
            </span>
          )}
          <svg
            className={`h-5 w-5 text-[var(--text-3)] transition ${isExpanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] px-5 py-5 space-y-6">
          {/* Basic Info */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Pozisyon" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} />
            <Select
              label="Kapasite (aynı anda)"
              value={String(editCapacity)}
              onChange={(e) => setEditCapacity(Number(e.target.value))}
              options={[
                { value: "1", label: "1 randevu" },
                { value: "2", label: "2 randevu" },
                { value: "3", label: "3 randevu" },
              ]}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-1)] outline-none transition focus:border-[var(--accent)]"
                placeholder="Kısa açıklama..."
              />
            </div>
          </div>

          {/* Service Assignment */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-[var(--text-1)]">🎯 Hizmet Ataması</h4>
            {services.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Henüz hizmet tanımlı değil.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((svc) => (
                  <label
                    key={svc.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                      selectedServiceIds.includes(svc.id)
                        ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)]/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="h-4 w-4 rounded accent-[var(--accent)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{svc.name}</p>
                      <p className="text-[10px] text-[var(--text-3)]">{svc.durationMinutes}dk · {svc.price}₺</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Staff Working Hours */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-[var(--text-1)]">🕐 Çalışma Saatleri</h4>
            <div className="space-y-1.5">
              {staffHours.map((h, idx) => (
                <div
                  key={h.day}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    h.isOpen
                      ? "border-[var(--border)] bg-[var(--surface-1)]"
                      : "border-[var(--border)] bg-[var(--surface-2)] opacity-60"
                  }`}
                >
                  <span className="w-20 font-medium text-[var(--text-1)]">{DAY_NAMES[h.day]}</span>
                  <button
                    type="button"
                    onClick={() => updateHourDay(idx, { isOpen: !h.isOpen })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                      h.isOpen ? "bg-emerald-500" : "bg-[var(--surface-3)]"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${h.isOpen ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  {h.isOpen && (
                    <>
                      <select value={h.start} onChange={(e) => updateHourDay(idx, { start: e.target.value })} className="rounded border border-[var(--border)] bg-[var(--surface-1)] px-1.5 py-1 text-xs">
                        {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-xs text-[var(--text-3)]">—</span>
                      <select value={h.end} onChange={(e) => updateHourDay(idx, { end: e.target.value })} className="rounded border border-[var(--border)] bg-[var(--surface-1)] px-1.5 py-1 text-xs">
                        {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave Dates */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-[var(--text-1)]">🏖️ İzin Günleri</h4>
            <div className="flex gap-2">
              <Input label="Tarih" type="date" value={newLeaveDate} onChange={(e) => setNewLeaveDate(e.target.value)} />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!newLeaveDate || leaveDates.includes(newLeaveDate)) return;
                  setLeaveDates([...leaveDates, newLeaveDate].sort());
                  setNewLeaveDate("");
                }}
              >
                Ekle
              </Button>
            </div>
            {leaveDates.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {leaveDates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-2)]"
                  >
                    {d}
                    <button
                      onClick={() => setLeaveDates((prev) => prev.filter((x) => x !== d))}
                      className="ml-0.5 text-rose-500 hover:text-rose-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Kaydediliyor..." : "💾 Değişiklikleri Kaydet"}
            </Button>
            <Button variant="secondary" onClick={handleToggleActive}>
              {item.isActive ? "⏸️ Pasif Yap" : "▶️ Aktif Yap"}
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              🗑️ Sil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
