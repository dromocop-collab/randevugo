"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Clock4, Download, ExternalLink, Eye, Filter, Grid3x3, ListChecks, MonitorSmartphone, MousePointerClick,
  PartyPopper, Play, RefreshCw, Share2, Sparkles, Store, TrendingUp, UserRound,
} from "lucide-react";
import { QUESTIONS, RESULTS, type ResultType } from "@/app/anket/survey-data";
import {
  SURVEY_ADMIN_LIMIT, isPermissionDenied, listSurveyEvents, listSurveyResponses,
  type AdminSurveyEvent, type AdminSurveyResponse,
} from "@/features/survey/survey-admin-repository";
import {
  AdminPage, BarRow, Btn, Card, EmptyState, HeroStat, PageHeader, Pill, ResponsiveTable, Segmented, SkeletonList,
  StatCard, StatGrid, downloadCsv, fullDate, relativeTime, ui, type Column,
} from "../_pages-ui";
import c from "./anket.module.css";

const DAY = 86_400_000;
const PAGE_SIZE = 25;

type RangeKey = "7" | "30" | "90" | "all";
const RANGE_OPTIONS: ReadonlyArray<{ value: RangeKey; label: string }> = [
  { value: "7", label: "Son 7 gün" },
  { value: "30", label: "Son 30 gün" },
  { value: "90", label: "Son 90 gün" },
  { value: "all", label: "Tümü" },
];

const RESULT_ORDER = Object.keys(RESULTS) as ResultType[];
const DEVICE_LABEL: Record<string, string> = { mobile: "Mobil", tablet: "Tablet", desktop: "Masaüstü" };
const DEVICE_KEYS = ["mobile", "tablet", "desktop"] as const;
const SECTOR_QUESTION = QUESTIONS.find((question) => question.key === "tur");

/** soru anahtarı → seçenek kimliği → "emoji etiket" */
const OPTION_LABEL: Record<string, Record<string, string>> = Object.fromEntries(
  QUESTIONS.map((question) => [question.key, Object.fromEntries(question.options.map((option) => [option.id, `${option.emoji} ${option.label}`]))]),
);

function optionLabel(key: string, id: string | undefined) {
  if (!id) return "—";
  return OPTION_LABEL[key]?.[id] ?? id;
}

function resultLabel(type: string) {
  const result = RESULTS[type as ResultType];
  return result ? `${result.emoji} ${result.title}` : type || "—";
}

function percent(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : null;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `%${value.toLocaleString("tr-TR", { maximumFractionDigits: value < 10 ? 1 : 0 })}`;
}

function startOfDay(ms: number) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function n(value: number) {
  return value.toLocaleString("tr-TR");
}

type LoadState = {
  responses: AdminSurveyResponse[];
  events: AdminSurveyEvent[];
  responsesTruncated: boolean;
  eventsTruncated: boolean;
  responsesError: "" | "denied" | string;
  eventsError: "" | "denied" | string;
};

const EMPTY_STATE: LoadState = { responses: [], events: [], responsesTruncated: false, eventsTruncated: false, responsesError: "", eventsError: "" };

function errorText(reason: unknown) {
  if (isPermissionDenied(reason)) return "denied";
  return reason instanceof Error ? reason.message : "Veri alınamadı.";
}

