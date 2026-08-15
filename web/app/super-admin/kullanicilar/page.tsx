"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";

interface UserItem {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const db = getDb();
    getDocs(collection(db, "users"))
      .then((snap) => {
        const rows: UserItem[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            email: String(d.email ?? ""),
            displayName: String(d.displayName ?? d.fullName ?? ""),
            createdAt: d.createdAt?.toDate?.()
              ? d.createdAt.toDate().toLocaleDateString("tr-TR")
              : undefined,
          };
        });
        setUsers(rows);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  return (
    <Card title="Kullanıcı Yönetimi" description={`Toplam ${users.length} kullanıcı`}>
      <div className="mb-4">
        <Input
          label="Kullanıcı Ara"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="E-posta, isim veya UID..."
        />
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Kullanıcı yok" description="Henüz kayıtlı kullanıcı bulunmuyor." />
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-1)]">
                  {u.displayName || "İsimsiz"}
                </p>
                <p className="text-xs text-[var(--text-3)]">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-3)]">{u.createdAt ?? "—"}</p>
                <p className="text-[10px] text-[var(--text-3)]">{u.id.slice(0, 12)}...</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
