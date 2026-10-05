"use client";

import { useMemo, useState } from "react";
import {
  Archive, BriefcaseBusiness, CalendarClock, CalendarOff, CalendarPlus, CheckCircle2, CircleDollarSign, Info, KeyRound, MailCheck,
  PauseCircle, PlayCircle, Save, ShieldCheck, Sparkles, Star, UserRound, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge, Button, Callout, Field, FormGrid, Input, NativeSelect, SegmentedControl, Sheet, StatCard, StatGrid, Switch, Textarea,
} from "@/components/dashboard/ui";
import { ImageUploader } from "@/components/ui/image-uploader";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import { archiveStaff, linkStaffAccount, updateStaff } from "@/features/staff/staff-repository";
import { uploadStaffImage } from "@/lib/firebase/upload";
import type { Appointment } from "@/types/appointments";
import type { DaySchedule } from "@/types/business";
import type { Review } from "@/types/review";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";
import { Avatar, cx, useConfirm, ws } from "../_workspace/kit";
import { DAY_NAMES, DayCard, ORDERED_DAYS, cleanSchedule, copySchedule, dayError } from "../_workspace/week-editor";
import { cleanOverrides } from "../hizmetler/service-shared";
import { SpecialtyPicker } from "./specialty-picker";
import styles from "./staff.module.css";

type Tab = "profile" | "services" | "schedule" | "access" | "account";
type Permissions = NonNullable<Staff["permissions"]>;

const PERMISSIONS: Array<[keyof Permissions, string, string]> = [
  ["manageOwnCalendar", "Kendi takvimini yönet", "Kendi randevularını ve müsaitliğini görür."],
  ["viewCustomers", "Müşteri bilgilerini gör", "Müşteri listesi ve iletişim bilgileri."],
  ["manageAppointments", "Randevu durumunu değiştir", "Onaylama, iptal, gelmedi işaretleme."],
  ["manageCheckout", "Adisyon ve tahsilat yönet", "Ödeme alma ve adisyon kapatma."],
  ["manageCatalog", "Ürün ve stok yönet", "Ürün kataloğu ve stok hareketleri."],
  ["managePackages", "Paket ve seans yönet", "Paket satışı ve seans kullanımı."],
  ["manageFinance", "Gelir ve giderleri gör", "Kasa ve finans raporları."],
];

