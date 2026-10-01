"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BadgeCheck, Banknote, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign,
  ClipboardList, Clock3, ContactRound, CreditCard, Gift, History, Mail,
  PackageCheck, PackagePlus, PencilLine, Phone, Plus, ReceiptText, RefreshCw, Save, Sparkles,
  UserRound, WalletCards, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { updateAppointmentAdditionalServices } from "@/features/appointments/appointment-repository";
import { redeemPackage, sellPackage } from "@/features/operations/operations-repository";
import { formatMoney } from "@/lib/utils/date";
import type { Appointment, AppointmentServiceLine } from "@/types/appointments";
import type { Customer } from "@/types/customer";
import type { CheckoutReceipt, CustomerPackage, FinanceTransaction, PaymentMethod, ServicePackage } from "@/types/operations";
import type { Service } from "@/types/service";

type CustomerTab = "overview" | "info" | "appointments" | "services" | "packages" | "debts" | "payments";

const tabs: Array<{ id: CustomerTab; label: string; icon: typeof UserRound }> = [
  { id: "overview", label: "Genel bakış", icon: Sparkles },
  { id: "info", label: "Müşteri bilgileri", icon: UserRound },
  { id: "appointments", label: "Randevular", icon: CalendarDays },
  { id: "services", label: "Hizmet ekle", icon: PackagePlus },
  { id: "packages", label: "Paketler", icon: PackageCheck },
  { id: "debts", label: "Borçlar", icon: ReceiptText },
  { id: "payments", label: "Ödemeler", icon: WalletCards },
];

const statusLabels: Record<string, string> = {
  completed: "Tamamlandı", confirmed: "Onaylı", cancelled: "İptal",
  pending: "Bekliyor", no_show: "Gelmedi",
};
const paymentLabels: Record<PaymentMethod, string> = { cash: "Nakit", card: "Kart", transfer: "Havale", other: "Diğer" };

function samePhone(left?: string, right?: string) {
  const normalize = (value = "") => value.replace(/\D/g, "").replace(/^90/, "").replace(/^0/, "");
  return Boolean(left && right && normalize(left) === normalize(right));
}

function displayDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Props {
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
}

