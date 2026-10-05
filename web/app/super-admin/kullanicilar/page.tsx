"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection, getCountFromServer, getDocs, limit, orderBy, query, startAfter, where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { ArrowUpRight, Building2, CalendarPlus, Mail, Phone, RefreshCw, UserRound, UsersRound } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { emailSearchPrefix } from "@/features/platform/admin-ops";
import {
  AdminPage, Avatar, Btn, Card, Chips, CopyButton, DetailList, EmptyState, ErrorBox, HeroStat, PageHeader, Pill,
  ResponsiveTable, Sheet, SearchField, SkeletonList, StatCard, StatGrid, Toolbar, ToolbarRow, fullDate, relativeTime, ui, useNow,
  type Column, type Tone,
} from "../_pages-ui";

interface UserItem {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  role: string;
  businessId: string | null;
  businessName: string | null;
  createdAt?: string;
  createdMillis: number | null;
  lastSeenMillis: number | null;
}

type Segment = "all" | "business" | "customer" | "recent";

const PAGE_SIZE = 50;
const SEARCH_LIMIT = 20;
const DAY = 86_400_000;

function millis(value: unknown): number | null {
  const candidate = value as { toMillis?: () => number } | null | undefined;
  if (candidate && typeof candidate.toMillis === "function") return candidate.toMillis();
  if (typeof value === "string" || typeof value === "number") { const parsed = new Date(value).getTime(); return Number.isNaN(parsed) ? null : parsed; }
  return null;
}

function toUser(item: QueryDocumentSnapshot): UserItem {
  const d = item.data();
  const businessIds = Array.isArray(d.businessIds) ? d.businessIds.filter((id: unknown) => typeof id === "string") : [];
  const businessId = typeof d.businessId === "string" ? d.businessId : typeof d.activeBusinessId === "string" ? d.activeBusinessId : businessIds[0] ?? null;
  return {
    id: item.id,
    email: String(d.email ?? ""),
    displayName: String(d.displayName ?? d.fullName ?? ""),
    phone: String(d.phone ?? d.phoneNumber ?? ""),
    role: String(d.role ?? d.accountType ?? d.userType ?? ""),
    businessId,
    businessName: typeof d.businessName === "string" ? d.businessName : null,
    createdAt: d.createdAt?.toDate?.() ? d.createdAt.toDate().toLocaleDateString("tr-TR") : undefined,
    createdMillis: millis(d.createdAt),
    lastSeenMillis: millis(d.lastLoginAt ?? d.lastSeenAt ?? d.updatedAt),
  };
}

const ROLE_META: Record<string, { label: string; tone: Tone }> = {
  owner: { label: "İşletme sahibi", tone: "green" },
  business: { label: "İşletme", tone: "green" },
  admin: { label: "Yönetici", tone: "violet" },
  manager: { label: "Müdür", tone: "blue" },
  staff: { label: "Personel", tone: "blue" },
  customer: { label: "Müşteri", tone: "neutral" },
  platform_admin: { label: "Platform admin", tone: "dark" },
};

function isBusinessAccount(user: UserItem) {
  return Boolean(user.businessId) || ["owner", "business", "admin", "manager", "staff"].includes(user.role);
}

function RoleBadges({ user }: { user: UserItem }) {
  const meta = ROLE_META[user.role];
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {meta ? <Pill tone={meta.tone}>{meta.label}</Pill> : user.role ? <Pill>{user.role}</Pill> : <Pill>{isBusinessAccount(user) ? "İşletme" : "Müşteri"}</Pill>}
      {user.businessId && user.role !== "business" && user.role !== "owner" && <Pill tone="green" dot>İşletme bağlı</Pill>}
    </span>
  );
}

