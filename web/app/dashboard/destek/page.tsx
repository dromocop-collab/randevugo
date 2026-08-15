"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  orderBy,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { useAuthContext } from "@/features/auth/auth-context";
import { useBusiness } from "@/hooks/use-business";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";

interface TicketRow {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  { value: "billing", label: "Faturalama" },
  { value: "technical", label: "Teknik Sorun" },
  { value: "account", label: "Hesap" },
  { value: "feature_request", label: "Özellik Talebi" },
  { value: "bug_report", label: "Hata Bildirimi" },
  { value: "other", label: "Diğer" },
];

export default function DashboardSupportPage() {
  const { user } = useAuthContext();
  const { businessId } = useBusiness();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [message, setMessage] = useState("");

  async function loadTickets() {
    if (!businessId) return;
    const db = getDb();
    try {
      const snap = await getDocs(
        query(
          collection(db, "supportTickets"),
          where("businessId", "==", businessId),
          orderBy("createdAt", "desc")
        )
      );
      setTickets(
        snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: String(d.title ?? ""),
            category: String(d.category ?? ""),
            status: String(d.status ?? "open"),
            createdAt: d.createdAt?.toDate?.()
              ? d.createdAt.toDate().toLocaleDateString("tr-TR")
              : "—",
          };
        })
      );
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const db = getDb();

    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "supportTickets"),
            where("businessId", "==", businessId),
            orderBy("createdAt", "desc")
          )
        );
        if (cancelled) return;
        setTickets(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TicketRow, "id">) }))
        );
      } catch {
        if (!cancelled) setTickets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [businessId]);

  async function handleSubmit() {
    if (!title.trim() || !message.trim() || !businessId || !user) return;
    setSubmitting(true);
    try {
      const db = getDb();
      await addDoc(collection(db, "supportTickets"), {
        title: title.trim(),
        category,
        message: message.trim(),
        priority: "medium",
        status: "open",
        businessId,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Destek talebiniz oluşturuldu.");
      setTitle("");
      setMessage("");
      setShowForm(false);
      await loadTickets();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    open: { label: "Açık", color: "bg-sky-100 text-sky-700" },
    in_progress: { label: "İşleniyor", color: "bg-amber-100 text-amber-700" },
    waiting_user: { label: "Yanıt Bekleniyor", color: "bg-violet-100 text-violet-700" },
    resolved: { label: "Çözüldü", color: "bg-emerald-100 text-emerald-700" },
    closed: { label: "Kapatıldı", color: "bg-gray-100 text-gray-700" },
  };

  return (
    <div className="space-y-4">
      <Card
        title="Destek Talepleri"
        description="Platform ekibine destek talebi gönderin"
        headerAction={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Kapat" : "+ Yeni Talep"}
          </Button>
        }
      >
        {showForm && (
          <div className="mb-6 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <Input
              label="Konu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sorununuzu kısaca özetleyin"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-3)]">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--text-1)]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-3)]">
                Mesaj
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Sorununuzu detaylı açıklayın..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--text-1)]"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !message.trim()}
              >
                {submitting ? "Gönderiliyor..." : "Gönder"}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            title="Destek talebi yok"
            description="Henüz bir destek talebi oluşturmadınız."
          />
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => {
              const info = statusLabels[ticket.status] ?? {
                label: ticket.status,
                color: "bg-gray-100 text-gray-700",
              };
              return (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-1)]">
                      {ticket.title}
                    </p>
                    <p className="text-xs text-[var(--text-3)]">
                      {
                        CATEGORY_OPTIONS.find((c) => c.value === ticket.category)
                          ?.label ?? ticket.category
                      }{" "}
                      · {ticket.createdAt}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${info.color}`}
                  >
                    {info.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
