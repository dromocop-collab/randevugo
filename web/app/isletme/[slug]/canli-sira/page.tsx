"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Clock3, LoaderCircle, ShieldCheck, Sparkles, Ticket, UserRound, UsersRound } from "lucide-react";
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
      setServices(serviceRows.filter((item) => item.isBookableOnline && Number.isFinite(item.durationMinutes) && item.durationMinutes >= 5 && item.durationMinutes <= 480 &&
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

  return <div className="marketing-page live-join-page"><MarketingHeader />
    <main className="live-join-main">
      <Link href={business ? `/isletme/${slug}` : "/simdi-musait"} className="live-join-back"><ArrowLeft size={16} /> İşletmeye dön</Link>
      <header className="live-join-hero">
        <div><span className="live-join-eyebrow"><Ticket size={16} /> CANLI SIRA</span><h1>Sıraya <em>katıl.</em></h1><p>Hizmetini ve personel tercihini seç. Sıranı buradan kolayca takip et.</p></div>
        <span className="live-join-hero__icon" aria-hidden="true"><Sparkles size={44} /></span>
      </header>
      {loading || enabled === null ? <div className="live-join-state" role="status"><LoaderCircle size={20} className="animate-spin" /> Canlı sıra kontrol ediliyor…</div> : !enabled || !eligible ?
        <div className="live-join-state">İşletme şu anda yeni canlı sıra müşterisi kabul etmiyor. <Link href="/simdi-musait">Diğer işletmeleri gör <ArrowRight size={16} /></Link></div> : <>
        {active && <div className="live-join-active"><Ticket size={22} /><div><strong>Bu işletmede zaten aktif sıran var.</strong><Link href={`/siram?businessId=${encodeURIComponent(active.businessId)}&entryId=${encodeURIComponent(active.entryId)}`}>Sıramı gör <ArrowRight size={16} /></Link></div></div>}
        {!active && <section className="live-join-panel" aria-label="Canlı sıraya katılma adımları">
          <div className="live-join-progress" aria-label={`Adım ${step} / 3`}>
            {["Hizmet", "Personel", "Onay"].map((label, index) => <div key={label} className={`live-join-progress__step ${step === index + 1 ? "is-current" : ""} ${step > index + 1 ? "is-done" : ""}`} aria-current={step === index + 1 ? "step" : undefined}><span>{step > index + 1 ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></div>)}
          </div>
          <div className="live-join-panel__body">
            <div className="live-join-heading"><span>ADIM {String(step).padStart(2, "0")} / 03</span><h2>{step === 1 ? "Hangi hizmeti almak istersin?" : step === 2 ? "Personel tercihin var mı?" : "Sıran için her şey hazır."}</h2><p>{step === 1 ? "Canlı sıraya uygun hizmetlerden birini seç." : step === 2 ? "İlk müsait personeli veya tercih ettiğin uzmanı seç." : "Bilgileri kontrol edip sıraya katılabilirsin."}</p></div>
            {step === 1 && <div className="live-join-options">{services.map((service) => <button key={service.id} type="button" onClick={() => { setServiceId(service.id); setStaffId(""); setStep(2); }} className="live-join-option"><span className="live-join-option__icon"><BriefcaseBusiness size={20} /></span><span className="live-join-option__copy"><strong>{service.name}</strong><small>{service.durationMinutes} dk · Canlı sıra</small></span><ArrowRight size={19} /></button>)}</div>}
            {step === 2 && <div className="live-join-options">{waitLoading && <p role="status" className="live-join-loading"><LoaderCircle size={15} className="animate-spin" /> Tahminler hesaplanıyor…</p>}<button type="button" className="live-join-option" onClick={() => { setStaffId(""); setStep(3); }}><span className="live-join-option__icon"><UsersRound size={20} /></span><span className="live-join-option__copy"><strong>İlk müsait personel</strong><small>{waitEstimateLabel(waitOptions?.firstAvailable ?? null)}</small></span><ArrowRight size={19} /></button>{eligibleStaff.map((person) => <button key={person.id} type="button" className="live-join-option" onClick={() => { setStaffId(person.id); setStep(3); }}><span className="live-join-option__icon"><UserRound size={20} /></span><span className="live-join-option__copy"><strong>{person.fullName}</strong><small>{waitEstimateLabel(waitOptions?.byStaff[person.id] ?? null)}</small></span><ArrowRight size={19} /></button>)}</div>}
            {step === 3 && <div className="live-join-review"><dl className="live-join-summary"><div><dt><BriefcaseBusiness size={17} /> İşletme</dt><dd>{business?.name}</dd></div><div><dt><Sparkles size={17} /> Hizmet</dt><dd>{selectedService?.name}</dd></div><div><dt><UserRound size={17} /> Personel</dt><dd>{staffId ? staff.find((item) => item.id === staffId)?.fullName : "İlk müsait personel"}</dd></div></dl><div className="live-join-wait"><span className="live-join-wait__icon"><Clock3 size={22} /></span><div><small>GÜNCEL BEKLEME</small><strong>{waitEstimateLabel(selectedWait)}</strong>{selectedWait?.peopleAhead !== null && selectedWait?.peopleAhead !== undefined && <p>Önünde {selectedWait.peopleAhead} kişi var</p>}<span>Tahmindir; kesin sıra saati değildir.</span></div></div><p className="live-join-assurance"><ShieldCheck size={17} /> Katılım sırasında işletmenin güncel durumu yeniden doğrulanır.</p><button type="button" disabled={busy} onClick={submit} className="live-join-submit">{busy ? <LoaderCircle size={18} className="animate-spin" /> : <Ticket size={18} />} Sıraya katıl <ArrowRight size={18} /></button></div>}
            {step > 1 && <button type="button" disabled={busy} onClick={() => setStep((value) => value - 1)} className="live-join-previous"><ArrowLeft size={16} /> Önceki adıma dön</button>}
          </div>
        </section>}
      </>}
      {error && <p className="live-join-error" role="alert">{error}</p>}
      <p className="live-join-footer-note">İleri tarihli randevu almak istersen <Link href={business ? `/isletme/${slug}` : "/kesfet"}>işletme sayfasından Randevu Al</Link> seçeneğini kullanabilirsin.</p>
    </main><MarketingFooter /></div>;
}
