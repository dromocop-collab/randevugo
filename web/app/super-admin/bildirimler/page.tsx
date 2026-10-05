"use client";

import { useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  Activity, BadgeCheck, BellRing, CalendarClock, CheckCircle2, ChevronRight, CircleAlert, LayoutTemplate, Megaphone, RefreshCw, Rocket, Send,
  ShieldCheck, Smartphone, Sparkles, TicketCheck, UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPlatformPushOperations, sendPlatformPush,
  type PlatformPushOperations, type PushCategory, type PushDestination, type PushPlatform,
} from "@/features/notifications/platform-push-repository";
import {
  AdminPage, Btn, Card, ConfirmSheet, EmptyState, HeroStat, IconBtn, PageHeader, Pill, ResponsiveTable, SearchField, Segmented, SkeletonList,
  StatCard, StatGrid, cx, relativeTime, ui, useNow, type Column,
} from "../_pages-ui";
import n from "./notifications.module.css";

type Template = {
  id: string;
  name: string;
  description: string;
  title: string;
  body: string;
  category: PushCategory;
  destination: PushDestination;
  icon: typeof BellRing;
};

const templates: Template[] = [
  {
    id: "appointment_reminder", name: "Randevu hatırlatma", description: "Yaklaşan randevuları hatırlatır.",
    title: "Randevunu unutma", body: "Yaklaşan randevunun ayrıntılarını uygulamadan kontrol edebilirsin.",
    category: "service", destination: "appointments", icon: CalendarClock,
  },
  {
    id: "queue_update", name: "Canlı sıra", description: "Kullanıcıyı sıra ekranına yönlendirir.",
    title: "Canlı sıran seni bekliyor", body: "Sıra durumunu ve güncel bekleme bilgisini uygulamadan takip edebilirsin.",
    category: "service", destination: "queue", icon: TicketCheck,
  },
  {
    id: "new_businesses", name: "Yeni işletmeler", description: "Keşfet alanına geri çağırır.",
    title: "Yeni işletmeler seni bekliyor", body: "Yakınındaki yeni işletmeleri ve hizmetleri şimdi keşfet.",
    category: "campaign", destination: "discover", icon: Sparkles,
  },
  {
    id: "last_minute", name: "Son dakika fırsatı", description: "Yeni açılan saatleri duyurur.",
    title: "Yeni bir müsaitlik açıldı", body: "Sana uygun son dakika randevu saatlerini şimdi incele.",
    category: "campaign", destination: "discover", icon: Rocket,
  },
];

const destinationLabels: Record<PushDestination, string> = {
  discover: "Keşfet", appointments: "Randevularım", queue: "Sıram", account: "Hesabım",
};

const platformLabels: Record<PushPlatform, string> = { all: "iOS + Android", ios: "iOS", android: "Android" };

type HistoryRow = PlatformPushOperations["rows"][number];

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  if (error instanceof Error) return error.message;
  return "Bildirim işlemi tamamlanamadı.";
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "sent" ? "green" : status === "partial" ? "amber" : "neutral";
  const label = status === "sent" ? "Gönderildi" : status === "partial" ? "Kısmi" : status === "no_recipients" ? "Alıcı yok" : "Bilinmiyor";
  return <Pill tone={tone} dot>{label}</Pill>;
}

