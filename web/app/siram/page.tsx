"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { LoaderCircle, Ticket } from "lucide-react";
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
  return <div className="marketing-page min-h-screen bg-[var(--bg-1)]"><MarketingHeader />
    <main className="mx-auto max-w-2xl px-4 py-10"><Link href="/" className="text-sm text-[var(--accent)]">← Ana sayfa</Link>
      <h1 className="mt-7 flex items-center gap-3 text-3xl font-bold text-[var(--text-1)]"><Ticket size={29} aria-hidden="true" /> Sıram</h1>
      {authStatus === "unauthenticated" ? <div className="mt-8 rounded-2xl border border-[var(--border)] p-6">Sıranı görmek için <Link href={`/musteri/giris?next=${encodeURIComponent(signInNext)}`} className="text-[var(--accent)]">giriş yap</Link>.</div> :
        !loaded ? <p className="mt-8" role="status">Sıran yükleniyor…</p> :
        pointer && !entry ? <div className="mt-8 rounded-2xl border border-[var(--border)] p-6">{entryMissing ? "Bu sıra kaydı bulunamadı veya erişilemiyor." : error ? "Son durum bağlantı nedeniyle gösterilemiyor." : "Sıran yükleniyor…"}</div> :
        entry && copy ? <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
          <p className="text-sm font-semibold text-[var(--accent)]">CANLI SIRA</p><h2 className="mt-2 text-2xl font-bold text-[var(--text-1)]">{copy.title}</h2><p className="mt-2 text-[var(--text-2)]">{copy.detail}</p>
          <dl className="mt-6 space-y-3 border-t border-[var(--border)] pt-5 text-sm"><div><dt className="text-[var(--text-3)]">İşletme</dt><dd className="font-semibold">{businessName || "İşletme"}</dd></div><div><dt className="text-[var(--text-3)]">Hizmet</dt><dd className="font-semibold">{serviceName || "Hizmet"}</dd></div><div><dt className="text-[var(--text-3)]">Personel</dt><dd>{staffName || "İlk müsait personel"}</dd></div>{entry.joinedAt?.toDate && <div><dt className="text-[var(--text-3)]">Katılım</dt><dd>{entry.joinedAt.toDate().toLocaleString("tr-TR")}</dd></div>}</dl>
          {["waiting", "on_the_way"].includes(entry.status) && joinFeatureEnabled && <div className="mt-5 rounded-xl border border-[var(--border)] p-4"><strong>{waitEstimateLabel(wait)}</strong>{wait?.peopleAhead !== null && wait?.peopleAhead !== undefined && <p className="mt-1 text-sm">Önünde {wait.peopleAhead} kişi var</p>}<small className="text-[var(--text-3)]">Tahmin, son güncel bilgilere göre hesaplanır.</small></div>}
          {entry.status === "on_the_way" && <p className="mt-3 text-sm text-[var(--text-2)]">🚶 Yola çıktığını işletmeye bildirdik.{entry.declaredEtaMinutes ? ` Belirttiğin yaklaşık varış: ${entry.declaredEtaMinutes}${entry.declaredEtaMinutes === 20 ? "+" : ""} dk.` : ""}</p>}
          {["waiting", "on_the_way"].includes(entry.status) && joinFeatureEnabled && wait?.peopleAhead !== null && wait?.peopleAhead !== undefined && wait.peopleAhead <= 1 &&
            <div className="mt-4 rounded-xl border border-[var(--border)] p-4"><p className="font-semibold">Sıran yaklaşıyor. Hâlâ geliyor musun?</p>
              {entry.presenceConfirmedAt ? <p className="mt-2 text-sm text-[var(--accent)]">Geliyorum onayın işletmeye iletildi.</p> :
                <button disabled={busy} onClick={() => void action("confirm")} className="mt-3 min-h-11 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:opacity-60">✅ Geliyorum</button>}</div>}
          {entry.status === "called" && <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900" role="status">🔔 İşletme seni çağırdı.</p>}
          {entry.status === "waiting" && joinFeatureEnabled && <div className="mt-6"><label htmlFor="queue-eta" className="mb-2 block text-sm font-semibold">Yaklaşık ne kadar sürede oradasın? (isteğe bağlı)</label><select id="queue-eta" value={eta} onChange={(event) => setEta(event.target.value as typeof eta)} className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3"><option value="">Belirtmek istemiyorum</option><option value="5">5 dk</option><option value="10">10 dk</option><option value="15">15 dk</option><option value="20">20+ dk</option></select><button disabled={busy} onClick={() => action("way")} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle size={17} className="animate-spin" />} Yola Çıktım</button></div>}
          {canLeave && <button disabled={busy} onClick={() => action("leave")} className="mt-3 min-h-12 w-full rounded-xl border border-[var(--border)] px-4 font-semibold text-[var(--text-1)] disabled:opacity-60">Sıradan Ayrıl</button>}
        </section> : <div className="mt-8 rounded-2xl border border-[var(--border)] p-6">{error ? "Aktif sıra bilgisi şu anda yenilenemiyor." : "Aktif sıran bulunmuyor."} <Link href="/simdi-musait" className="text-[var(--accent)]">İşletmeleri keşfet</Link></div>}
      {choices.length > 1 && <div className="mt-4 flex flex-wrap gap-2">{choices.map((item, index) => <button key={item.entryId} className="min-h-11 rounded-xl border border-[var(--border)] px-4" onClick={() => { setEntry(null); setPointer(item); }}>Sıra {index + 1}</button>)}</div>}
      {error && <p className="mt-4 rounded-xl border border-amber-300 p-4 text-amber-900 dark:text-amber-200" role="alert">{error}</p>}
    </main><MarketingFooter /></div>;
}
