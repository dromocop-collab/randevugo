"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLAN_PRICE, PLAN_LABEL, PLAN_FEATURES, PLAN_FEATURE_LIST } from "@/constants/plans";
import { listPlatformPlans, removePlatformPlan, savePlatformPlan, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";

export default function SuperAdminSubscriptionsPage() {
  const f = PLAN_FEATURES;
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [editing, setEditing] = useState<PlatformPlan>({ id: "RANDEVUGO", label: PLAN_LABEL, yearlyPrice: PLAN_PRICE.yearly, trialDays: PLAN_PRICE.trialDays, maxStores: 3, maxStaff: 250, isActive: true, features: [...PLAN_FEATURE_LIST] });
  const [busy, setBusy] = useState(false);

  async function reload() { setPlans(await listPlatformPlans()); }
  useEffect(() => {
    let cancelled = false;
    listPlatformPlans()
      .then((rows) => { if (!cancelled) setPlans(rows); })
      .catch(() => toast.error("Paketler yüklenemedi."));
    return () => { cancelled = true; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await savePlatformPlan(editing); await reload(); toast.success("Paket kaydedildi."); }
    catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <Card title="Dinamik Paket Yönetimi" description="Paketleri oluştur, fiyat ve mağaza/ekip limitlerini yönet">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Paket kodu" value={editing.id} onChange={(event) => setEditing({ ...editing, id: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} required />
              <Input label="Görünen ad" value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} required />
              <Input label="Yıllık fiyat (₺)" type="number" value={editing.yearlyPrice} onChange={(event) => setEditing({ ...editing, yearlyPrice: Number(event.target.value) })} min={0} />
              <Input label="Deneme günü" type="number" value={editing.trialDays} onChange={(event) => setEditing({ ...editing, trialDays: Number(event.target.value) })} min={0} />
              <Input label="Maks. mağaza" type="number" value={editing.maxStores} onChange={(event) => setEditing({ ...editing, maxStores: Number(event.target.value) })} min={1} max={3} />
              <Input label="Maks. çalışan" type="number" value={editing.maxStaff} onChange={(event) => setEditing({ ...editing, maxStaff: Number(event.target.value) })} min={1} />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]"><input type="checkbox" checked={editing.isActive} onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })} /> Satışa ve atamaya açık</label>
            <Button type="submit" disabled={busy || !editing.id || !editing.label}>{busy ? "Kaydediliyor…" : "Paketi kaydet"}</Button>
          </form>
          <div className="space-y-3">
            {plans.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-3)]">Henüz dinamik paket yok. Varsayılan paketi kaydederek başla.</p> : plans.map((plan) => <article key={plan.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[var(--text-1)]">{plan.label} <small className="text-[var(--text-3)]">{plan.id}</small></p><p className="text-sm text-[var(--text-2)]">{plan.yearlyPrice.toLocaleString("tr-TR")} ₺/yıl · {plan.trialDays} gün deneme</p><p className="mt-1 text-xs text-[var(--text-3)]">En fazla {plan.maxStores} mağaza · {plan.maxStaff} çalışan</p></div><span className={`rounded-full px-2 py-1 text-xs ${plan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{plan.isActive ? "Aktif" : "Kapalı"}</span></div>
              <div className="mt-3 flex gap-2"><Button variant="secondary" className="text-xs" onClick={() => setEditing(plan)}>Düzenle</Button><Button variant="danger" className="text-xs" onClick={async () => { if (!confirm(`${plan.label} paketi silinsin mi?`)) return; await removePlatformPlan(plan.id); await reload(); }}>Sil</Button></div>
            </article>)}
          </div>
        </div>
      </Card>
      <Card title="Abonelik Planı" description="Tek paket. Tüm özellikler.">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--text-1)]">
                {PLAN_LABEL}
              </h3>
              <div className="text-right">
                <span className="text-2xl font-bold text-[var(--accent)]">
                  {PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺
                </span>
                <span className="text-sm text-[var(--text-3)]"> / yıl</span>
                <p className="text-xs text-[var(--text-3)]">
                  Ayda yaklaşık {PLAN_PRICE.monthlyEquivalent} ₺
                </p>
              </div>
            </div>

            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {PLAN_PRICE.trialDays} gün ücretsiz deneme
            </div>

            <ul className="mt-5 space-y-2 text-sm">
              <FeatureRow label="Maks. Çalışan" value={f.maxStaff === -1 ? "Sınırsız" : String(f.maxStaff)} />
              <FeatureRow label="Maks. Şube" value={f.maxBranches === -1 ? "Sınırsız" : String(f.maxBranches)} />
              <FeatureRow
                label="Aylık Randevu"
                value={f.maxAppointmentsPerMonth === -1 ? "Sınırsız" : String(f.maxAppointmentsPerMonth)}
              />
              <FeatureRow label="Kapora" value={f.canUseDeposits} />
              <FeatureRow label="Gelişmiş Analiz" value={f.canUseAdvancedAnalytics} />
              <FeatureRow label="Çoklu Şube" value={f.canUseMultiBranch} />
              <FeatureRow label="API Erişimi" value={f.canUseApi} />
              <FeatureRow label="CRM" value={f.canUseCRM} />
              <FeatureRow label="Branding" value={f.canUseBranding} />
              <FeatureRow label="Bildirimler" value={f.canUseNotifications} />
              <FeatureRow label="Raporlama" value={f.canUseReports} />
              <FeatureRow label="Yorum Sistemi" value={f.canUseReviews} />
              <FeatureRow label="QR Kodu" value={f.canUseQR} />
            </ul>
          </div>

          <Card title="Özellik Listesi" description="Abonelere sunulan özellikler" className="mt-5">
            <ul className="grid grid-cols-2 gap-2 text-sm text-[var(--text-2)]">
              {PLAN_FEATURE_LIST.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Card>
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: string | boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-[var(--text-3)]">{label}</span>
      {typeof value === "boolean" ? (
        <span className={value ? "text-emerald-600" : "text-rose-400"}>
          {value ? "✓" : "✗"}
        </span>
      ) : (
        <span className="font-medium text-[var(--text-1)]">{value}</span>
      )}
    </li>
  );
}
