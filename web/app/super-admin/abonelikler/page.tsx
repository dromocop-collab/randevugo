"use client";

import { Card } from "@/components/ui/card";
import { PLAN_PRICE, PLAN_LABEL, PLAN_FEATURES, PLAN_FEATURE_LIST } from "@/constants/plans";

export default function SuperAdminSubscriptionsPage() {
  const f = PLAN_FEATURES;

  return (
    <div className="space-y-5">
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
