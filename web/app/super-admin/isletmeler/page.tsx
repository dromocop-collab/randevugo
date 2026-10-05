"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { collection, doc, getDoc, getDocs, type DocumentSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";
import {
  ArrowRightLeft, Ban, Building2, CalendarDays, Check, ChevronRight, Copy, Crown, Download, ExternalLink, Eye, EyeOff,
  MapPin, PackageCheck, RefreshCw, RotateCcw, Store, UserRound, WalletCards, X,
} from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import {
  DEFAULT_PLATFORM_PLAN_ID, isLegacyPlanId, listPlatformPlansWithSource, planDisplayLabel, type PlatformPlan,
} from "@/features/subscriptions/platform-plan-repository";
import {
  assignBusinessPlan, readBusinessFromServer, reviewBusiness, setBusinessDiscoveryVisibility, setBusinessSuspension,
} from "@/features/platform/admin-business-actions";
import {
  AdminButton, AdminPage, Badge, Callout, ConfirmSheet, DataTable, EmptyState, KeyValueList, PageHeader, Panel,
  SearchField, SegmentedControl, SelectField, Sheet, Skeleton, StatCard, StatGrid, Toolbar, type AdminTone, type DataColumn,
} from "@/components/super-admin/ui";
import styles from "./businesses.module.css";

interface BusinessItem {
  id: string;
  organizationId?: string;
  organizationName?: string;
  branchNumber: number;
  isHeadquarters: boolean;
  name: string;
  ownerUid: string;
  status: string;
  statusBeforeSuspension?: string;
  isSuspended: boolean;
  hiddenFromDiscovery: boolean;
  isPublished: boolean;
  plan: string;
  city: string;
  district: string;
  category: string;
  slug?: string;
  phone: string;
  approvalStatus: string;
  createdAt: Date | null;
}

type StatusFilter = "all" | "active" | "pending" | "suspended" | "rejected";
type SortKey = "newest" | "oldest" | "name" | "city";

function toBusinessItem(snapshot: QueryDocumentSnapshot | DocumentSnapshot): BusinessItem {
  const d = snapshot.data() ?? {};
  const createdAt = typeof d.createdAt?.toDate === "function" ? d.createdAt.toDate() as Date : typeof d.createdAt === "string" ? new Date(d.createdAt) : null;
  return {
    id: snapshot.id,
    organizationId: typeof d.organizationId === "string" ? d.organizationId : undefined,
    organizationName: typeof d.organizationName === "string" ? d.organizationName : undefined,
    branchNumber: Number(d.branchNumber ?? d.storePosition ?? 1),
    isHeadquarters: d.isHeadquarters === true,
    name: String(d.name ?? "İsimsiz"),
    ownerUid: String(d.ownerUid ?? ""),
    status: String(d.status ?? "active"),
    statusBeforeSuspension: typeof d.statusBeforeSuspension === "string" ? d.statusBeforeSuspension : undefined,
    isSuspended: d.isSuspended === true || d.status === "suspended",
    hiddenFromDiscovery: d.hiddenFromDiscovery === true,
    isPublished: d.isPublished === true,
    plan: String(d.plan ?? DEFAULT_PLATFORM_PLAN_ID).toUpperCase(),
    city: String(d.city ?? ""),
    district: String(d.district ?? ""),
    category: String(d.category ?? ""),
    slug: typeof d.slug === "string" ? d.slug : undefined,
    phone: String(d.phone ?? ""),
    approvalStatus: String(d.approvalStatus ?? (d.status === "active" ? "approved" : "pending")),
    createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
  };
}

function statusOf(biz: BusinessItem): { key: Exclude<StatusFilter, "all">; label: string; tone: AdminTone } {
  if (biz.isSuspended) return { key: "suspended", label: "Askıda", tone: "red" };
  if (biz.status === "pending_review") return { key: "pending", label: "Onay bekliyor", tone: "amber" };
  if (biz.status === "rejected") return { key: "rejected", label: "Reddedildi", tone: "red" };
  return { key: "active", label: "Aktif", tone: "green" };
}

const fmtDate = (value: Date | null) => value ? value.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "—";
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR");

export default function SuperAdminBusinessesPage() {
  // useSearchParams statik ön render sırasında Suspense sınırı ister.
  return <Suspense fallback={null}><BusinessesRoute /></Suspense>;
}

