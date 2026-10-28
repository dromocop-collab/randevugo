"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import {
  CheckCircle2, CircleAlert, Clock3, ExternalLink, MessageSquareText, FileUp, HandHelping, Inbox, LifeBuoy, MessageCircleHeart, Power, PowerOff,
  RefreshCw, Reply, Send, SkipForward, TriangleAlert, UserX, Wrench,
} from "lucide-react";
import Link from "@/i18n/link";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { logSupportSession, startSupportSession } from "@/features/businesses/support-mode";
import {
  getWhatsAppOnboarding, sendWhatsAppOnboardingTest, submitWhatsAppOnboardingTemplates, updateWhatsAppOnboarding,
  type OnboardingJob, type OnboardingOverview, type OnboardingStepKey, type OnboardingStepStatus,
} from "@/features/whatsapp/whatsapp-onboarding-repository";
import {
  AdminPage, Btn, Card, Chips, ConfirmSheet, EmptyState, HeroStat, PageHeader, Pill, SkeletonList, StatCard, StatGrid,
  cx, relativeTime, ui, useNow, type Tone,
} from "../_pages-ui";
import s from "./karsilama.module.css";

const TEMPLATE_STATUS: Record<string, { label: string; tone: Tone }> = {
  APPROVED: { label: "Onaylı", tone: "green" },
  PENDING: { label: "Meta inceliyor", tone: "amber" },
  IN_APPEAL: { label: "İtirazda", tone: "amber" },
  REJECTED: { label: "Reddedildi", tone: "red" },
  PAUSED: { label: "Duraklatıldı", tone: "red" },
  DISABLED: { label: "Devre dışı", tone: "red" },
};
const STEP_STATUS: Record<OnboardingStepStatus, { label: string; tone: Tone }> = {
  sent: { label: "Gönderildi", tone: "green" },
  pending: { label: "Bekliyor", tone: "blue" },
  skipped: { label: "Atlandı", tone: "neutral" },
  failed: { label: "Hata", tone: "red" },
  none: { label: "—", tone: "neutral" },
};
const JOB_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Devam ediyor", tone: "blue" },
  done: { label: "Tamamlandı", tone: "green" },
  opted_out: { label: "DUR dedi", tone: "amber" },
};

type Filter = "all" | "help" | "active" | "opted_out";

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

function delayLabel(ms: number) {
  if (ms < 3_600_000) return `Kayıttan ${Math.round(ms / 60_000)} dk sonra`;
  const days = Math.round(ms / 86_400_000);
  return days >= 20 ? "Deneme bitimine 5 gün kala" : `Kayıttan ${days} gün sonra`;
}

/** WhatsApp biçimi: *kalın* → <b>; satır sonları korunur. */
function WhatsAppText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return <>{parts.map((part, index) => part.startsWith("*") && part.endsWith("*") && part.length > 2 ? <b key={index}>{part.slice(1, -1)}</b> : <Fragment key={index}>{part}</Fragment>)}</>;
}

