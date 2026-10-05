"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Activity, Bot, Building2, ClipboardList, Download, RefreshCw, ShieldCheck, UserCog } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import {
  AdminPage, Btn, Card, Chips, CopyButton, DetailList, EmptyState, ErrorBox, HeroStat, PageHeader, Pill, SearchField, Sheet, SkeletonList,
  StatCard, StatGrid, Toolbar, ToolbarRow, downloadCsv, fullDate, groupByDay, relativeTime, timeOf, ui, useNow, type Tone,
} from "../_pages-ui";
import s from "./audit.module.css";

interface AuditLogItem {
  id: string; action: string; actorUid?: string; actorRole?: string; businessId?: string;
  entityType?: string; entityId?: string; createdAt?: string; createdMillis: number | null;
  extra: Array<[string, string]>;
}

const KNOWN_FIELDS = new Set(["action", "actorUid", "actorRole", "businessId", "entityType", "entityId", "createdAt"]);
const DAY = 86_400_000;

function actionTone(action: string): Tone {
  const value = action.toLowerCase();
  if (/(delete|remove|suspend|reject|ban|sil|askı)/.test(value)) return "red";
  if (/(approve|activate|publish|onay|create)/.test(value)) return "green";
  if (/(update|change|plan|assign)/.test(value)) return "blue";
  if (value.startsWith("assistant")) return "violet";
  return "neutral";
}

function primitive(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  const stamp = value as { toDate?: () => Date };
  if (typeof stamp.toDate === "function") return stamp.toDate().toLocaleString("tr-TR");
  try { const json = JSON.stringify(value); return json.length > 300 ? `${json.slice(0, 300)}…` : json; } catch { return null; }
}

