"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  listCategoryRequests,
  approveCategoryRequest,
  rejectCategoryRequest,
  addCategoryManually,
  type CategoryRequest,
} from "@/features/categories/category-request-repository";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

export default function SuperAdminModerationPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [allRequests, setAllRequests] = useState<CategoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (filter === "all") {
      setRequests(allRequests);
    } else {
      setRequests(allRequests.filter((r) => r.status === filter));
    }
  }, [filter, allRequests]);

  async function loadAll() {
    setLoading(true);
    try {
      const data = await listCategoryRequests();
      setAllRequests(data);
    } catch {
      toast.error("Kategori istekleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(req: CategoryRequest) {
    if (!user) return;
    setProcessing(req.id);
    try {
      await approveCategoryRequest(req.id, user.uid, req.requestedCategory);
      toast.success(`"${req.requestedCategory}" kategorisi onaylandı!`);
      setAllRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: "approved" as const } : r))
      );
    } catch {
      toast.error("Onaylama başarısız.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(req: CategoryRequest) {
    if (!user) return;
    setProcessing(req.id);
    try {
      await rejectCategoryRequest(req.id, user.uid);
      toast.success(`"${req.requestedCategory}" reddedildi.`);
      setAllRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" as const } : r))
      );
    } catch {
      toast.error("Red işlemi başarısız.");
    } finally {
      setProcessing(null);
    }
  }

  // Stats
  const pendingCount = allRequests.filter((r) => r.status === "pending").length;
  const approvedCount = allRequests.filter((r) => r.status === "approved").length;
  const rejectedCount = allRequests.filter((r) => r.status === "rejected").length;

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pending: { label: "Bekliyor", color: "text-amber-600", bg: "bg-amber-500/10", icon: "⏳" },
    approved: { label: "Onaylandı", color: "text-emerald-600", bg: "bg-emerald-500/10", icon: "✅" },
    rejected: { label: "Reddedildi", color: "text-rose-600", bg: "bg-rose-500/10", icon: "❌" },
  };

  const filterTabs = [
    { key: "pending" as const, label: "Bekleyenler", count: pendingCount, color: "amber" },
    { key: "approved" as const, label: "Onaylananlar", count: approvedCount, color: "emerald" },
    { key: "rejected" as const, label: "Reddedilenler", count: rejectedCount, color: "rose" },
    { key: "all" as const, label: "Tümü", count: allRequests.length, color: "sky" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-600/10 p-5 transition hover:shadow-lg hover:shadow-amber-500/10">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl transition group-hover:bg-amber-500/20" />
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600/70">Bekleyen İstekler</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{pendingCount}</p>
          <p className="mt-1 text-xs text-amber-600/50">Onay bekliyor</p>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 p-5 transition hover:shadow-lg hover:shadow-emerald-500/10">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl transition group-hover:bg-emerald-500/20" />
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600/70">Onaylanan</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{approvedCount}</p>
          <p className="mt-1 text-xs text-emerald-600/50">Kategoriye eklendi</p>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-rose-600/10 p-5 transition hover:shadow-lg hover:shadow-rose-500/10">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-rose-500/10 blur-2xl transition group-hover:bg-rose-500/20" />
          <p className="text-xs font-medium uppercase tracking-wider text-rose-600/70">Reddedilen</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{rejectedCount}</p>
          <p className="mt-1 text-xs text-rose-600/50">Reddedildi</p>
        </div>
      </div>

      {/* Category Requests */}
      <Card
        title="Kategori Onay İstekleri"
        description="İşletmelerin talep ettiği yeni kategorileri inceleyin"
      >
        {/* Filter Tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {filterTabs.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                filter === f.key
                  ? `bg-${f.color}-500/15 text-${f.color}-600 ring-1 ring-${f.color}-500/30`
                  : "bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text-1)]"
              }`}
              style={
                filter === f.key
                  ? {
                      background: `var(--${f.color === "amber" ? "amber" : f.color === "emerald" ? "emerald" : f.color === "rose" ? "rose" : "sky"}-bg, rgba(${f.color === "amber" ? "245,158,11" : f.color === "emerald" ? "16,185,129" : f.color === "rose" ? "244,63,94" : "14,165,233"}, 0.1))`,
                      color: f.color === "amber" ? "#d97706" : f.color === "emerald" ? "#059669" : f.color === "rose" ? "#e11d48" : "#0284c7",
                    }
                  : undefined
              }
            >
              {f.label}
              <span
                className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{
                  background:
                    filter === f.key
                      ? `rgba(${f.color === "amber" ? "245,158,11" : f.color === "emerald" ? "16,185,129" : f.color === "rose" ? "244,63,94" : "14,165,233"}, 0.15)`
                      : "var(--surface-3, rgba(0,0,0,0.06))",
                }}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState title="Yükleniyor" description="Kategori istekleri çekiliyor..." />
        ) : requests.length === 0 ? (
          <EmptyState
            title="İstek bulunamadı"
            description={
              filter === "pending"
                ? "Onay bekleyen kategori isteği yok. Harika! 🎉"
                : "Bu filtreyle eşleşen istek yok."
            }
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const config = statusConfig[req.status] ?? statusConfig.pending;
              const isExpanded = expandedId === req.id;

              return (
                <div
                  key={req.id}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] transition hover:shadow-md"
                >
                  {/* Main Row */}
                  <div
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg} text-lg`}>
                        {config.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[var(--text-1)]">
                            {req.requestedCategory}
                          </p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--text-3)]">
                          <span className="font-medium text-[var(--text-2)]">{req.businessName}</span>
                          {" · "}
                          {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === "pending" && (
                        <>
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleApprove(req); }}
                            disabled={processing === req.id}
                          >
                            {processing === req.id ? "İşleniyor..." : "✅ Onayla"}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={(e) => { e.stopPropagation(); handleReject(req); }}
                            disabled={processing === req.id}
                          >
                            ❌ Reddet
                          </Button>
                        </>
                      )}
                      {req.status === "approved" && (
                        <Button
                          variant="secondary"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!user) return;
                            setProcessing(req.id);
                            try {
                              await addCategoryManually(req.requestedCategory, user.uid);
                              toast.success(`"${req.requestedCategory}" kategoriye eklendi!`);
                            } catch {
                              toast.error("Kategoriye ekleme başarısız.");
                            } finally {
                              setProcessing(null);
                            }
                          }}
                          disabled={processing === req.id}
                        >
                          {processing === req.id ? "Ekleniyor..." : "📂 Kategoriye Ekle"}
                        </Button>
                      )}
                      <span className={`text-[var(--text-3)] transition ${isExpanded ? "rotate-180" : ""}`}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/50 px-5 py-4">
                      <div className="grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">İşletme</p>
                          <p className="mt-0.5 font-medium text-[var(--text-1)]">{req.businessName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">İstek Tarihi</p>
                          <p className="mt-0.5 font-medium text-[var(--text-1)]">
                            {req.requestedAt ? new Date(req.requestedAt).toLocaleString("tr-TR") : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">İşletme ID</p>
                          <p className="mt-0.5 font-mono text-xs text-[var(--text-2)]">{req.businessId}</p>
                        </div>
                      </div>
                      {req.reviewedAt && (
                        <div className="mt-3 rounded-lg bg-[var(--surface-3)] p-2.5">
                          <p className="text-xs text-[var(--text-3)]">
                            İncelenme: {new Date(req.reviewedAt).toLocaleString("tr-TR")}
                            {req.reviewedBy && <span> · Admin: {req.reviewedBy.slice(0, 8)}…</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Business Moderation */}
      <Card title="İşletme Moderasyon" description="Onay bekleyen ve incelenmesi gereken işletmeler">
        <EmptyState
          title="Onay bekleyen işletme yok"
          description="Yeni işletmeler review sürecine girdiğinde burada listelenecek."
        />
      </Card>

      <Card title="Yorum Moderasyon" description="İncelenmesi gereken müşteri yorumları">
        <EmptyState
          title="Moderasyon gerektiren yorum yok"
          description="Raporlanan yorumlar burada görünecek."
        />
      </Card>
    </div>
  );
}
