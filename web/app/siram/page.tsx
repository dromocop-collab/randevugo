"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, ArrowRight, BellRing, Clock3, Footprints, LoaderCircle, Sparkles, Ticket, UserRound } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { getDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { confirmLiveQueuePresence, getLiveQueueWaitEstimate, getMyActiveQueues, leaveLiveQueue, markLiveQueueOnTheWay, queueCustomerError, watchMyQueueEntry, type ActiveQueuePointer, type CustomerQueueEntry } from "@/features/live-queue/customer-queue-repository";
import { canCustomerLeaveQueue, customerQueueStatusCopy } from "@/features/live-queue/customer-queue-presentation";
import { waitEstimateLabel, type LiveWaitEstimate } from "@/features/live-queue/wait-estimate";

export default function MyQueuePage() {
  const { user, status: authStatus } = useAuth();
  const [pointer, setPointer] = useState<ActiveQueuePointer | null>(null);
  const [choices, setChoices] = useState<ActiveQueuePointer[]>([]);
  const [entry, setEntry] = useState<CustomerQueueEntry | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [staffName, setStaffName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinFeatureEnabled, setJoinFeatureEnabled] = useState(false);
  const [wait, setWait] = useState<LiveWaitEstimate | null>(null);
  const [eta, setEta] = useState<"" | "5" | "10" | "15" | "20">("");
  const [signInNext, setSignInNext] = useState("/siram");
  const [entryMissing, setEntryMissing] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const businessId = query.get("businessId");
    const entryId = query.get("entryId");
    if (businessId && entryId && /^[a-zA-Z0-9_-]{1,128}$/.test(businessId) && /^[a-zA-Z0-9_-]{1,128}$/.test(entryId))
      queueMicrotask(() => setSignInNext(`/siram?businessId=${encodeURIComponent(businessId)}&entryId=${encodeURIComponent(entryId)}`));
  }, []);

  useEffect(() => subscribeLiveFeatureAvailability((flags) =>
    setJoinFeatureEnabled(flags.isLiveAvailabilityEnabled && flags.isLiveQueueEnabled && flags.isLiveOperationsEnabled)), []);
  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    let cancelled = false;
    const query = new URLSearchParams(window.location.search);
    const businessId = query.get("businessId");
    const entryId = query.get("entryId");
    if (businessId && entryId && !businessId.includes("/") && !entryId.includes("/")) {
      queueMicrotask(() => { setPointer({ businessId, entryId, status: "waiting" }); setLoaded(true); });
    }
    getMyActiveQueues().then((rows) => {
      if (cancelled) return;
      setChoices(rows);
      if (!businessId || !entryId) setPointer(rows[0] ?? null);
      setLoaded(true);
    }).catch(() => { if (!cancelled) { setError("Bağlantı kurulamadı. Son durum yenilenemiyor."); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [authStatus, user]);
  useEffect(() => {
    if (!pointer || !user) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setEntryMissing(false); });
    const unsubscribe = watchMyQueueEntry(pointer.businessId, pointer.entryId, (row) => {
      if (cancelled) return;
      if (row?.customerId !== user.uid) { setEntryMissing(true); setError("Sıra kaydına erişilemiyor."); return; }
      setEntryMissing(false);
      setEntry(row); setError("");
      getDoc(doc(getDb(), "businesses", pointer.businessId)).then((snap) => {
        if (!cancelled) setBusinessName(String(snap.data()?.name ?? "İşletme"));
      }).catch(() => undefined);
      getDoc(doc(getDb(), "businesses", pointer.businessId, "services", row.serviceId)).then((snap) => {
        if (!cancelled) setServiceName(String(snap.data()?.name ?? "Hizmet"));
      }).catch(() => undefined);
      const staffId = row.assignedStaffId ?? row.requestedStaffId;
      if (staffId) getDoc(doc(getDb(), "businesses", pointer.businessId, "staff", staffId)).then((snap) => {
        if (!cancelled) setStaffName(String(snap.data()?.fullName ?? "Personel"));
      }).catch(() => undefined);
      else setStaffName("İlk müsait personel");
    }, () => { if (!cancelled) setError("Bağlantı kurulamadı. Son durum yenilenemiyor."); });
    return () => { cancelled = true; unsubscribe(); };
  }, [pointer, user]);

  useEffect(() => {
    if (!pointer || !entry || !joinFeatureEnabled || !["waiting", "on_the_way"].includes(entry.status)) {
      queueMicrotask(() => setWait(null)); return;
    }
    let cancelled = false;
    const refresh = () => { if (!cancelled) setWait(null); return getLiveQueueWaitEstimate({ businessId: pointer.businessId, serviceId: entry.serviceId,
      entryId: pointer.entryId }).then((value) => { if (!cancelled) setWait(value); })
      .catch(() => { if (!cancelled) setWait(null); }); };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 120_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [pointer, entry, joinFeatureEnabled]);

  async function action(kind: "leave" | "way" | "confirm") {
    if (!pointer || busy) return;
    if (kind === "leave" && !window.confirm("Sıradan ayrılmak istediğinden emin misin?")) return;
    setBusy(true); setError("");
    try {
      if (kind === "leave") await leaveLiveQueue(pointer.businessId, pointer.entryId);
      else if (kind === "way") await markLiveQueueOnTheWay(pointer.businessId, pointer.entryId,
        eta ? Number(eta) as 5 | 10 | 15 | 20 : null);
      else await confirmLiveQueuePresence(pointer.businessId, pointer.entryId);
    } catch (cause) { setError(queueCustomerError(cause)); }
    finally { setBusy(false); }
  }

  const copy = entry ? customerQueueStatusCopy[entry.status] : null;
  const canLeave = entry ? canCustomerLeaveQueue(entry.status) : false;
  const activeStep = entry?.status === "waiting" ? 0 : entry?.status === "on_the_way" ? 1 : entry?.status === "called" ? 2 : entry?.status === "in_service" ? 3 : -1;
  return <div className="marketing-page live-discovery-page my-queue-page"><MarketingHeader />
    <main className="live-discovery-main">
      <nav className="live-breadcrumb" aria-label="Sayfa konumu"><Link href="/"><ArrowLeft size={15} /> Ana sayfa</Link><span>/</span><span>Sıram</span></nav>
      <header className="my-queue-hero"><div><span className="live-eyebrow"><Ticket size={15} /> CANLI SIRA TAKİBİ</span><h1>Sıran, <em>seninle.</em></h1><p>İşletmeden gelecek güncel durumu ve sıranla ilgili işlemleri burada takip edebilirsin.</p></div><span className="my-queue-hero__mark" aria-hidden="true"><Ticket size={54} strokeWidth={1.25} /></span></header>

      {authStatus === "unauthenticated" ? <div className="live-state-card"><span className="live-state-card__icon"><Ticket size={28} /></span><h2>Sıranı görmek için giriş yap</h2><p>Aktif sıran hesabınla eşleşir; giriş yaptıktan sonra kaldığın yerden takip edebilirsin.</p><Link href={`/musteri/giris?next=${encodeURIComponent(signInNext)}`} className="live-state-card__action">Giriş yap <ArrowRight size={17} /></Link></div> :
        !loaded ? <div className="live-state-card" role="status"><span className="live-state-card__icon"><LoaderCircle size={28} className="animate-spin" /></span><h2>Sıran yükleniyor</h2><p>Son durumunu kontrol ediyoruz.</p></div> :
        pointer && !entry ? <div className="live-state-card" role="status"><span className="live-state-card__icon"><LoaderCircle size={28} className={!entryMissing && !error ? "animate-spin" : ""} /></span><h2>{entryMissing ? "Sıra kaydına erişilemiyor" : error ? "Son durum yenilenemedi" : "Sıran yükleniyor"}</h2><p>{entryMissing ? "Bu sıra kaydı bulunamadı veya hesabına ait değil." : error ? "Bağlantıyı kontrol edip sayfayı yeniden deneyebilirsin." : "İşletmeden gelen güncel bilgiyi bekliyoruz."}</p></div> :
        entry && copy ? <div className="my-queue-layout"><section className="my-queue-status-card" aria-labelledby="my-queue-status-title">
          <div className="my-queue-status-card__head"><span className="live-section-kicker"><span /> CANLI SIRA DURUMUN</span><span className="my-queue-status-card__ticket"><Ticket size={21} /></span></div>
          <div className="my-queue-status-card__title"><span className="my-queue-status-card__icon">{entry.status === "called" ? <BellRing size={27} /> : entry.status === "on_the_way" ? <Footprints size={27} /> : <Ticket size={27} />}</span><div><h2 id="my-queue-status-title">{copy.title}</h2><p>{copy.detail}</p></div></div>
          {activeStep >= 0 && <div className="my-queue-progress" aria-label="Sıra aşaması">{["Sırada", "Yolda", "Çağrıldı", "İşlemde"].map((label, index) => <span key={label} className={index <= activeStep ? "is-current" : ""}><i>{index < activeStep ? "✓" : index + 1}</i>{label}</span>)}</div>}
          {["waiting", "on_the_way"].includes(entry.status) && joinFeatureEnabled && <div className="my-queue-wait"><Clock3 size={21} /><div><small>GÜNCEL BEKLEME</small><strong>{waitEstimateLabel(wait)}</strong>{wait?.peopleAhead !== null && wait?.peopleAhead !== undefined && <p>Önünde {wait.peopleAhead} kişi var</p>}<span>Tahmin, işletmenin son durumuna göre değişebilir.</span></div></div>}
          {entry.status === "on_the_way" && <p className="my-queue-note"><Footprints size={18} /> Yola çıktığını işletmeye bildirdik.{entry.declaredEtaMinutes ? ` Belirttiğin yaklaşık varış: ${entry.declaredEtaMinutes}${entry.declaredEtaMinutes === 20 ? "+" : ""} dk.` : ""}</p>}
          {["waiting", "on_the_way"].includes(entry.status) && joinFeatureEnabled && wait?.peopleAhead !== null && wait?.peopleAhead !== undefined && wait.peopleAhead <= 1 &&
            <div className="my-queue-confirm"><strong>Sıran yaklaşıyor. Hâlâ geliyor musun?</strong>{entry.presenceConfirmedAt ? <p>Geliyorum onayın işletmeye iletildi.</p> : <button disabled={busy} onClick={() => void action("confirm")}>Geliyorum <ArrowRight size={17} /></button>}</div>}
          {entry.status === "called" && <p className="my-queue-called" role="status"><BellRing size={19} /> İşletme seni çağırdı. Hazırsan işletmeye geç.</p>}
          {entry.status === "waiting" && joinFeatureEnabled && <div className="my-queue-actions"><label htmlFor="queue-eta">Yaklaşık ne kadar sürede oradasın? <small>İsteğe bağlı</small></label><select id="queue-eta" value={eta} onChange={(event) => setEta(event.target.value as typeof eta)}><option value="">Belirtmek istemiyorum</option><option value="5">5 dk</option><option value="10">10 dk</option><option value="15">15 dk</option><option value="20">20+ dk</option></select><button disabled={busy} onClick={() => action("way")} className="my-queue-primary">{busy ? <LoaderCircle size={18} className="animate-spin" /> : <Footprints size={18} />} Yola Çıktım <ArrowRight size={17} /></button></div>}
          {canLeave && <button disabled={busy} onClick={() => action("leave")} className="my-queue-leave">Sıradan Ayrıl</button>}
        </section><aside className="my-queue-info"><span className="my-queue-info__eyebrow">SIRA BİLGİLERİN</span><h3>{businessName || "İşletme"}</h3><dl><div><dt><Sparkles size={16} /> Hizmet</dt><dd>{serviceName || "Hizmet"}</dd></div><div><dt><UserRound size={16} /> Personel</dt><dd>{staffName || "İlk müsait personel"}</dd></div>{entry.joinedAt?.toDate && <div><dt><Clock3 size={16} /> Katılım</dt><dd>{entry.joinedAt.toDate().toLocaleString("tr-TR")}</dd></div>}</dl><p>Canlı sıra kaydın normal randevularından ayrıdır.</p><Link href="/simdi-musait">Şimdi Müsait&apos;e dön <ArrowRight size={15} /></Link></aside></div> :
        <div className="live-state-card"><span className="live-state-card__icon"><Ticket size={28} /></span><h2>{error ? "Sıra bilgisi yenilenemedi" : "Şu anda aktif sıran yok"}</h2><p>{error ? "Bağlantın düzeldiğinde son durumunu yeniden kontrol edebilirsin." : "Canlı sıraya açık işletmeleri keşfedip uygun hizmet için sıraya katılabilirsin."}</p><Link href="/simdi-musait" className="live-state-card__action">İşletmeleri keşfet <ArrowRight size={17} /></Link></div>}
      {choices.length > 1 && <div className="my-queue-choices" aria-label="Aktif sıraların">{choices.map((item, index) => <button key={item.entryId} className={pointer?.entryId === item.entryId ? "is-active" : ""} onClick={() => { setEntry(null); setPointer(item); }}>Sıra {index + 1}</button>)}</div>}
      {error && <p className="my-queue-error" role="alert">{error}</p>}
    </main><MarketingFooter /></div>;
}
