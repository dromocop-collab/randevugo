"use client";

import { useEffect, useState } from "react";
import { collection, collectionGroup, getDocs, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { PLAN_PRICE } from "@/constants/plans";

interface PlatformStats {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  pendingBusinesses: number;
  trialingBusinesses: number;
  subscribedBusinesses: number;
  totalUsers: number;
  totalAppointments: number;
  estimatedMRR: number;
  estimatedARR: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();

    Promise.allSettled([
      getDocs(collection(db, "businesses")),
      getDocs(collection(db, "users")),
      getDocs(
        query(
          collectionGroup(db, "appointments"),
          where("status", "in", ["pending", "confirmed", "completed", "cancelled", "no_show"])
        )
      ),
      getDocs(collection(db, "subscriptions")),
    ])
      .then(([businessesResult, usersResult, appointmentsResult, subscriptionsResult]) => {
        const businesses =
          businessesResult.status === "fulfilled"
            ? businessesResult.value.docs
            : [];

        const usersCount =
          usersResult.status === "fulfilled" ? usersResult.value.size : 0;
        const appointmentsCount =
          appointmentsResult.status === "fulfilled"
            ? appointmentsResult.value.size
            : 0;

        const subscriptions =
          subscriptionsResult.status === "fulfilled"
            ? subscriptionsResult.value.docs
            : [];

        let active = 0;
        let suspended = 0;
        let pending = 0;

        businesses.forEach((doc) => {
          const data = doc.data();
          const status = String(data.status ?? "active");
          if (status === "active" && !data.isSuspended) active++;
          else if (data.isSuspended || status === "suspended") suspended++;
          else if (status === "pending_review") pending++;
        });

        let trialing = 0;
        let subscribed = 0;

        subscriptions.forEach((doc) => {
          const data = doc.data();
          const subStatus = String(data.status ?? "");
          if (subStatus === "trialing") trialing++;
          else if (subStatus === "active") subscribed++;
        });

        const monthlyEquivalent = PLAN_PRICE.yearly / 12;
        const mrr = subscribed * monthlyEquivalent;
        const arr = subscribed * PLAN_PRICE.yearly;

        setStats({
          totalBusinesses: businesses.length,
          activeBusinesses: active,
          suspendedBusinesses: suspended,
          pendingBusinesses: pending,
          trialingBusinesses: trialing,
          subscribedBusinesses: subscribed,
          totalUsers: usersCount,
          totalAppointments: appointmentsCount,
          estimatedMRR: Math.round(mrr),
          estimatedARR: arr,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]"
          />
        ))}
      </div>
    );
  }

  const metrics = [
    { label: "Toplam İşletme", value: stats.totalBusinesses, color: "text-[var(--text-1)]" },
    { label: "Aktif İşletme", value: stats.activeBusinesses, color: "text-emerald-600" },
    { label: "Askıda", value: stats.suspendedBusinesses, color: "text-rose-600" },
    { label: "Onay Bekliyor", value: stats.pendingBusinesses, color: "text-amber-600" },
    { label: "Toplam Kullanıcı", value: stats.totalUsers, color: "text-[var(--text-1)]" },
    { label: "Toplam Randevu", value: stats.totalAppointments, color: "text-[var(--text-1)]" },
  ];

  const revenueMetrics = [
    { label: "Trial İşletme", value: stats.trialingBusinesses, color: "text-amber-500" },
    { label: "Aktif Abonelik", value: stats.subscribedBusinesses, color: "text-emerald-600" },
    {
      label: "Tahmini MRR",
      value: `${stats.estimatedMRR.toLocaleString("tr-TR")} ₺`,
      color: "text-sky-600",
    },
    {
      label: "Tahmini ARR",
      value: `${stats.estimatedARR.toLocaleString("tr-TR")} ₺`,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="admin-dashboard space-y-5">
      <section className="admin-health-strip">
        <div>
          <span className="admin-live-dot" /> Sistem durumu
          <strong>Tüm ana servisler çalışıyor</strong>
        </div>
        <p>{stats.activeBusinesses.toLocaleString("tr-TR")} aktif işletme · {stats.totalAppointments.toLocaleString("tr-TR")} randevu</p>
      </section>
      <Card title="Platform Metrikleri" description="Genel platform durumu">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="admin-metric rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
            >
              <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">
                {m.label}
              </p>
              <p className={`mt-2 text-2xl font-bold ${m.color}`}>
                {typeof m.value === "number" ? m.value.toLocaleString("tr-TR") : m.value}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Gelir & Abonelik" description="Tek plan gelir analizi ve abonelik durumu">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {revenueMetrics.map((m) => (
            <div
              key={m.label}
              className="admin-metric rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
            >
              <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">
                {m.label}
              </p>
              <p className={`mt-2 text-2xl font-bold ${m.color}`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