function BusinessesRoute() {
  const searchParams = useSearchParams();
  // Komut paleti aynı sayfadayken yeni ?q= ile gelirse görünüm yeni parametrelerle kurulur.
  return <BusinessesView key={searchParams.toString()} initialQuery={searchParams.get("q") ?? ""} autoOpen={searchParams.get("ac") === "1"} initialStatus={searchParams.get("durum") === "pending" ? "pending" : "all"} />;
}

function BusinessesView({ initialQuery, autoOpen, initialStatus }: { initialQuery: string; autoOpen: boolean; initialStatus: StatusFilter }) {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [plansFromFallback, setPlansFromFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [searchText, setSearchText] = useState(autoOpen ? "" : initialQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [planFilter, setPlanFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(autoOpen ? initialQuery : null);
  const [suspendTarget, setSuspendTarget] = useState<BusinessItem | null>(null);
  const [migrateOpen, setMigrateOpen] = useState(false);

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [snap, planResult] = await Promise.all([
        getDocs(collection(getDb(), "businesses")),
        listPlatformPlansWithSource().catch(() => null),
      ]);
      setBusinesses(snap.docs.map(toBusinessItem));
      if (planResult) { setPlans(planResult.plans); setPlansFromFallback(planResult.fromFallback); }
    } catch (error) {
      setLoadError((error as Error).message || "İşletmeler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadBusinesses(); }); }, [loadBusinesses]);

  const patchBusiness = useCallback((next: BusinessItem) => {
    setBusinesses((current) => current.map((item) => item.id === next.id ? next : item));
  }, []);

  // Sunucuda onaylanan durumu okur; arayüz yalnızca bunu gösterir.
  const refreshFromServer = useCallback(async (id: string) => {
    const snapshot = await readBusinessFromServer(id);
    if (!snapshot.exists()) throw new Error("İşletme sunucuda bulunamadı.");
    const item = toBusinessItem(snapshot);
    patchBusiness(item);
    return item;
  }, [patchBusiness]);

  async function toggleHidden(biz: BusinessItem) {
    const desired = !biz.hiddenFromDiscovery;
    setBusy(`hidden:${biz.id}`);
    try {
      await setBusinessDiscoveryVisibility(biz.id, desired);
      const confirmed = await refreshFromServer(biz.id);
      if (confirmed.hiddenFromDiscovery !== desired) throw new Error("Sunucu değişikliği doğrulamadı; lütfen yenileyip tekrar deneyin.");
      toast.success(desired ? "İşletme gizlendi; keşif, arama ve uygulama listelerinde görünmeyecek." : "İşletme yeniden listelerde görünür.");
    } catch (error) {
      toast.error((error as Error).message || "Görünürlük değiştirilemedi.");
      await refreshFromServer(biz.id).catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }

  async function confirmSuspension() {
    const biz = suspendTarget;
    if (!biz) return;
    const desired = !biz.isSuspended;
    setBusy(`suspend:${biz.id}`);
    try {
      await setBusinessSuspension(biz.id, desired);
      const confirmed = await refreshFromServer(biz.id);
      if (confirmed.isSuspended !== desired) throw new Error("Sunucu değişikliği doğrulamadı; lütfen yenileyip tekrar deneyin.");
      toast.success(desired ? "İşletme askıya alındı." : confirmed.status === "active" ? "Askı kaldırıldı; işletme yeniden aktif." : "Askı kaldırıldı; işletme önceki durumuna (onay bekliyor/reddedildi) döndü.");
      setSuspendTarget(null);
    } catch (error) {
      toast.error((error as Error).message || "Askı durumu değiştirilemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function changePlan(biz: BusinessItem, planId: string) {
    setBusy(`plan:${biz.id}`);
    try {
      const result = await assignBusinessPlan(biz.id, planId);
      await Promise.all(businesses.filter((item) => item.id === biz.id || (biz.organizationId && item.organizationId === biz.organizationId)).map((item) => refreshFromServer(item.id).catch(() => undefined)));
      toast.success(`${planDisplayLabel(planId, plans)} paketi ${result.affectedBranches} şubeye tanımlandı.`);
    } catch (error) {
      toast.error((error as Error).message || "Paket atanamadı.");
    } finally {
      setBusy(null);
    }
  }

  async function decide(biz: BusinessItem, decision: "approved" | "rejected") {
    setBusy(`review:${biz.id}`);
    try {
      await reviewBusiness(biz.id, decision);
      await refreshFromServer(biz.id);
      toast.success(decision === "approved" ? "Mağaza onaylandı ve yayına açıldı." : "Mağaza başvurusu reddedildi.");
    } catch (error) {
      toast.error((error as Error).message || "Karar kaydedilemedi.");
    } finally {
      setBusy(null);
    }
  }

  // Eski paket kodlarını firma başına bir kez RANDEVUGO'ya taşır (assignBusinessPlan tüm şubelere uygular).
  const legacyBusinesses = useMemo(() => businesses.filter((item) => isLegacyPlanId(item.plan)), [businesses]);
  async function migrateLegacyPlans() {
    setBusy("migrate");
    const seen = new Set<string>();
    let ok = 0, failed = 0;
    for (const biz of legacyBusinesses) {
      const key = biz.organizationId ? `org:${biz.organizationId}` : `biz:${biz.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      try { await assignBusinessPlan(biz.id, DEFAULT_PLATFORM_PLAN_ID); ok++; } catch { failed++; }
    }
    await loadBusinesses();
    setBusy(null);
    setMigrateOpen(false);
    if (failed) toast.error(`${ok} firma taşındı, ${failed} firma taşınamadı.`);
    else toast.success(`${ok} firma SeninRandevun paketine taşındı.`);
  }

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: businesses.length, active: 0, pending: 0, suspended: 0, rejected: 0 };
    businesses.forEach((biz) => { result[statusOf(biz).key]++; });
    return result;
  }, [businesses]);
  const cities = useMemo(() => [...new Set(businesses.map((item) => item.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")), [businesses]);
  const networkCount = useMemo(() => new Set(businesses.map((business) => business.organizationId ?? `legacy:${business.ownerUid}`)).size, [businesses]);
  const hiddenCount = businesses.filter((item) => item.hiddenFromDiscovery).length;

  const filtered = useMemo(() => {
    const q = normalize(searchText.trim());
    const rows = businesses.filter((biz) => {
      if (statusFilter !== "all" && statusOf(biz).key !== statusFilter) return false;
      if (planFilter === "legacy" ? !isLegacyPlanId(biz.plan) : planFilter !== "all" && biz.plan !== planFilter) return false;
      if (visibilityFilter === "hidden" && !biz.hiddenFromDiscovery) return false;
      if (visibilityFilter === "visible" && biz.hiddenFromDiscovery) return false;
      if (cityFilter !== "all" && biz.city !== cityFilter) return false;
      if (!q) return true;
      return [biz.name, biz.organizationName ?? "", biz.id, biz.city, biz.district, biz.category, biz.ownerUid, biz.slug ?? "", biz.phone]
        .some((value) => normalize(value).includes(q));
    });
    const byDate = (item: BusinessItem) => item.createdAt?.getTime() ?? 0;
    return rows.sort((a, b) => sort === "newest" ? byDate(b) - byDate(a)
      : sort === "oldest" ? byDate(a) - byDate(b)
      : sort === "name" ? a.name.localeCompare(b.name, "tr")
      : a.city.localeCompare(b.city, "tr") || a.name.localeCompare(b.name, "tr"));
  }, [businesses, cityFilter, planFilter, searchText, sort, statusFilter, visibilityFilter]);

  const filtersActive = statusFilter !== "all" || planFilter !== "all" || visibilityFilter !== "all" || cityFilter !== "all" || searchText.trim() !== "";
  function resetFilters() { setStatusFilter("all"); setPlanFilter("all"); setVisibilityFilter("all"); setCityFilter("all"); setSearchText(""); }

  function exportBusinesses() {
    const rows = [
      ["İşletme", "Firma", "Şehir", "İlçe", "Kategori", "Paket", "Durum", "Keşifte", "Oluşturulma", "İşletme ID", "Sahip UID"],
      ...filtered.map((biz) => [biz.name, biz.organizationName ?? "", biz.city, biz.district, biz.category, planDisplayLabel(biz.plan, plans), statusOf(biz).label, biz.hiddenFromDiscovery ? "Gizli" : "Görünür", biz.createdAt ? biz.createdAt.toLocaleDateString("tr-TR") : "", biz.id, biz.ownerUid]),
    ];
    const csv = "﻿" + rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `isletmeler-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataColumn<BusinessItem>[] = [
    {
      key: "name", header: "İşletme", primary: true,
      cell: (biz) => (
        <span className={styles.nameCell}>
          <span className={styles.avatar} aria-hidden>{biz.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
          <span className="min-w-0">
            <b className={styles.name}>{biz.name}</b>
            <small className={styles.sub}>{biz.organizationName && biz.organizationName !== biz.name ? `${biz.organizationName} · ` : ""}{biz.isHeadquarters ? "Merkez" : `${biz.branchNumber}. şube`}</small>
          </span>
        </span>
      ),
    },
    { key: "city", header: "Konum", cell: (biz) => <span className={styles.muted}>{[biz.city, biz.district].filter(Boolean).join(" / ") || "—"}</span> },
    { key: "plan", header: "Paket", cell: (biz) => <PlanBadge planId={biz.plan} plans={plans} /> },
    {
      key: "status", header: "Durum",
      cell: (biz) => { const s = statusOf(biz); return <span className="flex flex-wrap gap-1"><Badge tone={s.tone} dot size="sm">{s.label}</Badge>{biz.hiddenFromDiscovery && <Badge size="sm" icon={EyeOff}>Gizli</Badge>}</span>; },
    },
    { key: "created", header: "Kayıt", cell: (biz) => <span className={styles.muted}>{fmtDate(biz.createdAt)}</span>, hideOnMobile: false },
    { key: "go", header: <span className="sr-only">Aç</span>, align: "right", width: 44, hideOnMobile: true, cell: () => <ChevronRight size={16} className={styles.chev} aria-hidden /> },
  ];

  const selected = businesses.find((item) => item.id === selectedId) ?? null;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Mağaza operasyonu"
        title="İşletmeler"
        description="Onay, paket, keşif görünürlüğü ve askı durumlarını tek yerden yönetin. Tüm işlemler sunucu tarafında doğrulanır."
        icon={Building2}
        actions={<>
          <AdminButton variant="glass" icon={Download} onClick={exportBusinesses} disabled={filtered.length === 0}>CSV</AdminButton>
          <AdminButton variant="lime" icon={RefreshCw} loading={loading} onClick={() => void loadBusinesses()}>Yenile</AdminButton>
        </>}
      />

      <StatGrid columns={4}>
        <StatCard label="Firma ağı" value={networkCount.toLocaleString("tr-TR")} icon={Building2} tone="green" loading={loading} hint={`${businesses.length} şube`} />
        <StatCard label="Onay bekleyen" value={counts.pending} icon={PackageCheck} tone="amber" loading={loading} hint="Yayına alınmayı bekliyor" />
        <StatCard label="Askıda" value={counts.suspended} icon={Ban} tone="red" loading={loading} hint={`${counts.rejected} reddedilmiş`} />
        <StatCard label="Keşifte gizli" value={hiddenCount} icon={EyeOff} tone="violet" loading={loading} hint="Doğrudan linki açık" />
      </StatGrid>

      {plansFromFallback && !loading && (
        <Callout tone="blue" icon={WalletCards} title="Paket koleksiyonu boş — yerleşik SeninRandevun paketi kullanılıyor"
          action={<AdminButton size="sm" variant="primary" href="/super-admin/abonelikler">Varsayılan paketi oluştur</AdminButton>}>
          Paket adları ve fiyatlar kod içindeki varsayılandan gösteriliyor. Kalıcı hale getirmek için Abonelikler sayfasını açın.
        </Callout>
      )}
      {legacyBusinesses.length > 0 && !loading && (
        <Callout tone="amber" icon={ArrowRightLeft} title={`${legacyBusinesses.length} işletme eski paket kodunda (FREE/PRO/BUSINESS)`}
          action={<AdminButton size="sm" variant="secondary" onClick={() => setMigrateOpen(true)}>SeninRandevun’a taşı</AdminButton>}>
          Bu işletmelerin tüm özellikleri açık; taşıma yalnızca paket kodunu düzeltir, erişim süresine dokunmaz.
        </Callout>
      )}

      <Panel flush>
        <div className={styles.filters}>
          <Toolbar>
            <SearchField value={searchText} onChange={setSearchText} placeholder="İsim, şehir, ID, telefon veya sahip UID…" ariaLabel="İşletme ara" />
          </Toolbar>
          <SegmentedControl<StatusFilter>
            ariaLabel="Durum filtresi"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Tümü", count: counts.all },
              { value: "active", label: "Aktif", count: counts.active },
              { value: "pending", label: "Onay bekleyen", count: counts.pending },
              { value: "suspended", label: "Askıda", count: counts.suspended },
              { value: "rejected", label: "Reddedilen", count: counts.rejected },
            ]}
          />
          <div className={styles.selects}>
            <SelectField ariaLabel="Paket filtresi" value={planFilter} onChange={setPlanFilter} options={[
              { value: "all", label: "Tüm paketler" },
              ...plans.map((plan) => ({ value: plan.id, label: plan.label })),
              ...(legacyBusinesses.length ? [{ value: "legacy", label: "Eski paket kodları" }] : []),
            ]} />
            <SelectField ariaLabel="Keşif görünürlüğü" value={visibilityFilter} onChange={setVisibilityFilter} options={[
              { value: "all", label: "Tüm görünürlük" }, { value: "visible", label: "Keşifte görünür" }, { value: "hidden", label: "Keşifte gizli" },
            ]} />
            <SelectField ariaLabel="Şehir" value={cityFilter} onChange={setCityFilter} options={[{ value: "all", label: "Tüm şehirler" }, ...cities.map((city) => ({ value: city, label: city }))]} />
            <SelectField<SortKey> ariaLabel="Sıralama" value={sort} onChange={setSort} options={[
              { value: "newest", label: "En yeni" }, { value: "oldest", label: "En eski" }, { value: "name", label: "Ada göre" }, { value: "city", label: "Şehre göre" },
            ]} />
          </div>
          <div className={styles.resultLine}>
            <span>{loading ? "Yükleniyor…" : `${filtered.length} / ${businesses.length} işletme`}</span>
            {filtersActive && <button type="button" className={styles.reset} onClick={resetFilters}><X size={13} /> Filtreleri temizle</button>}
          </div>
        </div>
        {loadError ? (
          <EmptyState icon={RefreshCw} title="İşletmeler yüklenemedi" description={loadError} action={<AdminButton variant="primary" onClick={() => void loadBusinesses()}>Yeniden dene</AdminButton>} />
        ) : (
          <DataTable
            ariaLabel="İşletme listesi"
            rows={filtered}
            columns={columns}
            rowKey={(biz) => biz.id}
            loading={loading}
            onRowClick={(biz) => setSelectedId(biz.id)}
            rowLabel={(biz) => `${biz.name} ayrıntılarını aç`}
            renderMobileCard={(biz) => <MobileBusinessCard biz={biz} plans={plans} />}
            empty={<EmptyState icon={Store} title="Eşleşen işletme yok" description="Arama veya filtreleri değiştirin." action={filtersActive ? <AdminButton onClick={resetFilters}>Filtreleri temizle</AdminButton> : undefined} />}
          />
        )}
      </Panel>

      {selected && (
        <BusinessDetailSheet
          biz={selected}
          plans={plans}
          branches={selected.organizationId ? businesses.filter((item) => item.organizationId === selected.organizationId) : [selected]}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
          onToggleHidden={() => void toggleHidden(selected)}
          onSuspend={() => setSuspendTarget(selected)}
          onChangePlan={(planId) => void changePlan(selected, planId)}
          onDecide={(decision) => void decide(selected, decision)}
        />
      )}
      {selectedId && !selected && !loading && (
        <Sheet open onClose={() => setSelectedId(null)} title="İşletme bulunamadı">
          <EmptyState title="Bu ID ile işletme yok" description={selectedId} compact />
        </Sheet>
      )}

      <ConfirmSheet
        open={Boolean(suspendTarget)}
        title={suspendTarget?.isSuspended ? `${suspendTarget?.name} askıdan çıkarılsın mı?` : `${suspendTarget?.name ?? ""} askıya alınsın mı?`}
        description={suspendTarget?.isSuspended
          ? "İşletme askıdan önceki durumuna döner. Önceki durum bilinmiyorsa yeniden onay bekler; asla otomatik olarak aktif yapılmaz."
          : "Askıdaki işletme yeni randevu alamaz ve herkese açık listelerden kalkar. Veriler korunur."}
        confirmLabel={suspendTarget?.isSuspended ? "Askıyı kaldır" : "Askıya al"}
        tone={suspendTarget?.isSuspended ? "primary" : "danger"}
        icon={suspendTarget?.isSuspended ? RotateCcw : Ban}
        busy={busy?.startsWith("suspend:") ?? false}
        onConfirm={() => void confirmSuspension()}
        onClose={() => setSuspendTarget(null)}
      />
      <ConfirmSheet
        open={migrateOpen}
        title="Eski paket kodları taşınsın mı?"
        description={`${legacyBusinesses.length} işletme (firma başına bir kez) SeninRandevun (RANDEVUGO) paketine atanacak. Abonelik süreleri değişmez; her işlem audit kaydına yazılır.`}
        confirmLabel="Taşı"
        tone="primary"
        icon={ArrowRightLeft}
        busy={busy === "migrate"}
        onConfirm={() => void migrateLegacyPlans()}
        onClose={() => setMigrateOpen(false)}
      />
    </AdminPage>
  );
}

function PlanBadge({ planId, plans }: { planId: string; plans: PlatformPlan[] }) {
  const legacy = isLegacyPlanId(planId);
  const known = plans.some((plan) => plan.id === planId) || planId === DEFAULT_PLATFORM_PLAN_ID;
  return <Badge size="sm" tone={legacy ? "amber" : known ? "lime" : "red"} icon={legacy ? ArrowRightLeft : Crown}>{planDisplayLabel(planId, plans)}</Badge>;
}

function MobileBusinessCard({ biz, plans }: { biz: BusinessItem; plans: PlatformPlan[] }) {
  const s = statusOf(biz);
  return (
    <div className={styles.mCard}>
      <div className={styles.mTop}>
        <span className={styles.avatar} aria-hidden>{biz.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
        <span className="min-w-0 flex-1">
          <b className={styles.name}>{biz.name}</b>
          <small className={styles.sub}><MapPin size={11} aria-hidden /> {[biz.city, biz.district].filter(Boolean).join(" / ") || "Konum yok"}{biz.category ? ` · ${biz.category}` : ""}</small>
        </span>
        <ChevronRight size={16} className={styles.chev} aria-hidden />
      </div>
      <div className={styles.mBadges}>
        <Badge tone={s.tone} dot size="sm">{s.label}</Badge>
        <PlanBadge planId={biz.plan} plans={plans} />
        {biz.hiddenFromDiscovery && <Badge size="sm" icon={EyeOff}>Gizli</Badge>}
        <span className={styles.mDate}>{fmtDate(biz.createdAt)}</span>
      </div>
    </div>
  );
}

type OwnerInfo = { name: string; email: string; phone: string } | null;
type SubscriptionInfo = { status: string; plan: string; endsAt: Date | null; isLifetime: boolean } | null;

const SUBSCRIPTION_LABEL: Record<string, { label: string; tone: AdminTone }> = {
  trialing: { label: "Deneme", tone: "amber" }, active: { label: "Aktif", tone: "green" }, past_due: { label: "Ödeme bekliyor", tone: "red" },
  cancelled: { label: "İptal", tone: "neutral" }, expired: { label: "Süresi doldu", tone: "red" },
};

function BusinessDetailSheet({
  biz, plans, branches, busy, onClose, onSelect, onToggleHidden, onSuspend, onChangePlan, onDecide,
}: {
  biz: BusinessItem;
  plans: PlatformPlan[];
  branches: BusinessItem[];
  busy: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onToggleHidden: () => void;
  onSuspend: () => void;
  onChangePlan: (planId: string) => void;
  onDecide: (decision: "approved" | "rejected") => void;
}) {
  const [extra, setExtra] = useState<{ id: string; owner: OwnerInfo; subscription: SubscriptionInfo } | null>(null);
  const [planChoice, setPlanChoice] = useState<{ id: string; plan: string } | null>(null);
  const chosenPlan = planChoice?.id === biz.id ? planChoice.plan : isLegacyPlanId(biz.plan) ? DEFAULT_PLATFORM_PLAN_ID : biz.plan;

  useEffect(() => {
    let alive = true;
    const db = getDb();
    Promise.all([
      biz.ownerUid ? getDoc(doc(db, "users", biz.ownerUid)).catch(() => null) : Promise.resolve(null),
      getDoc(doc(db, "subscriptions", biz.id)).catch(() => null),
    ]).then(([owner, subscription]) => {
      if (!alive) return;
      const o = owner?.exists() ? owner.data() : null;
      const s = subscription?.exists() ? subscription.data() : null;
      const status = String(s?.status ?? "");
      const endRaw = status === "trialing" ? s?.trialEndsAt : s?.subscriptionEndsAt;
      const endsAt = typeof endRaw?.toDate === "function" ? endRaw.toDate() as Date : typeof endRaw === "string" ? new Date(endRaw) : null;
      setExtra({
        id: biz.id,
        owner: o ? { name: String(o.displayName ?? o.fullName ?? ""), email: String(o.email ?? ""), phone: String(o.phone ?? o.phoneNumber ?? "") } : null,
        subscription: s ? { status, plan: String(s.plan ?? ""), endsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null, isLifetime: s.isLifetime === true || s.accessMode === "lifetime" } : null,
      });
    });
    return () => { alive = false; };
  }, [biz.id, biz.ownerUid]);

  const info = extra?.id === biz.id ? extra : null;
  const s = statusOf(biz);
  const isBusy = (prefix: string) => busy === `${prefix}:${biz.id}`;
  const anyBusy = Boolean(busy && busy.endsWith(`:${biz.id}`));
  const copy = (value: string, label: string) => { void navigator.clipboard?.writeText(value).then(() => toast.success(`${label} kopyalandı.`)).catch(() => undefined); };
  const sub = info?.subscription;
  const subBadge = sub ? (sub.isLifetime ? { label: "Süresiz", tone: "violet" as AdminTone } : SUBSCRIPTION_LABEL[sub.status] ?? { label: sub.status || "—", tone: "neutral" as AdminTone }) : null;
  const assignable = plans.filter((plan) => plan.isActive || plan.id === biz.plan);

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      dismissible={!anyBusy}
      title={biz.name}
      description={<span className="mt-1 flex flex-wrap gap-1.5"><Badge tone={s.tone} dot size="sm">{s.label}</Badge><PlanBadge planId={biz.plan} plans={plans} />{biz.hiddenFromDiscovery ? <Badge size="sm" icon={EyeOff}>Keşifte gizli</Badge> : <Badge size="sm" tone="green" icon={Eye}>Keşifte görünür</Badge>}</span>}
    >
      <div className={styles.detail}>
        {biz.status === "pending_review" && !biz.isSuspended && (
          <Callout tone="amber" icon={PackageCheck} title="Bu mağaza onay bekliyor" action={<span className="flex gap-2">
            <AdminButton size="sm" variant="danger" icon={X} loading={isBusy("review")} disabled={anyBusy} onClick={() => onDecide("rejected")}>Reddet</AdminButton>
            <AdminButton size="sm" variant="primary" icon={Check} loading={isBusy("review")} disabled={anyBusy} onClick={() => onDecide("approved")}>Onayla</AdminButton>
          </span>}>Onaylanınca yayına açılır ve randevu almaya başlar.</Callout>
        )}

        <section className={styles.actions} aria-label="Hızlı işlemler">
          <AdminButton variant="secondary" icon={biz.hiddenFromDiscovery ? Eye : EyeOff} loading={isBusy("hidden")} disabled={anyBusy} onClick={onToggleHidden}>
            {biz.hiddenFromDiscovery ? "Keşifte göster" : "Keşiften gizle"}
          </AdminButton>
          <AdminButton variant={biz.isSuspended ? "primary" : "danger"} icon={biz.isSuspended ? RotateCcw : Ban} disabled={anyBusy} onClick={onSuspend}>
            {biz.isSuspended ? "Askıyı kaldır" : "Askıya al"}
          </AdminButton>
          {biz.slug && <AdminButton variant="ghost" icon={ExternalLink} href={`/isletme/${biz.slug}`} external>Mağazayı aç</AdminButton>}
        </section>

        <h3 className={styles.sectionTitle}>Paket</h3>
        <div className={styles.planRow}>
          <SelectField
            ariaLabel="Atanacak paket"
            value={chosenPlan}
            onChange={(value) => setPlanChoice({ id: biz.id, plan: value })}
            disabled={anyBusy}
            className="min-w-0 flex-1"
            options={[
              ...(!assignable.some((plan) => plan.id === biz.plan) ? [{ value: biz.plan, label: planDisplayLabel(biz.plan, plans) }] : []),
              ...assignable.map((plan) => ({ value: plan.id, label: `${plan.label} · ${plan.monthlyPrice.toLocaleString("tr-TR")} ₺/ay` })),
            ]}
          />
          <AdminButton variant="primary" loading={isBusy("plan")} disabled={anyBusy || chosenPlan === biz.plan} onClick={() => onChangePlan(chosenPlan)}>
            {isLegacyPlanId(biz.plan) && chosenPlan === DEFAULT_PLATFORM_PLAN_ID ? "Taşı" : "Uygula"}
          </AdminButton>
        </div>
        <p className={styles.hint}>Paket firmadaki tüm şubelere uygulanır; erişim süresi Abonelikler sayfasından yönetilir.</p>

        <h3 className={styles.sectionTitle}>Abonelik</h3>
        {!info ? <Skeleton height={64} radius={16} /> : sub ? (
          <KeyValueList items={[
            { label: "Durum", value: subBadge ? <Badge tone={subBadge.tone} size="sm" dot>{subBadge.label}</Badge> : "—" },
            { label: "Abonelik paketi", value: planDisplayLabel(sub.plan || biz.plan, plans) },
            { label: sub.status === "trialing" ? "Deneme bitişi" : "Bitiş", value: sub.isLifetime ? "Süre sınırı yok" : fmtDate(sub.endsAt) },
            { label: "Yönet", value: <Link className={styles.link} href="/super-admin/abonelikler">Abonelikler <ChevronRight size={12} /></Link> },
          ]} />
        ) : <p className={styles.hint}>Abonelik kaydı yok (eski kayıt). Abonelikler sayfası açıldığında otomatik oluşturulur.</p>}

        <h3 className={styles.sectionTitle}>Sahip</h3>
        {!info ? <Skeleton height={64} radius={16} /> : (
          <KeyValueList items={[
            { label: "Ad", value: info.owner?.name || "—" },
            { label: "Telefon", value: info.owner?.phone || biz.phone || "—" },
            { label: "E-posta", value: info.owner?.email ? <a className={styles.link} href={`mailto:${info.owner.email}`}>{info.owner.email}</a> : "—", wide: true },
            { label: "Sahip UID", value: <button type="button" className={styles.copy} onClick={() => copy(biz.ownerUid, "Sahip UID")}>{biz.ownerUid || "—"} <Copy size={12} /></button>, wide: true },
          ]} />
        )}

        <h3 className={styles.sectionTitle}>Kayıt</h3>
        <KeyValueList items={[
          { label: "Kategori", value: biz.category || "—" },
          { label: "Konum", value: [biz.city, biz.district].filter(Boolean).join(" / ") || "—" },
          { label: "Oluşturulma", value: <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {fmtDate(biz.createdAt)}</span> },
          { label: "Yayın", value: biz.isPublished ? "Yayında" : "Yayında değil" },
          { label: "İşletme ID", value: <button type="button" className={styles.copy} onClick={() => copy(biz.id, "İşletme ID")}>{biz.id} <Copy size={12} /></button>, wide: true },
        ]} />

        <h3 className={styles.sectionTitle}>{biz.organizationName ? `${biz.organizationName} şubeleri` : "Şubeler"} <small>({branches.length})</small></h3>
        <ul className={styles.branches}>
          {[...branches].sort((a, b) => Number(b.isHeadquarters) - Number(a.isHeadquarters) || a.branchNumber - b.branchNumber).map((branch) => {
            const bs = statusOf(branch);
            const current = branch.id === biz.id;
            return (
              <li key={branch.id}>
                <button type="button" className={styles.branch} disabled={current || anyBusy} onClick={() => onSelect(branch.id)} aria-current={current || undefined}>
                  <Store size={15} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{branch.name}{current && " (bu şube)"}</span>
                  <small>{branch.isHeadquarters ? "Merkez" : `${branch.branchNumber}. şube`}</small>
                  <Badge tone={bs.tone} size="sm" dot>{bs.label}</Badge>
                </button>
              </li>
            );
          })}
        </ul>

        {biz.slug && (
          <>
            <h3 className={styles.sectionTitle}>Bağlantılar</h3>
            <div className={styles.links}>
              <Link className={styles.link} href={`/isletme/${biz.slug}`} target="_blank" rel="noreferrer"><Store size={13} /> Mağaza sayfası</Link>
              <Link className={styles.link} href={`/isletme/${biz.slug}/randevu`} target="_blank" rel="noreferrer"><CalendarDays size={13} /> Randevu sayfası</Link>
              <button type="button" className={styles.link} onClick={() => copy(`${window.location.origin}/isletme/${biz.slug}`, "Mağaza linki")}><Copy size={13} /> Linki kopyala</button>
              {biz.ownerUid && <button type="button" className={styles.link} onClick={() => copy(biz.ownerUid, "Sahip UID")}><UserRound size={13} /> Sahip UID</button>}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
