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
import { BriefcaseBusiness, CalendarClock, CalendarOff, CheckCircle2, ChevronDown, PauseCircle, PlayCircle, Save, ShieldCheck, Sparkles, Trash2, UserRound, WandSparkles } from "lucide-react";

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
    <div className="staff-page">
      <section className="staff-command-hero">
        <div>
          <span><Sparkles size={15} /> EKİP OPERASYONU</span>
          <h1>Yeteneği doğru hizmetle buluştur.</h1>
          <p>Uzmanlıkları, kapasiteyi, vardiyaları ve izinleri akıcı bir çalışma alanından yönet.</p>
        </div>
        <aside><UserRound size={27} /><strong>{staff.length}</strong><small>aktif ekip profili</small></aside>
      </section>

      {/* Create Staff Form */}
      <Card className="staff-create-card" title="Yeni Çalışan Ekle" description="Ekibinize yeni bir üye ekleyin.">
        <form className="grid gap-3 sm:grid-cols-5" onSubmit={onCreate}>
          <Input label="Ad Soyad *" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ali Yılmaz" />
          <Input label="Telefon *" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="05XX" />
          <Input label="E-posta *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Pozisyon" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Uzman" />
          <div className="flex items-end">
            <Button className="w-full" type="submit"><UserRound size={17} /> Ekibe Ekle</Button>
          </div>
        </form>
      </Card>

      {/* Staff List */}
      {staff.length === 0 ? (
        <EmptyState title="Henüz çalışan yok" description="İlk ekip üyenizi yukarıdan ekleyin." />
      ) : (
        <div className="staff-list">
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
    <article className={`staff-member-card ${isExpanded ? "is-expanded" : ""}`}>
      {/* Collapsed Header */}
      <button
        onClick={onToggle}
        className="staff-member-head"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`staff-member-avatar ${item.isActive ? "is-active" : ""}`}>
            {item.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="staff-member-name">{item.fullName}</p>
            <p className="staff-member-meta">
              {item.position} · {item.phone}
              {!item.isActive && <span className="ml-2 text-rose-500">(Pasif)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.serviceIds.length > 0 && (
            <span className="staff-service-count">
              <CheckCircle2 size={13} /> {item.serviceIds.length} hizmet
            </span>
          )}
          <span className="staff-expand-icon"><ChevronDown className={isExpanded ? "rotate-180" : ""} size={19} /></span>
        </div>
      </button>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <div className="staff-editor-panel">
          <div className="staff-editor-intro">
            <div><span><WandSparkles size={14} /> PROFİL STÜDYOSU</span><h3>{item.fullName} için çalışma planı</h3></div>
            <i><ShieldCheck size={18} /> Değişiklikler güvenle senkronlanır</i>
          </div>
          {/* Basic Info */}
          <section className="staff-editor-section"><header><BriefcaseBusiness size={18} /><div><h4>Uzmanlık profili</h4><p>Rol, kapasite ve müşteriye görünen tanıtım.</p></div></header><div className="grid gap-3 sm:grid-cols-3">
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
          </div></section>

          {/* Service Assignment */}
          <section className="staff-editor-section">
            <header><Sparkles size={18} /><div><h4>Hizmet yetkinlikleri</h4><p>Bu uzmanın sunabildiği hizmetleri seç.</p></div></header>
            {services.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Henüz hizmet tanımlı değil.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((svc) => (
                  <label
                    key={svc.id}
                    className={`staff-service-option ${
                      selectedServiceIds.includes(svc.id)
                        ? "is-selected"
                        : ""
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
          </section>

          {/* Staff Working Hours */}
          <section className="staff-editor-section">
            <header><CalendarClock size={18} /><div><h4>Haftalık çalışma ritmi</h4><p>Açık günleri ve hizmet saatlerini planla.</p></div></header>
            <div className="staff-hours-grid">
              {staffHours.map((h, idx) => (
                <div
                  key={h.day}
                  className={`staff-hour-row ${
                    h.isOpen
                      ? "is-open"
                      : "is-closed"
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
          </section>

          {/* Leave Dates */}
          <section className="staff-editor-section">
            <header><CalendarOff size={18} /><div><h4>İzin ve müsaitlik</h4><p>Randevuya kapanacak özel günleri ekle.</p></div></header>
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
          </section>

          {/* Action Buttons */}
          <footer className="staff-editor-actions">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={17} /> {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
            <Button variant="secondary" onClick={handleToggleActive}>
              {item.isActive ? <PauseCircle size={17} /> : <PlayCircle size={17} />} {item.isActive ? "Pasif Yap" : "Aktif Yap"}
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 size={17} /> Sil
            </Button>
          </footer>
        </div>
      )}
    </article>
  );
}
