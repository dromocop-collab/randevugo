"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, BadgeCheck, CircleAlert, Clock3, Coins, Eye, EyeOff, KeyRound, ListChecks, MessageSquareText, RadioTower, RefreshCw, Save, Send,
  ShieldCheck, XCircle,
} from "lucide-react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import {
  getMutlucellSettings,
  getSmsOperations,
  testMutlucellSettings,
  updateMutlucellSettings,
  type MutlucellSettings,
  type SmsOperationsResult,
} from "@/features/mutlucell/mutlucell-repository";
import {
  AdminPage, Btn, Card, Chips, EmptyState, HeroStat, IconBtn, PageHeader, Pill, SearchField, Segmented, SkeletonList, StatCard, StatGrid,
  cx, groupByDay, timeOf, ui, useNow, type Tone,
} from "../_pages-ui";
import s from "./sms.module.css";

type StatusFilter = "all" | "delivered" | "pending" | "failed";

const TYPE_LABEL: Record<string, string> = { confirmation: "Onay", reminder: "Hatırlatma", cancellation: "İptal", reschedule: "Saat değişikliği" };

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  if (error instanceof Error) return error.message;
  return "İşlem tamamlanamadı.";
}

function statusTone(status: string): Tone {
  return status === "delivered" ? "green" : status === "failed" ? "red" : "amber";
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={s.switch} />;
}