export default function NotificationCenterPage() {
  const now = useNow();
  const [operations, setOperations] = useState<PlatformPushOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("appointment_reminder");
  const [platform, setPlatform] = useState<PushPlatform>("all");
  const [category, setCategory] = useState<PushCategory>("service");
  const [destination, setDestination] = useState<PushDestination>("appointments");
  const [title, setTitle] = useState(templates[0].title);
  const [body, setBody] = useState(templates[0].body);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "sent" | "issues">("all");

  async function refresh(silent = false) {
    if (!silent) setRefreshing(true);
    try { setOperations(await getPlatformPushOperations()); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { if (!silent) setRefreshing(false); }
  }

  useEffect(() => {
    getPlatformPushOperations()
      .then(setOperations)
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const targetCount = useMemo(() => {
    if (!operations) return 0;
    const source = category === "campaign" ? (operations.campaignEligible ?? operations.summary) : operations.summary;
    return platform === "ios" ? source.ios : platform === "android" ? source.android : source.total;
  }, [category, operations, platform]);

  const history = useMemo(() => {
    const query = historyQuery.trim().toLocaleLowerCase("tr-TR");
    return (operations?.rows ?? []).filter((row) => {
      const statusMatches = historyFilter === "all" || (historyFilter === "sent" ? row.status === "sent" : row.status !== "sent");
      const queryMatches = !query || `${row.title} ${row.body}`.toLocaleLowerCase("tr-TR").includes(query);
      return statusMatches && queryMatches;
    });
  }, [historyFilter, historyQuery, operations]);

  const delivery = useMemo(() => {
    const rows = operations?.rows ?? [];
    const recipients = rows.reduce((sum, row) => sum + row.recipients, 0);
    const success = rows.reduce((sum, row) => sum + row.successCount, 0);
    const failures = rows.reduce((sum, row) => sum + row.failureCount, 0);
    return { success, failures, rate: recipients ? Math.round((success / recipients) * 100) : 0 };
  }, [operations]);

  const issueCount = useMemo(() => (operations?.rows ?? []).filter((row) => row.status !== "sent").length, [operations]);
  const valid = title.trim().length > 0 && body.trim().length > 0 && title.length <= 80 && body.length <= 500;
  const counts = category === "campaign" ? (operations?.campaignEligible ?? operations?.summary) : operations?.summary;

  function applyTemplate(template: Template) {
    setSelectedTemplate(template.id);
    setTitle(template.title); setBody(template.body);
    setCategory(template.category); setDestination(template.destination);
  }

  async function submit() {
    if (!valid || sending) return;
    setSending(true);
    try {
      const result = await sendPlatformPush({
        title: title.trim(), body: body.trim(), platform, category, destination,
        templateId: selectedTemplate || "custom",
      });
      setConfirming(false);
      await refresh(true);
      if (result.recipients === 0) toast.warning("Uygun ve izinli bildirim alıcısı bulunamadı.");
      else if (result.failureCount > 0) toast.warning(`${result.successCount} cihaza ulaştı, ${result.failureCount} gönderim başarısız oldu.`);
      else toast.success(`${result.successCount} cihaza bildirim gönderildi.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally { setSending(false); }
  }

  if (loading) {
    return <AdminPage><PageHeader eyebrow="Bildirim komuta merkezi" icon={BellRing} title="Push bildirimleri" description="iOS ve Android cihazları kontrol ediliyor…" /><SkeletonList rows={3} height={140} /></AdminPage>;
  }

  const millisOf = (row: HistoryRow) => row.createdAt ? new Date(row.createdAt).getTime() : null;
  const columns: Column<HistoryRow>[] = [
    { key: "title", header: "Bildirim", cell: (row) => <span style={{ display: "block", maxWidth: 360 }}><b className={ui.truncate} style={{ display: "block" }}>{row.title}</b><small className={`${ui.truncate} ${ui.muted}`} style={{ display: "block" }}>{row.body}</small></span> },
    { key: "platform", header: "Platform", width: 120, cell: (row) => platformLabels[row.platform] },
    { key: "category", header: "Tür", width: 100, cell: (row) => <Pill tone={row.category === "campaign" ? "violet" : "blue"}>{row.category === "campaign" ? "Kampanya" : "Hizmet"}</Pill> },
    { key: "delivery", header: "Teslim", width: 110, align: "right", cell: (row) => <span><b>{row.successCount}</b><span className={ui.faint}> / {row.recipients}</span></span> },
    { key: "status", header: "Durum", width: 120, cell: (row) => <StatusPill status={row.status} /> },
    { key: "date", header: "Tarih", width: 150, cell: (row) => <span title={row.createdAt ? new Date(row.createdAt).toLocaleString("tr-TR") : undefined} className={ui.muted}>{row.createdAt ? relativeTime(millisOf(row), now) : "—"}</span> },
  ];

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Bildirim komuta merkezi"
        icon={BellRing}
        title="Doğru mesajı, doğru cihaza gönder."
        description="Hazır şablon kullanın, iOS ve Android hedefini seçin, göndermeden önce mobil önizlemeyi kontrol edin."
        meta={<>
          <HeroStat label="cihaz" value={(operations?.summary.total ?? 0).toLocaleString("tr-TR")} />
          <HeroStat label="iOS" value={(operations?.summary.ios ?? 0).toLocaleString("tr-TR")} />
          <HeroStat label="Android" value={(operations?.summary.android ?? 0).toLocaleString("tr-TR")} />
        </>}
      />

      <div className={n.grid}>
        <div className={n.col}>
          <Card title="Hazır şablonlar" description="Seçtikten sonra metni düzenleyebilirsiniz." icon={LayoutTemplate} action={<Pill>{templates.length} şablon</Pill>}>
            <div className={n.templates}>
              {templates.map((template) => {
                const Icon = template.icon; const active = selectedTemplate === template.id;
                return (
                  <button key={template.id} type="button" onClick={() => applyTemplate(template)} aria-pressed={active} className={cx(n.template, active && n.templateOn)}>
                    <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className={n.templateIcon}><Icon size={17} /></span>{active && <CheckCircle2 size={17} style={{ color: "var(--green-2)" }} />}</span>
                    <b>{template.name}</b>
                    <small>{template.description}</small>
                    <Pill tone={template.category === "campaign" ? "violet" : "blue"}>{template.category === "campaign" ? "Kampanya" : "Hizmet"}</Pill>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Mesaj içeriği" description="Başlık ve açıklama her iki platformda aynı gönderilir." icon={Megaphone}>
            <div className={n.fields}>
              <label className={ui.field}>
                <span className={ui.fieldLabel}>Başlık <small className={title.length > 80 ? n.over : undefined}>{title.length}/80</small></span>
                <input className={ui.input} value={title} maxLength={80} onChange={(event) => { setTitle(event.target.value); setSelectedTemplate("custom"); }} />
              </label>
              <label className={ui.field}>
                <span className={ui.fieldLabel}>Mesaj <small className={body.length > 500 ? n.over : undefined}>{body.length}/500</small></span>
                <textarea className={ui.textarea} value={body} maxLength={500} rows={4} onChange={(event) => { setBody(event.target.value); setSelectedTemplate("custom"); }} />
              </label>
              <div className={n.row2}>
                <label className={ui.field}>
                  <span className={ui.fieldLabel}>Bildirim türü</span>
                  <select className={ui.select} value={category} onChange={(event) => setCategory(event.target.value as PushCategory)}><option value="service">Hizmet bildirimi</option><option value="campaign">Kampanya bildirimi</option></select>
                </label>
                <label className={ui.field}>
                  <span className={ui.fieldLabel}>Dokununca açılacak alan</span>
                  <select className={ui.select} value={destination} onChange={(event) => setDestination(event.target.value as PushDestination)}>{Object.entries(destinationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                </label>
              </div>
              {category === "campaign" && <div className={n.consent}><ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} /><div><b>İzinli pazarlama gönderimi</b>Yalnızca kampanya bildirimlerine açıkça izin veren kullanıcılar alıcı listesine eklenir. Sayaç gerçek izinli cihazları gösterir.</div></div>}
            </div>
          </Card>
        </div>

        <div className={cx(n.col, n.aside)}>
          <Card title="Hedef ve önizleme" description="Cihaz kaydındaki gerçek işletim sistemine göre seçilir." icon={Smartphone}>
            <div className={n.platforms} role="radiogroup" aria-label="Hedef platform">
              {(["all", "ios", "android"] as PushPlatform[]).map((item) => (
                <button key={item} type="button" role="radio" aria-checked={platform === item} onClick={() => setPlatform(item)} className={cx(n.platform, platform === item && n.platformOn)}>
                  {item === "all" ? "Tümü" : item === "ios" ? "iOS" : "Android"}
                  <small>{(item === "all" ? counts?.total : item === "ios" ? counts?.ios : counts?.android) ?? 0} cihaz</small>
                </button>
              ))}
            </div>
            <div className={n.phone} aria-label="Bildirim önizlemesi">
              <div className={cx(n.screen, platform === "android" && n.android)}>
                <div className={n.notch} />
                <div className={n.clock}>09:41</div>
                <div className={n.notif}>
                  <span className={n.notifIcon}><BellRing size={17} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className={n.notifTop}><b>SeninRandevun</b><small>şimdi</small></div>
                    <strong>{title || "Bildirim başlığı"}</strong>
                    <p>{body || "Bildirim açıklaması burada görünür."}</p>
                  </div>
                </div>
                <div className={n.dest}><span>{platformLabels[platform]}</span><span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>{destinationLabels[destination]} <ChevronRight size={12} /></span></div>
              </div>
            </div>
            <div className={n.target}>
              <span className={n.targetIcon}><UsersRound size={20} /></span>
              <div><b>{targetCount.toLocaleString("tr-TR")}</b><small>{category === "campaign" ? "Kampanya izni açık, etkin ve benzersiz cihaz" : "Etkin, geçerli ve benzersiz cihaz"}</small></div>
            </div>
            <Btn variant="primary" block icon={Send} disabled={!valid || targetCount === 0} onClick={() => setConfirming(true)} style={{ marginTop: 12 }}>Gönderimi kontrol et</Btn>
            {targetCount === 0 && <p className={ui.faint} style={{ margin: "8px 0 0", fontSize: 12, textAlign: "center" }}>Bu hedefte uygun cihaz yok.</p>}
          </Card>
        </div>
      </div>

      <StatGrid cols={3}>
        <StatCard label="Teslim oranı" value={`%${delivery.rate}`} hint="Son 30 gönderim" icon={BadgeCheck} tone="green" />
        <StatCard label="Başarılı teslim" value={delivery.success.toLocaleString("tr-TR")} hint="FCM tarafından kabul" icon={CheckCircle2} tone="lime" />
        <StatCard label="Kontrol gerekli" value={delivery.failures.toLocaleString("tr-TR")} hint="Başarısız cihaz" icon={CircleAlert} tone={delivery.failures ? "red" : "neutral"} onClick={() => setHistoryFilter("issues")} active={historyFilter === "issues"} />
      </StatGrid>

      <Card flush title="Son gönderimler" description="Kişisel veri içermeyen teslim özeti." icon={Activity}
        action={<IconBtn label="Gönderimleri yenile" icon={RefreshCw} spinning={refreshing} disabled={refreshing} onClick={() => void refresh()} />}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 16px 12px" }}>
          <SearchField value={historyQuery} onChange={setHistoryQuery} placeholder="Başlık veya mesaj ara" label="Gönderimlerde ara" />
          <Segmented label="Gönderim durumu" value={historyFilter} onChange={setHistoryFilter} options={[
            { value: "all", label: "Tümü", count: operations?.rows.length ?? 0 },
            { value: "sent", label: "Başarılı" },
            { value: "issues", label: "Sorunlu", count: issueCount, alert: issueCount > 0 },
          ]} />
        </div>
        {history.length === 0
          ? <EmptyState icon={BellRing} title="Bu filtrede gönderim bulunamadı" action={historyQuery || historyFilter !== "all" ? <Btn size="sm" onClick={() => { setHistoryQuery(""); setHistoryFilter("all"); }}>Filtreleri temizle</Btn> : undefined} />
          : <ResponsiveTable label="Son gönderimler" rows={history} columns={columns} rowKey={(row) => row.id} maxHeight="60vh"
            renderCard={(row) => <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: 14 }}>{row.title}</b><small className={ui.muted} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12.5 }}>{row.body}</small></div>
                <StatusPill status={row.status} />
              </div>
              <div className={ui.rowCardMeta}><span>{platformLabels[row.platform]}</span><span>·</span><span>{row.category === "campaign" ? "Kampanya" : "Hizmet"}</span><span>·</span><b style={{ color: "var(--green-2)" }}>{row.successCount}/{row.recipients} teslim</b><span>·</span><span>{row.createdAt ? relativeTime(millisOf(row), now) : "—"}</span></div>
            </>} />}
      </Card>

      <ConfirmSheet open={confirming} onClose={() => setConfirming(false)} onConfirm={submit} icon={Send} confirmLabel="Şimdi gönder"
        title="Gönderimi onayla"
        description={<>Bildirim <b>{platformLabels[platform]}</b> hedefindeki uygun cihazlara hemen gönderilecek. Bu işlem geri alınamaz.</>}>
        <div className={n.summary}>
          <div><span>Başlık</span><b>{title}</b></div>
          <div><span>Kesin hedef</span><b>{targetCount} cihaz</b></div>
          <div><span>Tür</span><b>{category === "campaign" ? "Kampanya (izinli)" : "Hizmet"}</b></div>
          <div><span>Açılacak alan</span><b>{destinationLabels[destination]}</b></div>
        </div>
      </ConfirmSheet>
    </AdminPage>
  );
}
