"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import {
  BadgeCheck, CheckCircle2, CircleAlert, Clock3, Eye, FileText, Gauge, Info, MessagesSquare, PhoneCall, Power, PowerOff, RefreshCw, Send,
  ShieldCheck, Store, TriangleAlert, Webhook, XCircle,
} from "lucide-react";
import {
  getWhatsAppOperations, sendWhatsAppTest, setWhatsAppChannel, type WhatsAppMessageType, type WhatsAppOperations,
} from "@/features/whatsapp/whatsapp-admin-repository";
import {
  AdminPage, BarRow, Btn, Card, Chips, ConfirmSheet, CopyButton, DetailList, EmptyState, HeroStat, PageHeader, Pill, ResponsiveTable,
  SkeletonList, StatCard, StatGrid, cx, relativeTime, ui, useNow, type Tone,
} from "../_pages-ui";
import s from "./whatsapp.module.css";

const TYPE_LABEL: Record<string, string> = { confirmation: "Onay", reminder: "Hatırlatma", reschedule: "Saat değişikliği", cancellation: "İptal" };
const STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  accepted: { label: "Meta kabul etti", tone: "neutral" },
  sent: { label: "Gönderildi", tone: "blue" },
  delivered: { label: "İletildi", tone: "green" },
  read: { label: "Okundu", tone: "green" },
  failed: { label: "Başarısız → SMS", tone: "red" },
};
const TEMPLATE_STATUS: Record<string, { label: string; tone: Tone }> = {
  APPROVED: { label: "Onaylı", tone: "green" },
  PENDING: { label: "İnceleniyor", tone: "amber" },
  IN_APPEAL: { label: "İtirazda", tone: "amber" },
  REJECTED: { label: "Reddedildi", tone: "red" },
  PAUSED: { label: "Duraklatıldı", tone: "red" },
  DISABLED: { label: "Devre dışı", tone: "red" },
};
const QUALITY: Record<string, { label: string; tone: Tone }> = {
  GREEN: { label: "Yüksek", tone: "green" }, YELLOW: { label: "Orta", tone: "amber" }, RED: { label: "Düşük", tone: "red" }, UNKNOWN: { label: "Henüz yok", tone: "neutral" },
};
const TIER: Record<string, string> = {
  TIER_50: "Günde 50 müşteri", TIER_250: "Günde 250 müşteri", TIER_1K: "Günde 1.000 müşteri", TIER_10K: "Günde 10.000 müşteri",
  TIER_100K: "Günde 100.000 müşteri", TIER_UNLIMITED: "Sınırsız",
};
// Sık görülen Meta hata kodları (müşteri tarafı / politika).
const ERROR_HINT: Record<string, string> = {
  "131026": "Numara WhatsApp kullanmıyor veya mesaj alamıyor",
  "131047": "24 saat penceresi dışında serbest mesaj",
  "131049": "Meta etkileşimi düşük gördüğü için iletmedi",
  "131050": "Kullanıcı işletme mesajlarını kapattı",
  "131051": "Desteklenmeyen mesaj türü",
  "132001": "Şablon yok veya dili uyuşmuyor",
  "132000": "Şablon değişken sayısı uyuşmuyor",
  "130472": "Kullanıcı deney grubunda (Meta)",
  "131042": "Ödeme sorunu (Meta hesabı)",
};

type Filter = "all" | "delivered" | "failed" | "pending";

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

