"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection, getCountFromServer, getDocs, limit, orderBy, query, startAfter, where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { RefreshCw, Search, UserRound, UsersRound } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { emailSearchPrefix } from "@/features/platform/admin-ops";

interface UserItem {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
}

const PAGE_SIZE = 50;
const SEARCH_LIMIT = 20;

function toUser(item: QueryDocumentSnapshot): UserItem {
  const d = item.data();
  return {
    id: item.id,
    email: String(d.email ?? ""),
    displayName: String(d.displayName ?? d.fullName ?? ""),
    createdAt: d.createdAt?.toDate?.() ? d.createdAt.toDate().toLocaleDateString("tr-TR") : undefined,
  };
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [serverMatches, setServerMatches] = useState<{ prefix: string; rows: UserItem[] } | null>(null);
  const [searching, setSearching] = useState(false);

  const usersRef = useCallback(() => collection(getDb(), "users"), []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    getCountFromServer(usersRef()).then((snapshot) => setTotal(snapshot.data().count)).catch(() => setTotal(null));
    try {
      // Not: createdAt alanı olmayan eski belgeler bu sıralı listede görünmez; e-posta aramasıyla bulunabilir.
      const snap = await getDocs(query(usersRef(), orderBy("createdAt", "desc"), limit(PAGE_SIZE)));
      setUsers(snap.docs.map(toUser));
      setCursor(snap.docs.at(-1) ?? null);
      setHasMore(snap.size === PAGE_SIZE);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [usersRef]);

  useEffect(() => {
    queueMicrotask(() => { void loadUsers(); });
  }, [loadUsers]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snap = await getDocs(query(usersRef(), orderBy("createdAt", "desc"), startAfter(cursor), limit(PAGE_SIZE)));
      setUsers((current) => [...current, ...snap.docs.map(toUser)]);
      setCursor(snap.docs.at(-1) ?? cursor);
      setHasMore(snap.size === PAGE_SIZE);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kullanıcılar yüklenemedi.");
    } finally {
      setLoadingMore(false);
    }
  }

  // E-posta/önek gibi görünen aramalar sunucuda önek sorgusuyla yapılır (yüklenmemiş sayfalardaki hesapları da bulur).
  const prefix = emailSearchPrefix(searchText);
  useEffect(() => {
    if (!prefix) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      getDocs(query(usersRef(), where("email", ">=", prefix), where("email", "<=", `${prefix}`), limit(SEARCH_LIMIT)))
        .then((snap) => { if (!cancelled) setServerMatches({ prefix, rows: snap.docs.map(toUser) }); })
        .catch(() => { if (!cancelled) setServerMatches(null); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [prefix, usersRef]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    if (!q) return users;
    const local = users.filter((u) =>
      u.email.toLocaleLowerCase("tr-TR").includes(q) ||
      u.displayName.toLocaleLowerCase("tr-TR").includes(q) ||
      u.id.toLocaleLowerCase("tr-TR").includes(q));
    const remote = prefix && serverMatches?.prefix === prefix ? serverMatches.rows : [];
    const seen = new Set(remote.map((u) => u.id));
    return [...remote, ...local.filter((u) => !seen.has(u.id))];
  }, [prefix, searchText, serverMatches, users]);

  const searchActive = searchText.trim().length > 0;
  const totalLabel = total === null ? "" : ` · toplam ${total.toLocaleString("tr-TR")} kullanıcı`;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(125deg,#111827,#173a46_58%,#155e75)] px-6 py-6 text-white shadow-xl shadow-slate-950/10">
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-cyan-200"><UsersRound size={14}/> KULLANICI MERKEZİ</span><h1 className="mt-3 text-2xl font-semibold">Platform kullanıcıları</h1><p className="mt-1 text-sm text-cyan-50/60">Hesapları isim, e-posta veya kimlik bilgisiyle hızla bulun.</p></div><div className="flex items-end gap-3">{total !== null && <div className="text-right"><small className="block text-[10px] font-bold tracking-wider text-cyan-200">TOPLAM</small><b className="text-2xl">{total.toLocaleString("tr-TR")}</b></div>}<button type="button" onClick={() => void loadUsers()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-60"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Yenile</button></div></div>
      </section>
      <Card title="Kullanıcı Yönetimi" description={searchActive ? `${filtered.length} eşleşme${prefix ? " (e-posta öneki sunucuda aranır)" : " (yüklenen kullanıcılar arasında)"}${totalLabel}` : `${users.length} kullanıcı yüklendi${totalLabel}`}>
        <label className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"><Search size={16} className="text-[var(--text-3)]"/><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="E-posta, isim veya UID ara…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)]"/>{searching && <RefreshCw size={14} className="animate-spin text-[var(--text-3)]"/>}</label>
        {loading && users.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />
            ))}
          </div>
        ) : error && users.length === 0 ? (
          <ErrorState title="Kullanıcılar yüklenemedi" description={error} action={<Button onClick={loadUsers} iconLeft={<RefreshCw size={15}/>}>Yeniden dene</Button>}/>
        ) : filtered.length === 0 ? (
          <EmptyState title={users.length ? "Eşleşen kullanıcı yok" : "Kullanıcı yok"} description={users.length ? "Arama ifadesini değiştirin veya daha fazla kullanıcı yükleyin." : "Henüz kayıtlı kullanıcı bulunmuyor."} />
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
        {error && users.length > 0 && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
        {!loading && hasMore && <div className="mt-4 flex justify-center"><Button variant="secondary" loading={loadingMore} disabled={loadingMore} onClick={() => void loadMore()}>Daha fazla yükle</Button></div>}
      </Card>
    </div>
  );
}
