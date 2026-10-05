"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Banknote, CalendarDays, CalendarX2, CheckCircle2, CircleDollarSign, Clock3, CreditCard, Gift, History, Mail, MessageCircle,
  NotebookPen, PackageCheck, PackagePlus, PencilLine, Phone, Plus, ReceiptText, Save, Sparkles, Tag, UserRound, WalletCards, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge, Button, Callout, EmptyState, Field, Input, KeyValueList, NativeSelect, Sheet, StatCard, StatGrid, StatusPill, Textarea, type DashTone,
} from "@/components/dashboard/ui";
import { updateAppointmentAdditionalServices } from "@/features/appointments/appointment-repository";
import { updateCustomerNotes } from "@/features/customers/customer-repository";
import { redeemPackage, sellPackage } from "@/features/operations/operations-repository";
import { formatMoney } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { Appointment, AppointmentServiceLine } from "@/types/appointments";
import type { Customer } from "@/types/customer";
import type { CheckoutReceipt, CustomerPackage, FinanceTransaction, PaymentMethod, ServicePackage } from "@/types/operations";
import type { Service } from "@/types/service";
import styles from "./customer-profile-studio.module.css";

type CustomerTab = "overview" | "appointments" | "services" | "packages" | "debts" | "payments";

const tabs: Array<{ id: CustomerTab; label: string; icon: typeof UserRound }> = [
  { id: "overview", label: "Genel", icon: Sparkles },
  { id: "appointments", label: "Randevular", icon: CalendarDays },
  { id: "services", label: "Hizmet ekle", icon: PackagePlus },
  { id: "packages", label: "Paketler", icon: PackageCheck },
  { id: "debts", label: "Borçlar", icon: ReceiptText },
  { id: "payments", label: "Ödemeler", icon: WalletCards },
];

const paymentLabels: Record<PaymentMethod, string> = { cash: "Nakit", card: "Kart", transfer: "Havale", other: "Diğer" };
const packageStatus: Record<CustomerPackage["status"], { label: string; tone: DashTone }> = {
  active: { label: "Aktif", tone: "green" },
  used: { label: "Tamamlandı", tone: "neutral" },
  expired: { label: "Süresi doldu", tone: "amber" },
  cancelled: { label: "İptal", tone: "red" },
};
const TAG_SUGGESTIONS = ["VIP", "Düzenli", "Yeni", "Hassas cilt", "Alerji", "Geç kalabilir", "Sessiz seans"];

function samePhone(left?: string, right?: string) {
  const normalize = (value = "") => value.replace(/\D/g, "").replace(/^90/, "").replace(/^0/, "");
  return Boolean(left && right && normalize(left) === normalize(right));
}

function displayDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function shortDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("90") ? digits : digits.startsWith("0") ? `9${digits}` : `90${digits}`;
  return `https://wa.me/${international}`;
}

type TimelineEvent = { id: string; at: string; title: string; detail: string; amount?: string; tone: DashTone; icon: typeof UserRound; status?: string };

interface Props {
  open: boolean;
  businessId: string;
  customer: Customer;
  appointments: Appointment[];
  services: Service[];
  servicePackages: ServicePackage[];
  customerPackages: CustomerPackage[];
  receipts: CheckoutReceipt[];
  transactions: FinanceTransaction[];
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onNotesSaved: (customerId: string, notes: string, tags: string[]) => void;
  /** Sayfa yüklendiği an; "sıradaki randevu" hesabı için. */
  referenceTime: number;
}

