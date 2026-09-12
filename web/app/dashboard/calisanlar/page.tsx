"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import { useBusiness } from "@/hooks/use-business";
import { archiveStaff, createStaff, linkStaffAccount, listStaff, updateStaff } from "@/features/staff/staff-repository";
import { listServices } from "@/features/services/service-repository";
import { listServiceCategories } from "@/features/services/service-category-repository";
import { firstErrorMessage, staffCreateSchema } from "@/lib/validation/schemas";
import { ImageUploader } from "@/components/ui/image-uploader";
import { uploadStaffImage } from "@/lib/firebase/upload";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listBusinessReviewsForOwner } from "@/features/reviews/review-repository";
import type { Staff } from "@/types/staff";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { DaySchedule } from "@/types/business";
import type { Appointment } from "@/types/appointments";
import type { Review } from "@/types/review";
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
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadedAt] = useState(() => Date.now());

  // Create form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("Uzman");
  const [specialtyCategoryIds, setSpecialtyCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    Promise.all([listStaff(businessId), listServices(businessId), listServiceCategories(businessId), listAppointments(businessId), listBusinessReviewsForOwner(businessId).catch(() => [] as Review[])]).then(
      ([staffRows, serviceRows, categoryRows, appointmentRows, reviewRows]) => {
        if (cancelled) return;
        setStaff(staffRows);
        setServices(serviceRows);
        setCategories(categoryRows);
        setAppointments(appointmentRows);
        setReviews(reviewRows);
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

    const validated = staffCreateSchema.safeParse({ name, phone, email, specialtyCategoryIds });
    if (!validated.success) {
      toast.error(firstErrorMessage(validated.error));
      return;
    }

    const { name: safeName, phone: safePhone, email: safeEmail, specialtyCategoryIds: safeCategoryIds } = validated.data;
    const matchingServiceIds = services
      .filter((service) => safeCategoryIds.includes(service.category))
      .map((service) => service.id);

    await createStaff(businessId, {
      fullName: safeName,
      photoUrl: "",
      phone: safePhone,
      email: safeEmail,
      position,
      specialtyCategoryIds: safeCategoryIds,
      expertiseLevel: "specialist",
      commissionRate: 0,
      permissions: { manageOwnCalendar: true, viewCustomers: false, manageAppointments: false },
      isActive: true,
      serviceIds: matchingServiceIds,
      workingHours: defaultHours,
      leaveDates: [],
      appointmentCapacity: 1,
    });

    toast.success("Çalışan eklendi");
    setName("");
    setPhone("");
    setEmail("");
    setPosition("Uzman");
    setSpecialtyCategoryIds([]);
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
          <div className="sm:col-span-5">
            <SpecialtyPicker
              categories={categories}
              selectedIds={specialtyCategoryIds}
              onChange={setSpecialtyCategoryIds}
              emptyMessage="Önce Hizmetler bölümünden Saç, Cilt Bakımı gibi en az bir kategori oluşturun."
            />
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
              allStaff={staff}
              services={services}
              categories={categories}
              appointments={appointments}
              reviews={reviews}
              referenceTime={loadedAt}
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
  allStaff,
  services,
  categories,
  appointments,
  reviews,
  referenceTime,
  businessId,
  isExpanded,
  onToggle,
  onRefresh,
}: {
  item: Staff;
  allStaff: Staff[];
  services: Service[];
  categories: ServiceCategory[];
  appointments: Appointment[];
  reviews: Review[];
  referenceTime: number;
  businessId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [editPosition, setEditPosition] = useState(item.position);
  const [editPhotoUrl, setEditPhotoUrl] = useState(item.photoUrl ?? "");
  const [expertiseLevel, setExpertiseLevel] = useState(item.expertiseLevel ?? "specialist");
  const [commissionRate, setCommissionRate] = useState(item.commissionRate ?? 0);
  const [permissions, setPermissions] = useState(item.permissions ?? { manageOwnCalendar: true, viewCustomers: false, manageAppointments: false });
  const [replacementStaffId, setReplacementStaffId] = useState("");
  const [editBio, setEditBio] = useState(item.bio ?? "");
  const [editCapacity, setEditCapacity] = useState(item.appointmentCapacity);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(item.serviceIds);
  const derivedCategoryIds = Array.from(new Set(
    services.filter((service) => item.serviceIds.includes(service.id)).map((service) => service.category).filter(Boolean)
  ));
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    item.specialtyCategoryIds?.length ? item.specialtyCategoryIds : derivedCategoryIds
  );
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
  const memberAppointments = appointments.filter((appointment) => appointment.staffId === item.id);
  const completedAppointments = memberAppointments.filter((appointment) => appointment.status === "completed");
  const upcomingAppointments = memberAppointments.filter((appointment) => ["pending", "confirmed"].includes(appointment.status) && new Date(appointment.startAt).getTime() >= referenceTime);
  const memberReviews = reviews.filter((review) => review.staffId === item.id && review.status === "approved");
  const averageRating = memberReviews.length ? memberReviews.reduce((total, review) => total + review.rating, 0) / memberReviews.length : 0;
  const generatedRevenue = completedAppointments.reduce((total, appointment) => total + Number(appointment.servicePrice ?? 0), 0);

  function updateHourDay(idx: number, patch: Partial<DaySchedule>) {
    setStaffHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  }

  function changeSpecialties(nextIds: string[]) {
    const newlyAdded = nextIds.filter((id) => !selectedCategoryIds.includes(id));
    setSelectedCategoryIds(nextIds);
    setSelectedServiceIds((current) => {
      const allowed = current.filter((id) => {
        const service = services.find((row) => row.id === id);
        return service && nextIds.includes(service.category);
      });
      const defaults = services
        .filter((service) => newlyAdded.includes(service.category))
        .map((service) => service.id);
      return Array.from(new Set([...allowed, ...defaults]));
    });
  }

  async function handleSave() {
    if (selectedCategoryIds.length === 0) {
      toast.error("En az bir branş seçmelisiniz.");
      return;
    }
    setSaving(true);
    try {
      await updateStaff(businessId, item.id, {
        position: editPosition,
        photoUrl: editPhotoUrl,
        expertiseLevel,
        commissionRate: Math.min(100, Math.max(0, commissionRate)),
        permissions,
        bio: editBio || undefined,
        appointmentCapacity: editCapacity,
        specialtyCategoryIds: selectedCategoryIds,
        serviceIds: selectedServiceIds,
        workingHours: staffHours,
        leaveDates,
      });
      if (item.linkedUid) await linkStaffAccount(businessId, item.id);
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

  async function handleLinkAccount() {
    try {
      const result = await linkStaffAccount(businessId, item.id);
      toast.success(`${result.email} çalışan paneline bağlandı.`);
      onRefresh();
    } catch (error) {
      toast.error((error as Error).message || "Çalışan hesabı bağlanamadı. Bu e-posta ile önce müşteri hesabı oluşturulmalı.");
    }
  }

  async function handleDelete() {
    if (!confirm(`${item.fullName} arşivlenecek. Gelecek randevuları varsa seçtiğiniz çalışana aktarılacak. Emin misiniz?`)) return;
    try {
      const result = await archiveStaff(businessId, item.id, replacementStaffId || undefined);
      toast.success(result.transferred > 0 ? `${result.transferred} randevu aktarıldı ve çalışan arşivlendi.` : "Çalışan güvenle arşivlendi.");
      onRefresh();
    } catch (error) {
      toast.error((error as Error).message || "Çalışan arşivlenemedi.");
    }
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
            {selectedCategoryIds.length > 0 && <p className="staff-member-meta">{categories.filter((category) => selectedCategoryIds.includes(category.id)).map((category) => category.name).join(" · ")}</p>}
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
            <Select
              label="Yetkinlik seviyesi"
              value={expertiseLevel}
              onChange={(e) => setExpertiseLevel(e.target.value as NonNullable<Staff["expertiseLevel"]>)}
              options={[
                { value: "junior", label: "Gelişen uzman" },
                { value: "specialist", label: "Uzman" },
                { value: "senior", label: "Kıdemli uzman" },
                { value: "trainer", label: "Eğitmen / Usta" },
              ]}
            />
            <Input label="Prim / komisyon (%)" type="number" min="0" max="100" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} />
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
          </div><div className="mt-4"><ImageUploader label="Çalışan fotoğrafı" currentUrl={editPhotoUrl} onUpload={setEditPhotoUrl} uploadFn={(file) => uploadStaffImage(businessId, item.id, file)} /></div></section>

          <section className="staff-editor-section">
            <header><BriefcaseBusiness size={18} /><div><h4>Branşlar *</h4><p>Çalışanın görev aldığı ana hizmet alanlarını seç. En az bir branş zorunludur.</p></div></header>
            <SpecialtyPicker categories={categories} selectedIds={selectedCategoryIds} onChange={changeSpecialties} />
          </section>

          <section className="staff-editor-section">
            <header><Sparkles size={18} /><div><h4>Performans özeti</h4><p>Gerçek randevu ve değerlendirme verilerinden hesaplanır.</p></div></header>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="staff-service-option is-selected"><div><p className="font-bold">{completedAppointments.length}</p><small>Tamamlanan randevu</small></div></div>
              <div className="staff-service-option is-selected"><div><p className="font-bold">{upcomingAppointments.length}</p><small>Gelecek randevu</small></div></div>
              <div className="staff-service-option is-selected"><div><p className="font-bold">{averageRating ? averageRating.toFixed(1) : "—"}</p><small>Müşteri puanı ({memberReviews.length})</small></div></div>
              <div className="staff-service-option is-selected"><div><p className="font-bold">{generatedRevenue.toLocaleString("tr-TR")} ₺</p><small>Üretilen gelir · prim {(generatedRevenue * commissionRate / 100).toLocaleString("tr-TR")} ₺</small></div></div>
            </div>
          </section>

          <section className="staff-editor-section">
            <header><ShieldCheck size={18} /><div><h4>Çalışan paneli yetkileri</h4><p>Çalışan hesabı bağlandığında erişebileceği alanları şimdiden sınırla.</p></div></header>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ["manageOwnCalendar", "Kendi takvimini yönet"],
                ["viewCustomers", "Müşteri bilgilerini gör"],
                ["manageAppointments", "Randevu durumunu değiştir"],
              ] as const).map(([key, label]) => (
                <label key={key} className={`staff-service-option ${permissions[key] ? "is-selected" : ""}`}>
                  <input type="checkbox" checked={permissions[key]} onChange={() => setPermissions((current) => ({ ...current, [key]: !current[key] }))} />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Service Assignment */}
          <section className="staff-editor-section">
            <header><Sparkles size={18} /><div><h4>Hizmet yetkinlikleri</h4><p>Bu uzmanın sunabildiği hizmetleri seç.</p></div></header>
            {services.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Henüz hizmet tanımlı değil.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {services.filter((svc) => selectedCategoryIds.includes(svc.category)).map((svc) => (
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
            <Button variant="secondary" onClick={handleLinkAccount}>
              <ShieldCheck size={17} /> {item.linkedUid ? "Panel Erişimini Yenile" : "Çalışan Panelini Bağla"}
            </Button>
            <Select
              label="Gelecek randevuları aktar"
              value={replacementStaffId}
              onChange={(e) => setReplacementStaffId(e.target.value)}
              options={[
                { value: "", label: "Aktarım gerekmiyorsa boş bırak" },
                ...allStaff.filter((candidate) => candidate.id !== item.id && candidate.isActive).map((candidate) => ({ value: candidate.id, label: candidate.fullName })),
              ]}
            />
            <Button variant="danger" onClick={handleDelete}><Trash2 size={17} /> Arşivle</Button>
          </footer>
        </div>
      )}
    </article>
  );
}

function SpecialtyPicker({
  categories,
  selectedIds,
  onChange,
  emptyMessage = "Henüz seçilebilir hizmet branşı yok.",
}: {
  categories: ServiceCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyMessage?: string;
}) {
  if (categories.length === 0) return <p className="text-sm text-amber-700">{emptyMessage}</p>;

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-[var(--text-2)]">Çalışan branşı * <span className="font-normal text-[var(--text-3)]">(birden fazla seçilebilir)</span></legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => {
          const selected = selectedIds.includes(category.id);
          return (
            <label key={category.id} className={`staff-service-option ${selected ? "is-selected" : ""}`}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onChange(selected ? selectedIds.filter((id) => id !== category.id) : [...selectedIds, category.id])}
                className="h-4 w-4 rounded accent-[var(--accent)]"
              />
              <span className="flex items-center gap-2 font-semibold">
                <ServiceCategoryIcon icon={category.icon} name={category.name} size={17} />
                {category.name}
              </span>
            </label>
          );
        })}
      </div>
      {selectedIds.length === 0 && <p className="mt-2 text-xs font-semibold text-rose-600">Devam etmek için en az bir branş seçin.</p>}
    </fieldset>
  );
}
