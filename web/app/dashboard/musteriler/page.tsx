"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownUp, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, CircleX, Clock3, ContactRound, Phone, RefreshCw, Search, Sparkles, TrendingUp, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { CustomerProfileStudio } from "@/components/dashboard/customer-profile-studio";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { createOrUpdateCustomer, listCustomers, normalizeCustomerPhone, renameCustomer } from "@/features/customers/customer-repository";
import { listCheckoutReceipts, listCustomerPackages, listFinanceTransactions, listServicePackages } from "@/features/operations/operations-repository";
import { listServices } from "@/features/services/service-repository";
import { useBusiness } from "@/hooks/use-business";
import { formatMoney } from "@/lib/utils/date";
import type { Appointment } from "@/types/appointments";
import type { Customer } from "@/types/customer";
import type { CheckoutReceipt, CustomerPackage, FinanceTransaction, ServicePackage } from "@/types/operations";
import type { Service } from "@/types/service";

type SortKey = "name" | "appointments" | "spent" | "lastVisit";
type SortDir = "asc" | "desc";
const numberOrZero = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function CustomersPage() {
  const { businessId } = useBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
  const [receipts, setReceipts] = useState<CheckoutReceipt[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isMobileDetail, setIsMobileDetail] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (showLoader = false) => {
    if (!businessId) return;
    if (showLoader) setLoading(true);
      const results = await Promise.allSettled([
        listCustomers(businessId), listAppointments(businessId), listServices(businessId, true), listServicePackages(businessId),
        listCustomerPackages(businessId), listCheckoutReceipts(businessId), listFinanceTransactions(businessId),
      ]);
      if (results[0].status === "fulfilled") setCustomers(results[0].value);
      if (results[1].status === "fulfilled") setAppointments(results[1].value);
      if (results[2].status === "fulfilled") setServices(results[2].value);
      if (results[3].status === "fulfilled") setServicePackages(results[3].value);
      if (results[4].status === "fulfilled") setCustomerPackages(results[4].value);
      if (results[5].status === "fulfilled") setReceipts(results[5].value);
      if (results[6].status === "fulfilled") setTransactions(results[6].value);
    if (results[0].status === "rejected" || results[1].status === "rejected") toast.error("Müşteri verileri yüklenemedi.");
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    queueMicrotask(() => void loadData(true));
  }, [loadData]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => setIsMobileDetail(query.matches);
    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobileDetail || !selectedId) return;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileDetail, selectedId]);

  const customerApptsMap = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appointment) => {
      const phone = normalizeCustomerPhone(appointment.customerPhone ?? "");
      if (!phone) return;
      if (!map[phone]) map[phone] = [];
      map[phone].push(appointment);
    });
    return map;
  }, [appointments]);

  const filtered = useMemo(() => {
    let list = [...customers];
    if (search.trim()) {
      const query = search.toLocaleLowerCase("tr-TR");
      list = list.filter((customer) => customer.fullName.toLocaleLowerCase("tr-TR").includes(query) || customer.phone.includes(query) || customer.email?.toLocaleLowerCase("tr-TR").includes(query));
    }
    list.sort((a, b) => {
      let comparison = 0;
      if (sortKey === "name") comparison = a.fullName.localeCompare(b.fullName, "tr");
      if (sortKey === "appointments") comparison = numberOrZero(a.totalAppointments) - numberOrZero(b.totalAppointments);
      if (sortKey === "spent") comparison = numberOrZero(a.totalSpent) - numberOrZero(b.totalSpent);
      if (sortKey === "lastVisit") comparison = new Date(a.lastVisitAt || 0).getTime() - new Date(b.lastVisitAt || 0).getTime();
      return sortDir === "desc" ? -comparison : comparison;
    });
    return list;
  }, [customers, search, sortDir, sortKey]);

  const selectedCustomer = selectedId ? customers.find((customer) => customer.id === selectedId) : null;
  const selectedAppts = selectedCustomer ? [...(customerApptsMap[normalizeCustomerPhone(selectedCustomer.phone)] || [])].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()) : [];
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => sum + numberOrZero(customer.totalSpent), 0);
  const totalAppointmentCount = customers.reduce((sum, customer) => sum + numberOrZero(customer.totalAppointments), 0);
  const avgAppointments = totalCustomers > 0 ? Math.round((totalAppointmentCount / totalCustomers) * 10) / 10 : 0;

  const customerDetail = selectedCustomer && businessId ? (
    <CustomerProfileStudio
      key={selectedCustomer.id}
      businessId={businessId}
      customer={selectedCustomer}
      appointments={selectedAppts}
      services={services}
      servicePackages={servicePackages}
      customerPackages={customerPackages}
      receipts={receipts}
      transactions={transactions}
      onClose={() => setSelectedId(null)}
      onRename={saveCustomerName}
      onRefresh={() => loadData()}
    />
  ) : (
    <div className="crm-select-hint"><i><ContactRound size={29} /></i><h3>Bir müşteri seçin</h3><p>Bilgiler, randevular, hizmetler, paketler, borçlar ve ödemeler burada yönetilecek.</p></div>
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  async function syncCustomers() {
    if (!businessId) return;
    setSyncing(true);
    try {
      const phones = new Map<string, { name: string; phone: string; email?: string }>();
      appointments.forEach((appointment) => {
        const phone = normalizeCustomerPhone(appointment.customerPhone ?? "");
        if (phone && !phones.has(phone)) phones.set(phone, { name: appointment.customerName || "Müşteri", phone, email: appointment.customerEmail || undefined });
      });
      for (const entry of phones.values()) await createOrUpdateCustomer(businessId, { fullName: entry.name, phone: entry.phone, email: entry.email });
      setCustomers(await listCustomers(businessId));
      toast.success(`${phones.size} müşteri senkronize edildi.`);
    } catch { toast.error("Senkronizasyon başarısız"); }
    finally { setSyncing(false); }
  }

  async function saveCustomerName(fullName: string) {
    if (!businessId || !selectedCustomer || fullName.length < 2) {
      toast.error("Müşteri adı en az 2 karakter olmalıdır.");
      return;
    }
    try {
      const previousId = selectedCustomer.id;
      const customerPhone = normalizeCustomerPhone(selectedCustomer.phone);
      const customerId = await renameCustomer(businessId, {
        fullName,
        phone: selectedCustomer.phone,
        email: selectedCustomer.email,
      });
      await loadData();
      setCustomers((current) => current.map((customer) => normalizeCustomerPhone(customer.phone) === customerPhone ? { ...customer, fullName } : customer));
      setAppointments((current) => current.map((appointment) => normalizeCustomerPhone(appointment.customerPhone ?? "") === customerPhone ? { ...appointment, customerName: fullName } : appointment));
      setCustomerPackages((current) => current.map((item) => normalizeCustomerPhone(item.customerPhone) === customerPhone ? { ...item, customerName: fullName } : item));
      setReceipts((current) => current.map((item) => normalizeCustomerPhone(item.customerPhone ?? "") === customerPhone ? { ...item, customerName: fullName } : item));
      setSelectedId(customerId || previousId);
      toast.success("Müşteri adı tüm kayıtlarda güncellendi.");
    } catch {
      toast.error("Müşteri adı güncellenemedi.");
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>;

  const metrics = [
    { label: "Toplam müşteri", value: totalCustomers.toString(), note: "Kayıtlı müşteri portföyü", icon: UsersRound, tone: "ocean" },
    { label: "Toplam gelir", value: formatMoney(totalRevenue), note: "Müşteri bazlı toplam hacim", icon: CircleDollarSign, tone: "emerald" },
    { label: "Ort. randevu", value: avgAppointments.toString(), note: "Müşteri başına ziyaret", icon: TrendingUp, tone: "violet" },
  ];

  return (
    <div className="crm-page">
      <section className="crm-hero">
        <div><p><Sparkles size={15} /> MÜŞTERİ İLİŞKİLERİ</p><h1>Müşterilerinizi yakından tanıyın.</h1><span>Randevu geçmişini, bağlılığı ve müşteri değerini tek ekrandan yönetin.</span></div>
        <i aria-hidden="true"><ContactRound size={34} /></i>
        {customers.length === 0 && appointments.length > 0 && <button className="crm-sync" onClick={syncCustomers} disabled={syncing}><RefreshCw size={17} className={syncing ? "animate-spin" : ""} />{syncing ? "Senkronize ediliyor" : "Randevulardan aktar"}</button>}
      </section>

      <section className="crm-metrics" aria-label="Müşteri özetleri">
        {metrics.map(({ label, value, note, icon: Icon, tone }) => <article className={`crm-metric crm-metric--${tone}`} key={label}><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div><i aria-hidden="true"><Icon size={23} /></i></article>)}
      </section>

      <section className="crm-toolbar">
        <label><Search size={20} aria-hidden="true" /><input type="search" placeholder="İsim, telefon veya e-posta ile ara..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="crm-sort" aria-label="Sıralama seçenekleri"><ArrowDownUp size={17} aria-hidden="true" />
          {([{ key: "name" as SortKey, label: "İsim" }, { key: "appointments" as SortKey, label: "Randevu" }, { key: "spent" as SortKey, label: "Harcama" }, { key: "lastVisit" as SortKey, label: "Son ziyaret" }]).map((sort) => <button key={sort.key} onClick={() => toggleSort(sort.key)} className={sortKey === sort.key ? "active" : ""} aria-pressed={sortKey === sort.key}>{sort.label}{sortKey === sort.key ? (sortDir === "desc" ? " ↓" : " ↑") : ""}</button>)}
        </div>
      </section>

      {filtered.length === 0 ? <section className="crm-empty"><i><UsersRound size={32} /></i><h2>{search ? "Aramanızla eşleşen müşteri yok" : "Henüz müşteri kaydı yok"}</h2><p>{search ? "Farklı bir isim, telefon veya e-posta deneyin." : "Randevular geldikçe müşteri portföyünüz burada oluşacak."}</p></section> : (
        <section className={`crm-workspace${selectedCustomer ? " has-selection" : ""}`}>
          <div className="crm-customer-list">
            {filtered.map((customer) => {
              const isActive = selectedId === customer.id;
              return <button key={customer.id} onClick={() => setSelectedId(customer.id)} className={`crm-customer-card${isActive ? " active" : ""}`} aria-pressed={isActive}>
                  <span className="crm-customer-main"><span className="crm-avatar">{customer.fullName.charAt(0).toLocaleUpperCase("tr-TR")}</span><span className="crm-customer-name"><strong>{customer.fullName}</strong><small><Phone size={13} /> {customer.phone}</small></span><span className="crm-customer-value"><b><CalendarDays size={14} /> {numberOrZero(customer.totalAppointments)}</b>{numberOrZero(customer.totalSpent) > 0 && <small>{formatMoney(numberOrZero(customer.totalSpent))}</small>}</span><ChevronRight className="crm-card-arrow" size={19} /></span>
                  <span className="crm-tags"><small className="is-complete"><CheckCircle2 size={13} /> {numberOrZero(customer.completedAppointments)} tamamlanan</small>{numberOrZero(customer.cancelledAppointments) > 0 && <small className="is-cancelled"><CircleX size={13} /> {numberOrZero(customer.cancelledAppointments)} iptal</small>}{customer.lastVisitAt && <small className="is-visit"><Clock3 size={13} /> {new Date(customer.lastVisitAt).toLocaleDateString("tr-TR")}</small>}</span>
              </button>;
            })}
          </div>

            <div className="crm-detail-column" ref={detailRef}>{!isMobileDetail && customerDetail}</div>
          </section>
        )}

        {isMobileDetail && selectedCustomer && businessId && typeof document !== "undefined" && createPortal(
          <div className="crm-mobile-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
            <div className="crm-mobile-detail-shell" role="dialog" aria-modal="true" aria-label={`${selectedCustomer.fullName} müşteri profili`}>
              {customerDetail}
            </div>
          </div>,
          document.body,
        )}
      </div>
  );
}
