"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, CircleX, ClipboardList, Clock3, ContactRound, Mail, Phone, RefreshCw, Search, Sparkles, TrendingUp, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { createOrUpdateCustomer, listCustomers } from "@/features/customers/customer-repository";
import { useBusiness } from "@/hooks/use-business";
import { formatMoney } from "@/lib/utils/date";
import type { Appointment } from "@/types/appointments";
import type { Customer } from "@/types/customer";

type SortKey = "name" | "appointments" | "spent" | "lastVisit";
type SortDir = "asc" | "desc";
const statusLabels: Record<string, string> = { completed: "Tamamlandı", confirmed: "Onaylı", cancelled: "İptal", pending: "Bekliyor" };

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
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!businessId) return;
    queueMicrotask(() => setLoading(true));
    Promise.all([listCustomers(businessId), listAppointments(businessId)])
      .then(([custs, appts]) => { setCustomers(custs); setAppointments(appts); setLoading(false); })
      .catch(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (!selectedId || typeof window === "undefined" || window.innerWidth >= 1024) return;
    window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [selectedId]);

  const customerApptsMap = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appointment) => {
      const phone = appointment.customerPhone?.trim();
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
      if (sortKey === "appointments") comparison = a.totalAppointments - b.totalAppointments;
      if (sortKey === "spent") comparison = a.totalSpent - b.totalSpent;
      if (sortKey === "lastVisit") comparison = new Date(a.lastVisitAt || 0).getTime() - new Date(b.lastVisitAt || 0).getTime();
      return sortDir === "desc" ? -comparison : comparison;
    });
    return list;
  }, [customers, search, sortDir, sortKey]);

  const selectedCustomer = selectedId ? customers.find((customer) => customer.id === selectedId) : null;
  const selectedAppts = selectedCustomer ? [...(customerApptsMap[selectedCustomer.phone] || [])].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()) : [];
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const avgAppointments = totalCustomers > 0 ? Math.round((customers.reduce((sum, customer) => sum + customer.totalAppointments, 0) / totalCustomers) * 10) / 10 : 0;

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
        const phone = appointment.customerPhone?.trim();
        if (phone && !phones.has(phone)) phones.set(phone, { name: appointment.customerName || "Müşteri", phone, email: appointment.customerEmail || undefined });
      });
      for (const entry of phones.values()) await createOrUpdateCustomer(businessId, { fullName: entry.name, phone: entry.phone, email: entry.email });
      setCustomers(await listCustomers(businessId));
      toast.success(`${phones.size} müşteri senkronize edildi.`);
    } catch { toast.error("Senkronizasyon başarısız"); }
    finally { setSyncing(false); }
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
        <section className="crm-workspace">
          <div className="crm-customer-list">
            {filtered.map((customer) => {
              const isActive = selectedId === customer.id;
              return <button key={customer.id} onClick={() => setSelectedId(customer.id)} className={`crm-customer-card${isActive ? " active" : ""}`} aria-pressed={isActive}>
                <span className="crm-customer-main"><span className="crm-avatar">{customer.fullName.charAt(0).toLocaleUpperCase("tr-TR")}</span><span className="crm-customer-name"><strong>{customer.fullName}</strong><small><Phone size={13} /> {customer.phone}</small></span><span className="crm-customer-value"><b><CalendarDays size={14} /> {customer.totalAppointments}</b>{customer.totalSpent > 0 && <small>{formatMoney(customer.totalSpent)}</small>}</span><ChevronRight className="crm-card-arrow" size={19} /></span>
                <span className="crm-tags"><small className="is-complete"><CheckCircle2 size={13} /> {customer.completedAppointments} tamamlanan</small>{customer.cancelledAppointments > 0 && <small className="is-cancelled"><CircleX size={13} /> {customer.cancelledAppointments} iptal</small>}{customer.lastVisitAt && <small className="is-visit"><Clock3 size={13} /> {new Date(customer.lastVisitAt).toLocaleDateString("tr-TR")}</small>}</span>
              </button>;
            })}
          </div>

          <div className="crm-detail-column" ref={detailRef}>
            {selectedCustomer ? <article className="crm-detail-card">
              <header className="crm-detail-head"><button className="crm-detail-close" onClick={() => setSelectedId(null)} aria-label="Müşteri detayını kapat"><X size={18} /></button><span className="crm-detail-avatar">{selectedCustomer.fullName.charAt(0).toLocaleUpperCase("tr-TR")}</span><div><small>MÜŞTERİ PROFİLİ</small><h2>{selectedCustomer.fullName}</h2><p><Phone size={14} /> {selectedCustomer.phone}</p>{selectedCustomer.email && <p><Mail size={14} /> {selectedCustomer.email}</p>}</div></header>
              <div className="crm-detail-metrics">
                {([{ label: "Toplam", value: selectedCustomer.totalAppointments, icon: CalendarDays, tone: "ocean" }, { label: "Tamamlanan", value: selectedCustomer.completedAppointments, icon: CheckCircle2, tone: "emerald" }, { label: "İptal", value: selectedCustomer.cancelledAppointments, icon: CircleX, tone: "rose" }, { label: "Harcama", value: formatMoney(selectedCustomer.totalSpent), icon: CircleDollarSign, tone: "amber" }]).map(({ label, value, icon: Icon, tone }) => <div className={`crm-detail-stat crm-detail-stat--${tone}`} key={label}><i><Icon size={19} /></i><strong>{value}</strong><small>{label}</small></div>)}
              </div>
              <section className="crm-history"><h3><ClipboardList size={19} /> Randevu geçmişi <span>{selectedAppts.length}</span></h3>
                {selectedAppts.length === 0 ? <p className="crm-history-empty">Henüz randevu geçmişi bulunmuyor.</p> : <div className="crm-history-list">{selectedAppts.map((appointment) => <article key={appointment.id}><div><strong>{appointment.serviceName || "Hizmet"}</strong><span className={`status-${appointment.status}`}>{statusLabels[appointment.status] || "Bekliyor"}</span></div><p><CalendarDays size={13} />{new Date(appointment.startAt).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>{(appointment.staffName || appointment.servicePrice) && <small>{appointment.staffName || "Ekip"}{appointment.servicePrice ? ` · ${formatMoney(appointment.servicePrice)}` : ""}</small>}</article>)}</div>}
              </section>
            </article> : <div className="crm-select-hint"><i><ContactRound size={29} /></i><h3>Bir müşteri seçin</h3><p>Profil, değer ve randevu geçmişi burada görüntülenecek.</p></div>}
          </div>
        </section>
      )}
    </div>
  );
}