const EXPERTISE: Array<{ value: NonNullable<Staff["expertiseLevel"]>; label: string }> = [
  { value: "junior", label: "Gelişen uzman" },
  { value: "specialist", label: "Uzman" },
  { value: "senior", label: "Kıdemli uzman" },
  { value: "trainer", label: "Eğitmen / Usta" },
];

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function StaffEditorSheet({
  open, item, allStaff, services, categories, appointments, reviews, referenceTime, businessId, initialTab = "profile", onClose, onRefresh,
}: {
  open: boolean;
  item: Staff;
  allStaff: Staff[];
  services: Service[];
  categories: ServiceCategory[];
  appointments: Appointment[];
  reviews: Review[];
  referenceTime: number;
  businessId: string;
  initialTab?: Tab;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { confirm, dialog } = useConfirm();
  const [editPosition, setEditPosition] = useState(item.position);
  const [editPhotoUrl, setEditPhotoUrl] = useState(item.photoUrl ?? "");
  const [expertiseLevel, setExpertiseLevel] = useState(item.expertiseLevel ?? "specialist");
  const [commissionRate, setCommissionRate] = useState(String(item.commissionRate ?? 0));
  const [serviceOverrides, setServiceOverrides] = useState(item.serviceOverrides ?? {});
  const [permissions, setPermissions] = useState<Permissions>({ manageOwnCalendar: true, viewCustomers: false, manageAppointments: false, manageCheckout: false, manageCatalog: false, managePackages: false, manageFinance: false, ...(item.permissions ?? {}) });
  const [replacementStaffId, setReplacementStaffId] = useState("");
  const [editBio, setEditBio] = useState(item.bio ?? "");
  const [editCapacity, setEditCapacity] = useState(item.appointmentCapacity || 1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(item.serviceIds);
  const derivedCategoryIds = Array.from(new Set(
    services.filter((service) => item.serviceIds.includes(service.id)).map((service) => service.category).filter(Boolean),
  ));
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(item.specialtyCategoryIds?.length ? item.specialtyCategoryIds : derivedCategoryIds);
  const [staffHours, setStaffHours] = useState<DaySchedule[]>(() => {
    if (item.workingHours.length > 0) {
      return ORDERED_DAYS.map((day) => {
        const existing = item.workingHours.find((h) => h.day === day);
        return existing ?? { day, isOpen: false, start: "09:00", end: "19:00" };
      });
    }
    return ORDERED_DAYS.map((day) => ({ day, isOpen: day !== 0, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" }));
  });
  const [leaveDates, setLeaveDates] = useState<string[]>(item.leaveDates ?? []);
  const [newLeaveDate, setNewLeaveDate] = useState("");

  /* ── Performans ── */
  const memberAppointments = useMemo(() => appointments.filter((appointment) => appointment.staffId === item.id), [appointments, item.id]);
  const completedAppointments = memberAppointments.filter((appointment) => appointment.status === "completed");
  const upcomingAppointments = memberAppointments.filter((appointment) => ["pending", "confirmed"].includes(appointment.status) && new Date(appointment.startAt).getTime() >= referenceTime);
  const memberReviews = reviews.filter((review) => review.staffId === item.id && review.status === "approved");
  const averageRating = memberReviews.length ? memberReviews.reduce((total, review) => total + review.rating, 0) / memberReviews.length : 0;
  const generatedRevenue = completedAppointments.reduce((total, appointment) => total + Number(appointment.servicePrice ?? 0), 0);
  const commissionNumber = Number(commissionRate);
  const safeRate = Number.isFinite(commissionNumber) ? Math.min(100, Math.max(0, commissionNumber)) : 0;
  const earnedCommission = generatedRevenue * safeRate / 100;
  const paidCommission = (item.commissionPayouts ?? []).reduce((total, payout) => total + payout.amount, 0);
  const outstandingCommission = Math.max(0, earnedCommission - paidCommission);

  /* ── Doğrulama ── */
  const scheduleErrors = staffHours.filter((day) => dayError(day));
  const commissionError = !Number.isFinite(commissionNumber) || commissionNumber < 0 || commissionNumber > 100 ? "Komisyon 0 ile 100 arasında olmalı." : null;
  const overrideErrors = selectedServiceIds.filter((id) => {
    const value = serviceOverrides[id];
    if (!value) return false;
    return (value.durationMinutes !== undefined && (value.durationMinutes < 5 || value.durationMinutes > 480)) || (value.price !== undefined && value.price < 0);
  });
  const tabErrors: Record<Tab, number> = {
    profile: (commissionError ? 1 : 0),
    services: (selectedCategoryIds.length === 0 ? 1 : 0) + overrideErrors.length,
    schedule: scheduleErrors.length,
    access: 0,
    account: 0,
  };
  const totalErrors = Object.values(tabErrors).reduce((a, b) => a + b, 0);
  const visibleServices = services.filter((svc) => selectedCategoryIds.includes(svc.category));
  const today = todayKey();
  const sortedLeaves = [...leaveDates].sort();

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) => prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]);
  }

  function changeSpecialties(nextIds: string[]) {
    const newlyAdded = nextIds.filter((id) => !selectedCategoryIds.includes(id));
    setSelectedCategoryIds(nextIds);
    setSelectedServiceIds((current) => {
      const allowed = current.filter((id) => {
        const service = services.find((row) => row.id === id);
        return service && nextIds.includes(service.category);
      });
      const defaults = services.filter((service) => newlyAdded.includes(service.category)).map((service) => service.id);
      return Array.from(new Set([...allowed, ...defaults]));
    });
  }

  function setOverride(serviceId: string, key: "durationMinutes" | "price", raw: string) {
    setServiceOverrides((current) => ({ ...current, [serviceId]: { ...current[serviceId], [key]: raw ? Number(raw) : undefined } }));
  }

  function addLeave() {
    if (!newLeaveDate) return;
    if (leaveDates.includes(newLeaveDate)) {
      toast.info("Bu tarih zaten izinli.");
      return;
    }
    setLeaveDates([...leaveDates, newLeaveDate].sort());
    setNewLeaveDate("");
  }

  async function handleSave() {
    setSubmitted(true);
    if (selectedCategoryIds.length === 0) {
      setTab("services");
      toast.error("En az bir branş seçmelisiniz.");
      return;
    }
    if (overrideErrors.length) {
      setTab("services");
      toast.error("Özel süre 5–480 dk, özel fiyat 0 veya üzeri olmalı.");
      return;
    }
    const invalidDay = scheduleErrors[0];
    if (invalidDay) {
      setTab("schedule");
      toast.error(`${DAY_NAMES[invalidDay.day]}: ${dayError(invalidDay)}`);
      return;
    }
    if (commissionError) {
      setTab("profile");
      toast.error(commissionError);
      return;
    }
    setSaving(true);
    try {
      await updateStaff(businessId, item.id, {
        position: editPosition.trim() || item.position,
        photoUrl: editPhotoUrl,
        expertiseLevel,
        commissionRate: safeRate,
        serviceOverrides: cleanOverrides(serviceOverrides),
        permissions,
        // Firestore tanımsız alanları reddeder; boş biyografi boş metin olarak kaydedilir.
        bio: editBio.trim(),
        appointmentCapacity: editCapacity,
        specialtyCategoryIds: selectedCategoryIds,
        serviceIds: selectedServiceIds,
        workingHours: cleanSchedule(staffHours),
        leaveDates,
      });
      if (item.linkedUid) await linkStaffAccount(businessId, item.id).catch(() => undefined);
      toast.success(`${item.fullName} güncellendi.`);
      await onRefresh();
      onClose();
    } catch {
      toast.error("Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    setActionBusy("active");
    try {
      await updateStaff(businessId, item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? `${item.fullName} pasife alındı; yeni randevu almaz.` : `${item.fullName} yeniden aktif.`);
      await onRefresh();
    } catch {
      toast.error("Durum değiştirilemedi.");
    } finally {
      setActionBusy("");
    }
  }

  async function handleLinkAccount() {
    setActionBusy("link");
    try {
      const result = await linkStaffAccount(businessId, item.id, true);
      toast.success(result.invited ? `${result.email} adresine panel daveti gönderildi.` : `${result.email} çalışan paneline bağlandı.`);
      await onRefresh();
    } catch (error) {
      toast.error((error as Error).message || "Çalışan hesabı bağlanamadı. Bu e-posta ile önce müşteri hesabı oluşturulmalı.");
    } finally {
      setActionBusy("");
    }
  }

  async function handleArchive() {
    const replacement = allStaff.find((candidate) => candidate.id === replacementStaffId);
    const ok = await confirm({
      title: `${item.fullName} arşivlensin mi?`,
      description: replacement
        ? `Gelecek randevuları ${replacement.fullName} adlı çalışana aktarılacak ve ${item.fullName} ekip listesinden çıkacak.`
        : `Gelecek randevuları aktarılmayacak. ${item.fullName} ekip listesinden çıkacak ve yeni randevu almayacak.`,
      confirmLabel: "Arşivle",
    });
    if (!ok) return;
    setActionBusy("archive");
    try {
      const result = await archiveStaff(businessId, item.id, replacementStaffId || undefined);
      toast.success(result.transferred > 0 ? `${result.transferred} randevu aktarıldı ve çalışan arşivlendi.` : "Çalışan güvenle arşivlendi.");
      await onRefresh();
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Çalışan arşivlenemedi.");
    } finally {
      setActionBusy("");
    }
  }

  async function handleCommissionPaid() {
    if (outstandingCommission <= 0) {
      toast.info("Ödenecek hakediş bulunmuyor.");
      return;
    }
    const ok = await confirm({
      title: "Hakediş ödendi olarak kaydedilsin mi?",
      description: `${outstandingCommission.toLocaleString("tr-TR")} ₺ tutarındaki hakediş ${item.fullName} için ödendi olarak işaretlenecek.`,
      confirmLabel: "Ödendi işaretle",
      tone: "primary",
    });
    if (!ok) return;
    setActionBusy("commission");
    try {
      const payout = {
        id: crypto.randomUUID(),
        periodLabel: new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(referenceTime)),
        grossRevenue: generatedRevenue,
        rate: safeRate,
        amount: outstandingCommission,
        paidAt: new Date().toISOString(),
      };
      await updateStaff(businessId, item.id, { commissionPayouts: [...(item.commissionPayouts ?? []).slice(-35), payout] });
      toast.success(`${outstandingCommission.toLocaleString("tr-TR")} ₺ hakediş ödendi olarak kaydedildi.`);
      await onRefresh();
    } catch {
      toast.error("Hakediş kaydedilemedi.");
    } finally {
      setActionBusy("");
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof UserRound }> = [
    { id: "profile", label: "Profil", icon: UserRound },
    { id: "services", label: "Hizmetler", icon: Sparkles },
    { id: "schedule", label: "Çalışma planı", icon: CalendarClock },
    { id: "access", label: "Yetkiler", icon: ShieldCheck },
    { id: "account", label: "Hesap", icon: KeyRound },
  ];
  const lastPayout = (item.commissionPayouts ?? []).at(-1);

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        dismissible={!saving && !actionBusy}
        placement="side"
        size="lg"
        title={<span className={styles.sheetTitle}><Avatar name={item.fullName} photoUrl={editPhotoUrl || item.photoUrl} /><span><b>{item.fullName}</b><small>{item.position}{!item.isActive ? " · pasif" : ""}</small></span></span>}
        headerExtra={
          <div className={ws.tabs} role="tablist" aria-label="Çalışan düzenleme bölümleri">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={cx(ws.tab, tab === id && ws.tabActive)} onClick={() => setTab(id)}>
                <Icon size={15} /> {label}{(submitted || id === "schedule") && tabErrors[id] ? <span className={ws.tabDot} aria-label="hata var" /> : null}
              </button>
            ))}
          </div>
        }
        footer={tab === "account" ? (
          <Button variant="ghost" onClick={onClose}>Kapat</Button>
        ) : <>
          {submitted && totalErrors ? <p className={cx(ws.footNote, ws.footNoteError)}>{totalErrors} sorun düzeltilmeli</p> : <p className={ws.footNote}><Info size={13} /> Tüm sekmelerdeki değişiklikler birlikte kaydedilir.</p>}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Vazgeç</Button>
          <Button variant="primary" icon={Save} loading={saving} onClick={() => void handleSave()}>Kaydet</Button>
        </>}
      >
        <div className={ws.stack}>
          {tab === "profile" && <>
            <section className={ws.section}>
              <div className={ws.sectionHead}><BriefcaseBusiness size={18} /><div><h3>Uzmanlık profili</h3><p>Rol, kapasite ve müşteriye görünen tanıtım.</p></div></div>
              <ImageUploader label="Çalışan fotoğrafı" currentUrl={editPhotoUrl} onUpload={setEditPhotoUrl} uploadFn={(file) => uploadStaffImage(businessId, item.id, file)} />
              <FormGrid>
                <Field label="Pozisyon"><Input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} maxLength={80} /></Field>
                <Field label="Yetkinlik seviyesi">
                  <NativeSelect value={expertiseLevel} onChange={(e) => setExpertiseLevel(e.target.value as NonNullable<Staff["expertiseLevel"]>)}>
                    {EXPERTISE.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </NativeSelect>
                </Field>
                <div className={ws.fieldGroup}>
                  <span className={ws.fieldGroupLabel} id={`capacity-${item.id}`}>Aynı anda kaç randevu?</span>
                  <SegmentedControl ariaLabel="Aynı anda kaç randevu" stretch value={String(editCapacity)} onChange={(value) => setEditCapacity(Number(value))} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }]} />
                  <span className={ws.fieldGroupHint}>Örn. iki koltukta çalışan uzman için 2.</span>
                </div>
                <Field label="Prim / komisyon" error={commissionError}>
                  <span className={ws.affix}><Input type="number" inputMode="decimal" min="0" max="100" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} aria-invalid={Boolean(commissionError)} className={cx(commissionError && styles.invalid)} /><span>%</span></span>
                </Field>
                <Field label="Kısa tanıtım (isteğe bağlı)" wide hint="Mağaza sayfanızda uzman kartında görünür.">
                  <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} maxLength={300} placeholder="Uzmanlık alanları, deneyim…" />
                </Field>
              </FormGrid>
            </section>

            <section className={ws.section}>
              <div className={ws.sectionHead}><Sparkles size={18} /><div><h3>Performans özeti</h3><p>Gerçek randevu ve değerlendirme verilerinden hesaplanır.</p></div></div>
              <StatGrid columns={2}>
                <StatCard label="Tamamlanan" value={completedAppointments.length} icon={CheckCircle2} tone="green" />
                <StatCard label="Gelecek randevu" value={upcomingAppointments.length} icon={CalendarClock} tone="blue" />
                <StatCard label="Müşteri puanı" value={averageRating ? averageRating.toFixed(1) : "—"} hint={`${memberReviews.length} değerlendirme`} icon={Star} tone="amber" />
                <StatCard label="Üretilen gelir" value={`${generatedRevenue.toLocaleString("tr-TR")} ₺`} hint={`Hakediş ${earnedCommission.toLocaleString("tr-TR")} ₺`} icon={CircleDollarSign} tone="violet" />
              </StatGrid>
              <div className={styles.payout}>
                <div><small>Kalan hakediş</small><b>{outstandingCommission.toLocaleString("tr-TR")} ₺</b>{lastPayout ? <span>Son ödeme: {lastPayout.periodLabel} · {lastPayout.amount.toLocaleString("tr-TR")} ₺</span> : null}</div>
                <Button variant="secondary" onClick={() => void handleCommissionPaid()} disabled={outstandingCommission <= 0} loading={actionBusy === "commission"}>Ödendi işaretle</Button>
              </div>
            </section>
          </>}

          {tab === "services" && <>
            <SpecialtyPicker categories={categories} selectedIds={selectedCategoryIds} onChange={changeSpecialties} showError />
            <hr className={ws.divider} />
            <section className={ws.section}>
              <div className={ws.between}>
                <div className={ws.sectionHead}><Sparkles size={18} /><div><h3>Verdiği hizmetler</h3><p>Boş bırakılan özel süre/fiyat hizmetin varsayılanını kullanır.</p></div></div>
                {visibleServices.length ? <Badge tone="accent">{selectedServiceIds.filter((id) => visibleServices.some((svc) => svc.id === id)).length} / {visibleServices.length}</Badge> : null}
              </div>
              {services.length === 0 ? (
                <Callout tone="blue" title="Henüz hizmet tanımlı değil." action={<Button size="sm" variant="secondary" href="/dashboard/hizmetler">Hizmet ekle</Button>} />
              ) : visibleServices.length === 0 ? (
                <p className={styles.hint}><Info size={14} /> Hizmetleri görmek için yukarıdan branş seçin.</p>
              ) : (
                <ul className={styles.serviceList}>
                  {visibleServices.map((svc) => {
                    const checked = selectedServiceIds.includes(svc.id);
                    const category = categories.find((cat) => cat.id === svc.category);
                    const override = serviceOverrides[svc.id];
                    const invalid = submitted && overrideErrors.includes(svc.id);
                    return (
                      <li key={svc.id} className={cx(styles.serviceItem, checked && styles.serviceItemOn)}>
                        <label className={styles.serviceHead}>
                          <input type="checkbox" checked={checked} onChange={() => toggleService(svc.id)} />
                          {category ? <ServiceCategoryIcon icon={category.icon} name={category.name} size={17} /> : null}
                          <span className={ws.checkText}><b>{svc.name}</b><small>{svc.durationMinutes} dk · {svc.price.toLocaleString("tr-TR")} ₺{!svc.isActive ? " · pasif" : ""}</small></span>
                        </label>
                        {checked ? (
                          <div className={ws.grid2}>
                            <span className={ws.affix}><Input type="number" inputMode="numeric" min="5" max="480" aria-label={`${svc.name} özel süre`} placeholder={`${svc.durationMinutes}`} value={override?.durationMinutes ?? ""} onChange={(event) => setOverride(svc.id, "durationMinutes", event.target.value)} className={cx(invalid && styles.invalid)} /><span>dk</span></span>
                            <span className={ws.affix}><Input type="number" inputMode="decimal" min="0" aria-label={`${svc.name} özel fiyat`} placeholder={`${svc.price}`} value={override?.price ?? ""} onChange={(event) => setOverride(svc.id, "price", event.target.value)} className={cx(invalid && styles.invalid)} /><span>₺</span></span>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>}

          {tab === "schedule" && <>
            <section className={ws.section}>
              <div className={ws.sectionHead}><CalendarClock size={18} /><div><h3>Haftalık çalışma planı</h3><p>Çalışan yalnızca açık günlerde ve bu saatlerde randevu alır.</p></div></div>
              <div className={styles.dayList}>
                {staffHours.map((day) => (
                  <DayCard
                    key={day.day}
                    compact
                    day={day}
                    closedLabel="Çalışmıyor"
                    onChange={(patch) => setStaffHours((prev) => prev.map((h) => (h.day === day.day ? { ...h, ...patch } : h)))}
                    onCopy={(target) => {
                      const previous = staffHours;
                      setStaffHours(copySchedule(staffHours, day, target));
                      toast.success(target === "weekdays" ? `${DAY_NAMES[day.day]} hafta içine kopyalandı.` : `${DAY_NAMES[day.day]} tüm günlere kopyalandı.`, { action: { label: "Geri al", onClick: () => setStaffHours(previous) } });
                    }}
                  />
                ))}
              </div>
            </section>
            <hr className={ws.divider} />
            <section className={ws.section}>
              <div className={ws.sectionHead}><CalendarOff size={18} /><div><h3>İzin günleri</h3><p>Bu günlerde çalışana randevu verilmez.</p></div></div>
              <div className={styles.leaveAdd}>
                <Field label="İzin tarihi"><Input type="date" min={today} value={newLeaveDate} onChange={(e) => setNewLeaveDate(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLeave(); } }} /></Field>
                <Button variant="soft" icon={CalendarPlus} onClick={addLeave} disabled={!newLeaveDate}>Ekle</Button>
              </div>
              {sortedLeaves.length ? (
                <ul className={styles.leaveList}>
                  {sortedLeaves.map((date) => (
                    <li key={date} className={cx(styles.leaveChip, date < today && styles.leavePast)}>
                      <span>{new Date(`${date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short", year: date.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined })}</span>
                      <button type="button" onClick={() => setLeaveDates((prev) => prev.filter((x) => x !== date))} aria-label={`${date} iznini kaldır`}><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              ) : <p className={styles.hint}><Info size={14} /> Planlı izin yok.</p>}
            </section>
          </>}

          {tab === "access" && (
            <section className={ws.section}>
              <div className={ws.sectionHead}><ShieldCheck size={18} /><div><h3>Çalışan paneli yetkileri</h3><p>Çalışan hesabına bağlandığında erişebileceği alanlar.</p></div></div>
              {!item.linkedUid ? <Callout tone="blue" icon={Info} title="Panel hesabı henüz bağlı değil">Yetkiler şimdiden kaydedilir; hesap bağlandığında uygulanır.</Callout> : null}
              <div className={styles.permissionList}>
                {PERMISSIONS.map(([key, label, description]) => (
                  <Switch key={key} checked={permissions[key]} onChange={(next) => setPermissions((current) => ({ ...current, [key]: next }))} label={label} description={description} />
                ))}
              </div>
            </section>
          )}

          {tab === "account" && <>
            <section className={ws.section}>
              <div className={ws.sectionHead}><MailCheck size={18} /><div><h3>Çalışan paneli</h3><p>{item.email}</p></div></div>
              <div className={styles.accountRow}>
                <Badge tone={item.linkedUid ? "green" : "amber"} dot>{item.linkedUid ? "Hesap bağlı" : "Bağlantı bekliyor"}</Badge>
                <Button variant="secondary" icon={MailCheck} loading={actionBusy === "link"} disabled={Boolean(actionBusy)} onClick={() => void handleLinkAccount()}>{item.linkedUid ? "Erişimi yenile ve e-posta gönder" : "Daveti gönder"}</Button>
              </div>
            </section>
            <hr className={ws.divider} />
            <section className={ws.section}>
              <div className={ws.sectionHead}>{item.isActive ? <PauseCircle size={18} /> : <PlayCircle size={18} />}<div><h3>{item.isActive ? "Geçici olarak durdur" : "Yeniden aktifleştir"}</h3><p>{item.isActive ? "Pasif çalışanlar online randevuda görünmez; verileri korunur." : "Çalışan yeniden randevu alabilir."}</p></div></div>
              <Button variant={item.isActive ? "secondary" : "primary"} icon={item.isActive ? PauseCircle : PlayCircle} loading={actionBusy === "active"} disabled={Boolean(actionBusy)} onClick={() => void handleToggleActive()}>{item.isActive ? "Pasif yap" : "Aktif yap"}</Button>
            </section>
            <hr className={ws.divider} />
            <section className={cx(ws.section, styles.danger)}>
              <div className={ws.sectionHead}><Archive size={18} /><div><h3>Çalışanı arşivle</h3><p>Ekip listesinden kaldırılır. Gelecek randevuları seçtiğiniz çalışana aktarılabilir.</p></div></div>
              <Field label="Gelecek randevular kime aktarılsın?">
                <NativeSelect value={replacementStaffId} onChange={(e) => setReplacementStaffId(e.target.value)}>
                  <option value="">Aktarım yapma</option>
                  {allStaff.filter((candidate) => candidate.id !== item.id && candidate.isActive && !candidate.archivedAt).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.fullName}</option>)}
                </NativeSelect>
              </Field>
              <Button variant="dangerSoft" icon={Archive} loading={actionBusy === "archive"} disabled={Boolean(actionBusy)} onClick={() => void handleArchive()}>Çalışanı arşivle</Button>
            </section>
          </>}
        </div>
      </Sheet>
      {dialog}
    </>
  );
}
