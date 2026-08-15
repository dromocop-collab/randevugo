"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

interface AuditLogItem {
  id: string;
  action: string;
  actorUid?: string;
  actorRole?: string;
  businessId?: string;
  entityType?: string;
  entityId?: string;
  createdAt?: string;
}

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    getDocs(
      query(
        collection(db, "platformAuditLogs"),
        orderBy("createdAt", "desc"),
        limit(100)
      )
    )
      .then((snap) => {
        setLogs(
          snap.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              action: String(d.action ?? ""),
              actorUid: d.actorUid ? String(d.actorUid) : undefined,
              actorRole: d.actorRole ? String(d.actorRole) : undefined,
              businessId: d.businessId ? String(d.businessId) : undefined,
              entityType: d.entityType ? String(d.entityType) : undefined,
              entityId: d.entityId ? String(d.entityId) : undefined,
              createdAt: d.createdAt?.toDate?.()
                ? d.createdAt.toDate().toLocaleString("tr-TR")
                : undefined,
            };
          })
        );
      })
      .catch(() => {
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card title="Audit Logs" description="Platform geneli kritik işlem kayıtları">
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          title="Henüz audit log yok"
          description="Platform işlemleri kaydedildiğinde burada görünecek."
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-1)]">
                  {log.action}
                </p>
                <p className="text-xs text-[var(--text-3)]">
                  {[log.entityType, log.entityId, log.actorRole]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <p className="text-xs text-[var(--text-3)]">
                {log.createdAt ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