export default function SuperAdminUsersPage() {
  const now = useNow();
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
  const [segment, setSegment] = useState<Segment>("all");
  const [selected, setSelected] = useState<UserItem | null>(null);

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
      getDocs(query(usersRef(), where("email", ">=", prefix), where("email", "<=", `${prefix}\uf8ff`), limit(SEARCH_LIMIT)))
        .then((snap) => { if (!cancelled) setServerMatches({ prefix, rows: snap.docs.map(toUser) }); })
        .catch(() => { if (!cancelled) setServerMatches(null); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [prefix, usersRef]);

  const searched = useMemo(() => {
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    if (!q) return users;
    const local = users.filter((u) =>
      u.email.toLocaleLowerCase("tr-TR").includes(q) ||
      u.displayName.toLocaleLowerCase("tr-TR").includes(q) ||
      u.phone.includes(q) ||
      u.id.toLocaleLowerCase("tr-TR").includes(q));
    const remote = prefix && serverMatches?.prefix === prefix ? serverMatches.rows : [];
    const seen = new Set(remote.map((u) => u.id));
    return [...remote, ...local.filter((u) => !seen.has(u.id))];
  }, [prefix, searchText, serverMatches, users]);

  const segmentCounts = useMemo(() => ({
    all: searched.length,
    business: searched.filter(isBusinessAccount).length,
    customer: searched.filter((u) => !isBusinessAccount(u)).length,
    recent: searched.filter((u) => u.createdMillis !== null && now - u.createdMillis < 7 * DAY).length,
  }), [now, searched]);

  const filtered = useMemo(() => {
    if (segment === "business") return searched.filter(isBusinessAccount);
    if (segment === "customer") return searched.filter((u) => !isBusinessAccount(u));
    if (segment === "recent") return searched.filter((u) => u.createdMillis !== null && now - u.createdMillis < 7 * DAY);
    return searched;
  }, [now, searched, segment]);

  const searchActive = searchText.trim().length > 0;
  const joined7 = users.filter((u) => u.createdMillis !== null && now - u.createdMillis < 7 * DAY).length;
  const joinedToday = users.filter((u) => u.createdMillis !== null && now - u.createdMillis < DAY).length;

  const columns: Column<UserItem>[] = [
    { key: "user", header: "Kullanıcı", cell: (u) => <UserCell user={u} /> },
    { key: "role", header: "Rol", width: 190, cell: (u) => <RoleBadges user={u} /> },
    { key: "business", header: "İşletme", width: 170, cell: (u) => u.businessId ? <span className={ui.truncate} style={{ display: "block", maxWidth: 160 }}>{u.businessName ?? <span className={ui.mono}>{u.businessId.slice(0, 10)}…</span>}</span> : <span className={ui.faint}>—</span> },
    { key: "joined", header: "Katılım", width: 130, cell: (u) => <span title={fullDate(u.createdMillis)}><b style={{ fontWeight: 650 }}>{u.createdAt ?? "—"}</b><br /><small className={ui.faint}>{relativeTime(u.createdMillis, now)}</small></span> },
    { key: "uid", header: "UID", width: 150, align: "right", cell: (u) => <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className={`${ui.mono} ${ui.faint}`} title={u.id}>{u.id.slice(0, 8)}…</span><CopyButton value={u.id} label="UID kopyala" compact /></span> },
  ];

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Kullanıcı merkezi"
        icon={UsersRound}
        title="Platform kullanıcıları"
        description="Hesapları isim, e-posta, telefon veya UID ile bulun; rol ve işletme bağlantısını tek bakışta görün."
        meta={<>
          <HeroStat label="toplam hesap" value={total === null ? "—" : total.toLocaleString("tr-TR")} />
          <HeroStat label="yüklendi" value={users.length.toLocaleString("tr-TR")} />
        </>}
        actions={<Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void loadUsers()}>Yenile</Btn>}
      />

      <StatGrid>
        <StatCard label="Toplam kullanıcı" value={total === null ? "—" : total.toLocaleString("tr-TR")} hint="Sunucu sayımı" icon={UsersRound} tone="green" />
        <StatCard label="Son 7 gün" value={joined7} hint="yüklenenler arasında yeni" icon={CalendarPlus} tone="lime" onClick={() => setSegment("recent")} active={segment === "recent"} />
        <StatCard label="Bugün katılan" value={joinedToday} hint="son 24 saat" icon={CalendarPlus} tone="blue" />
        <StatCard label="İşletme hesabı" value={users.filter(isBusinessAccount).length} hint="yüklenenler arasında" icon={Building2} tone="violet" onClick={() => setSegment("business")} active={segment === "business"} />
      </StatGrid>

      <Toolbar>
        <SearchField value={searchText} onChange={setSearchText} loading={searching} placeholder="E-posta, isim, telefon veya UID ara…" label="Kullanıcı ara" />
        <ToolbarRow>
          <Chips label="Hesap türü" value={segment} onChange={setSegment} options={[
            { value: "all", label: "Tümü", count: segmentCounts.all },
            { value: "business", label: "İşletme", count: segmentCounts.business },
            { value: "customer", label: "Müşteri", count: segmentCounts.customer },
            { value: "recent", label: "Son 7 gün", count: segmentCounts.recent },
          ]} />
        </ToolbarRow>
      </Toolbar>

      <Card
        flush
        title={searchActive ? `${filtered.length} eşleşme` : `${filtered.length} kullanıcı`}
        description={searchActive ? (prefix ? "E-posta öneki sunucuda da aranıyor" : "Yüklenen kullanıcılar arasında aranıyor") : "En yeni kayıtlar en üstte · satıra dokunup detayı açın"}
      >
        {loading && users.length === 0 ? (
          <div style={{ padding: 16 }}><SkeletonList rows={6} height={58} /></div>
        ) : error && users.length === 0 ? (
          <div style={{ padding: 16 }}><ErrorBox message={error} onRetry={() => void loadUsers()} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={UserRound} title={users.length ? "Eşleşen kullanıcı yok" : "Kullanıcı yok"} description={users.length ? "Arama ifadesini veya filtreyi değiştirin, ya da daha fazla kullanıcı yükleyin." : "Henüz kayıtlı kullanıcı bulunmuyor."}
            action={segment !== "all" || searchActive ? <Btn size="sm" onClick={() => { setSegment("all"); setSearchText(""); }}>Filtreleri temizle</Btn> : undefined} />
        ) : (
          <ResponsiveTable
            label="Kullanıcı listesi"
            rows={filtered}
            columns={columns}
            rowKey={(u) => u.id}
            onRowClick={setSelected}
            maxHeight="70vh"
            renderCard={(u) => <>
              <UserCell user={u} />
              <div className={ui.rowCardMeta}><RoleBadges user={u} /><span>· {u.createdAt ?? "Tarih yok"}</span><span className={ui.mono}>{u.id.slice(0, 8)}…</span></div>
            </>}
          />
        )}
        {error && users.length > 0 && <div style={{ padding: "0 16px 16px" }}><ErrorBox message={error} /></div>}
        {!loading && hasMore && <div className={ui.loadMore}><Btn loading={loadingMore} onClick={() => void loadMore()}>Daha fazla yükle</Btn></div>}
        {!hasMore && users.length > 0 && !searchActive && <p className={ui.footNote}>Tüm sıralı kayıtlar yüklendi. createdAt alanı olmayan eski hesaplar e-posta aramasıyla bulunabilir.</p>}
      </Card>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} width={520}
        title={selected ? (selected.displayName || "İsimsiz kullanıcı") : ""}
        description={selected?.email || "E-posta bilgisi yok"}
        footer={selected ? <>
          {selected.email && <a className={`${ui.btn}`} href={`mailto:${selected.email}`}><Mail size={15} /> E-posta</a>}
          {selected.businessId && <Link className={`${ui.btn} ${ui.btnPrimary}`} href={`/super-admin/isletmeler?q=${encodeURIComponent(selected.businessId)}`}><Building2 size={15} /> İşletmeyi aç</Link>}
        </> : undefined}>
        {selected && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={selected.displayName || selected.email || "?"} seed={selected.id} size={56} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><RoleBadges user={selected} /><small className={ui.muted}>Katıldı: {relativeTime(selected.createdMillis, now)}</small></div>
          </div>
          <DetailList rows={[
            { label: "Ad soyad", value: selected.displayName || <span className={ui.faint}>Belirtilmemiş</span> },
            { label: "E-posta", value: selected.email ? <><span className={ui.truncate}>{selected.email}</span><CopyButton value={selected.email} compact label="E-postayı kopyala" /></> : <span className={ui.faint}>Yok</span> },
            selected.phone ? { label: "Telefon", value: <a className={ui.link} href={`tel:${selected.phone}`}><Phone size={13} /> {selected.phone}</a> } : null,
            { label: "UID", value: <><span className={ui.mono} style={{ overflowWrap: "anywhere" }}>{selected.id}</span><CopyButton value={selected.id} compact label="UID kopyala" /></> },
            { label: "Kayıt tarihi", value: fullDate(selected.createdMillis) },
            selected.lastSeenMillis ? { label: "Son hareket", value: `${fullDate(selected.lastSeenMillis)} (${relativeTime(selected.lastSeenMillis, now)})` } : null,
            selected.businessId ? { label: "İşletme", value: <Link className={ui.link} href={`/super-admin/isletmeler?q=${encodeURIComponent(selected.businessId)}`}>{selected.businessName ?? selected.businessId} <ArrowUpRight size={13} /></Link> } : null,
          ]} />
        </div>}
      </Sheet>
    </AdminPage>
  );
}

function UserCell({ user }: { user: UserItem }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      <Avatar name={user.displayName || user.email || "?"} seed={user.id} />
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <b className={ui.truncate} style={{ fontSize: 14, fontWeight: 700 }}>{user.displayName || "İsimsiz"}</b>
        <small className={`${ui.truncate} ${ui.muted}`} style={{ fontSize: 12.5 }}>{user.email || "E-posta bilgisi yok"}</small>
      </span>
    </span>
  );
}