export default function SuperAdminAuditLogsPage() {
  const now = useNow();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [role, setRole] = useState("all");
  const [entity, setEntity] = useState("all");
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const snap = await getDocs(query(collection(getDb(), "platformAuditLogs"), orderBy("createdAt", "desc"), limit(250)));
      setLogs(snap.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id, action: String(data.action ?? "Bilinmeyen işlem"),
          actorUid: data.actorUid ? String(data.actorUid) : undefined,
          actorRole: data.actorRole ? String(data.actorRole) : data.actorSource ? String(data.actorSource) : undefined,
          businessId: data.businessId ? String(data.businessId) : undefined,
          entityType: data.entityType ? String(data.entityType) : undefined,
          entityId: data.entityId ? String(data.entityId) : undefined,
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toLocaleString("tr-TR") : undefined,
          createdMillis: typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : null,
          extra: Object.entries(data).filter(([key]) => !KNOWN_FIELDS.has(key)).map(([key, value]) => [key, primitive(value)] as [string, string | null]).filter((entry): entry is [string, string] => entry[1] !== null),
        };
      }));
    } catch (loadError) { setError((loadError as Error).message || "Audit kayıtları yüklenemedi."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadLogs(); }); }, [loadLogs]);

  const facet = useCallback((key: "actorRole" | "entityType") => {
    const counts = new Map<string, number>();
    logs.forEach((log) => { const value = log[key]; if (value) counts.set(value, (counts.get(value) ?? 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [logs]);
  const roles = useMemo(() => facet("actorRole"), [facet]);
  const entities = useMemo(() => facet("entityType"), [facet]);

  const filtered = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase("tr-TR");
    return logs.filter((log) => (role === "all" || log.actorRole === role) && (entity === "all" || log.entityType === entity) && (!term || [log.action, log.actorUid, log.actorRole, log.businessId, log.entityType, log.entityId, log.id]
      .filter(Boolean).some((value) => String(value).toLocaleLowerCase("tr-TR").includes(term))));
  }, [entity, logs, role, searchText]);

  const last24 = useMemo(() => logs.filter((log) => log.createdMillis !== null && now - log.createdMillis < DAY).length, [logs, now]);
  const actors = useMemo(() => new Set(logs.map((log) => log.actorUid).filter(Boolean)).size, [logs]);
  const businesses = useMemo(() => new Set(logs.map((log) => log.businessId).filter(Boolean)).size, [logs]);

  function exportLogs() {
    downloadCsv(`seninrandevun-audit-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Tarih", "İşlem", "Aktör rolü", "Aktör UID", "İşletme", "Varlık türü", "Varlık ID"],
      ...filtered.map((log) => [log.createdAt ?? "", log.action, log.actorRole ?? "", log.actorUid ?? "", log.businessId ?? "", log.entityType ?? "", log.entityId ?? ""]),
    ]);
  }

  const filtersActive = role !== "all" || entity !== "all" || searchText.trim().length > 0;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Güvenlik izi"
        icon={ShieldCheck}
        title="Platform işlem geçmişi"
        description="Kritik yönetim hareketlerini aktör, işletme ve varlık bazında inceleyin. Son 250 kayıt yüklenir."
        meta={<><HeroStat label="kayıt" value={logs.length} /><HeroStat label="son 24 saat" value={last24} /></>}
        actions={<>
          <Btn variant="onDark" icon={Download} disabled={filtered.length === 0} onClick={exportLogs}>CSV</Btn>
          <Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void loadLogs()}>Yenile</Btn>
        </>}
      />

      <StatGrid>
        <StatCard label="Yüklenen kayıt" value={logs.length} hint={`${filtered.length} görünüyor`} icon={ClipboardList} tone="green" />
        <StatCard label="Son 24 saat" value={last24} hint="yönetim hareketi" icon={Activity} tone="lime" />
        <StatCard label="Farklı aktör" value={actors} hint="UID bazında" icon={UserCog} tone="blue" />
        <StatCard label="Etkilenen işletme" value={businesses} hint="benzersiz işletme" icon={Building2} tone="violet" />
      </StatGrid>

      <Toolbar>
        <SearchField value={searchText} onChange={setSearchText} placeholder="İşlem, aktör, işletme veya varlık ara…" label="Audit kayıtlarında ara" />
        {(roles.length > 0 || entities.length > 1) && <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          {roles.length > 0 && <ToolbarRow><Chips label="Aktör rolü" value={role} onChange={setRole} options={[{ value: "all", label: "Tüm aktörler" }, ...roles.map(([value, count]) => ({ value, label: value, count }))]} /></ToolbarRow>}
          {entities.length > 1 && <ToolbarRow><Chips label="Varlık türü" value={entity} onChange={setEntity} options={[{ value: "all", label: "Tüm varlıklar" }, ...entities.map(([value, count]) => ({ value, label: value, count }))]} /></ToolbarRow>}
        </div>}
      </Toolbar>

      <Card flush title="Zaman çizelgesi" description={`${filtered.length} / ${logs.length} kayıt · ayrıntı için kayda dokunun`}>
        {loading && logs.length === 0 ? <div style={{ padding: 16 }}><SkeletonList rows={6} height={56} /></div>
          : error ? <div style={{ padding: 16 }}><ErrorBox message={error} onRetry={() => void loadLogs()} /></div>
          : filtered.length === 0 ? <EmptyState icon={ClipboardList} title={logs.length ? "Eşleşen kayıt yok" : "Henüz audit kaydı yok"} description={logs.length ? "Arama ifadesini veya filtreleri değiştirerek tekrar deneyin." : "Platform işlemleri kaydedildiğinde burada görünecek."}
            action={filtersActive ? <Btn size="sm" onClick={() => { setRole("all"); setEntity("all"); setSearchText(""); }}>Filtreleri temizle</Btn> : undefined} />
          : <div className={s.timeline}>
            {groupByDay(filtered, (log) => log.createdMillis, now).map((group) => (
              <div key={group.key}>
                <div className={ui.groupLabel}>{group.label}<span>{group.items.length}</span></div>
                {group.items.map((log) => (
                  <button key={log.id} type="button" className={s.entry} onClick={() => setSelected(log)}>
                    <span className={s.time}>{timeOf(log.createdMillis)}</span>
                    <span className={s.dot} data-tone={actionTone(log.action)} aria-hidden>{log.action.startsWith("assistant") ? <Bot size={13} /> : null}</span>
                    <span className={s.main}>
                      <b>{log.action}</b>
                      <span className={s.tags}>
                        {log.actorRole && <Pill>{log.actorRole}</Pill>}
                        {log.entityType && <Pill tone="blue">{log.entityType}</Pill>}
                        {log.businessId && <Pill tone="green">İşletme {log.businessId.slice(0, 8)}…</Pill>}
                        {log.actorUid && <span className={`${ui.mono} ${ui.faint}`}>{log.actorUid.slice(0, 8)}…</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>}
      </Card>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title={selected?.action ?? ""} description={selected ? `${fullDate(selected.createdMillis)} · ${relativeTime(selected.createdMillis, now)}` : undefined} width={560}>
        {selected && <DetailList rows={[
          { label: "Kayıt ID", value: <><span className={ui.mono}>{selected.id}</span><CopyButton value={selected.id} compact /></> },
          { label: "İşlem", value: <Pill tone={actionTone(selected.action)}>{selected.action}</Pill> },
          selected.actorRole ? { label: "Aktör rolü", value: selected.actorRole } : null,
          selected.actorUid ? { label: "Aktör UID", value: <><span className={ui.mono}>{selected.actorUid}</span><CopyButton value={selected.actorUid} compact /></> } : null,
          selected.businessId ? { label: "İşletme", value: <><Link className={ui.link} href={`/super-admin/isletmeler?q=${encodeURIComponent(selected.businessId)}`} onClick={() => setSelected(null)}><span className={ui.mono}>{selected.businessId}</span></Link><CopyButton value={selected.businessId} compact /></> } : null,
          selected.entityType ? { label: "Varlık türü", value: selected.entityType } : null,
          selected.entityId ? { label: "Varlık ID", value: <><span className={ui.mono}>{selected.entityId}</span><CopyButton value={selected.entityId} compact /></> } : null,
          ...selected.extra.map(([key, value]) => ({ label: key, value: <span className={ui.mono}>{value}</span> })),
        ]} />}
      </Sheet>
    </AdminPage>
  );
}
