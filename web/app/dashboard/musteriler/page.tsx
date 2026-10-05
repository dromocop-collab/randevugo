"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, CalendarDays, CalendarX2, CircleDollarSign, ContactRound, Phone, RefreshCw, TrendingUp, UserPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { CustomerProfileStudio } from "@/components/dashboard/customer-profile-studio";
import {
  Badge, Button, DashPage, DataTable, EmptyState, Field, FormGrid, Input, NativeSelect, PageHeader, SearchField, SegmentedControl, Sheet, Skeleton, SkeletonList,
  StatCard, StatGrid, Toolbar, type DataColumn,
} from "@/components/dashboard/ui";
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
import { Avatar, cx, matchesSearch, ws } from "../_workspace/kit";
import styles from "./customers.module.css";

type SortKey = "name" | "appointments" | "spent" | "lastVisit";
type SortDir = "asc" | "desc";
type Segment = "all" | "loyal" | "new" | "away" | "debt";
const AWAY_DAYS = 60;
const numberOrZero = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function relativeVisit(value: string | undefined, now: number) {
  if (!value) return "Henüz gelmedi";
  const days = Math.floor((now - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Bugün";
  if (days === 1) return "Dün";
  if (days < 30) return `${days} gün önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}

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
  const [segment, setSegment] = useState<Segment>("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadedAt] = useState(() => Date.now());
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addSubmitted, setAddSubmitted] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: "", phone: "", email: "" });

  // Panel ana sayfası ve ⌘K "Müşteri ekle" → /dashboard/musteriler?new=1
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") !== "1") return;
    queueMicrotask(() => openAdd());
    router.replace("/dashboard/musteriler", { scroll: false });
  }, [router]);

  function openAdd() {
    setAddForm({ fullName: "", phone: "", email: "" });
    setAddSubmitted(false);
    setShowAdd(true);
  }

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

  const debtPhones = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach((receipt) => { if (Number(receipt.remainingAmount) > 0 && receipt.customerPhone) set.add(normalizeCustomerPhone(receipt.customerPhone)); });
    return set;
  }, [receipts]);

  const segmentOf = useCallback((customer: Customer): Exclude<Segment, "all">[] => {
    const result: Exclude<Segment, "all">[] = [];
    if (numberOrZero(customer.completedAppointments) >= 3) result.push("loyal");
    if (numberOrZero(customer.totalAppointments) <= 1) result.push("new");
    if (customer.lastVisitAt && loadedAt - new Date(customer.lastVisitAt).getTime() > AWAY_DAYS * 86_400_000) result.push("away");
    if (debtPhones.has(normalizeCustomerPhone(customer.phone))) result.push("debt");
    return result;
  }, [debtPhones, loadedAt]);

  const segmentCounts = useMemo(() => {
    const counts: Record<Segment, number> = { all: customers.length, loyal: 0, new: 0, away: 0, debt: 0 };
    customers.forEach((customer) => segmentOf(customer).forEach((key) => { counts[key] += 1; }));
    return counts;
  }, [customers, segmentOf]);

  const filtered = useMemo(() => {
    const list = customers.filter((customer) =>
      (segment === "all" || segmentOf(customer).includes(segment)) &&
      matchesSearch(search, customer.fullName, customer.phone, customer.email, ...(customer.tags ?? [])),
    );
    list.sort((a, b) => {
      let comparison = 0;
      if (sortKey === "name") comparison = a.fullName.localeCompare(b.fullName, "tr");
      if (sortKey === "appointments") comparison = numberOrZero(a.totalAppointments) - numberOrZero(b.totalAppointments);
      if (sortKey === "spent") comparison = numberOrZero(a.totalSpent) - numberOrZero(b.totalSpent);
      if (sortKey === "lastVisit") comparison = new Date(a.lastVisitAt || 0).getTime() - new Date(b.lastVisitAt || 0).getTime();
      return sortDir === "desc" ? -comparison : comparison;
    });
    return list;
  }, [customers, search, segment, segmentOf, sortDir, sortKey]);

  const selectedCustomer = selectedId ? customers.find((customer) => customer.id === selectedId) : null;
  const selectedAppts = selectedCustomer ? [...(customerApptsMap[normalizeCustomerPhone(selectedCustomer.phone)] || [])].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()) : [];
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => sum + numberOrZero(customer.totalSpent), 0);
  const totalAppointmentCount = customers.reduce((sum, customer) => sum + numberOrZero(customer.totalAppointments), 0);
  const totalNoShows = customers.reduce((sum, customer) => sum + numberOrZero(customer.noShowAppointments), 0);
  const avgAppointments = totalCustomers > 0 ? Math.round((totalAppointmentCount / totalCustomers) * 10) / 10 : 0;

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

  const addErrors: Partial<Record<"fullName" | "phone" | "email", string>> = {};
  if (addForm.fullName.trim().length < 2) addErrors.fullName = "Ad soyad en az 2 karakter olmalı.";
  if (addForm.phone.replace(/\D/g, "").length < 10) addErrors.phone = "Geçerli bir telefon numarası girin.";
  if (addForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addForm.email.trim())) addErrors.email = "Geçerli bir e-posta girin.";
  const addError = (key: keyof typeof addErrors) => (addSubmitted ? addErrors[key] : undefined);

  async function addCustomer(event: FormEvent) {
    event.preventDefault();
    setAddSubmitted(true);
    if (!businessId || Object.keys(addErrors).length) return;
    const phone = normalizeCustomerPhone(addForm.phone);
    const existing = customers.find((customer) => normalizeCustomerPhone(customer.phone) === phone);
    if (existing) {
      setShowAdd(false);
      setSelectedId(existing.id);
      toast.info(`${existing.fullName} zaten kayıtlı; profili açıldı.`);
      return;
    }
    setAddBusy(true);
    try {
      const customerId = await createOrUpdateCustomer(businessId, { fullName: addForm.fullName.trim(), phone, email: addForm.email.trim() || undefined });
      setCustomers(await listCustomers(businessId));
      setShowAdd(false);
      if (customerId) setSelectedId(customerId);
      toast.success("Müşteri eklendi.");
    } catch {
      toast.error("Müşteri eklenemedi.");
    } finally {
      setAddBusy(false);
    }
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

  const columns: DataColumn<Customer>[] = [
    {
      key: "name",
      header: "Müşteri",
      primary: true,
      cell: (customer) => (
        <span className={styles.identity}>
          <Avatar name={customer.fullName} />
          <span className={styles.identityText}><b>{customer.fullName}</b><small><Phone size={12} aria-hidden="true" /> {customer.phone}</small></span>
        </span>
      ),
    },
    { key: "visits", header: "Ziyaret", align: "right", cell: (customer) => <span className={ws.mono}>{numberOrZero(customer.totalAppointments)}</span> },
    { key: "spent", header: "Harcama", align: "right", cell: (customer) => <span className={ws.mono}>{numberOrZero(customer.totalSpent) > 0 ? formatMoney(numberOrZero(customer.totalSpent)) : "—"}</span> },
    { key: "noshow", header: "Gelmedi", align: "right", cell: (customer) => numberOrZero(customer.noShowAppointments) > 0 ? <Badge size="sm" tone="red">{numberOrZero(customer.noShowAppointments)}</Badge> : <span className={ws.muted}>0</span> },
    { key: "last", header: "Son ziyaret", cell: (customer) => <span title={customer.lastVisitAt ? new Date(customer.lastVisitAt).toLocaleDateString("tr-TR") : undefined}>{relativeVisit(customer.lastVisitAt, loadedAt)}</span> },
    { key: "tags", header: "Etiketler", cell: (customer) => <CustomerTags customer={customer} segments={segmentOf(customer)} /> },
  ];

  if (loading) {
    return (
      <DashPage>
        <Skeleton height={150} radius={24} />
        <StatGrid columns={4}>{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height={104} radius={18} />)}</StatGrid>
        <SkeletonList rows={6} height={72} label="Müşteriler yükleniyor" />
      </DashPage>
    );
  }

  const syncButton = appointments.length > 0
    ? <Button variant={customers.length ? "glass" : "bright"} icon={RefreshCw} loading={syncing} onClick={() => void syncCustomers()}>{syncing ? "Aktarılıyor" : "Randevulardan aktar"}</Button>
    : null;

  return (
    <DashPage>
      <PageHeader
        eyebrow="Müşteri ilişkileri"
        icon={ContactRound}
        title="Müşterileriniz"
        description="Randevu geçmişini, harcamayı, paketleri ve notları tek yerden yönetin."
        actions={<>
          <Button variant="bright" icon={UserPlus} onClick={openAdd}>Müşteri ekle</Button>
          {customers.length === 0 ? syncButton : null}
        </>}
        meta={customers.length ? <>
          <Badge tone="accent" icon={UsersRound}>{totalCustomers} müşteri</Badge>
          {segmentCounts.debt ? <Badge tone="amber" icon={CircleDollarSign}>{segmentCounts.debt} ödeme bekliyor</Badge> : null}
        </> : undefined}
      />

      {customers.length === 0 ? (
        <EmptyState
          mascot="wave"
          title="Henüz müşteri kaydı yok"
          description={appointments.length ? "Mevcut randevularınızdaki müşterileri tek dokunuşla buraya aktarabilirsiniz." : "Randevular geldikçe müşteri portföyünüz burada kendiliğinden oluşur."}
          action={<>
            <Button variant="primary" icon={UserPlus} onClick={openAdd}>Müşteri ekle</Button>
            {syncButton}
          </>}
        />
      ) : (
        <>
          <StatGrid columns={4}>
            <StatCard label="Toplam müşteri" value={totalCustomers} hint={`${segmentCounts.loyal} sadık müşteri`} icon={UsersRound} tone="blue" onClick={() => setSegment("all")} />
            <StatCard label="Toplam gelir" value={formatMoney(totalRevenue)} hint="Müşteri bazlı toplam" icon={CircleDollarSign} tone="green" />
            <StatCard label="Ort. ziyaret" value={avgAppointments} hint="Müşteri başına" icon={TrendingUp} tone="violet" />
            <StatCard label="Gelmedi" value={totalNoShows} hint={`${segmentCounts.away} müşteri ${AWAY_DAYS}+ gündür gelmedi`} icon={CalendarX2} tone={totalNoShows ? "red" : "neutral"} onClick={segmentCounts.away ? () => setSegment("away") : undefined} />
          </StatGrid>

          <div className={ws.stackSm}>
            <Toolbar>
              <SearchField value={search} onChange={setSearch} placeholder="İsim, telefon, e-posta veya etiket" />
              <div className={styles.sort}>
                <NativeSelect value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} aria-label="Sıralama">
                  <option value="lastVisit">Son ziyaret</option>
                  <option value="name">İsim</option>
                  <option value="appointments">Randevu sayısı</option>
                  <option value="spent">Harcama</option>
                </NativeSelect>
                <Button variant="secondary" iconOnly icon={sortDir === "desc" ? ArrowDownWideNarrow : ArrowUpNarrowWide} onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")} aria-label={sortDir === "desc" ? "Azalan sıralama, artana çevir" : "Artan sıralama, azalana çevir"} />
              </div>
            </Toolbar>
            <SegmentedControl
              ariaLabel="Müşteri grubu"
              value={segment}
              onChange={setSegment}
              options={[
                { value: "all", label: "Tümü", count: segmentCounts.all },
                { value: "loyal", label: "Sadık", count: segmentCounts.loyal },
                { value: "new", label: "Yeni", count: segmentCounts.new },
                { value: "away", label: "Uzun süredir yok", count: segmentCounts.away },
                ...(segmentCounts.debt ? [{ value: "debt" as const, label: "Borçlu", count: segmentCounts.debt }] : []),
              ]}
            />
          </div>

          <section className={styles.tableCard} aria-label="Müşteri listesi">
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(customer) => customer.id}
              onRowClick={(customer) => setSelectedId(customer.id)}
              rowLabel={(customer) => `${customer.fullName} profilini aç`}
              ariaLabel="Müşteriler"
              renderMobileCard={(customer) => (
                <span className={styles.mobileCard}>
                  <span className={styles.identity}>
                    <Avatar name={customer.fullName} />
                    <span className={styles.identityText}><b>{customer.fullName}</b><small><Phone size={12} aria-hidden="true" /> {customer.phone}</small></span>
                  </span>
                  <span className={styles.mobileStats}>
                    <span><CalendarDays size={13} aria-hidden="true" /> {numberOrZero(customer.totalAppointments)} ziyaret</span>
                    {numberOrZero(customer.totalSpent) > 0 ? <span><CircleDollarSign size={13} aria-hidden="true" /> {formatMoney(numberOrZero(customer.totalSpent))}</span> : null}
                    <span>{relativeVisit(customer.lastVisitAt, loadedAt)}</span>
                  </span>
                  <CustomerTags customer={customer} segments={segmentOf(customer)} />
                </span>
              )}
              empty={<EmptyState compact mascot="thinking" title="Eşleşen müşteri yok" description="Farklı bir isim, telefon veya etiket deneyin." action={<Button variant="soft" onClick={() => { setSearch(""); setSegment("all"); }}>Filtreleri temizle</Button>} />}
            />
          </section>
        </>
      )}

      <Sheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        dismissible={!addBusy}
        size="sm"
        title="Yeni müşteri"
        description="Telefon numarası müşterinin kimliğidir; aynı numara ikinci kez eklenmez."
        footer={<>
          <Button variant="ghost" onClick={() => setShowAdd(false)} disabled={addBusy}>Vazgeç</Button>
          <Button type="submit" form="customer-add-form" variant="primary" icon={UserPlus} loading={addBusy}>Ekle</Button>
        </>}
      >
        <form id="customer-add-form" className={ws.stack} onSubmit={addCustomer} noValidate>
          <FormGrid columns={2}>
            <Field label="Ad soyad" wide error={addError("fullName")}>
              <Input data-autofocus autoComplete="name" value={addForm.fullName} onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))} aria-invalid={Boolean(addError("fullName"))} className={cx(addError("fullName") && styles.invalid)} />
            </Field>
            <Field label="Telefon" error={addError("phone")}>
              <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} aria-invalid={Boolean(addError("phone"))} className={cx(addError("phone") && styles.invalid)} />
            </Field>
            <Field label="E-posta (isteğe bağlı)" error={addError("email")}>
              <Input type="email" inputMode="email" autoComplete="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} aria-invalid={Boolean(addError("email"))} className={cx(addError("email") && styles.invalid)} />
            </Field>
          </FormGrid>
        </form>
      </Sheet>

      {selectedCustomer && businessId ? (
        <CustomerProfileStudio
          key={selectedCustomer.id}
          open
          businessId={businessId}
          customer={selectedCustomer}
          appointments={selectedAppts}
          services={services}
          servicePackages={servicePackages}
          customerPackages={customerPackages}
          receipts={receipts}
          transactions={transactions}
          referenceTime={loadedAt}
          onClose={() => setSelectedId(null)}
          onRename={saveCustomerName}
          onRefresh={() => loadData()}
          onNotesSaved={(customerId, notes, tags) => setCustomers((current) => current.map((customer) => customer.id === customerId ? { ...customer, notes, tags } : customer))}
        />
      ) : null}
    </DashPage>
  );
}

function CustomerTags({ customer, segments }: { customer: Customer; segments: string[] }) {
  const tags = customer.tags ?? [];
  const auto = [
    segments.includes("debt") ? <Badge key="debt" size="sm" tone="amber">Borç</Badge> : null,
    segments.includes("loyal") ? <Badge key="loyal" size="sm" tone="green">Sadık</Badge> : null,
    segments.includes("away") ? <Badge key="away" size="sm" tone="neutral">Uzun süredir yok</Badge> : null,
  ].filter(Boolean);
  if (!tags.length && !auto.length) return <span className={ws.muted}>—</span>;
  return (
    <span className={styles.tags}>
      {auto}
      {tags.slice(0, 2).map((tag) => <Badge key={tag} size="sm" tone="accent">{tag}</Badge>)}
      {tags.length > 2 ? <Badge size="sm">+{tags.length - 2}</Badge> : null}
    </span>
  );
}