export function CustomerProfileStudio({
  businessId, customer, appointments, services, servicePackages, customerPackages,
  receipts, transactions, onClose, onRename, onRefresh,
}: Props) {
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(customer.fullName);
  const [savingName, setSavingName] = useState(false);
  const [busy, setBusy] = useState("");
  const [sale, setSale] = useState<{ packageId: string; paymentMethod: PaymentMethod }>({ packageId: "", paymentMethod: "card" });
  const [serviceTargetId, setServiceTargetId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

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
  const lastAppointment = appointments[0];
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

  function openServiceStudio() {
    const target = editableAppointments[0];
    setServiceTargetId(target?.id ?? "");
    setSelectedServiceIds((target?.additionalServices ?? []).map((item) => item.serviceId));
    setActiveTab("services");
  }

  function selectServiceTarget(appointmentId: string) {
    const target = editableAppointments.find((item) => item.id === appointmentId);
    setServiceTargetId(appointmentId);
    setSelectedServiceIds((target?.additionalServices ?? []).map((item) => item.serviceId));
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) => current.includes(serviceId)
      ? current.filter((item) => item !== serviceId)
      : [...current, serviceId]);
  }

  async function saveAdditionalServices(event: FormEvent) {
    event.preventDefault();
    if (!serviceTarget) return toast.error("Hizmetin bağlanacağı açık işlemi seçin.");
    setBusy("additional-services");
    try {
      await updateAppointmentAdditionalServices(businessId, serviceTarget, selectedServices);
      await onRefresh();
      toast.success(selectedServices.length
        ? `${selectedServices.length} ek hizmet müşterinin işlemine eklendi.`
        : "Ek hizmetler işlemden kaldırıldı.");
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

  return (
    <article className="crm-studio">
      <header className="crm-studio-head">
        <button className="crm-detail-close" onClick={onClose} aria-label="Müşteri detayını kapat"><X size={18}/></button>
        <span className="crm-detail-avatar">{customer.fullName.charAt(0).toLocaleUpperCase("tr-TR")}</span>
        <div className="crm-studio-identity">
          <small>MÜŞTERİ PROFİLİ</small>
          {editingName ? (
            <form className="crm-name-editor" onSubmit={saveName}>
              <input autoFocus maxLength={80} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} aria-label="Müşteri adı soyadı"/>
              <button type="submit" disabled={savingName || nameDraft.trim().length < 2} aria-label="Kaydet">{savingName ? <RefreshCw size={15} className="animate-spin"/> : <Save size={15}/>}</button>
              <button type="button" onClick={() => { setEditingName(false); setNameDraft(customer.fullName); }} aria-label="İptal"><X size={15}/></button>
            </form>
          ) : (
            <div className="crm-name-row"><h2>{customer.fullName}</h2><button type="button" onClick={() => setEditingName(true)}><PencilLine size={14}/> Düzenle</button></div>
          )}
          <p><Phone size={14}/> {customer.phone}{customer.email && <><span>•</span><Mail size={14}/> {customer.email}</>}</p>
        </div>
        <aside className="crm-studio-side">
          <div className="crm-studio-last"><Clock3 size={17}/><span><small>SON SEANS</small><b>{lastSessionAt ? displayDate(lastSessionAt) : "Henüz gelmedi"}</b><em>{lastSessionLabel}</em></span></div>
          <div className="crm-studio-health"><i/><span><small>GENEL DURUM</small><b>{debtTotal > 0 ? "Ödeme bekleniyor" : "Her şey yolunda"}</b></span></div>
        </aside>
      </header>

      <nav className="crm-studio-tabs" aria-label="Müşteri profili bölümleri">
        {tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={activeTab === id ? "active" : ""} onClick={() => id === "services" ? openServiceStudio() : setActiveTab(id)}><Icon size={16}/><span>{label}</span>{id === "packages" && activePackageCount > 0 && <b>{activePackageCount}</b>}{id === "debts" && openDebts.length > 0 && <b>{openDebts.length}</b>}</button>)}
      </nav>

      <div className="crm-studio-content">
        {activeTab === "overview" && <div className="crm-overview-grid">
          <section className="crm-last-session-banner"><span><Clock3 size={20}/></span><div><small>SON SEANS BİLGİSİ</small><h3>{lastSessionAt ? displayDate(lastSessionAt) : "Henüz tamamlanan seans bulunmuyor"}</h3><p>{lastSessionLabel}</p></div><button type="button" onClick={() => setActiveTab("appointments")}>Geçmişi aç <ChevronRight size={14}/></button></section>
          <section className="crm-overview-kpis">
            <article><span><CalendarDays size={18}/></span><p><small>TOPLAM RANDEVU</small><strong>{totalAppointmentCount}</strong><em>{completedAppointmentCount} tamamlandı</em></p></article>
            <article><span><CircleDollarSign size={18}/></span><p><small>TOPLAM HARCAMA</small><strong>{formatMoney(customer.totalSpent)}</strong><em>Bugüne kadar ödediği</em></p></article>
            <article><span><PackageCheck size={18}/></span><p><small>KALAN SEANS</small><strong>{remainingSessions}</strong><em>{activePackageCount} aktif paket</em></p></article>
            <article className={debtTotal > 0 ? "attention" : ""}><span><ReceiptText size={18}/></span><p><small>ÖDENMEMİŞ TUTAR</small><strong>{formatMoney(debtTotal)}</strong><em>{debtTotal > 0 ? `${openDebts.length} ödeme bekliyor` : "Borç bulunmuyor"}</em></p></article>
          </section>
          <section className="crm-overview-activity">
            <header><div><History size={18}/><span><small>SON İŞLEM</small><b>{lastAppointment ? displayDate(lastAppointment.startAt) : "Henüz işlem yok"}</b></span></div><button type="button" onClick={() => setActiveTab("appointments")}>Tümünü gör <ChevronRight size={14}/></button></header>
            {lastSessionAt ? <article><span>{lastSessionFromPackage ? <PackageCheck size={18}/> : <CalendarDays size={18}/>}</span><div><b>{lastSessionFromPackage ? lastUsedPackage.packageName : lastAppointment?.serviceName || lastSessionLabel}</b><small>{displayDate(lastSessionAt)} · {lastSessionLabel}</small></div><strong>{lastSessionFromPackage ? `${lastUsedPackage.remainingSessions}/${lastUsedPackage.totalSessions}` : lastAppointment?.servicePrice ? formatMoney(lastAppointment.servicePrice) : "—"}</strong></article> : <p>İlk randevu veya paket seansından sonra hareketler burada görünür.</p>}
          </section>
          <section className="crm-overview-actions">
            <header><Sparkles size={17}/><div><small>HIZLI İŞLEMLER</small><b>Müşteriyi tek ekrandan yönetin</b></div></header>
            <div><button type="button" onClick={openServiceStudio}><PackagePlus size={16}/><span><b>Hizmet ekle</b><small>Aldığı başka hizmeti işlemine ekle</small></span><ChevronRight size={15}/></button><button type="button" onClick={() => setActiveTab("packages")}><Plus size={16}/><span><b>Paket tanımla</b><small>Seans paketini müşteriye ekle</small></span><ChevronRight size={15}/></button><button type="button" onClick={() => setActiveTab("debts")}><ReceiptText size={16}/><span><b>Borçları gör</b><small>Bekleyen ödemeleri incele</small></span><ChevronRight size={15}/></button><button type="button" onClick={() => setActiveTab("info")}><PencilLine size={16}/><span><b>Bilgileri düzenle</b><small>Ad ve iletişim bilgilerini güncelle</small></span><ChevronRight size={15}/></button></div>
          </section>
        </div>}

        {activeTab === "info" && <section className="crm-info-panel">
          <header><ContactRound size={19}/><div><small>MÜŞTERİ KARTI</small><h3>İletişim ve ilişki bilgileri</h3></div></header>
          <div className="crm-info-fields"><article><small>Ad soyad</small><b>{customer.fullName}</b></article><article><small>Telefon</small><b>{customer.phone}</b></article><article><small>E-posta</small><b>{customer.email || "Eklenmemiş"}</b></article><article><small>Müşteri numarası</small><b>{customer.id.slice(0, 10).toUpperCase()}</b></article><article className="highlight"><small>En son geldiği zaman</small><b>{lastSessionAt ? displayDate(lastSessionAt) : "Henüz gelmedi"}</b></article><article className="highlight"><small>En son aldığı hizmet</small><b>{lastSessionLabel}</b></article><article><small>Son ziyaret</small><b>{displayDate(customer.lastVisitAt)}</b></article><article><small>Hesap durumu</small><b>{customer.userId ? "Kendi hesabına bağlı" : "Hesabı henüz yok"}</b></article></div>
          <button className="crm-info-edit" type="button" onClick={() => setEditingName(true)}><PencilLine size={15}/> Profil adını düzenle</button>
        </section>}

        {activeTab === "appointments" && <RecordList title="Randevu geçmişi" icon={ClipboardList} count={appointments.length} empty="Bu müşterinin henüz randevusu bulunmuyor.">
          {appointments.map((appointment) => <article className="crm-record" key={appointment.id}><span className={`crm-record-icon status-${appointment.status}`}><CalendarDays size={17}/></span><div><b>{appointment.serviceName || "Hizmet"}{appointment.additionalServices?.length ? ` + ${appointment.additionalServices.map((item) => item.name).join(", ")}` : ""}</b><small>{displayDate(appointment.startAt)} · {appointment.staffName || "Ekip"}</small></div><span className={`crm-status status-${appointment.status}`}>{statusLabels[appointment.status] || appointment.status}</span><strong>{appointment.servicePrice ? formatMoney(appointment.servicePrice) : "—"}</strong></article>)}
        </RecordList>}

        {activeTab === "services" && <form className="crm-service-assign" onSubmit={saveAdditionalServices}>
          <header><span><PackagePlus size={20}/></span><div><small>EK HİZMET İŞLEME</small><h3>Müşterinin aldığı diğer hizmetleri ekle</h3><p>Hizmetler seçilen randevuya bağlanır; süre, toplam ücret, kasa ve müşteri hesabı birlikte güncel kalır.</p></div></header>
          {editableAppointments.length ? <>
            <div className="crm-service-target"><Select label="Hizmet hangi işleme eklenecek?" value={serviceTarget?.id ?? ""} onChange={(event) => selectServiceTarget(event.target.value)} options={editableAppointments.map((item) => ({ value:item.id, label:item.serviceName || "Hizmet", description:`${displayDate(item.startAt)} · ${formatMoney(item.servicePrice ?? 0)}` }))}/></div>
            <div className="crm-service-picker">
              <div className="crm-service-picker-head"><div><small>MEVCUT HİZMETLER</small><b>Bir veya daha fazla hizmet seçebilirsiniz</b></div><span>{selectedServices.length} seçili</span></div>
              <div className="crm-service-options">{availableServices.length ? availableServices.map((service) => { const selected = selectedServiceIds.includes(service.serviceId); return <button type="button" key={service.serviceId} className={selected ? "selected" : ""} onClick={() => toggleService(service.serviceId)} aria-pressed={selected}><span><b>{service.name}</b><small>{service.durationMinutes} dk</small></span><strong>{formatMoney(service.price)}</strong><i>{selected ? "✓" : "+"}</i></button>; }) : <p className="crm-service-empty">Eklenebilecek aktif hizmet bulunmuyor.</p>}</div>
            </div>
            <section className="crm-service-summary"><div><small>ANA HİZMET</small><b>{serviceTarget?.serviceName || "Hizmet"}</b><span>{formatMoney(serviceBasePrice)}</span></div><i>+</i><div><small>EK HİZMETLER</small><b>{selectedServices.length} hizmet · {extraServiceDuration} dk</b><span>{formatMoney(extraServiceTotal)}</span></div><strong><small>YENİ TOPLAM</small>{formatMoney(serviceBasePrice + extraServiceTotal)}</strong></section>
            <Button type="submit" disabled={!availableServices.length} loading={busy === "additional-services"}><Save size={16}/> Hizmetleri müşterinin işlemine kaydet</Button>
          </> : <div className="crm-service-no-target"><CalendarDays size={25}/><b>Açık işlem bulunmuyor</b><p>Ek hizmet eklemek için müşterinin ödenmemiş veya henüz kapatılmamış bir randevusu olmalıdır. Ödenmiş adisyonlar korunur.</p></div>}
        </form>}

        {activeTab === "packages" && <div className="crm-packages-layout">
          <form className="crm-package-assign" onSubmit={assignPackage}>
            <header><span><Gift size={19}/></span><div><small>HIZLI PAKET TANIMLAMA</small><h3>Paketi bu müşteriye bağla</h3><p>Seçilen paket tahsilatla birlikte müşterinin hesabında anında görünür.</p></div></header>
            <Select label="Paket seçimi" required value={sale.packageId} onChange={(event) => setSale((current) => ({ ...current, packageId: event.target.value }))} options={[{value:"",label:"Aktif paketlerden seçin",description:"Müşteriye tanımlanacak paketi seçin"},...servicePackages.filter((item) => item.isActive).map((item) => ({value:item.id,label:item.name,description:`${item.sessionCount} seans · ${formatMoney(item.price)}`}))]}/>
            <Select label="Ödeme yöntemi" value={sale.paymentMethod} onChange={(event) => setSale((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))} options={Object.entries(paymentLabels).map(([value,label])=>({value,label,description:value==="cash"?"Kasaya nakit işlensin":value==="card"?"Kart tahsilatı olarak işlensin":value==="transfer"?"Banka transferi olarak işlensin":"Diğer ödeme yöntemi"}))}/>
            <Button type="submit" disabled={!sale.packageId} loading={busy === "sale"}><Plus size={16}/> Paketi tanımla ve tahsil et</Button>
          </form>
          <RecordList title="Müşterinin paketleri" icon={PackageCheck} count={activePackages.length} empty="Bu müşteriye tanımlanmış paket bulunmuyor.">
            {activePackages.map((item) => { const percentage = Math.max(0, Math.min(100, (item.remainingSessions / item.totalSessions) * 100)); return <article className="crm-package-card" key={item.id}><header><div><small>{item.serviceName}</small><b>{item.packageName}</b></div><span className={`status-${item.status}`}>{item.status === "active" ? "Aktif" : item.status === "used" ? "Tamamlandı" : item.status === "expired" ? "Süresi doldu" : "İptal"}</span></header><div className="crm-package-progress"><p><span>Kalan seans</span><b>{item.remainingSessions} / {item.totalSessions}</b></p><i><span style={{ width: `${percentage}%` }}/></i></div><footer><small><Clock3 size={13}/> {displayDate(item.expiresAt)} tarihine kadar</small><Button size="sm" variant="secondary" disabled={item.status !== "active" || item.remainingSessions < 1} loading={busy === item.id} onClick={() => void redeemSession(item.id)}>1 seans kullan</Button></footer></article>; })}
          </RecordList>
        </div>}

        {activeTab === "debts" && <RecordList title="Bekleyen ödemeler" icon={ReceiptText} count={openDebts.length} empty="Bu müşterinin ödenmemiş borcu bulunmuyor." summary={debtTotal ? `Toplam ${formatMoney(debtTotal)}` : undefined}>
          {openDebts.map((receipt) => <article className="crm-record crm-record--debt" key={receipt.id}><span className="crm-record-icon"><ReceiptText size={17}/></span><div><b>Ödeme kaydı #{receipt.id.slice(0, 7).toUpperCase()}</b><small>{displayDate(receipt.createdAt)} · Toplam {formatMoney(receipt.total)}</small></div><span className="crm-status status-pending">Bekliyor</span><strong>{formatMoney(receipt.remainingAmount)}</strong></article>)}
        </RecordList>}

        {activeTab === "payments" && <RecordList title="Ödeme hareketleri" icon={WalletCards} count={customerTransactions.length} empty="Bu müşteriye ait ödeme hareketi bulunmuyor." summary={customerTransactions.length ? formatMoney(customerTransactions.reduce((sum, item) => sum + item.amount, 0)) : undefined}>
          {customerTransactions.map((item) => <article className="crm-record" key={item.id}><span className="crm-record-icon status-completed">{item.paymentMethod === "cash" ? <Banknote size={17}/> : <CreditCard size={17}/>}</span><div><b>{item.category}</b><small>{displayDate(item.occurredAt)} · {paymentLabels[item.paymentMethod]}</small></div><span className="crm-status status-completed"><BadgeCheck size={11}/> Alındı</span><strong>{formatMoney(item.amount)}</strong></article>)}
        </RecordList>}
      </div>
    </article>
  );
}

function RecordList({ title, icon: Icon, count, empty, summary, children }: { title: string; icon: typeof UserRound; count: number; empty: string; summary?: string; children: ReactNode }) {
  return <section className="crm-record-section"><header><span><Icon size={19}/></span><div><small>MÜŞTERİ KAYITLARI</small><h3>{title}</h3></div><p><b>{count}</b>{summary && <small>{summary}</small>}</p></header>{count ? <div className="crm-record-list">{children}</div> : <div className="crm-record-empty"><CheckCircle2 size={25}/><b>{empty}</b><span>Yeni bir kayıt oluştuğunda bu bölüm kendiliğinden güncellenir.</span></div>}</section>;
}
