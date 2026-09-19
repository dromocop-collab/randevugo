"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Ticket } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessBySlug } from "@/features/businesses/business-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { getLiveQueueWaitEstimate, getLiveQueueWaitOptions, getMyActiveQueues, joinLiveQueue, listLiveDiscovery, queueCustomerError, type ActiveQueuePointer } from "@/features/live-queue/customer-queue-repository";
import { waitEstimateLabel, type LiveWaitEstimate } from "@/features/live-queue/wait-estimate";
import type { Business } from "@/types/business";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";

export default function CustomerJoinQueuePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [eligible, setEligible] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [active, setActive] = useState<ActiveQueuePointer | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [waitOptions, setWaitOptions] = useState<{ firstAvailable: LiveWaitEstimate; byStaff: Record<string, LiveWaitEstimate> } | null>(null);
  const [waitLoading, setWaitLoading] = useState(false);

  useEffect(() => subscribeLiveFeatureAvailability((flags) =>
    setEnabled(flags.isLiveAvailabilityEnabled && flags.isLiveQueueEnabled && flags.isLiveOperationsEnabled)), []);
  useEffect(() => {
    if (!enabled || !slug) { queueMicrotask(() => setLoading(false)); return; }
    let cancelled = false;
    queueMicrotask(() => { setLoading(true); setError(""); });
    getBusinessBySlug(slug).then(async (row) => {
      if (!row) return;
      const [discovery, serviceRows, staffRows] = await Promise.all([
        listLiveDiscovery(row.id), listServices(row.id, true), listStaff(row.id, true),
      ]);
      if (cancelled) return;
      setBusiness(row);
      setEligible(discovery.some((item) => item.id === row.id));
      const activeStaff = staffRows.filter((item) => !item.archivedAt);
      setServices(serviceRows.filter((item) => item.isBookableOnline && item.durationMinutes >= 5 &&
        activeStaff.some((person) =>
          (!Array.isArray(item.assignableStaffIds) || item.assignableStaffIds.length === 0 || item.assignableStaffIds.includes(person.id)) &&
          (!Array.isArray(person.serviceIds) || person.serviceIds.length === 0 || person.serviceIds.includes(item.id)) &&
          (!person.specialtyCategoryIds?.length || person.specialtyCategoryIds.includes(item.category)))));
      setStaff(activeStaff);
    }).catch(() => { if (!cancelled) setError("Canlı sıra bilgileri yüklenemedi."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, slug]);
  useEffect(() => {
    if (!user || !business) return;
    let cancelled = false;
    getMyActiveQueues().then((rows) => { if (!cancelled) setActive(rows.find((item) => item.businessId === business.id) ?? null); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [business, user]);

  const selectedService = services.find((item) => item.id === serviceId);
  useEffect(() => {
    if (!enabled || !eligible || !business || !serviceId) { queueMicrotask(() => setWaitOptions(null)); return; }
    let cancelled = false;
    queueMicrotask(() => { setWaitLoading(true); setWaitOptions(null); });
    const refresh = () => {
      if (!cancelled) setWaitOptions(null);
      return getLiveQueueWaitOptions(business.id, serviceId).then((value) => { if (!cancelled) setWaitOptions(value); })
      .catch(() => { if (!cancelled) setWaitOptions(null); })
      .finally(() => { if (!cancelled) setWaitLoading(false); });
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 120_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [enabled, eligible, business, serviceId]);
  const selectedWait = staffId ? waitOptions?.byStaff[staffId] ?? null : waitOptions?.firstAvailable ?? null;
  const eligibleStaff = useMemo(() => selectedService ? staff.filter((person) =>
    (!Array.isArray(selectedService.assignableStaffIds) || selectedService.assignableStaffIds.length === 0 || selectedService.assignableStaffIds.includes(person.id)) &&
    (!Array.isArray(person.serviceIds) || person.serviceIds.length === 0 || person.serviceIds.includes(selectedService.id)) &&
    (!person.specialtyCategoryIds?.length || person.specialtyCategoryIds.includes(selectedService.category))) : [], [selectedService, staff]);

  async function submit() {
    if (!business || !selectedService || busy) return;
    if (!user) { router.push(`/musteri/giris?next=${encodeURIComponent(`/isletme/${slug}/canli-sira`)}`); return; }
    setBusy(true); setError("");
    try {
      const fresh = await getLiveQueueWaitEstimate({ businessId: business.id, serviceId: selectedService.id, staffId: staffId || null });
      if (fresh.status === "business_closed" || fresh.status === "no_eligible_staff" || fresh.reason === "FEATURE_DISABLED" || fresh.reason === "INTAKE_CLOSED") {
        setError("Bu hizmet için canlı sıra şu anda uygun değil. Durum yenilendi.");
        return;
      }
      const result = await joinLiveQueue(business.id, selectedService.id, staffId || null);
      router.push(`/siram?businessId=${encodeURIComponent(business.id)}&entryId=${encodeURIComponent(result.entryId)}`);
    } catch (cause) {
      setError(queueCustomerError(cause));
      const [fresh, rows] = await Promise.all([
        listLiveDiscovery(business.id).catch(() => []), getMyActiveQueues().catch(() => []),
      ]);
      setEligible(fresh.some((item) => item.id === business.id));
      setActive(rows.find((item) => item.businessId === business.id) ?? null);
    } finally { setBusy(false); }
  }

  return <div className="marketing-page min-h-screen bg-[var(--bg-1)]"><MarketingHeader />
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href={business ? `/isletme/${slug}` : "/simdi-musait"} className="text-sm text-[var(--accent)]">← İşletmeye dön</Link>
      <div className="mt-7"><span className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]"><Ticket size={17} /> CANLI SIRA</span><h1 className="mt-2 text-3xl font-bold text-[var(--text-1)]">Sıraya Katıl</h1><p className="mt-2 text-[var(--text-2)]">Normal randevu almak istersen işletme sayfasındaki Randevu Al seçeneğini kullanabilirsin.</p></div>
      {loading || enabled === null ? <p className="mt-8" role="status">Canlı sıra kontrol ediliyor…</p> : !enabled || !eligible ?
        <div className="mt-8 rounded-2xl border border-[var(--border)] p-6">İşletme şu anda yeni canlı sıra müşterisi kabul etmiyor. <Link href="/simdi-musait" className="text-[var(--accent)]">Diğer işletmeleri gör</Link></div> : <>
        {active && <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950"><strong>Bu işletmede zaten aktif sıran var.</strong><Link className="mt-2 flex items-center gap-1 text-[var(--accent)]" href={`/siram?businessId=${encodeURIComponent(active.businessId)}&entryId=${encodeURIComponent(active.entryId)}`}>Sıramı gör <ArrowRight size={16} /></Link></div>}
        {!active && <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--accent)]">{step}/3 · {step === 1 ? "Hizmet seç" : step === 2 ? "Personel tercihi" : "Onayla"}</p>
          {step === 1 && <div className="mt-4 space-y-2">{services.map((service) => <button key={service.id} type="button" onClick={() => { setServiceId(service.id); setStaffId(""); setStep(2); }} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[var(--border)] p-3 text-left"><span>{service.name}</span><ArrowRight size={17} /></button>)}</div>}
          {step === 2 && <div className="mt-4 space-y-2">{waitLoading && <p role="status" className="text-sm text-[var(--text-3)]">Tahminler hesaplanıyor…</p>}<button type="button" className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[var(--border)] p-3 text-left" onClick={() => { setStaffId(""); setStep(3); }}><span>İlk müsait personel</span><small>{waitEstimateLabel(waitOptions?.firstAvailable ?? null)}</small></button>{eligibleStaff.map((person) => <button key={person.id} type="button" className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[var(--border)] p-3 text-left" onClick={() => { setStaffId(person.id); setStep(3); }}><span>{person.fullName}</span><small>{waitEstimateLabel(waitOptions?.byStaff[person.id] ?? null)}</small></button>)}</div>}
          {step === 3 && <div className="mt-4"><dl className="space-y-3 text-sm"><div><dt className="text-[var(--text-3)]">İşletme</dt><dd className="font-semibold">{business?.name}</dd></div><div><dt className="text-[var(--text-3)]">Hizmet</dt><dd className="font-semibold">{selectedService?.name}</dd></div><div><dt className="text-[var(--text-3)]">Personel</dt><dd className="font-semibold">{staffId ? staff.find((item) => item.id === staffId)?.fullName : "İlk müsait personel"}</dd></div></dl><div className="mt-5 rounded-xl border border-[var(--border)] p-4"><strong>{waitEstimateLabel(selectedWait)}</strong>{selectedWait?.peopleAhead !== null && selectedWait?.peopleAhead !== undefined && <p className="mt-1 text-sm">Önünde {selectedWait.peopleAhead} kişi var</p>}<small className="text-[var(--text-3)]">Tahmindir; kesin sıra saati değildir.</small></div><p className="mt-5 text-sm text-[var(--text-2)]">Katılım sırasında işletmenin güncel durumu yeniden doğrulanır.</p><button type="button" disabled={busy} onClick={submit} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle size={17} className="animate-spin" />} Sıraya katıl</button></div>}
          {step > 1 && <button type="button" disabled={busy} onClick={() => setStep((value) => value - 1)} className="mt-4 text-sm text-[var(--accent)]">Önceki adıma dön</button>}
        </section>}
      </>}
      {error && <p className="mt-4 rounded-xl border border-red-300 p-4 text-red-700" role="alert">{error}</p>}
    </main><MarketingFooter /></div>;
}