export default function SurveyAdminPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("30");
  const [data, setData] = useState<LoadState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [reportTime, setReportTime] = useState(() => Date.now());
  const [visible, setVisible] = useState(PAGE_SIZE);

  const load = useCallback(async (key: RangeKey) => {
    setLoading(true);
    const now = Date.now();
    const since = key === "all" ? null : startOfDay(now - (Number(key) - 1) * DAY);
    const [responses, events] = await Promise.allSettled([listSurveyResponses(since), listSurveyEvents(since)]);
    setData({
      responses: responses.status === "fulfilled" ? responses.value.rows : [],
      responsesTruncated: responses.status === "fulfilled" && responses.value.truncated,
      responsesError: responses.status === "rejected" ? errorText(responses.reason) : "",
      events: events.status === "fulfilled" ? events.value.rows : [],
      eventsTruncated: events.status === "fulfilled" && events.value.truncated,
      eventsError: events.status === "rejected" ? errorText(events.reason) : "",
    });
    setReportTime(now);
    setVisible(PAGE_SIZE);
    setLoading(false);
    setLoadedOnce(true);
  }, []);

  useEffect(() => { queueMicrotask(() => void load(rangeKey)); }, [load, rangeKey]);

  const report = useMemo(() => {
    const { responses, events } = data;
    const eventCount = (type: string) => events.reduce((sum, event) => sum + (event.type === type ? 1 : 0), 0);
    const views = eventCount("view");
    const starts = eventCount("start");
    const completes = responses.length;
    const signups = eventCount("cta_signup");
    const customers = eventCount("cta_customer");
    const shares = eventCount("share");
    const restarts = eventCount("restart");
    const avgHours = completes ? responses.reduce((sum, row) => sum + row.hoursSaved, 0) / completes : 0;

    // Sonuç dağılımı
    const resultCounts = new Map<string, number>();
    responses.forEach((row) => resultCounts.set(row.resultType, (resultCounts.get(row.resultType) ?? 0) + 1));

    // Soru bazında cevaplar
    const questionCounts = QUESTIONS.map((question) => {
      const counts = new Map<string, number>();
      responses.forEach((row) => {
        const id = row.answers[question.key];
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
      });
      const known = question.options.map((option) => ({ id: option.id, label: `${option.emoji} ${option.label}`, value: counts.get(option.id) ?? 0 }));
      const unknown = [...counts.entries()].filter(([id]) => !question.options.some((option) => option.id === id)).reduce((sum, [, value]) => sum + value, 0);
      const answered = [...counts.values()].reduce((sum, value) => sum + value, 0);
      const top = known.reduce((best, row) => (row.value > best.value ? row : best), known[0]);
      return { question, rows: known, unknown, answered, top };
    });

    // Sektör × sonuç
    const sectors = (SECTOR_QUESTION?.options ?? []).map((option) => {
      const rows = responses.filter((row) => row.answers.tur === option.id);
      const byResult = new Map<string, number>();
      rows.forEach((row) => byResult.set(row.resultType, (byResult.get(row.resultType) ?? 0) + 1));
      const dominant = RESULT_ORDER.reduce<{ type: ResultType | null; value: number }>(
        (best, type) => ((byResult.get(type) ?? 0) > best.value ? { type, value: byResult.get(type) ?? 0 } : best),
        { type: null, value: 0 },
      );
      const hours = rows.length ? rows.reduce((sum, row) => sum + row.hoursSaved, 0) / rows.length : 0;
      return { option, total: rows.length, byResult, dominant, hours };
    }).sort((a, b) => b.total - a.total);

    // Cihazlar
    const deviceSplit = (list: Array<{ device: string }>) => DEVICE_KEYS.map((key) => ({ key, value: list.filter((row) => row.device === key).length }));
    const responseDevices = deviceSplit(responses);
    const viewDevices = deviceSplit(events.filter((event) => event.type === "view"));

    // Günlük / haftalık trend
    const times = [...responses.map((row) => row.createdAtMs), ...events.map((event) => event.createdAtMs)].filter((value): value is number => typeof value === "number");
    const today = startOfDay(reportTime);
    const firstDay = rangeKey === "all"
      ? (times.length ? startOfDay(Math.min(...times)) : today - 6 * DAY)
      : today - (Number(rangeKey) - 1) * DAY;
    const spanDays = Math.max(1, Math.round((today - firstDay) / DAY) + 1);
    const bucketDays = spanDays > 120 ? 7 : 1;
    const bucketCount = Math.ceil(spanDays / bucketDays);
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const start = firstDay + index * bucketDays * DAY;
      return {
        key: String(start),
        label: new Date(start).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
        completes: 0,
        signups: 0,
      };
    });
    const bucketOf = (ms: number | null) => {
      if (ms === null) return -1;
      const index = Math.floor(Math.round((startOfDay(ms) - firstDay) / DAY) / bucketDays);
      return index >= 0 && index < bucketCount ? index : -1;
    };
    responses.forEach((row) => { const index = bucketOf(row.createdAtMs); if (index >= 0) buckets[index].completes += 1; });
    events.forEach((event) => { if (event.type !== "cta_signup") return; const index = bucketOf(event.createdAtMs); if (index >= 0) buckets[index].signups += 1; });

    return {
      views, starts, completes, signups, customers, shares, restarts, avgHours,
      resultCounts, questionCounts, sectors, responseDevices, viewDevices, buckets, bucketDays,
    };
  }, [data, rangeKey, reportTime]);

  const recent = useMemo(
    () => [...data.responses].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)),
    [data.responses],
  );

  function exportCsv() {
    downloadCsv(`anket-cevaplari-${rangeKey === "all" ? "tumu" : `${rangeKey}-gun`}.csv`, [
      ["Tarih", "Sonuç", "Kazanılacak saat (hafta)", "Cihaz", ...QUESTIONS.map((question) => question.title)],
      ...recent.map((row) => [
        row.createdAtMs ? new Date(row.createdAtMs).toLocaleString("tr-TR") : "",
        RESULTS[row.resultType as ResultType]?.title ?? row.resultType,
        String(row.hoursSaved),
        DEVICE_LABEL[row.device] ?? row.device,
        ...QUESTIONS.map((question) => {
          const id = row.answers[question.key];
          const option = question.options.find((item) => item.id === id);
          return option?.label ?? id ?? "";
        }),
      ]),
    ]);
  }

  const bothDenied = data.responsesError === "denied" && data.eventsError === "denied";
  const anyDenied = data.responsesError === "denied" || data.eventsError === "denied";
  const otherErrors = [data.responsesError, data.eventsError].filter((value) => value && value !== "denied");
  const hasData = data.responses.length > 0 || data.events.length > 0;
  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === rangeKey)?.label ?? "";

  const completionRate = percent(report.completes, report.starts);
  const startRate = percent(report.starts, report.views);
  const signupRate = percent(report.signups, report.completes);

  const columns: Column<AdminSurveyResponse>[] = [
    { key: "time", header: "Zaman", width: 170, cell: (row) => <span title={fullDate(row.createdAtMs)}>{relativeTime(row.createdAtMs, reportTime)}</span> },
    { key: "sector", header: "Sektör", cell: (row) => optionLabel("tur", row.answers.tur) },
    { key: "result", header: "Sonuç", cell: (row) => <Pill tone="green">{resultLabel(row.resultType)}</Pill> },
    { key: "channel", header: "Kanal", cell: (row) => <span className={ui.muted}>{optionLabel("kanal", row.answers.kanal)}</span> },
    { key: "hours", header: "Saat/hafta", align: "right", width: 100, cell: (row) => <b>~{row.hoursSaved}</b> },
    { key: "device", header: "Cihaz", width: 110, cell: (row) => DEVICE_LABEL[row.device] ?? row.device },
  ];

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Anket hunisi"
        icon={PartyPopper}
        title="Randevu karakter testi nasıl gidiyor?"
        description="/anket sayfasının görüntülenme → başlama → tamamlama → kayıt hunisi, karakter dağılımı ve soru bazında cevaplar. Kişisel veri toplanmaz."
        meta={<>
          <HeroStat label="cevap" value={n(data.responses.length)} />
          <HeroStat label="olay" value={n(data.events.length)} />
          <HeroStat label="" value={rangeLabel} />
        </>}
        actions={<>
          <a href="/anket" target="_blank" rel="noreferrer" className={`${ui.btn} ${ui.btnOnDark}`}><ExternalLink size={15} aria-hidden /> Anketi aç</a>
          <Btn variant="onDark" icon={Download} disabled={!data.responses.length} onClick={exportCsv}>CSV</Btn>
          <Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void load(rangeKey)}>Yenile</Btn>
        </>}
      />

      <div className={c.rangeRow}>
        <Segmented label="Zaman aralığı" value={rangeKey} onChange={setRangeKey} options={RANGE_OPTIONS} />
        <span className={ui.faint} style={{ fontSize: 12 }}>Sorgu başına en fazla {n(SURVEY_ADMIN_LIMIT)} kayıt</span>
      </div>

      {anyDenied && (
        <div className={ui.notice} role="alert">
          <span>
            <b>Okuma izni yok.</b>{" "}
            {bothDenied ? "surveyResponses ve surveyEvents" : data.responsesError === "denied" ? "surveyResponses" : "surveyEvents"} koleksiyonlarını
            okumak için Firestore kurallarının yayınlanması gerekiyor: <code>firebase deploy --only firestore:rules</code>. Kurallar
            yayınlanana kadar bu sayfa boş görünür (giriş yapan hesabın platform admini olduğundan da emin olun).
          </span>
        </div>
      )}
      {otherErrors.length > 0 && <div className={ui.errorBox} role="alert"><p>{otherErrors.join(" · ")}</p><Btn size="sm" onClick={() => void load(rangeKey)}>Yeniden dene</Btn></div>}
      {(data.responsesTruncated || data.eventsTruncated) && (
        <div className={ui.notice}>
          <span>Bu aralıkta {n(SURVEY_ADMIN_LIMIT)}+ kayıt var; yalnızca en yeni {n(SURVEY_ADMIN_LIMIT)} {data.responsesTruncated && data.eventsTruncated ? "cevap ve olay" : data.responsesTruncated ? "cevap" : "olay"} hesaba katıldı. Daha kısa bir aralık seçin.</span>
        </div>
      )}

      <StatGrid>
        <StatCard label="Görüntülenme" value={n(report.views)} hint="oturum başına 1" icon={Eye} tone="blue" />
        <StatCard label="Başlayan" value={n(report.starts)} hint={`görüntüleyenlerin ${formatPercent(startRate)}`} icon={Play} tone="violet" />
        <StatCard label="Tamamlayan" value={n(report.completes)} hint="kaydedilen cevap" icon={ListChecks} tone="green" />
        <StatCard label="Tamamlama oranı" value={formatPercent(completionRate)} hint="tamamlayan / başlayan" icon={TrendingUp} tone="lime" />
        <StatCard label="“İşletmeni aç” tıklaması" value={n(report.signups)} hint={`dönüşüm ${formatPercent(signupRate)} (tamamlayana göre)`} icon={Store} tone="green" />
        <StatCard label="Müşteri / Keşfet" value={n(report.customers)} hint="“Ben müşteriyim” tıklaması" icon={UserRound} tone="blue" />
        <StatCard label="Paylaşım" value={n(report.shares)} hint={`${n(report.restarts)} kez tekrar oynandı`} icon={Share2} tone="violet" />
        <StatCard label="Ort. kazanılacak saat" value={report.completes ? `~${report.avgHours.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : "—"} hint="haftada, tahmini" icon={Clock4} tone="amber" />
      </StatGrid>

      {loading && !loadedOnce ? <SkeletonList rows={3} height={220} /> : !hasData ? (
        <div className={ui.card}>
          <EmptyState
            icon={PartyPopper}
            title={anyDenied ? "Veriler okunamadı" : "Bu aralıkta henüz veri yok"}
            description={anyDenied
              ? "Firestore kuralları yayınlandıktan sonra cevaplar ve huni olayları burada görünecek."
              : "Anket görüntülendikçe ve tamamlandıkça huni, grafikler ve dağılımlar burada oluşacak."}
            action={<a href="/anket" target="_blank" rel="noreferrer" className={ui.btn}><ExternalLink size={15} aria-hidden /> /anket sayfasını aç</a>}
          />
        </div>
      ) : <>
        <div className={c.grid}>
          <Card title="Günlük trend" description={report.bucketDays > 1 ? "Haftalık tamamlama ve “İşletmeni aç” tıklaması" : "Günlük tamamlama ve “İşletmeni aç” tıklaması"} icon={TrendingUp}>
            <TrendChart buckets={report.buckets} />
          </Card>
          <Card title="Huni" description="Adımlar arası geçiş oranı" icon={Filter}>
            <Funnel steps={[
              { label: "Görüntülenme", value: report.views, icon: Eye },
              { label: "Teste başladı", value: report.starts, icon: Play },
              { label: "Tamamladı", value: report.completes, icon: ListChecks },
              { label: "İşletmeni aç", value: report.signups, icon: Store },
            ]} />
            <p className={c.note}>Tamamlama, kaydedilen cevaplardan sayılır. Olay takibi cevaplardan sonra başladıysa oranlar %100’ü aşabilir.</p>
          </Card>
        </div>

        <div className={c.grid2}>
          <Card title="Karakter dağılımı" description={`${n(report.completes)} tamamlanan testin sonucu`} icon={Sparkles}>
            <ResultBars counts={report.resultCounts} total={report.completes} />
          </Card>
          <Card title="Cihaz dağılımı" description="Görüntüleyenler ve tamamlayanlar" icon={MonitorSmartphone}>
            <div className={c.deviceBlocks}>
              <DeviceStack title="Görüntüleyenler" rows={report.viewDevices} />
              <DeviceStack title="Tamamlayanlar" rows={report.responseDevices} />
            </div>
          </Card>
        </div>

        <Card title="Sektör × karakter" description="Hangi sektör hangi karakterde yoğunlaşıyor? Hücre yoğunluğu satır içi payı gösterir." icon={Grid3x3}>
          <SectorInsights sectors={report.sectors} total={report.completes} />
          <SectorMatrix sectors={report.sectors} />
        </Card>

        <section className={c.questions} aria-label="Soru bazında cevaplar">
          {report.questionCounts.map(({ question, rows, unknown, answered, top }, index) => (
            <Card key={question.key} title={<><span className={c.qIndex}>{index + 1}</span>{question.title}</>} description={answered ? `${n(answered)} cevap · en çok: ${top.value ? top.label : "—"}` : "Henüz cevap yok"}>
              <div className={c.rank}>
                {rows.map((row) => <BarRow key={row.id} label={row.label} value={row.value} total={answered} />)}
                {unknown > 0 && <BarRow label="Eski / bilinmeyen seçenek" value={unknown} total={answered} />}
              </div>
            </Card>
          ))}
        </section>

        <Card title="Son cevaplar" description={`${n(recent.length)} cevap · en yeni önce`} icon={MousePointerClick} flush
          action={<Btn size="sm" icon={Download} disabled={!recent.length} onClick={exportCsv}>CSV</Btn>}>
          {recent.length === 0 ? <EmptyState title="Bu aralıkta cevap yok" /> : <>
            <ResponsiveTable
              label="Son anket cevapları"
              rows={recent.slice(0, visible)}
              columns={columns}
              rowKey={(row) => row.id}
              renderCard={(row) => (
                <div className={c.mobileRow}>
                  <div className={c.mobileTop}><b>{resultLabel(row.resultType)}</b><span className={ui.faint}>{relativeTime(row.createdAtMs, reportTime)}</span></div>
                  <span className={ui.muted}>{optionLabel("tur", row.answers.tur)} · ~{row.hoursSaved} saat/hafta · {DEVICE_LABEL[row.device] ?? row.device}</span>
                </div>
              )}
            />
            {visible < recent.length && (
              <div className={ui.loadMore}><Btn onClick={() => setVisible((value) => value + PAGE_SIZE)}>Daha fazla göster ({n(recent.length - visible)})</Btn></div>
            )}
          </>}
        </Card>
      </>}
    </AdminPage>
  );
}

/* ───────────── Grafikler ───────────── */

type Bucket = { key: string; label: string; completes: number; signups: number };

function TrendChart({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((bucket) => Math.max(bucket.completes, bucket.signups)));
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 7));
  const count = buckets.length;
  const points = buckets.map((bucket, index) => `${((index + 0.5) / count) * 100},${100 - (bucket.signups / niceMax) * 100}`).join(" ");
  const totalCompletes = buckets.reduce((sum, bucket) => sum + bucket.completes, 0);
  const totalSignups = buckets.reduce((sum, bucket) => sum + bucket.signups, 0);
  return (
    <figure className={c.chart} role="img" aria-label={`Trend grafiği: toplam ${totalCompletes} tamamlama, ${totalSignups} kayıt tıklaması`}>
      <div className={c.plot}>
        {[1, 0.75, 0.5, 0.25, 0].map((ratio) => <div key={ratio} className={c.gridLine} style={{ bottom: `${ratio * 100}%` }}><span>{Math.round(niceMax * ratio)}</span></div>)}
        <div className={c.bars} style={{ gap: count > 45 ? 1 : 3 }}>
          {buckets.map((bucket) => (
            <div key={bucket.key} className={c.barCol} title={`${bucket.label}: ${bucket.completes} tamamlama · ${bucket.signups} “İşletmeni aç”`}>
              <span className={c.barTip}>{bucket.completes} / {bucket.signups}</span>
              <i className={c.bar} style={{ height: `${(bucket.completes / niceMax) * 100}%` }} />
            </div>
          ))}
        </div>
        {totalSignups > 0 && (
          <svg className={c.line} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>
      <div className={c.xAxis}>{buckets.map((bucket, index) => <span key={bucket.key}>{index % labelEvery === 0 ? bucket.label : ""}</span>)}</div>
      <figcaption className={c.legendRow}>
        <span><i className={c.swatchBar} /> Tamamlama ({n(totalCompletes)})</span>
        <span><i className={c.swatchLine} /> “İşletmeni aç” ({n(totalSignups)})</span>
      </figcaption>
    </figure>
  );
}

function Funnel({ steps }: { steps: Array<{ label: string; value: number; icon: React.ElementType }> }) {
  const max = Math.max(1, ...steps.map((step) => step.value));
  return (
    <ol className={c.funnel}>
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1].value : null;
        const rate = previous !== null ? percent(step.value, previous) : null;
        const Icon = step.icon;
        return (
          <li key={step.label}>
            {previous !== null && (
              <span className={c.funnelDrop}>
                ↓ {formatPercent(rate)} geçti
                {rate !== null && rate < 100 && <small> · %{Math.round(100 - rate)} kayıp</small>}
              </span>
            )}
            <div className={c.funnelStep}>
              <span className={c.funnelLabel}><Icon size={14} aria-hidden /> {step.label}</span>
              <b>{n(step.value)}</b>
            </div>
            <div className={c.funnelTrack}>
              <i className={c.funnelFill} style={{ width: `${step.value ? Math.max(2, (step.value / max) * 100) : 0}%`, "--step": index } as CSSProperties} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ResultBars({ counts, total }: { counts: Map<string, number>; total: number }) {
  const rows = RESULT_ORDER.map((type) => ({ type, value: counts.get(type) ?? 0 })).sort((a, b) => b.value - a.value);
  return (
    <ul className={c.results}>
      {rows.map(({ type, value }) => {
        const result = RESULTS[type];
        const share = percent(value, total) ?? 0;
        return (
          <li key={type}>
            <span className={c.resultEmoji} style={{ background: `linear-gradient(135deg, ${result.accent[0]}, ${result.accent[1]})` }} aria-hidden>{result.emoji}</span>
            <div className={c.resultBody}>
              <div className={c.resultHead}><span>{result.title}</span><b>{n(value)} <small>{formatPercent(total ? share : null)}</small></b></div>
              <div className={c.resultTrack}><i style={{ width: `${value ? Math.max(3, share) : 0}%`, background: `linear-gradient(90deg, ${result.accent[0]}, ${result.accent[1]})` }} /></div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DeviceStack({ title, rows }: { title: string; rows: Array<{ key: string; value: number }> }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <div className={c.device}>
      <div className={c.deviceHead}><span>{title}</span><b>{n(total)}</b></div>
      <div className={c.stack} role="img" aria-label={`${title}: ${rows.map((row) => `${DEVICE_LABEL[row.key]} ${row.value}`).join(", ")}`}>
        {total === 0 ? <i className={c.stackEmpty} /> : rows.map((row) => row.value > 0 && (
          <i key={row.key} className={c[`dev-${row.key}`]} style={{ width: `${(row.value / total) * 100}%` }} title={`${DEVICE_LABEL[row.key]}: ${row.value}`} />
        ))}
      </div>
      <ul className={c.deviceLegend}>
        {rows.map((row) => (
          <li key={row.key}><i className={c[`dev-${row.key}`]} /> {DEVICE_LABEL[row.key]} <b>{formatPercent(percent(row.value, total))}</b></li>
        ))}
      </ul>
    </div>
  );
}

type SectorRow = {
  option: { id: string; emoji: string; label: string };
  total: number;
  byResult: Map<string, number>;
  dominant: { type: ResultType | null; value: number };
  hours: number;
};

function SectorInsights({ sectors, total }: { sectors: SectorRow[]; total: number }) {
  const top = sectors.filter((sector) => sector.total > 0).slice(0, 3);
  if (!top.length) return null;
  return (
    <ul className={c.insights}>
      {top.map((sector, index) => {
        const dominant = sector.dominant.type ? RESULTS[sector.dominant.type] : null;
        return (
          <li key={sector.option.id}>
            <span className={c.insightRank}>{index + 1}</span>
            <div>
              <b>{sector.option.emoji} {sector.option.label}</b> <span className={ui.faint}>· katılımın {formatPercent(percent(sector.total, total))}</span>
              <p>
                {dominant ? <>Baskın karakter <b>{dominant.emoji} {dominant.title}</b> ({formatPercent(percent(sector.dominant.value, sector.total))})</> : "—"}
                {" · "}ort. ~{sector.hours.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} saat/hafta
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SectorMatrix({ sectors }: { sectors: SectorRow[] }) {
  return (
    <div className={c.matrixWrap}>
      <table className={c.matrix}>
        <thead>
          <tr>
            <th scope="col">Sektör</th>
            <th scope="col" className={c.num}>Toplam</th>
            {RESULT_ORDER.map((type) => <th key={type} scope="col" className={c.center} title={RESULTS[type].title}><span aria-hidden>{RESULTS[type].emoji}</span><span className="sr-only">{RESULTS[type].title}</span></th>)}
            <th scope="col" className={c.num}>Ort. saat</th>
          </tr>
        </thead>
        <tbody>
          {sectors.map((sector) => (
            <tr key={sector.option.id} className={sector.total ? undefined : c.dimRow}>
              <th scope="row">{sector.option.emoji} {sector.option.label}</th>
              <td className={c.num}><b>{n(sector.total)}</b></td>
              {RESULT_ORDER.map((type) => {
                const value = sector.byResult.get(type) ?? 0;
                const share = sector.total ? value / sector.total : 0;
                const isTop = sector.dominant.type === type && value > 0;
                return (
                  <td key={type} className={c.center}>
                    <span className={`${c.heat} ${share > 0.55 ? c.heatStrong : ""} ${isTop ? c.heatTop : ""}`} style={{ "--heat": share } as CSSProperties} title={`${sector.option.label} · ${RESULTS[type].title}: ${value}`}>
                      {value || ""}
                    </span>
                  </td>
                );
              })}
              <td className={c.num}>{sector.total ? `~${sector.hours.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
