"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { RefreshCw, Search, UserRound, UsersRound } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";

interface UserItem {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(collection(getDb(), "users"));
      const rows: UserItem[] = snap.docs.map((item) => {
          const d = item.data();
          return {
            id: item.id,
            email: String(d.email ?? ""),
            displayName: String(d.displayName ?? d.fullName ?? ""),
            createdAt: d.createdAt?.toDate?.()
              ? d.createdAt.toDate().toLocaleDateString("tr-TR")
              : undefined,
          };
        });
      setUsers(rows.sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email, "tr")));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void loadUsers(); });
  }, [loadUsers]);

  const filtered = useMemo(() => users.filter((u) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLocaleLowerCase("tr-TR");
    return (
      u.email.toLocaleLowerCase("tr-TR").includes(q) ||
      u.displayName.toLocaleLowerCase("tr-TR").includes(q) ||
      u.id.toLocaleLowerCase("tr-TR").includes(q)
    );
  }), [searchText, users]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(125deg,#111827,#173a46_58%,#155e75)] px-6 py-6 text-white shadow-xl shadow-slate-950/10">
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-cyan-200"><UsersRound size={14}/> KULLANICI MERKEZİ</span><h1 className="mt-3 text-2xl font-semibold">Platform kullanıcıları</h1><p className="mt-1 text-sm text-cyan-50/60">Hesapları isim, e-posta veya kimlik bilgisiyle hızla bulun.</p></div><button type="button" onClick={() => void loadUsers()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-60"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Yenile</button></div>
      </section>
      <Card title="Kullanıcı Yönetimi" description={`${filtered.length} / ${users.length} kullanıcı gösteriliyor`}>
        <label className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"><Search size={16} className="text-[var(--text-3)]"/><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="E-posta, isim veya UID ara…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)]"/></label>
        {loading && users.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Kullanıcılar yüklenemedi" description={error} action={<Button onClick={loadUsers} iconLeft={<RefreshCw size={15}/>}>Yeniden dene</Button>}/>
        ) : filtered.length === 0 ? (
          <EmptyState title={users.length ? "Eşleşen kullanıcı yok" : "Kullanıcı yok"} description={users.length ? "Arama ifadesini değiştirerek tekrar deneyin." : "Henüz kayıtlı kullanıcı bulunmuyor."} />
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-700"><UserRound size={18}/></span><div className="min-w-0"><p className="truncate text-sm font-medium text-[var(--text-1)]">{u.displayName || "İsimsiz"}</p><p className="truncate text-xs text-[var(--text-3)]">{u.email || "E-posta bilgisi yok"}</p></div></div>
                <div className="shrink-0 text-right"><p className="text-xs text-[var(--text-3)]">{u.createdAt ?? "—"}</p><p className="font-mono text-[10px] text-[var(--text-3)]" title={u.id}>{u.id.slice(0, 12)}...</p></div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