export default function WhatsAppOnboardingPage() {
  const now = useNow();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<OnboardingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"on" | "off" | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getWhatsAppOnboarding()); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const enabled = data?.settings.enabled === true;
  const approved = data ? data.steps.filter((step) => step.templateStatus?.status === "APPROVED").length : 0;
  const missingTemplates = data ? data.steps.filter((step) => !step.templateStatus).length : 0;
  const totalSent = data?.stats.reduce((sum, row) => sum + row.sent, 0) ?? 0;
  const jobs = useMemo(() => (data?.jobs ?? []).filter((job) =>
    filter === "all" ? true : filter === "help" ? Boolean(job.helpRequestedAt) : job.status === filter), [data, filter]);

  async function setEnabled(next: boolean) {
    try {
      await updateWhatsAppOnboarding({ enabled: next });
      toast.success(next ? "Karşılama akışı açıldı." : "Karşılama akışı kapatıldı.");
      await load();
    } catch (error) { toast.error(errorMessage(error)); throw error; }
  }

  async function toggleStep(key: OnboardingStepKey, value: boolean) {
    setBusy(`step:${key}`);
    try { await updateWhatsAppOnboarding({ steps: { [key]: value } }); await load(); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(null); }
  }

  async function submitTemplates() {
    setBusy("templates");
    try {
      const { results } = await submitWhatsAppOnboardingTemplates();
      toast.success("Şablonlar Meta'ya gönderildi.", { description: results.map((row) => `${row.name}: ${row.result}`).join(" · ") });
      await load();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(null); }
  }

  async function sendTest(key: OnboardingStepKey) {
    if (!testPhone.trim()) { toast.error("Önce sağdaki kutuya test numarasını yaz."); return; }
    setBusy(`test:${key}`);
    try {
      await sendWhatsAppOnboardingTest(key, testPhone);
      toast.success("Test mesajı gönderildi.", { description: "Birkaç saniye içinde telefona düşer; WhatsApp Gelen Kutusu'nda da görünür." });
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(null); }
  }

  function openSupport(job: OnboardingJob) {
    if (user) logSupportSession(job.businessId, user.uid);
    startSupportSession(job.businessId, job.businessName);
    router.push("/dashboard");
  }

  const banner: { tone: string; icon: typeof CheckCircle2; title: string; text: string } | null = !data ? null
    : !data.channelEnabled ? { tone: "warn", icon: TriangleAlert, title: "WhatsApp kanalı kapalı", text: "Karşılama mesajları için önce WhatsApp Kanalı sayfasından kanalı açmalısın." }
      : enabled ? { tone: "success", icon: CheckCircle2, title: "Karşılama akışı açık", text: "Yeni kayıt olan her işletme sahibine adımlar sırayla, sadece gerektiğinde gidiyor. DUR yazan kişiye bir daha mesaj gitmez." }
        : approved === data.steps.length ? { tone: "ready", icon: CheckCircle2, title: "Şablonlar onaylı, akış kapalı", text: "Açtığında bundan sonra kayıt olanlara mesajlar başlar. Daha önce kayıt olmuş işletmelere geriye dönük mesaj gitmez." }
          : { tone: "warn", icon: Clock3, title: "Şablonlar onay bekliyor", text: missingTemplates ? "Önce şablonları Meta'ya gönder. Onay genelde birkaç dakika ile 24 saat arası sürer." : "Meta şablonları inceliyor. Hepsi onaylanınca akışı açabilirsin." };

  return (
    <AdminPage>
      <PageHeader eyebrow="WhatsApp" icon={MessageCircleHeart} title="Karşılama akışı"
        description="Yeni kayıt olan işletme sahibine Senin Randevun numarasından otomatik, akıllı WhatsApp mesajları: hoş geldin, kurulum hatırlatma, ilk randevu ipucu ve deneme bitişi."
        meta={<>
          <HeroStat label="akış" value={!data ? "…" : enabled ? "Açık" : "Kapalı"} />
          <HeroStat label="onaylı şablon" value={data ? `${approved}/${data.steps.length}` : "…"} />
          <HeroStat label="gönderilen" value={totalSent.toLocaleString("tr-TR")} />
        </>}
        actions={<Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void load()}>Yenile</Btn>}
      />

      {loading && !data ? <SkeletonList rows={4} height={110} /> : !data ? (
        <EmptyState icon={TriangleAlert} title="Bilgiler alınamadı" description="Yenile'ye bas; sorun sürerse 'sms' fonksiyon grubunun gönderildiğinden emin ol." />
      ) : (
        <>
          {banner ? (
            <div className={cx(s.banner, s[`banner-${banner.tone}`])} role="status">
              <banner.icon size={22} aria-hidden />
              <div><b>{banner.title}</b><p>{banner.text}</p></div>
              {missingTemplates > 0
                ? <Btn variant="primary" icon={FileUp} loading={busy === "templates"} onClick={() => void submitTemplates()}>Şablonları Meta&apos;ya gönder</Btn>
                : enabled
                  ? <Btn icon={PowerOff} onClick={() => setConfirm("off")}>Akışı kapat</Btn>
                  : <Btn variant="primary" icon={Power} disabled={!data.channelEnabled || approved === 0} onClick={() => setConfirm("on")}>Akışı aç</Btn>}
            </div>
          ) : null}
          {data.templateError ? <p className={s.warnLine}><CircleAlert size={14} aria-hidden /> Şablon durumu alınamadı: {data.templateError}</p> : null}

          <StatGrid cols={4}>
            <StatCard icon={Send} label="Gönderilen mesaj" value={totalSent.toLocaleString("tr-TR")} hint="Son 60 kayıt" />
            <StatCard icon={HandHelping} label="Yardım isteyen" tone={data.helpRequests ? "amber" : "neutral"} value={data.helpRequests.toLocaleString("tr-TR")} hint="“Benim yerime kurun” dedi" onClick={() => setFilter("help")} active={filter === "help"} />
            <StatCard icon={SkipForward} label="Gereksiz diye atlanan" value={(data.stats.reduce((sum, row) => sum + row.skipped, 0)).toLocaleString("tr-TR")} hint="Kurulumu bitmiş, randevu almış…" />
            <StatCard icon={UserX} label="DUR diyen" tone={data.optOuts ? "amber" : "neutral"} value={data.optOuts.toLocaleString("tr-TR")} hint="Bir daha mesaj gitmez" onClick={() => setFilter("opted_out")} active={filter === "opted_out"} />
          </StatGrid>

          <div className={s.grid}>
            <Card title="Adımlar" icon={Clock3} description="Her adım gönderilmeden önce işletmenin durumuna bakılır; gereksizse atlanır.">
              <ol className={s.timeline}>
                {data.steps.map((step, index) => {
                  const status = step.templateStatus ? TEMPLATE_STATUS[step.templateStatus.status] ?? { label: step.templateStatus.status, tone: "neutral" as Tone } : { label: "Oluşturulmadı", tone: "red" as Tone };
                  const stat = data.stats.find((row) => row.key === step.key);
                  const on = data.settings.steps[step.key];
                  return (
                    <li key={step.key} className={cx(s.step, !on && s.stepOff)} style={{ animationDelay: `${index * 70}ms` }}>
                      <span className={s.dot} aria-hidden>{index + 1}</span>
                      <div className={s.stepBody}>
                        <div className={s.stepHead}>
                          <span><b>{step.label}</b><small>{delayLabel(step.delayMs)} · <code>{step.template}</code></small></span>
                          <span className={s.stepActions}>
                            <Pill tone={status.tone} dot title={step.templateStatus?.rejectedReason ?? undefined}>{status.label}</Pill>
                            <label className={s.switch} title={on ? "Adımı kapat" : "Adımı aç"}>
                              <input type="checkbox" checked={on} disabled={busy === `step:${step.key}`} onChange={(event) => void toggleStep(step.key, event.target.checked)} />
                              <span aria-hidden />
                              <em className="sr-only">{step.label} adımı</em>
                            </label>
                          </span>
                        </div>
                        <div className={s.phone}>
                          <div className={s.bubble}>
                            <p><WhatsAppText text={step.preview} /></p>
                            <span className={s.time}>10:24</span>
                          </div>
                          {step.buttons.length ? (
                            <div className={s.bubbleButtons}>
                              {step.buttons.map((button) => (
                                <span key={button.text}>{button.type === "URL" ? <ExternalLink size={13} aria-hidden /> : <Reply size={13} aria-hidden />}{button.text}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className={s.stepFoot}>
                          <small>{stat ? `${stat.sent} gönderildi · ${stat.pending} bekliyor · ${stat.skipped} atlandı${stat.failed ? ` · ${stat.failed} hata` : ""}` : "—"}</small>
                          <Btn size="sm" icon={Send} loading={busy === `test:${step.key}`} disabled={step.templateStatus?.status !== "APPROVED"} onClick={() => void sendTest(step.key)} title={step.templateStatus?.status === "APPROVED" ? undefined : "Şablon onaylanınca test edilebilir"}>Test gönder</Btn>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <div className={s.side}>
              <Card title="Test numarası" icon={Send} description="Adımlardaki “Test gönder” bu numaraya örnek verilerle gönderir.">
                <label className={ui.field}><span className={ui.fieldLabel}>Telefon</span>
                  <input className={ui.input} type="tel" inputMode="tel" placeholder="05XX XXX XX XX" value={testPhone} onChange={(event) => setTestPhone(event.target.value)} />
                </label>
              </Card>
              <Card title="Nasıl çalışır?" icon={Wrench}>
                <ul className={s.rules}>
                  <li><b>Sadece ilk mağaza:</b> şube açanlara ve senin açtığın mağazalara gitmez.</li>
                  <li><b>Akıllı atlama:</b> kurulumu bitene hatırlatma, randevu alana ipucu, paket alana deneme mesajı gitmez.</li>
                  <li><b>DUR / BAŞLAT:</b> kişi DUR yazınca tüm akış durur, BAŞLAT ile geri açılır.</li>
                  <li><b>“Benim yerime kurun”:</b> düğmeye basan olursa telefonuna bildirim gelir; tek tıkla panelini destek modunda açıp kurarsın.</li>
                  <li><b>SMS yedeği:</b> hoş geldin WhatsApp&apos;tan gidemezse (numarada WhatsApp yoksa) yerine tek, ayrıntılı bir karşılama SMS&apos;i gider: panel linki ve iletişim numaramızla. Diğer adımlar SMS&apos;e düşmez.</li>
                  <li><b>Gelen kutusu:</b> giden her mesajın kopyası ve gelen cevaplar WhatsApp Gelen Kutusu&apos;nda.</li>
                </ul>
                <p className={s.note}>Mesajlar Meta&apos;nın bilgilendirme (utility) kategorisinde; ücret Meta&apos;nın konuşma fiyatlandırmasına göre WhatsApp hesabından düşer.</p>
              </Card>
            </div>
          </div>

          <Card title="Son kayıtlar" icon={Inbox} description="Akışa giren son 60 işletme ve adımlarının durumu">
            <Chips label="Filtre" value={filter} onChange={setFilter} options={[
              { value: "all", label: "Tümü" }, { value: "help", label: "Yardım isteyen" }, { value: "active", label: "Devam eden" }, { value: "opted_out", label: "DUR diyen" },
            ]} />
            {jobs.length === 0 ? <EmptyState icon={Inbox} title="Bu filtrede kayıt yok" description={enabled ? "Yeni işletme kayıt oldukça burada listelenir." : "Akış açılınca yeni kayıtlar burada görünür."} /> : (
              <ul className={s.jobs}>
                {jobs.map((job) => {
                  const jobStatus = JOB_STATUS[job.status] ?? { label: job.status, tone: "neutral" as Tone };
                  return (
                    <li key={job.businessId} className={cx(s.job, Boolean(job.helpRequestedAt) && s.jobHelp)}>
                      <div className={s.jobMain}>
                        <span className={s.jobTitle}>
                          <b>{job.businessName || "İşletme"}</b>
                          <Pill tone={jobStatus.tone} dot>{jobStatus.label}</Pill>
                          {job.smsWelcome ? <Pill tone={job.smsWelcome.status === "sent" ? "violet" : job.smsWelcome.status === "failed" ? "red" : "neutral"} title={job.smsWelcome.cause ?? undefined}><MessageSquareText size={12} aria-hidden /> {job.smsWelcome.status === "sent" ? "Karşılama SMS'i gitti" : job.smsWelcome.status === "failed" ? "SMS gönderilemedi" : "SMS atlandı"}</Pill> : null}
                          {job.helpRequestedAt ? <Pill tone="amber"><HandHelping size={12} aria-hidden /> Yardım istedi · {relativeTime(job.helpRequestedAt, now)}</Pill> : null}
                        </span>
                        <small>{job.phone} · {relativeTime(job.createdAt, now)} {job.source === "admin" ? "· elle başlatıldı" : ""}</small>
                      </div>
                      <ol className={s.track} aria-label="Adımlar">
                        {job.steps.map((step) => {
                          const meta = STEP_STATUS[step.status] ?? STEP_STATUS.none;
                          const label = data.steps.find((item) => item.key === step.key)?.label ?? step.key;
                          const detail = step.status === "skipped" ? step.reasonLabel : step.status === "failed" ? step.error : step.status === "pending" && step.dueAt ? `Planlanan: ${new Date(step.dueAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : step.at ? relativeTime(step.at, now) : null;
                          return (
                            <li key={step.key} className={cx(s.trackItem, s[`track-${step.status}`])} title={`${label}: ${meta.label}${detail ? ` · ${detail}` : ""}`}>
                              <i aria-hidden />
                              <span>{label}</span>
                              <small>{meta.label}{detail ? ` · ${detail}` : ""}</small>
                            </li>
                          );
                        })}
                      </ol>
                      <div className={s.jobActions}>
                        <Btn size="sm" variant={job.helpRequestedAt ? "primary" : "default"} icon={LifeBuoy} onClick={() => openSupport(job)}>Panelini aç</Btn>
                        {job.conversationId ? <LinkBtn href={`/super-admin/whatsapp-gelen?c=${job.conversationId}`}><Inbox size={14} aria-hidden /> Yazışma</LinkBtn> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      <ConfirmSheet open={confirm === "on"} onClose={() => setConfirm(null)} onConfirm={() => setEnabled(true)} icon={Power}
        title="Karşılama akışı açılsın mı?" confirmLabel="Akışı aç"
        description="Bundan sonra kayıt olan işletme sahiplerine adımlar sırayla gider. Daha önce kayıt olmuş işletmelere geriye dönük mesaj gönderilmez." />
      <ConfirmSheet open={confirm === "off"} onClose={() => setConfirm(null)} onConfirm={() => setEnabled(false)} icon={PowerOff} tone="danger"
        title="Karşılama akışı kapatılsın mı?" confirmLabel="Kapat"
        description="Bekleyen mesajlar gönderilmez; tekrar açtığında süresi geçenler atlanır." />
    </AdminPage>
  );
}

function LinkBtn({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className={s.linkBtn}>{children}</Link>;
}
