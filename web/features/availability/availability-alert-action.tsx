"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { createAvailabilityAlert } from "./availability-repository";

function minute(value: string) {
  const [hour, minutes] = value.split(":").map(Number);
  return hour * 60 + minutes;
}

export function AvailabilityAlertAction({ businessId, serviceId, staffId, dateKey, businessEnabled }: {
  businessId: string; serviceId: string; staffId: string | null; dateKey: string; businessEnabled: boolean;
}) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("19:00");
  const [busy, setBusy] = useState(false);
  const [doneScope, setDoneScope] = useState<string | null>(null);
  const scope = JSON.stringify([businessId, serviceId, staffId, dateKey]);
  const done = doneScope === scope;
  useEffect(() => subscribeLiveFeatureAvailability((flags) => setEnabled(flags.isAvailabilityAlertsEnabled)), []);
  if (!enabled || !businessEnabled || !serviceId) return null;

  async function subscribe() {
    if (!user || busy) return;
    if (minute(start) >= minute(end)) { toast.error("Saat aralığını kontrol edin."); return; }
    setBusy(true);
    try {
      const result = await createAvailabilityAlert({ businessId, serviceId, staffId, dateKey,
        startMinute: minute(start), endMinute: minute(end) });
      setDoneScope(scope);
      toast.success(result.alreadyExists ? "Bu bildirim zaten açık." : "Müsaitlik bildirimi açıldı.");
    } catch {
      toast.error("Bildirim oluşturulamadı. Tarih ve işletme ayarlarını kontrol edin.");
    } finally { setBusy(false); }
  }

  return <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4" aria-label="Müsaitlik bildirimi">
    <div className="flex items-start gap-3"><BellRing size={20} aria-hidden="true" className="text-[var(--accent)]" />
      <div><h3 className="font-semibold text-[var(--text-1)]">Müsait Olunca Haber Ver</h3>
        <p className="text-xs text-[var(--text-3)]">{dateKey} için istediğin saat aralığı açılırsa haber verelim. Bildirim rezervasyon yapmaz. iOS uygulamasında izin verdiysen telefonuna iletilir; durumunu Hesabım’da da görebilirsin.</p></div></div>
    <div className="mt-3 flex flex-wrap items-end gap-3 text-sm text-[var(--text-2)]">
      <label>Başlangıç<input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--field-bg)] p-2" /></label>
      <label>Bitiş<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--field-bg)] p-2" /></label>
      {user ? <button type="button" disabled={busy || done} onClick={() => void subscribe()}
        className="min-h-11 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:opacity-60">
        {busy ? "Kaydediliyor…" : done ? "Bildirim açık" : "Bana haber ver"}</button>
        : <Link href="/musteri/giris" className="rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-white">Giriş yap ve bildirimi aç</Link>}
    </div>
  </section>;
}