export function CustomerProfileStudio({
  open, businessId, customer, appointments, services, servicePackages, customerPackages,
  receipts, transactions, onClose, onRename, onRefresh, onNotesSaved, referenceTime,
}: Props) {
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(customer.fullName);
  const [savingName, setSavingName] = useState(false);
  const [busy, setBusy] = useState("");
  const [sale, setSale] = useState<{ packageId: string; paymentMethod: PaymentMethod }>({ packageId: "", paymentMethod: "card" });
  const [serviceTargetId, setServiceTargetId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [tags, setTags] = useState<string[]>(customer.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const notesDirty = notes.trim() !== (customer.notes ?? "").trim() || JSON.stringify(tags) !== JSON.stringify(customer.tags ?? []);

  const activePackages = useMemo(() => customerPackages.filter((item) => samePhone(item.customerPhone, customer.phone)), [customer.phone, customerPackages]);
  const customerReceipts = useMemo(() => receipts.filter((item) => samePhone(item.customerPhone, customer.phone)), [customer.phone, receipts]);
  const appointmentIds = useMemo(() => new Set(appointments.map((item) => item.id)), [appointments]);
  const packageIds = useMemo(() => new Set(activePackages.map((item) => item.id)), [activePackages]);
  const customerTransactions = useMemo(() => transactions.filter((item) =>
    (item.appointmentId && appointmentIds.has(item.appointmentId)) ||
    (item.customerPackageId && packageIds.has(item.customerPackageId))
  ), [appointmentIds, packageIds, transactions]);
  const openDebts = customerReceipts.filter((item) => Number(item.remainingAmount) > 0);
  const debtTotal = openDebts.reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0);
  const activePackageCount = activePackages.filter((item) => item.status === "active" && item.remainingSessions > 0).length;
  const remainingSessions = activePackages.reduce((sum, item) => sum + (item.status === "active" ? item.remainingSessions : 0), 0);
  const lastCompletedAppointment = appointments
    .filter((item) => item.status === "completed")
    .sort((left, right) => new Date(right.startAt).getTime() - new Date(left.startAt).getTime())[0];
  const lastUsedPackage = [...activePackages]
    .filter((item) => item.lastUsedAt)
    .sort((left, right) => new Date(right.lastUsedAt || 0).getTime() - new Date(left.lastUsedAt || 0).getTime())[0];
  const appointmentSessionAt = lastCompletedAppointment?.startAt;
  const packageSessionAt = lastUsedPackage?.lastUsedAt;
  const lastSessionFromPackage = packageSessionAt && (!appointmentSessionAt || new Date(packageSessionAt).getTime() > new Date(appointmentSessionAt).getTime());
  const lastSessionAt = lastSessionFromPackage ? packageSessionAt : appointmentSessionAt;
  const lastSessionLabel = lastSessionFromPackage
    ? `${lastUsedPackage.serviceName} · paket seansı`
    : lastCompletedAppointment
      ? `${lastCompletedAppointment.serviceName || "Hizmet"} · ${lastCompletedAppointment.staffName || "Ekip"}`
      : "Henüz tamamlanan seans yok";
  const totalAppointmentCount = Math.max(Number(customer.totalAppointments || 0), appointments.length);
  const completedAppointmentCount = Math.max(Number(customer.completedAppointments || 0), appointments.filter((item) => item.status === "completed").length);
  const noShowCount = Math.max(Number(customer.noShowAppointments || 0), appointments.filter((item) => item.status === "no_show").length);
  const cancelledCount = Math.max(Number(customer.cancelledAppointments || 0), appointments.filter((item) => item.status === "cancelled").length);
  const upcoming = appointments
    .filter((item) => ["pending", "confirmed"].includes(item.status) && new Date(item.startAt).getTime() >= referenceTime)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];

  /* ── Zaman çizelgesi ── */
  const timeline = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];
    appointments.forEach((item) => events.push({
      id: `a-${item.id}`,
      at: item.startAt,
      title: `${item.serviceName || "Hizmet"}${item.additionalServices?.length ? ` + ${item.additionalServices.length} ek` : ""}`,
      detail: item.staffName || "Ekip",
      amount: item.servicePrice ? formatMoney(item.servicePrice) : undefined,
      tone: item.status === "completed" ? "green" : item.status === "cancelled" ? "red" : item.status === "no_show" ? "neutral" : "accent",
      icon: item.status === "no_show" ? CalendarX2 : CalendarDays,
      status: item.status,
    }));
    activePackages.forEach((item) => events.push({
      id: `p-${item.id}`,
      at: item.createdAt,
      title: `${item.packageName} paketi alındı`,
      detail: `${item.totalSessions} seans · ${paymentLabels[item.paymentMethod] ?? "Ödeme"}`,
      amount: formatMoney(item.price),
      tone: "violet",
      icon: Gift,
    }));
    customerTransactions.forEach((item) => events.push({
      id: `t-${item.id}`,
      at: item.occurredAt,
      title: item.category || "Ödeme",
      detail: `${paymentLabels[item.paymentMethod] ?? "Ödeme"} ile tahsil edildi`,
      amount: formatMoney(item.amount),
      tone: "green",
      icon: item.paymentMethod === "cash" ? Banknote : CreditCard,
    }));
    return events.filter((item) => item.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [activePackages, appointments, customerTransactions]);
  const visibleTimeline = showAllTimeline ? timeline : timeline.slice(0, 6);

  /* ── Ek hizmet ── */
  const editableAppointments = useMemo(() => appointments.filter((item) =>
    !["cancelled", "no_show"].includes(item.status) && item.paymentStatus !== "paid" && !item.checkoutReceiptId
  ), [appointments]);
  const serviceTarget = editableAppointments.find((item) => item.id === serviceTargetId) ?? editableAppointments[0];
  const availableServices = useMemo<AppointmentServiceLine[]>(() => {
    const options = new Map<string, AppointmentServiceLine>();
    services
      .filter((item) => item.isActive && item.price >= 0 && item.id !== serviceTarget?.serviceId)
      .forEach((item) => options.set(item.id, {
        serviceId: item.id, name: item.name, price: item.price, durationMinutes: item.durationMinutes,
      }));
    (serviceTarget?.additionalServices ?? []).forEach((item) => {
      if (!options.has(item.serviceId)) options.set(item.serviceId, item);
    });
    return [...options.values()].sort((left, right) => left.name.localeCompare(right.name, "tr"));
  }, [serviceTarget, services]);
  const selectedServices = availableServices
    .filter((item) => selectedServiceIds.includes(item.serviceId))
    .map((item) => ({ ...item }));
  const previousExtraTotal = (serviceTarget?.additionalServices ?? []).reduce((sum, item) => sum + item.price, 0);
  const serviceBasePrice = serviceTarget
    ? serviceTarget.primaryServicePrice ?? Math.max(0, Number(serviceTarget.servicePrice ?? 0) - previousExtraTotal)
    : 0;
  const extraServiceTotal = selectedServices.reduce((sum, item) => sum + item.price, 0);
  const extraServiceDuration = selectedServices.reduce((sum, item) => sum + item.durationMinutes, 0);

  function goTab(id: CustomerTab) {
    if (id === "services") {
      const target = editableAppointments[0];
      setServiceTargetId(target?.id ?? "");
      setSelectedServiceIds((target?.additionalServices ?? []).map((item) => item.serviceId));
    }
    setActiveTab(id);
  }

  function selectServiceTarget(appointmentId: string) {
    const target = editableAppointments.find((item) => item.id === appointmentId);
    setServiceTargetId(appointmentId);
    setSelectedServiceIds((target?.additionalServices ?? []).map((item) => item.serviceId));
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) => current.includes(serviceId) ? current.filter((item) => item !== serviceId) : [...current, serviceId]);
  }

  async function saveAdditionalServices(event: FormEvent) {
    event.preventDefault();
    if (!serviceTarget) return toast.error("Hizmetin bağlanacağı açık işlemi seçin.");
    setBusy("additional-services");
    try {
      await updateAppointmentAdditionalServices(businessId, serviceTarget, selectedServices);
      await onRefresh();
      toast.success(selectedServices.length ? `${selectedServices.length} ek hizmet müşterinin işlemine eklendi.` : "Ek hizmetler işlemden kaldırıldı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ek hizmetler kaydedilemedi.");
    } finally {
      setBusy("");
    }
  }

  async function saveName(event: FormEvent) {
    event.preventDefault();
    const value = nameDraft.trim();
    if (value.length < 2) return toast.error("Müşteri adı en az 2 karakter olmalıdır.");
    setSavingName(true);
    try {
      await onRename(value);
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  }

  async function assignPackage(event: FormEvent) {
    event.preventDefault();
    if (!sale.packageId) return toast.error("Tanımlanacak paketi seçin.");
    setBusy("sale");
    try {
      await sellPackage({
        businessId,
        packageId: sale.packageId,
        customerId: customer.id,
        customerName: customer.fullName,
        customerPhone: customer.phone,
        paymentMethod: sale.paymentMethod,
      });
      await onRefresh();
      setSale({ packageId: "", paymentMethod: "card" });
      toast.success("Paket müşterinin hesabına tanımlandı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Paket tanımlanamadı.");
    } finally {
      setBusy("");
    }
  }

  async function redeemSession(packageId: string) {
    setBusy(packageId);
    try {
      await redeemPackage(businessId, packageId);
      await onRefresh();
      toast.success("Bir seans kullanıldı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Seans kullanılamadı.");
    } finally {
      setBusy("");
    }
  }

  function addTag(raw: string) {
    const value = raw.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!value) return;
    if (tags.some((tag) => tag.toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR"))) { setTagDraft(""); return; }
    if (tags.length >= 12) { toast.info("En fazla 12 etiket eklenebilir."); return; }
    setTags([...tags, value]);
    setTagDraft("");
  }

  async function saveNotes() {
    setBusy("notes");
    try {
      await updateCustomerNotes(businessId, customer.id, { notes, tags });
      onNotesSaved(customer.id, notes.trim(), tags);
      toast.success("Müşteri notu kaydedildi.");
    } catch {
      toast.error("Not kaydedilemedi.");
    } finally {
      setBusy("");
    }
  }

  const tabBadge = (id: CustomerTab) => id === "packages" && activePackageCount ? activePackageCount : id === "debts" && openDebts.length ? openDebts.length : 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy && !savingName}
      placement="side"
      size="lg"
      title={<span className={styles.title}><span className={styles.avatar} aria-hidden="true">{customer.fullName.charAt(0).toLocaleUpperCase("tr-TR")}</span><span className={styles.titleText}><b>{customer.fullName}</b><small>{customer.phone}</small></span></span>}
      headerExtra={
        <div className={styles.tabs} role="tablist" aria-label="Müşteri profili bölümleri">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={cn(styles.tab, activeTab === id && styles.tabActive)} onClick={() => goTab(id)}>
              <Icon size={15} /> {label}{tabBadge(id) ? <span className={cn(styles.tabBadge, id === "debts" && styles.tabBadgeWarn)}>{tabBadge(id)}</span> : null}
            </button>
          ))}
        </div>
      }
    >
      <div className={styles.body}>
        {activeTab === "overview" && <>
          {/* Kimlik ve hızlı iletişim */}
          <section className={styles.identity}>
            {editingName ? (
              <form className={styles.nameEditor} onSubmit={saveName}>
                <Input data-autofocus maxLength={80} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} aria-label="Müşteri adı soyadı" />
                <Button type="submit" variant="primary" iconOnly icon={Save} loading={savingName} disabled={nameDraft.trim().length < 2} aria-label="Adı kaydet" />
                <Button variant="ghost" iconOnly icon={X} onClick={() => { setEditingName(false); setNameDraft(customer.fullName); }} aria-label="Vazgeç" />
              </form>
            ) : (
              <div className={styles.identityRow}>
                <div className={styles.badgeRow}>
                  {debtTotal > 0 ? <Badge tone="amber" dot>Ödeme bekleniyor</Badge> : <Badge tone="green" dot>Her şey yolunda</Badge>}
                  {customer.userId ? <Badge tone="blue" icon={UserRound}>Uygulama hesabı var</Badge> : null}
                  {noShowCount > 1 ? <Badge tone="red" icon={CalendarX2}>{noShowCount} kez gelmedi</Badge> : null}
                </div>
                <Button size="sm" variant="ghost" icon={PencilLine} onClick={() => setEditingName(true)}>Adı düzenle</Button>
              </div>
            )}
            <div className={styles.contact}>
              <Button variant="secondary" icon={Phone} href={`tel:${customer.phone}`}>Ara</Button>
              <Button variant="secondary" icon={MessageCircle} href={whatsappLink(customer.phone)} external>WhatsApp</Button>
              {customer.email ? <Button variant="secondary" icon={Mail} href={`mailto:${customer.email}`}>E-posta</Button> : null}
            </div>
          </section>

          <StatGrid columns={2}>
            <StatCard label="Ziyaret" value={totalAppointmentCount} hint={`${completedAppointmentCount} tamamlandı${cancelledCount ? ` · ${cancelledCount} iptal` : ""}`} icon={CalendarDays} tone="blue" />
            <StatCard label="Toplam harcama" value={formatMoney(customer.totalSpent)} hint="Bugüne kadar ödediği" icon={CircleDollarSign} tone="green" />
            <StatCard label="Gelmedi" value={noShowCount} hint={totalAppointmentCount ? `%${Math.round((noShowCount / totalAppointmentCount) * 100)} oran` : "Kayıt yok"} icon={CalendarX2} tone={noShowCount > 1 ? "red" : "neutral"} />
            <StatCard label={debtTotal > 0 ? "Ödenmemiş" : "Kalan seans"} value={debtTotal > 0 ? formatMoney(debtTotal) : remainingSessions} hint={debtTotal > 0 ? `${openDebts.length} ödeme bekliyor` : `${activePackageCount} aktif paket`} icon={debtTotal > 0 ? ReceiptText : PackageCheck} tone={debtTotal > 0 ? "amber" : "violet"} onClick={() => goTab(debtTotal > 0 ? "debts" : "packages")} />
          </StatGrid>

          <div className={styles.lastSession}>
            <span aria-hidden="true"><Clock3 size={18} /></span>
            <div><small>Son seans</small><b>{lastSessionAt ? displayDate(lastSessionAt) : "Henüz tamamlanan seans yok"}</b><em>{lastSessionLabel}</em></div>
            {upcoming ? <Badge tone="accent" icon={CalendarDays}>Sıradaki: {shortDate(upcoming.startAt)}</Badge> : null}
          </div>

          {/* Not ve etiketler */}
          <section className={styles.card}>
            <header className={styles.cardHead}><NotebookPen size={17} /><div><h3>Notlar ve etiketler</h3><p>Yalnızca işletmeniz görür.</p></div></header>
            <div className={styles.tags}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}><Tag size={12} aria-hidden="true" />{tag}<button type="button" onClick={() => setTags(tags.filter((item) => item !== tag))} aria-label={`${tag} etiketini kaldır`}><X size={12} /></button></span>
              ))}
              <input
                className={styles.tagInput}
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(tagDraft); }
                  if (event.key === "Backspace" && !tagDraft && tags.length) setTags(tags.slice(0, -1));
                }}
                onBlur={() => addTag(tagDraft)}
                placeholder={tags.length ? "Etiket ekle" : "Etiket ekle (Enter)"}
                aria-label="Etiket ekle"
                enterKeyHint="done"
              />
            </div>
            {TAG_SUGGESTIONS.some((item) => !tags.includes(item)) ? (
              <div className={styles.suggestions}>
                {TAG_SUGGESTIONS.filter((item) => !tags.includes(item)).slice(0, 5).map((item) => <button key={item} type="button" onClick={() => addTag(item)}><Plus size={12} /> {item}</button>)}
              </div>
            ) : null}
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} placeholder="Tercihleri, hassasiyetleri, sohbet notları…" aria-label="Müşteri notu" />
            {notesDirty ? (
              <div className={styles.noteActions}>
                <Button variant="ghost" onClick={() => { setNotes(customer.notes ?? ""); setTags(customer.tags ?? []); }}>Vazgeç</Button>
                <Button variant="primary" icon={Save} loading={busy === "notes"} onClick={() => void saveNotes()}>Notu kaydet</Button>
              </div>
            ) : null}
          </section>

          {/* Zaman çizelgesi */}
          <section className={styles.card}>
            <header className={styles.cardHead}><History size={17} /><div><h3>Geçmiş</h3><p>Randevular, paketler ve ödemeler</p></div></header>
            {timeline.length ? (
              <>
                <ol className={styles.timeline}>
                  {visibleTimeline.map((event) => {
                    const Icon = event.icon;
                    return (
                      <li key={event.id} className={styles.timelineItem}>
                        <span className={cn(styles.timelineDot, styles[`tone-${event.tone}`])} aria-hidden="true"><Icon size={14} /></span>
                        <div className={styles.timelineText}>
                          <b>{event.title}</b>
                          <small>{displayDate(event.at)} · {event.detail}</small>
                        </div>
                        <div className={styles.timelineSide}>
                          {event.status ? <StatusPill status={event.status} size="sm" /> : null}
                          {event.amount ? <strong>{event.amount}</strong> : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {timeline.length > 6 ? <Button variant="ghost" block onClick={() => setShowAllTimeline((value) => !value)}>{showAllTimeline ? "Daha az göster" : `Tümünü göster (${timeline.length})`}</Button> : null}
              </>
            ) : <EmptyState compact mascot="idle" title="Henüz hareket yok" description="İlk randevu veya paket satışından sonra burada görünür." />}
          </section>

          <section className={styles.card}>
            <header className={styles.cardHead}><UserRound size={17} /><div><h3>Müşteri kartı</h3></div></header>
            <KeyValueList items={[
              { label: "Telefon", value: customer.phone },
              { label: "E-posta", value: customer.email || "Eklenmemiş" },
              { label: "Müşteri no", value: customer.id.slice(0, 10).toUpperCase() },
              { label: "Son ziyaret", value: displayDate(customer.lastVisitAt) },
              { label: "Hesap", value: customer.userId ? "Kendi hesabına bağlı" : "Hesabı henüz yok" },
              { label: "İlk kayıt", value: shortDate(customer.createdAt) },
            ]} />
          </section>
        </>}

        {activeTab === "appointments" && (
          <RecordList title="Randevu geçmişi" count={appointments.length} empty="Bu müşterinin henüz randevusu bulunmuyor.">
            {appointments.map((appointment) => (
              <article className={styles.record} key={appointment.id}>
                <span className={cn(styles.recordIcon, styles[`tone-${appointment.status === "completed" ? "green" : appointment.status === "cancelled" ? "red" : "accent"}`])} aria-hidden="true"><CalendarDays size={16} /></span>
                <div className={styles.recordText}>
                  <b>{appointment.serviceName || "Hizmet"}{appointment.additionalServices?.length ? ` + ${appointment.additionalServices.map((item) => item.name).join(", ")}` : ""}</b>
                  <small>{displayDate(appointment.startAt)} · {appointment.staffName || "Ekip"}</small>
                </div>
                <div className={styles.recordSide}><StatusPill status={appointment.status} size="sm" /><strong>{appointment.servicePrice ? formatMoney(appointment.servicePrice) : "—"}</strong></div>
              </article>
            ))}
          </RecordList>
        )}

        {activeTab === "services" && (
          <form className={styles.stack} onSubmit={saveAdditionalServices}>
            <Callout tone="accent" icon={PackagePlus} title="Müşterinin aldığı diğer hizmetleri ekleyin">Hizmetler seçilen randevuya bağlanır; süre, toplam ücret, kasa ve müşteri hesabı birlikte güncellenir.</Callout>
            {editableAppointments.length ? <>
              <Field label="Hizmet hangi işleme eklenecek?">
                <NativeSelect value={serviceTarget?.id ?? ""} onChange={(event) => selectServiceTarget(event.target.value)}>
                  {editableAppointments.map((item) => <option key={item.id} value={item.id}>{`${item.serviceName || "Hizmet"} · ${displayDate(item.startAt)} · ${formatMoney(item.servicePrice ?? 0)}`}</option>)}
                </NativeSelect>
              </Field>
              <div className={styles.pickHead}><b>Mevcut hizmetler</b><Badge tone="accent">{selectedServices.length} seçili</Badge></div>
              {availableServices.length ? (
                <div className={styles.pickGrid}>
                  {availableServices.map((service) => {
                    const selected = selectedServiceIds.includes(service.serviceId);
                    return (
                      <button type="button" key={service.serviceId} className={cn(styles.pick, selected && styles.pickOn)} onClick={() => toggleService(service.serviceId)} aria-pressed={selected}>
                        <span><b>{service.name}</b><small>{service.durationMinutes} dk</small></span>
                        <strong>{formatMoney(service.price)}</strong>
                        <i aria-hidden="true">{selected ? <CheckCircle2 size={16} /> : <Plus size={16} />}</i>
                      </button>
                    );
                  })}
                </div>
              ) : <p className={styles.muted}>Eklenebilecek aktif hizmet bulunmuyor.</p>}
              <div className={styles.summary}>
                <div><small>Ana hizmet</small><b>{formatMoney(serviceBasePrice)}</b></div>
                <div><small>Ek · {extraServiceDuration} dk</small><b>{formatMoney(extraServiceTotal)}</b></div>
                <div className={styles.summaryTotal}><small>Yeni toplam</small><b>{formatMoney(serviceBasePrice + extraServiceTotal)}</b></div>
              </div>
              <Button type="submit" variant="primary" block icon={Save} disabled={!availableServices.length} loading={busy === "additional-services"}>Hizmetleri işleme kaydet</Button>
            </> : <EmptyState compact mascot="thinking" title="Açık işlem bulunmuyor" description="Ek hizmet eklemek için müşterinin ödenmemiş veya henüz kapatılmamış bir randevusu olmalıdır. Ödenmiş adisyonlar korunur." />}
          </form>
        )}

        {activeTab === "packages" && <>
          <form className={cn(styles.card, styles.stack)} onSubmit={assignPackage}>
            <header className={styles.cardHead}><Gift size={17} /><div><h3>Paket tanımla</h3><p>Seçilen paket tahsilatla birlikte müşterinin hesabında görünür.</p></div></header>
            <Field label="Paket">
              <NativeSelect value={sale.packageId} onChange={(event) => setSale((current) => ({ ...current, packageId: event.target.value }))}>
                <option value="">Aktif paketlerden seçin</option>
                {servicePackages.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{`${item.name} · ${item.sessionCount} seans · ${formatMoney(item.price)}`}</option>)}
              </NativeSelect>
            </Field>
            <div className={styles.fieldGroup}>
              <span className={styles.fieldGroupLabel}>Ödeme yöntemi</span>
              <div className={styles.methods} role="radiogroup" aria-label="Ödeme yöntemi">
                {(Object.entries(paymentLabels) as Array<[PaymentMethod, string]>).map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={sale.paymentMethod === value} className={cn(styles.method, sale.paymentMethod === value && styles.methodOn)} onClick={() => setSale((current) => ({ ...current, paymentMethod: value }))}>{label}</button>
                ))}
              </div>
            </div>
            <Button type="submit" variant="primary" icon={Plus} disabled={!sale.packageId} loading={busy === "sale"}>Paketi tanımla ve tahsil et</Button>
          </form>
          <RecordList title="Müşterinin paketleri" count={activePackages.length} empty="Bu müşteriye tanımlanmış paket bulunmuyor.">
            {activePackages.map((item) => {
              const percentage = Math.max(0, Math.min(100, (item.remainingSessions / Math.max(1, item.totalSessions)) * 100));
              const status = packageStatus[item.status] ?? packageStatus.cancelled;
              return (
                <article className={styles.package} key={item.id}>
                  <header><div><small>{item.serviceName}</small><b>{item.packageName}</b></div><Badge size="sm" tone={status.tone}>{status.label}</Badge></header>
                  <div className={styles.progress}><p><span>Kalan seans</span><b>{item.remainingSessions} / {item.totalSessions}</b></p><i><span style={{ width: `${percentage}%` }} /></i></div>
                  <footer><small><Clock3 size={13} /> {shortDate(item.expiresAt)} tarihine kadar</small><Button size="sm" variant="soft" disabled={item.status !== "active" || item.remainingSessions < 1} loading={busy === item.id} onClick={() => void redeemSession(item.id)}>1 seans kullan</Button></footer>
                </article>
              );
            })}
          </RecordList>
        </>}

        {activeTab === "debts" && (
          <RecordList title="Bekleyen ödemeler" count={openDebts.length} empty="Bu müşterinin ödenmemiş borcu bulunmuyor." summary={debtTotal ? `Toplam ${formatMoney(debtTotal)}` : undefined}>
            {openDebts.map((receipt) => (
              <article className={styles.record} key={receipt.id}>
                <span className={cn(styles.recordIcon, styles["tone-amber"])} aria-hidden="true"><ReceiptText size={16} /></span>
                <div className={styles.recordText}><b>Ödeme kaydı #{receipt.id.slice(0, 7).toUpperCase()}</b><small>{displayDate(receipt.createdAt)} · Toplam {formatMoney(receipt.total)}</small></div>
                <div className={styles.recordSide}><Badge size="sm" tone="amber">Bekliyor</Badge><strong>{formatMoney(receipt.remainingAmount)}</strong></div>
              </article>
            ))}
          </RecordList>
        )}

        {activeTab === "payments" && (
          <RecordList title="Ödeme hareketleri" count={customerTransactions.length} empty="Bu müşteriye ait ödeme hareketi bulunmuyor." summary={customerTransactions.length ? formatMoney(customerTransactions.reduce((sum, item) => sum + item.amount, 0)) : undefined}>
            {customerTransactions.map((item) => (
              <article className={styles.record} key={item.id}>
                <span className={cn(styles.recordIcon, styles["tone-green"])} aria-hidden="true">{item.paymentMethod === "cash" ? <Banknote size={16} /> : <CreditCard size={16} />}</span>
                <div className={styles.recordText}><b>{item.category}</b><small>{displayDate(item.occurredAt)} · {paymentLabels[item.paymentMethod]}</small></div>
                <div className={styles.recordSide}><Badge size="sm" tone="green" icon={CheckCircle2}>Alındı</Badge><strong>{formatMoney(item.amount)}</strong></div>
              </article>
            ))}
          </RecordList>
        )}
      </div>
    </Sheet>
  );
}

function RecordList({ title, count, empty, summary, children }: { title: string; count: number; empty: string; summary?: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <header className={styles.recordHead}><h3>{title}</h3><span><Badge tone="neutral">{count}</Badge>{summary ? <b>{summary}</b> : null}</span></header>
      {count ? <div className={styles.recordList}>{children}</div> : <EmptyState compact mascot="happy" title={empty} description="Yeni bir kayıt oluştuğunda bu bölüm kendiliğinden güncellenir." />}
    </section>
  );
}
