"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/layout/theme-provider";
import { logout } from "@/features/auth/auth-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/ui/states";

interface SimpleAppointment {
  id: string;
  businessId: string;
  businessName: string;
  serviceName: string;
  staffName: string;
  startAt: string;
  status: string;
  publicToken?: string;
}

export default function CustomerAccountPage() {
  const { user, status: authStatus } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [appointments, setAppointments] = useState<SimpleAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;

    const db = getDb();
    const customerId = user.uid;

    getDocs(
      query(
        collectionGroup(db, "appointments"),
        where("customerId", "==", customerId),
        orderBy("startAt", "desc"),
        limit(50)
      )
    )
      .then(async (snap) => {
        const rows: SimpleAppointment[] = [];

        for (const docSnap of snap.docs) {
          const d = docSnap.data();
          const businessId = String(d.businessId ?? "");

          let businessName = "İşletme";
          try {
            const bSnap = await getDoc(doc(db, "businesses", businessId));
            if (bSnap.exists()) {
              businessName = String(bSnap.data().name ?? "İşletme");
            }
          } catch {
            // use default
          }

          rows.push({
            id: docSnap.id,
            businessId,
            businessName,
            serviceName: String(d.serviceName ?? "—"),
            staffName: String(d.staffName ?? "—"),
            startAt: d.startAt?.toDate?.()
              ? d.startAt.toDate().toISOString()
              : String(d.startAt ?? ""),
            status: String(d.status ?? "pending"),
            publicToken: d.publicToken ? String(d.publicToken) : undefined,
          });
        }

        setAppointments(rows);
      })
      .catch(() => {
        setAppointments([]);
      })
      .finally(() => setLoading(false));
  }, [authStatus, user]);

  if (authStatus === "loading") {
    return <LoadingState title="Yükleniyor" description="Hesabınız kontrol ediliyor..." />;
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Bekliyor", color: "bg-amber-100 text-amber-700" },
    confirmed: { label: "Onaylandı", color: "bg-emerald-100 text-emerald-700" },
    completed: { label: "Tamamlandı", color: "bg-sky-100 text-sky-700" },
    cancelled: { label: "İptal", color: "bg-rose-100 text-rose-700" },
    no_show: { label: "Gelmedi", color: "bg-gray-100 text-gray-700" },
  };

  const upcoming = appointments.filter(
    (a) =>
      (a.status === "confirmed" || a.status === "pending") &&
      new Date(a.startAt) > new Date()
  );
  const past = appointments.filter(
    (a) =>
      a.status === "completed" ||
      a.status === "cancelled" ||
      a.status === "no_show" ||
      (a.status === "confirmed" && new Date(a.startAt) <= new Date())
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SeninRandevun" width={28} height={28} className="rounded-lg" />
            <span className="text-sm font-bold text-[var(--text-1)]">
              SeninRandevun
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 text-sm"
              title="Tema değiştir"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <span className="hidden text-xs text-[var(--text-3)] sm:inline">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              onClick={async () => {
                await logout();
                router.push("/giris");
              }}
            >
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-20 pt-6">
        {/* Profile */}
        <Card title="Hesabım" description={user?.email ?? ""}>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))]">
              <span className="text-xl font-bold text-white">
                {(user?.displayName ?? user?.email ?? "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-1)]">
                {user?.displayName ?? "Kullanıcı"}
              </p>
              <p className="text-sm text-[var(--text-3)]">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Upcoming */}
        <Card
          title="Yaklaşan Randevular"
          description={`${upcoming.length} aktif randevu`}
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              title="Yaklaşan randevu yok"
              description="Yeni randevu almak için işletme keşfedin."
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((apt) => {
                const info = statusLabels[apt.status] ?? { label: apt.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <div
                    key={apt.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
                  >
                    <div>
                      <p className="font-medium text-[var(--text-1)]">
                        {apt.businessName}
                      </p>
                      <p className="text-xs text-[var(--text-3)]">
                        {apt.serviceName} · {apt.staffName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-3)]">
                        {new Date(apt.startAt).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        {new Date(apt.startAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${info.color}`}>
                        {info.label}
                      </span>
                      {apt.publicToken && (
                        <Link
                          href={`/randevu/${apt.publicToken}`}
                          className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--accent)] hover:bg-[var(--surface-2)]"
                        >
                          Detay
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Past */}
        <Card
          title="Geçmiş Randevular"
          description={`${past.length} tamamlanmış veya iptal randevu`}
        >
          {loading ? (
            <div className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />
          ) : past.length === 0 ? (
            <EmptyState
              title="Geçmiş randevu yok"
              description="Tamamlanan randevularınız burada listelenecek."
            />
          ) : (
            <div className="space-y-2">
              {past.slice(0, 10).map((apt) => {
                const info = statusLabels[apt.status] ?? { label: apt.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-1)]">
                        {apt.businessName} — {apt.serviceName}
                      </p>
                      <p className="text-xs text-[var(--text-3)]">
                        {new Date(apt.startAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${info.color}`}>
                      {info.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
