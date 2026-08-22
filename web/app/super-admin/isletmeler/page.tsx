"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";

interface BusinessItem {
  id: string;
  name: string;
  ownerUid: string;
  status: string;
  isSuspended: boolean;
  plan: string;
  city: string;
  category: string;
  approvalStatus?: string;
  storePosition?: number;
  createdAt?: string;
}

export default function SuperAdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "pending">("all");
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const db = getDb();
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "businesses"));
        if (cancelled) return;
        const rows: BusinessItem[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: String(d.name ?? "İsimsiz"),
            ownerUid: String(d.ownerUid ?? ""),
            status: String(d.status ?? "active"),
            isSuspended: d.isSuspended === true,
            plan: String(d.plan ?? "RANDEVUGO"),
            city: String(d.city ?? ""),
            category: String(d.category ?? ""),
            approvalStatus: String(d.approvalStatus ?? (d.status === "active" ? "approved" : "pending")),
            storePosition: Number(d.storePosition ?? 1),
            createdAt: d.createdAt?.toDate?.()
              ? d.createdAt.toDate().toLocaleDateString("tr-TR")
              : undefined,
          };
        });
        setBusinesses(rows);
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function loadBusinesses() {
    const db = getDb();
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "businesses"));
      const rows: BusinessItem[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: String(d.name ?? "İsimsiz"),
          ownerUid: String(d.ownerUid ?? ""),
          status: String(d.status ?? "active"),
          isSuspended: d.isSuspended === true,
          plan: String(d.plan ?? "FREE"),
          city: String(d.city ?? ""),
          category: String(d.category ?? ""),
          approvalStatus: String(d.approvalStatus ?? (d.status === "active" ? "approved" : "pending")),
          storePosition: Number(d.storePosition ?? 1),
          createdAt: d.createdAt?.toDate?.()
            ? d.createdAt.toDate().toLocaleDateString("tr-TR")
            : undefined,
        };
      });
      setBusinesses(rows);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSuspension(biz: BusinessItem) {
    const db = getDb();
    setBusyId(biz.id);
    try {
      await updateDoc(doc(db, "businesses", biz.id), {
        isSuspended: !biz.isSuspended,
        status: biz.isSuspended ? "active" : "suspended",
        updatedAt: serverTimestamp(),
      });
      toast.success(
        biz.isSuspended ? "İşletme aktif edildi." : "İşletme askıya alındı."
      );
      await loadBusinesses();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
      setConfirmAction(null);
    }
  }

  async function changePlan(bizId: string, newPlan: string) {
    setBusyId(bizId);
    try {
      const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "assignBusinessPlan");
      await callable({ businessId: bizId, plan: newPlan, status: "active" });
      toast.success(`Plan ${newPlan} olarak güncellendi.`);
      await loadBusinesses();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function reviewBusiness(bizId: string, decision: "approved" | "rejected") {
    setBusyId(bizId);
    try {
      const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "reviewBusiness");
      await callable({ businessId: bizId, decision });
      toast.success(decision === "approved" ? "Mağaza onaylandı ve yayına açıldı." : "Mağaza başvurusu reddedildi.");
      await loadBusinesses();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = businesses.filter((b) => {
    if (filter === "active" && (b.isSuspended || b.status === "suspended")) return false;
    if (filter === "suspended" && !b.isSuspended && b.status !== "suspended") return false;
    if (filter === "pending" && b.status !== "pending_review") return false;

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const planColors: Record<string, string> = {
    FREE: "bg-gray-100 text-gray-700",
    PRO: "bg-sky-100 text-sky-700",
    BUSINESS: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="space-y-4">
      <Card title="İşletme Yönetimi" description={`Toplam ${businesses.length} işletme`}>
        <div className="mb-4 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <Input
              label="Ara"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="İsim, ID veya şehir..."
            />
          </div>
          <Button variant={filter === "all" ? "secondary" : "ghost"} onClick={() => setFilter("all")}>
            Tümü
          </Button>
          <Button variant={filter === "active" ? "secondary" : "ghost"} onClick={() => setFilter("active")}>
            Aktif
          </Button>
          <Button variant={filter === "suspended" ? "secondary" : "ghost"} onClick={() => setFilter("suspended")}>
            Askıda
          </Button>
          <Button variant={filter === "pending" ? "secondary" : "ghost"} onClick={() => setFilter("pending")}>
            Onay bekleyen
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="İşletme yok" description="Filtrelere uygun işletme bulunamadı." />
        ) : (
          <div className="space-y-3">
            {filtered.map((biz) => (
              <div
                key={biz.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--text-1)]">{biz.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${biz.status === "pending_review" ? "bg-amber-100 text-amber-800" : biz.status === "rejected" || biz.isSuspended ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {biz.status === "pending_review" ? "Onay bekliyor" : biz.status === "rejected" ? "Reddedildi" : biz.isSuspended ? "Askıda" : "Aktif"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planColors[biz.plan] ?? "bg-gray-100 text-gray-700"}`}>
                        {biz.plan}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-3)]">
                      {biz.storePosition}. mağaza · {biz.city} · {biz.category} · {biz.createdAt ?? "—"}
                    </p>
                    <p className="text-xs text-[var(--text-3)]">ID: {biz.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {biz.status === "pending_review" && <>
                      <Button className="text-xs" disabled={busyId === biz.id} onClick={() => reviewBusiness(biz.id, "approved")}>Onayla</Button>
                      <Button variant="danger" className="text-xs" disabled={busyId === biz.id} onClick={() => reviewBusiness(biz.id, "rejected")}>Reddet</Button>
                    </>}
                    <select
                      value={biz.plan}
                      onChange={(e) => changePlan(biz.id, e.target.value)}
                      disabled={busyId === biz.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-2 py-1.5 text-xs text-[var(--text-1)]"
                    >
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="BUSINESS">BUSINESS</option>
                    </select>
                    {confirmAction?.id === biz.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="danger"
                          className="text-xs"
                          disabled={busyId === biz.id}
                          onClick={() => toggleSuspension(biz)}
                        >
                          Onayla
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs"
                          onClick={() => setConfirmAction(null)}
                        >
                          İptal
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        className="text-xs"
                        disabled={busyId === biz.id}
                        onClick={() =>
                          setConfirmAction({ id: biz.id, action: "toggle" })
                        }
                      >
                        {biz.isSuspended ? "Aktif Et" : "Askıya Al"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