export default function SmsCenterPage() {
  const now = useNow();
  const [settings, setSettings] = useState<MutlucellSettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [operations, setOperations] = useState<SmsOperationsResult>({ rows: [], summary: { total: 0, delivered: 0, pending: 0, failed: 0, credits: 0 } });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");

  async function refresh() {
    const [current, currentOperations] = await Promise.all([getMutlucellSettings(), getSmsOperations()]);
    setSettings(current); setOperations(currentOperations);
  }

  async function manualRefresh() {
    setRefreshing(true);
    try { await refresh(); } catch (error) { toast.error(errorMessage(error)); } finally { setRefreshing(false); }
  }

  useEffect(() => {
    Promise.all([getMutlucellSettings(), getSmsOperations()])
      .then(([current, currentOperations]) => { setSettings(current); setOperations(currentOperations); })
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const readiness = useMemo(() => {
    if (!settings) return { tone: "warn", title: "Kontrol ediliyor", detail: "Mutlucell bilgileri okunuyor." };
    if (!settings.username || !settings.hasApiKey) return { tone: "danger", title: "Kimlik bilgileri eksik", detail: "Kullanıcı adı ve API anahtarını tamamlayın." };
    if (!settings.senderTitle) return { tone: "warn", title: "Gönderici başlığı bekleniyor", detail: "Mutlucell tarafından onaylanan başlığı girin." };
    if (!settings.enabled) return { tone: "warn", title: "SMS gönderimi duraklatıldı", detail: "Doğrulama güvenliği nedeniyle kod ekranda gösterilmez." };
    if (!settings.lastTest || settings.lastTest.senderTitle !== settings.senderTitle) return { tone: "warn", title: "Başlık onayı test bekliyor", detail: "Mutlucell başlığı onayladıktan sonra gerçek test SMS'i göndererek bağlantıyı doğrulayın." };
    if (!settings.lastTest.success) return { tone: "danger", title: "Canlı SMS testi başarısız", detail: settings.lastTest.error || "Başlık veya bağlantı Mutlucell tarafından henüz kabul edilmedi." };
    return { tone: "success", title: "Canlı SMS doğrulandı", detail: `${settings.senderTitle} başlığı gerçek gönderimde Mutlucell tarafından kabul edildi.` };
  }, [settings]);

  const healthChecks = useMemo(() => [
    { label: "Kullanıcı hesabı", ok: Boolean(settings?.username), detail: settings?.username || "Kullanıcı adı girilmedi" },
    { label: "API kimlik doğrulama", ok: Boolean(settings?.hasApiKey), detail: settings?.hasApiKey ? settings.apiKeyMasked : "API anahtarı eksik" },
    { label: "Gönderici başlığı", ok: Boolean(settings?.senderTitle && settings.lastTest?.success && settings.lastTest.senderTitle === settings.senderTitle), detail: !settings?.senderTitle ? "Mutlucell onaylı başlık bekleniyor" : settings.lastTest?.success && settings.lastTest.senderTitle === settings.senderTitle ? `${settings.senderTitle} · gerçek gönderim onaylandı` : `${settings.senderTitle} · canlı test bekleniyor` },
    { label: "Canlı gönderim", ok: Boolean(settings?.enabled), detail: settings?.enabled ? "Gönderim açık" : "Süper admin tarafından duraklatıldı" },
    { label: "OTP güvenliği", ok: settings?.fallbackEnabled === false, detail: settings?.fallbackEnabled ? "Güvensiz fallback açık" : "Kod yalnızca SMS ile teslim edilir" },
    { label: "Son uçtan uca test", ok: settings?.lastTest?.success === true, detail: !settings?.lastTest ? "Henüz gerçek test yapılmadı" : settings.lastTest.success ? `Başarılı · ${settings.lastTest.providerMessageId ?? "paket alındı"}` : settings.lastTest.error || "Mutlucell testi başarısız" },
  ], [settings]);

  const logRows = useMemo(() => {
    const needle = logSearch.replace(/\s/g, "");
    return operations.rows
      .filter((row) => statusFilter === "all" || (statusFilter === "pending" ? row.status === "pending" || row.status === "accepted" : row.status === statusFilter))
      .filter((row) => typeFilter === "all" || row.type === typeFilter)
      .filter((row) => !needle || row.phoneMasked.replace(/\s/g, "").includes(needle))
      .map((row) => ({ ...row, sentMillis: row.sentAt ? new Date(row.sentAt).getTime() : null }))
      .sort((x, y) => (y.sentMillis ?? 0) - (x.sentMillis ?? 0));
  }, [logSearch, operations.rows, statusFilter, typeFilter]);

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    operations.rows.forEach((row) => counts.set(row.type, (counts.get(row.type) ?? 0) + 1));
    return [{ value: "all", label: "Tüm türler" }, ...[...counts.entries()].map(([value, count]) => ({ value, label: TYPE_LABEL[value] ?? value, count }))];
  }, [operations.rows]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await updateMutlucellSettings({
        username: settings.username,
        apiKey: apiKey || undefined,
        senderTitle: settings.senderTitle,
        enabled: settings.enabled,
        fallbackEnabled: settings.fallbackEnabled,
      });
      setApiKey("");
      await refresh();
      toast.success("Mutlucell ayarları canlı sisteme kaydedildi.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testPhone.trim()) return toast.error("Test için telefon numarası girin.");
    setTesting(true);
    try {
      const result = await testMutlucellSettings(testPhone);
      await refresh();
      toast.success(`Test SMS'i gönderildi. Paket: ${result.providerMessageId}`);
    } catch (error) {
      await refresh().catch(() => undefined);
      toast.error(errorMessage(error));
    } finally {
      setTesting(false);
    }
  }

  if (loading || !settings) {
    return <AdminPage><PageHeader eyebrow="Mutlucell operasyon merkezi" icon={RadioTower} title="SMS altyapısı" description="Mutlucell bağlantısı kontrol ediliyor…" /><SkeletonList rows={4} height={90} /></AdminPage>;
  }

  const summary = operations.summary;
  const deliveryRate = summary.total ? Math.round((summary.delivered / summary.total) * 100) : 0;
  const ReadyIcon = readiness.tone === "success" ? BadgeCheck : CircleAlert;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Mutlucell operasyon merkezi"
        icon={RadioTower}
        title="SMS altyapısı"
        description="Kimlik bilgilerini güncelleyin, onaylı başlığı bağlayın ve canlı gönderimi müşteriye gitmeden önce test edin."
        meta={<>
          <HeroStat label="sağlayıcı" value="Mutlucell" />
          <HeroStat label="kaynak" value={settings.source === "admin" ? "Admin" : settings.source === "secret" ? "Secret" : "Eksik"} />
          <HeroStat label="teslim oranı" value={`%${deliveryRate}`} />
        </>}
        actions={<Btn variant="lime" icon={RefreshCw} loading={refreshing} onClick={() => void manualRefresh()}>Yenile</Btn>}
      />

      <div className={cx(s.readiness, readiness.tone === "success" ? s.success : readiness.tone === "danger" ? s.danger : s.warn)} role="status">
        <ReadyIcon size={20} style={{ flexShrink: 0, marginTop: 1 }} />
        <div><b>{readiness.title}</b><p>{readiness.detail}</p></div>
      </div>

      <StatGrid cols={5}>
        <StatCard label="Gönderim" value={summary.total.toLocaleString("tr-TR")} hint="son kayıtlar" icon={MessageSquareText} tone="green" onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
        <StatCard label="Teslim" value={summary.delivered.toLocaleString("tr-TR")} hint={`%${deliveryRate} teslim oranı`} icon={BadgeCheck} tone="lime" onClick={() => setStatusFilter("delivered")} active={statusFilter === "delivered"} />
        <StatCard label="Bekleyen" value={summary.pending.toLocaleString("tr-TR")} hint="rapor bekleniyor" icon={Clock3} tone="amber" onClick={() => setStatusFilter("pending")} active={statusFilter === "pending"} />
        <StatCard label="Başarısız" value={summary.failed.toLocaleString("tr-TR")} hint="kontrol gerekli" icon={XCircle} tone={summary.failed ? "red" : "neutral"} onClick={() => setStatusFilter("failed")} active={statusFilter === "failed"} />
        <StatCard label="Kredi" value={summary.credits.toLocaleString("tr-TR")} hint="harcanan" icon={Coins} tone="blue" />
      </StatGrid>

      <Card title="Sağlık kontrolü" description={`${healthChecks.filter((check) => check.ok).length}/${healthChecks.length} kontrol başarılı`} icon={ListChecks}>
        <div className={s.checks}>
          {healthChecks.map((check) => (
            <div key={check.label} className={cx(s.check, check.ok ? s.ok : s.bad)}>
              <span className={s.checkIcon}>{check.ok ? <BadgeCheck size={15} /> : <CircleAlert size={15} />}</span>
              <div style={{ minWidth: 0 }}><b>{check.label}</b><small>{check.detail}</small></div>
            </div>
          ))}
        </div>
      </Card>

      <div className={s.grid}>
        <Card title="Bağlantı bilgileri" description="API anahtarı kaydedildikten sonra tekrar görüntülenmez." icon={ShieldCheck}>
          <div className={s.formGrid}>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>Mutlucell kullanıcı adı</span>
              <input className={ui.input} value={settings.username} autoComplete="off" onChange={(event) => setSettings({ ...settings, username: event.target.value })} />
            </label>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>Onaylı gönderici başlığı</span>
              <input className={ui.input} placeholder="Örn. Senin Ran." value={settings.senderTitle} onChange={(event) => setSettings({ ...settings, senderTitle: event.target.value })} />
              <span className={s.hint}>Mutlucell onayındaki yazımı, boşluğu ve noktalamayı aynen kullanın. Başlık otomatik değiştirilmez.</span>
            </label>
            <label className={cx(ui.field, s.span2)}>
              <span className={ui.fieldLabel}>API anahtarı {settings.hasApiKey && <small>{settings.apiKeyMasked}</small>}</span>
              <span className={s.withAction}>
                <input className={ui.input} type={showApiKey ? "text" : "password"} autoComplete="new-password" placeholder={settings.hasApiKey ? "Değiştirmek istemiyorsanız boş bırakın" : "Mutlucell API anahtarını girin"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
                <button type="button" className={s.inlineAction} aria-label={showApiKey ? "API anahtarını gizle" : "API anahtarını göster"} onClick={() => setShowApiKey(!showApiKey)}>{showApiKey ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
          </div>
          <div className={s.toggles}>
            <div className={s.toggle}><div><b>SMS gönderimi</b><small>Canlı Mutlucell gönderimini açar.</small></div><Switch label="SMS gönderimi" checked={settings.enabled} onChange={(enabled) => setSettings({ ...settings, enabled })} /></div>
            <div className={cx(s.toggle, s.secure)}><div><b>Güvenli OTP modu</b><small>Kod ekranda gösterilmez; SMS başarısızsa işlem güvenle durur.</small></div><ShieldCheck size={20} style={{ color: "var(--green-2)", flexShrink: 0 }} /></div>
          </div>
          <div className={s.formFoot}><Btn variant="primary" icon={Save} loading={saving} onClick={() => void save()}>{saving ? "Kaydediliyor" : "Ayarları kaydet"}</Btn></div>
        </Card>

        <Card title="Canlı bağlantı testi" description="Gerçek bir test SMS'i gönderir." icon={Activity}>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Test telefonu</span>
            <input className={ui.input} type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" value={testPhone} onChange={(event) => setTestPhone(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void sendTest(); } }} />
          </label>
          <Btn variant="primary" block icon={Send} loading={testing} disabled={!settings.enabled} onClick={() => void sendTest()} style={{ marginTop: 12 }}>{testing ? "Gönderiliyor" : "Test SMS'i gönder"}</Btn>
          {!settings.enabled && <p className={s.hint} style={{ marginTop: 8 }}>Test için önce SMS gönderimini açıp kaydedin.</p>}
          <div className={s.lastTest}>
            <small><KeyRound size={13} /> Son test</small>
            {!settings.lastTest ? <p className={ui.muted} style={{ margin: "8px 0 0" }}>Henüz bağlantı testi yapılmadı.</p>
              : settings.lastTest.success ? <div style={{ marginTop: 8 }}><Pill tone="green" dot>Başarılı gönderim</Pill><p className={ui.muted} style={{ margin: "6px 0 0", overflowWrap: "anywhere", fontSize: 12 }}>Paket: {settings.lastTest.providerMessageId}</p></div>
              : <div style={{ marginTop: 8 }}><Pill tone="red" dot>Test başarısız</Pill><p className={ui.muted} style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.5 }}>{settings.lastTest.error}</p></div>}
          </div>
        </Card>
      </div>

      <Card title="SMS teslim operasyonu" description="Mutlucell teslim raporları 15 dakikalık güvenli aralıklarla güncellenir." icon={MessageSquareText}
        action={<IconBtn label="Kayıtları yenile" icon={RefreshCw} spinning={refreshing} onClick={() => void manualRefresh()} disabled={refreshing} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 6 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <SearchField value={logSearch} onChange={setLogSearch} placeholder="Telefonda ara (maskeli)…" label="SMS kayıtlarında ara" shortcut={false} />
            <Segmented label="Teslim durumu" value={statusFilter} onChange={setStatusFilter} options={[
              { value: "all", label: "Tümü" },
              { value: "delivered", label: "Teslim", count: summary.delivered },
              { value: "pending", label: "Bekleyen", count: summary.pending },
              { value: "failed", label: "Başarısız", count: summary.failed, alert: summary.failed > 0 },
            ]} />
          </div>
          {typeOptions.length > 2 && <Chips label="SMS türü" value={typeFilter} onChange={setTypeFilter} options={typeOptions} />}
        </div>
        {logRows.length === 0
          ? <EmptyState icon={MessageSquareText} title={operations.rows.length ? "Bu filtrede kayıt yok" : "Henüz SMS kaydı yok"} description={operations.rows.length ? "Filtreleri değiştirerek tekrar deneyin." : "Yeni SMS gönderimleri burada teslim durumlarıyla görünecek."} />
          : groupByDay(logRows, (row) => row.sentMillis, now).map((group) => (
            <div key={group.key}>
              <div className={ui.groupLabel}>{group.label}<span>{group.items.length}</span></div>
              {group.items.map((row) => (
                <div key={row.id} className={s.logRow}>
                  <span className={s.logTime}>{timeOf(row.sentMillis)}</span>
                  <span className={s.logMain}><b>{TYPE_LABEL[row.type] ?? row.type}</b><small className={ui.mono}>{row.phoneMasked}</small></span>
                  <span className={s.logEnd}><span className={s.credits}>{row.credits} kredi</span><Pill tone={statusTone(row.status)} dot>{row.statusLabel}</Pill></span>
                </div>
              ))}
            </div>
          ))}
      </Card>
    </AdminPage>
  );
}
