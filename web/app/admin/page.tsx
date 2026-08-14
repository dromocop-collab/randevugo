"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

interface AdminStats {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  totalUsers: number;
  totalAppointments: number;
}

interface BusinessAdminItem {
  id: string;
  name: string;
  ownerUid: string;
  isSuspended: boolean;
  createdAt?: string;
}

const PRIMARY_ADMIN_EMAIL = "cihatwin@gmail.com";

export default function AdminPage() {
  const { user, status } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [businesses, setBusinesses] = useState<BusinessAdminItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended">("all");
  const isPrimaryAdmin = user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL;

  async function refreshAdminData() {
    const db = getDb();
    setLoading(true);

    const [businessesResult, usersResult, appointmentsResult] = await Promise.allSettled([
      getDocs(collection(db, "businesses")),
      getDocs(collection(db, "users")),
      getDocs(
        query(
          collectionGroup(db, "appointments"),
          where("status", "in", ["pending", "confirmed", "completed", "cancelled", "no_show"])
        )
      ),
    ]);

    if (businessesResult.status !== "fulfilled") {
      setLoading(false);
      throw businessesResult.reason;
    }

    const businessesSnap = businessesResult.value;
    const usersCount = usersResult.status === "fulfilled" ? usersResult.value.size : 0;
    const appointmentsCount = appointmentsResult.status === "fulfilled" ? appointmentsResult.value.size : 0;

    const mappedBusinesses: BusinessAdminItem[] = businessesSnap.docs.map((item) => {
      const row = item.data();
      return {
        id: item.id,
        name: String(row.name ?? "Isimsiz isletme"),
        ownerUid: String(row.ownerUid ?? ""),
        isSuspended: row.isSuspended === true,
        createdAt: row.createdAt?.toDate ? row.createdAt.toDate().toISOString() : undefined,
      };
    });

    const activeBusinesses = mappedBusinesses.filter((item) => item.isSuspended !== true).length;
    const suspendedBusinesses = mappedBusinesses.length - activeBusinesses;

    setStats({
      totalBusinesses: mappedBusinesses.length,
      activeBusinesses,
      suspendedBusinesses,
      totalUsers: usersCount,
      totalAppointments: appointmentsCount,
    });
    setBusinesses(mappedBusinesses);

    if (usersResult.status !== "fulfilled" || appointmentsResult.status !== "fulfilled") {
      toast.message("Bazi metrikler icin ek izin gerekli olabilir. Panel kisitli veri ile yuklendi.");
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    const db = getDb();

    if (isPrimaryAdmin) {
      const timeoutId = window.setTimeout(() => {
        refreshAdminData().catch((error) => {
          setLoading(false);
          toast.error((error as Error).message);
        });
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    getDoc(doc(db, "platformAdmins", user.uid))
      .then((adminDoc) => {
        const isAdmin = adminDoc.exists();
        setAllowed(isAdmin);

        if (!isAdmin) return;

        window.setTimeout(() => {
          refreshAdminData().catch((error) => {
            setLoading(false);
            toast.error((error as Error).message);
          });
        }, 0);
      })
      .catch(() => {
        setAllowed(false);
      });
  }, [isPrimaryAdmin, user]);

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-[var(--text-3)]">Yukleniyor...</p>
      </main>
    );
  }

  async function toggleBusinessSuspension(business: BusinessAdminItem) {
    const db = getDb();
    setBusyId(business.id);
    try {
      await updateDoc(doc(db, "businesses", business.id), {
        isSuspended: !business.isSuspended,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        business.isSuspended ? "Isletme tekrar aktif edildi." : "Isletme askiya alindi."
      );
      await refreshAdminData();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function repairOwnerMembership(business: BusinessAdminItem) {
    if (!business.ownerUid) {
      toast.error("Owner uid bulunamadi.");
      return;
    }

    const db = getDb();
    setBusyId(business.id);
    try {
      await setDoc(doc(db, "businesses", business.id, "members", business.ownerUid), {
        uid: business.ownerUid,
        role: "owner",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success("Owner uyeligi duzeltildi.");
      await refreshAdminData();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const filteredBusinesses = businesses.filter((business) => {
    if (filter === "active" && business.isSuspended) return false;
    if (filter === "suspended" && !business.isSuspended) return false;

    if (!queryText.trim()) return true;

    const q = queryText.trim().toLowerCase();
    return (
      business.name.toLowerCase().includes(q) ||
      business.id.toLowerCase().includes(q) ||
      business.ownerUid.toLowerCase().includes(q)
    );
  });

  if (!isPrimaryAdmin && !allowed) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <EmptyState title="Yetkisiz" description="Bu alan yalnizca platform yoneticilerine aciktir." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <Card title="Platform Ozeti" description="Isletme, kullanici ve abonelik metrikleri.">
        {stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Toplam Isletme" value={String(stats.totalBusinesses)} />
            <Metric label="Aktif Isletme" value={String(stats.activeBusinesses)} />
            <Metric label="Askidaki Isletme" value={String(stats.suspendedBusinesses)} />
            <Metric label="Toplam Kullanici" value={String(stats.totalUsers)} />
            <Metric label="Toplam Randevu" value={String(stats.totalAppointments)} />
          </div>
        ) : (
          <p className="text-sm text-[var(--text-3)]">Yukleniyor...</p>
        )}
      </Card>

      <Card title="Operasyon" description="Dondurma, aktifleştirme, audit ve destek modulleri">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input
            label="Isletme Ara"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Isim, id veya owner uid"
          />
          <Button variant={filter === "all" ? "secondary" : "ghost"} onClick={() => setFilter("all")}>Tum Isletmeler</Button>
          <Button variant={filter === "active" ? "secondary" : "ghost"} onClick={() => setFilter("active")}>Sadece Aktif</Button>
          <Button variant={filter === "suspended" ? "secondary" : "ghost"} onClick={() => setFilter("suspended")}>Sadece Askidaki</Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => {
              refreshAdminData().catch((error) => {
                setLoading(false);
                toast.error((error as Error).message);
              });
            }}
          >
            {loading ? "Yenileniyor..." : "Verileri Yenile"}
          </Button>
        </div>

        {filteredBusinesses.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">Isletme kaydi bulunamadi.</p>
        ) : (
          <div className="space-y-3">
            {filteredBusinesses.map((business) => (
              <div
                key={business.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--text-1)]">{business.name}</p>
                      <span className={business.isSuspended ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700" : "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"}>
                        {business.isSuspended ? "Askida" : "Aktif"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-3)]">ID: {business.id}</p>
                    <p className="text-xs text-[var(--text-3)]">Owner: {business.ownerUid || "-"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={busyId === business.id}
                      onClick={() => toggleBusinessSuspension(business)}
                    >
                      {business.isSuspended ? "Aktif Et" : "Askıya Al"}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busyId === business.id}
                      onClick={() => repairOwnerMembership(business)}
                    >
                      Owner Uyeligi Onar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-1)]">{value}</p>
    </div>
  );
}