export default function WhatsAppChannelPage() {
  const now = useNow();
  const [data, setData] = useState<WhatsAppOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<"on" | "off" | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testType, setTestType] = useState<WhatsAppMessageType>("confirmation");
  const [testing, setTesting] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getWhatsAppOperations()); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const enabled = data?.settings.enabled === true;
  const ready = data?.readiness.ready === true;
  const stats = data?.stats;
  const reached = (stats?.byStatus.delivered ?? 0) + (stats?.byStatus.read ?? 0);

  const requiredTemplates = useMemo(() => {
    if (!data) return [];
    return (Object.entries(data.settings.templates) as Array<[WhatsAppMessageType, string]>).map(([type, name]) => {
      const meta = data.templates?.find((template) => template.name === name && template.language === data.settings.language)
        ?? data.templates?.find((template) => template.name === name);
      return { type, name, meta };
    });
  }, [data]);
  const otherTemplates = useMemo(() => (data?.templates ?? []).filter((template) => !requiredTemplates.some((item) => item.name === template.name)), [data, requiredTemplates]);

  const rows = useMemo(() => (data?.recent ?? []).filter((row) =>
    filter === "all" ? true
      : filter === "delivered" ? row.status === "delivered" || row.status === "read"
        : filter === "failed" ? row.status === "failed"
          : row.status === "accepted" || row.status === "sent"), [data, filter]);

  const banner = !data ? null
    : enabled ? { tone: "success", icon: CheckCircle2, title: "WhatsApp kanalı açık", text: "“Önce WhatsApp” ayarı açık işletmelerin randevu bildirimleri WhatsApp'tan gidiyor; iletilemeyen her mesaj otomatik olarak SMS'e düşüyor." }
      : ready ? { tone: "ready", icon: BadgeCheck, title: "Her şey hazır, kanal kapalı", text: "Tüm zorunlu kontroller tamam. Kanalı açtığınızda bildirimler WhatsApp'tan gitmeye başlar." }
        : { tone: "warn", icon: Clock3, title: "Kurulum tamamlanmadı", text: "Aşağıdaki kırmızı maddeler bitince kanal açılabilir. Bu sürede tüm bildirimler SMS ile gider." };

  async function toggle(next: boolean) {
    try {
      await setWhatsAppChannel(next);
      toast.success(next ? "WhatsApp kanalı açıldı." : "WhatsApp kanalı kapatıldı.", { description: "Tüm sunucular yeni ayarı en geç 5 dakika içinde kullanır." });
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  async function sendTest() {
    if (!testPhone.trim()) { toast.error("Test için telefon numarası girin."); return; }
    setTesting(true);
    try {
      await sendWhatsAppTest(testPhone, testType);
      toast.success("Test mesajı Meta'ya iletildi.", { description: "Birkaç saniye içinde telefona düşmeli; durumu aşağıdaki listede izleyebilirsiniz." });
      window.setTimeout(() => { void load(); }, 4000);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setTesting(false); }
  }

  return (
    <AdminPage>
      <PageHeader eyebrow="Meta Cloud API" icon={MessagesSquare} title="WhatsApp kanalı"
        description="Randevu bildirimlerini WhatsApp'tan gönderen kanalın kurulumu, şablon onayları, iletim istatistikleri ve test gönderimi."
        meta={<>
          <HeroStat label="kanal" value={!data ? "…" : enabled ? "Açık" : "Kapalı"} />
          <HeroStat label="son 30 gün" value={(stats?.total ?? 0).toLocaleString("tr-TR")} />
          <HeroStat label="iletim oranı" value={stats?.deliveryRate == null ? "—" : `%${stats.deliveryRate}`} />
        </>}
        actions={<Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void load()}>Yenile</Btn>}
      />

      {loading && !data ? <SkeletonList rows={4} height={90} /> : !data ? (
        <EmptyState icon={TriangleAlert} title="Bilgiler alınamadı" description="Yenile'ye basın; sorun sürerse fonksiyonların gönderildiğinden emin olun." />
      ) : (
        <>
          {banner ? (
            <div className={cx(s.banner, s[`banner-${banner.tone}`])} role="status">
              <banner.icon size={22} aria-hidden />
              <div><b>{banner.title}</b><p>{banner.text}</p></div>
              {enabled
                ? <Btn icon={PowerOff} onClick={() => setConfirm("off")}>Kanalı kapat</Btn>
                : <Btn variant="primary" icon={Power} disabled={!ready} onClick={() => setConfirm("on")} title={ready ? undefined : "Önce zorunlu maddeleri tamamlayın"}>Kanalı aç</Btn>}
            </div>
          ) : null}

          {data.metaErrors.length ? (
            <div className={cx(s.banner, s["banner-danger"])} role="alert">
              <XCircle size={20} aria-hidden />
              <div><b>Meta’dan bilgi alınamadı</b>{data.metaErrors.map((error) => <p key={error}>{error}</p>)}</div>
            </div>
          ) : null}

          <Card title="Kurulum kontrol listesi" icon={ShieldCheck} description="Kırmızı ve zorunlu maddeler tamamlanmadan kanal açılmaz.">
            <div className={s.checks}>
              {data.readiness.checks.map((check) => (
                <div key={check.key} className={cx(s.check, check.ok ? s.ok : check.blocking ? s.bad : s.soft)}>
                  <span className={s.checkIcon}>{check.ok ? <CheckCircle2 size={15} aria-hidden /> : check.blocking ? <XCircle size={15} aria-hidden /> : <Clock3 size={15} aria-hidden />}</span>
                  <span><b>{check.label}{!check.blocking ? <em> · isteğe bağlı</em> : null}</b><small>{check.detail}</small></span>
                </div>
              ))}
            </div>
          </Card>

          <div className={s.grid}>
            <Card title="Numara" icon={PhoneCall} description="Meta'daki canlı durum">
              {data.phone ? (
                <DetailList rows={[
                  { label: "Numara", value: <b>{data.phone.display_phone_number ?? "—"}</b> },
                  { label: "Görünen ad", value: <span className={s.inline}>{data.phone.verified_name ?? "—"} {data.phone.name_status === "APPROVED" ? <Pill tone="green" dot>Onaylı</Pill> : <Pill tone="amber" dot>{data.phone.name_status === "PENDING_REVIEW" ? "İnceleniyor" : data.phone.name_status ?? "—"}</Pill>}</span> },
                  { label: "Bağlantı", value: data.phone.status === "CONNECTED" ? <Pill tone="green" dot>Bağlı</Pill> : <Pill tone="red" dot>{data.phone.status ?? "Bilinmiyor"}</Pill> },
                  { label: "Kalite puanı", value: <Pill tone={(QUALITY[data.phone.quality_rating ?? "UNKNOWN"] ?? QUALITY.UNKNOWN).tone} dot>{(QUALITY[data.phone.quality_rating ?? "UNKNOWN"] ?? QUALITY.UNKNOWN).label}</Pill> },
                  { label: "Mesaj sınırı", value: TIER[data.phone.messaging_limit_tier ?? ""] ?? "Meta henüz belirlemedi (başlangıçta günde 250 müşteri)" },
                  { label: "Hız", value: data.phone.throughput?.level === "HIGH" ? "Yüksek" : "Standart" },
                  { label: "Numara kimliği", value: <span className={s.inline}><code>{data.settings.phoneNumberId}</code><CopyButton value={data.settings.phoneNumberId} compact /></span> },
                ]} />
              ) : <p className={s.muted}>Numara bilgisi alınamadı. Token ve numara kimliğini kontrol edin.</p>}
            </Card>

            <Card title="Şablonlar" icon={FileText} description={`Dil: ${data.settings.language} · Bilgilendirme (Utility)`}>
              <ul className={s.templates}>
                {requiredTemplates.map(({ type, name, meta }) => {
                  const status = meta ? TEMPLATE_STATUS[meta.status] ?? { label: meta.status, tone: "neutral" as Tone } : { label: "Oluşturulmadı", tone: "red" as Tone };
                  return (
                    <li key={type}>
                      <span><b>{TYPE_LABEL[type] ?? type}</b><code>{name}</code>{meta?.rejected_reason && meta.rejected_reason !== "NONE" ? <small>Red sebebi: {meta.rejected_reason}</small> : null}</span>
                      <Pill tone={status.tone} dot>{status.label}</Pill>
                    </li>
                  );
                })}
              </ul>
              {otherTemplates.length ? <p className={s.muted}>Hesapta {otherTemplates.length} başka şablon daha var (sistem kullanmıyor).</p> : null}
              <p className={s.note}><Info size={13} aria-hidden /> Şablon metinleri WhatsApp Yöneticisi → Mesaj şablonları’ndan düzenlenir. Değişken sırası: {"{{1}}"} işletme, {"{{2}}"} hizmet, {"{{3}}"} tarih, {"{{4}}"} bağlantı (iptalde yok).</p>
            </Card>
          </div>

          <StatGrid cols={4}>
            <StatCard icon={Send} label="Gönderilen · 30 gün" value={(stats?.total ?? 0).toLocaleString("tr-TR")} hint={`${(stats?.byStatus.accepted ?? 0) + (stats?.byStatus.sent ?? 0)} yolda`} onClick={() => setFilter("all")} active={filter === "all"} />
            <StatCard icon={CheckCircle2} label="İletildi" tone="green" value={reached.toLocaleString("tr-TR")} hint={stats?.deliveryRate == null ? "Henüz sonuçlanan yok" : `İletim oranı %${stats.deliveryRate}`} onClick={() => setFilter("delivered")} active={filter === "delivered"} />
            <StatCard icon={Eye} label="Okundu" tone="blue" value={(stats?.byStatus.read ?? 0).toLocaleString("tr-TR")} hint={stats?.readRate == null ? "—" : `İletilenlerin %${stats.readRate}'i`} />
            <StatCard icon={CircleAlert} label="SMS'e düşen" tone={(stats?.byStatus.failed ?? 0) ? "red" : "neutral"} value={(stats?.byStatus.failed ?? 0).toLocaleString("tr-TR")} hint="WhatsApp'ı olmayan / ulaşılamayan" onClick={() => setFilter("failed")} active={filter === "failed"} />
          </StatGrid>

          <div className={s.grid}>
            <Card title="Son mesajlar" icon={MessagesSquare} description="Son 30 günden en yeni 50 mesaj">
              <Chips label="Durum filtresi" value={filter} onChange={setFilter} options={[
                { value: "all", label: "Tümü" }, { value: "delivered", label: "İletildi" }, { value: "pending", label: "Yolda" }, { value: "failed", label: "SMS'e düştü" },
              ]} />
              {rows.length === 0 ? <EmptyState icon={MessagesSquare} title="Bu filtrede mesaj yok" description={enabled ? "Bildirim gönderildikçe burada listelenir." : "Kanal kapalı; test mesajı gönderebilirsiniz."} /> : (
                <ResponsiveTable label="Son WhatsApp mesajları" rows={rows} rowKey={(row) => row.id} maxHeight="520px"
                  columns={[
                    { key: "time", header: "Zaman", width: 110, cell: (row) => <span className={s.muted}>{relativeTime(row.createdAt ? new Date(row.createdAt).getTime() : null, now)}</span> },
                    { key: "business", header: "İşletme", cell: (row) => <b>{row.businessName}</b> },
                    { key: "type", header: "Tür", cell: (row) => TYPE_LABEL[row.type] ?? row.type },
                    { key: "phone", header: "Alıcı", cell: (row) => <code>{row.phoneMasked}</code> },
                    { key: "status", header: "Durum", cell: (row) => <StatusCell row={row} /> },
                  ]}
                  renderCard={(row) => (
                    <span className={s.rowCard}>
                      <span><b>{row.businessName}</b><small>{TYPE_LABEL[row.type] ?? row.type} · {row.phoneMasked} · {relativeTime(row.createdAt ? new Date(row.createdAt).getTime() : null, now)}</small></span>
                      <StatusCell row={row} />
                    </span>
                  )}
                />
              )}
            </Card>

            <div className={s.side}>
              <Card title="Test mesajı" icon={Send} description="Örnek bilgilerle tek bir şablon gönderir (kanal kapalıyken de).">
                <div className={s.form}>
                  <label className={ui.field}><span className={ui.fieldLabel}>Telefon</span>
                    <input className={ui.input} type="tel" inputMode="tel" placeholder="05XX XXX XX XX" value={testPhone} onChange={(event) => setTestPhone(event.target.value)} />
                  </label>
                  <label className={ui.field}><span className={ui.fieldLabel}>Şablon</span>
                    <select className={ui.select} value={testType} onChange={(event) => setTestType(event.target.value as WhatsAppMessageType)}>
                      {requiredTemplates.map(({ type, name, meta }) => <option key={type} value={type} disabled={meta?.status !== "APPROVED"}>{TYPE_LABEL[type]} ({name}){meta?.status !== "APPROVED" ? " · onay bekliyor" : ""}</option>)}
                    </select>
                  </label>
                  <Btn variant="primary" icon={Send} loading={testing} onClick={() => void sendTest()}>Test gönder</Btn>
                  <small className={s.muted}>Saatte en fazla 10 test. Örnek: “Erdem Kuaför · Saç kesimi”.</small>
                </div>
              </Card>

              <Card title="Kullanım" icon={Store}>
                <DetailList rows={[
                  { label: "“Önce WhatsApp” açık işletme", value: data.optInBusinesses == null ? "—" : <b>{data.optInBusinesses.toLocaleString("tr-TR")}</b> },
                ]} />
                {!stats?.total ? <p className={s.muted}>Son 30 günde mesaj yok.</p> : null}
                {stats && stats.total ? (
                  <div className={s.bars}>
                    {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => <BarRow key={type} label={TYPE_LABEL[type] ?? type} value={count} total={stats.total} />)}
                  </div>
                ) : null}
                {stats && Object.keys(stats.errors).length ? (
                  <div className={s.errors}>
                    <b>Başarısızlık sebepleri</b>
                    {Object.entries(stats.errors).sort((a, b) => b[1] - a[1]).map(([code, count]) => <p key={code}><code>{code}</code> {ERROR_HINT[code] ?? "Meta hata kodu"} · {count}</p>)}
                  </div>
                ) : null}
                <p className={s.note}><Info size={13} aria-hidden /> İşletmeler WhatsApp’ı Ayarlar → Randevu Motoru → “Önce WhatsApp’tan gönder” ile açar. WhatsApp mesajları SMS kotasından düşmez.</p>
              </Card>

              <Card title="Webhook" icon={Webhook}>
                <DetailList rows={[
                  { label: "Adres", value: <span className={s.inline}><code className={s.wrap}>{data.webhookUrl}</code><CopyButton value={data.webhookUrl} compact /></span> },
                  { label: "Uygulama gizli anahtarı", value: data.settings.hasAppSecret ? <Pill tone="green" dot>Kayıtlı</Pill> : <Pill tone="red" dot>Eksik</Pill> },
                  { label: "Erişim anahtarı", value: data.settings.hasAccessToken ? <Pill tone="green" dot>Kayıtlı</Pill> : <Pill tone="red" dot>Eksik</Pill> },
                  { label: "WhatsApp hesap kimliği", value: data.settings.wabaId ? <code>{data.settings.wabaId}</code> : <Pill tone="red" dot>Eksik</Pill> },
                ]} />
                <p className={s.note}><Gauge size={13} aria-hidden /> Gizli anahtarlar yalnız Firestore’da (platformPrivateSettings/whatsapp) durur; bu sayfa değerlerini hiçbir zaman göstermez.</p>
              </Card>
            </div>
          </div>
        </>
      )}

      <ConfirmSheet open={confirm === "on"} onClose={() => setConfirm(null)} onConfirm={() => toggle(true)} icon={Power}
        title="WhatsApp kanalı açılsın mı?" confirmLabel="Kanalı aç"
        description="“Önce WhatsApp” ayarı açık işletmelerin onay, hatırlatma, saat değişikliği ve iptal bildirimleri WhatsApp'tan gönderilir. İletilemeyen mesaj otomatik olarak SMS'e düşer." />
      <ConfirmSheet open={confirm === "off"} onClose={() => setConfirm(null)} onConfirm={() => toggle(false)} icon={PowerOff} tone="danger"
        title="WhatsApp kanalı kapatılsın mı?" confirmLabel="Kapat"
        description="Tüm bildirimler yeniden SMS ile gider (SMS kotasından düşer). İstediğiniz zaman tekrar açabilirsiniz." />
    </AdminPage>
  );
}

function StatusCell({ row }: { row: WhatsAppOperations["recent"][number] }) {
  const status = STATUS_LABEL[row.status] ?? { label: row.status, tone: "neutral" as Tone };
  const hint = row.status === "failed" ? `${row.errorCode ? `${row.errorCode} · ` : ""}${ERROR_HINT[String(row.errorCode)] ?? row.errorTitle ?? ""}` : undefined;
  return <span className={s.status}><Pill tone={status.tone} dot title={hint}>{status.label}</Pill>{hint ? <small>{hint}</small> : null}</span>;
}
