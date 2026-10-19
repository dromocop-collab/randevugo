"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useBusinessContext } from "@/features/businesses/business-context";
import {
  createAutomationRule, listAutomationRules, listAutomationRuns, removeAutomationRule, setAutomationRuleEnabled, testAutomationRule, updateAutomationRule,
  type AutomationRule, type AutomationRuleInput, type AutomationRun,
} from "@/features/automations/automation-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import {
  Activity, ArrowRight, BellRing, Check, ChevronDown, Clock3, Copy, FlaskConical, History, Lightbulb, LoaderCircle, Lock, MonitorSmartphone,
  Pencil, Plus, ShieldCheck, Smartphone, Sparkles, Trash2, Users, WandSparkles, Zap,
} from "lucide-react";
import { ConfirmSheet, EmptyState, HeroChip, Notice, Panel, Pill, Segmented, StudioHero, StudioPage, StudioSkeleton, Toggle, cx, studio } from "@/app/[lang]/dashboard/_studio";
import { RECIPES, RECIPE_CATEGORIES, TRIGGERS, blankRule, recipeRuleInput, type Recipe } from "./automation-catalog";
import { useIntlLocale, useT } from "@/i18n/client";
import type { TFunction } from "@/i18n/config";
import { RuleEditor } from "./rule-editor";
import css from "./otomasyonlar.module.css";

type Filter = "all" | "active" | "paused";
type Option = { id: string; name: string };

function relative(isoValue: string | undefined, now: number, t: TFunction, locale: string) {
  if (!isoValue) return "";
  const diff = Math.max(0, now - new Date(isoValue).getTime());
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return t("az önce");
  if (minutes < 60) return t("{count} dk önce", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("{count} sa önce", { count: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return t("{count} gün önce", { count: days });
  return new Date(isoValue).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function toInput(rule: AutomationRule): AutomationRuleInput {
  const { name, trigger, enabled, title, message, customerTitle, customerMessage, conditions, channels } = rule;
  return { name, trigger, enabled, title, message, customerTitle, customerMessage, conditions, channels };
}

export default function AutomationsPage() {
  const t = useT();
  const intl = useIntlLocale();
  const { businessId, businesses, access } = useBusinessContext();
  const params = useSearchParams();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [staff, setStaff] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<Recipe["category"]>("takvim");
  const [editor, setEditor] = useState<{ id: string | null; input: AutomationRuleInput } | null>(params.get("create") === "1" ? { id: null, input: blankRule() } : null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const ago = (value: string | undefined) => relative(value, now, t, intl);
  const canManage = access?.role !== "staff";
  const businessName = businesses.find((item) => item.id === businessId)?.name;

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [ruleList, runList] = await Promise.all([listAutomationRules(businessId), listAutomationRuns(businessId).catch(() => [])]);
      setRules(ruleList);
      setRuns(runList);
    } catch { toast.error(t("Otomasyonlar yüklenemedi.")); }
    finally { setLoading(false); }
  }, [businessId, t]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);
  useEffect(() => {
    if (!businessId || !canManage) return;
    let alive = true;
    void Promise.all([listServices(businessId, true).catch(() => []), listStaff(businessId, true).catch(() => [])]).then(([serviceList, staffList]) => {
      if (!alive) return;
      setServices(serviceList.map((item) => ({ id: item.id, name: item.name })).sort((a, b) => a.name.localeCompare(b.name, "tr")));
      setStaff(staffList.map((item) => ({ id: item.id, name: item.fullName })).sort((a, b) => a.name.localeCompare(b.name, "tr")));
    });
    return () => { alive = false; };
  }, [businessId, canManage]);

  const activeCount = useMemo(() => rules.filter((item) => item.enabled).length, [rules]);
  const totalRuns = useMemo(() => rules.reduce((sum, item) => sum + item.runs, 0), [rules]);
  const weekRuns = useMemo(() => runs.filter((run) => !run.test && run.createdAt && now - new Date(run.createdAt).getTime() < 7 * 86_400_000).length, [runs, now]);
  const visible = useMemo(() => rules.filter((rule) => filter === "all" || (filter === "active" ? rule.enabled : !rule.enabled)), [rules, filter]);
  const usedNames = useMemo(() => new Set(rules.map((rule) => rule.name.trim().toLocaleLowerCase("tr"))), [rules]);
  const serviceName = useMemo(() => new Map(services.map((item) => [item.id, item.name])), [services]);
  const staffName = useMemo(() => new Map(staff.map((item) => [item.id, item.name])), [staff]);
  const closeEditor = useCallback(() => setEditor(null), []);
  const closeDelete = useCallback(() => setPendingDelete(null), []);
  const deleteTarget = rules.find((item) => item.id === pendingDelete);

  async function save(input: AutomationRuleInput) {
    if (!businessId || !canManage || !editor) return;
    setSaving(true);
    try {
      if (editor.id) await updateAutomationRule(businessId, editor.id, input);
      else await createAutomationRule(businessId, input);
      toast.success(editor.id ? t("Kural güncellendi.") : t("Otomasyon çalışmaya başladı."));
      setEditor(null);
      await load();
    } catch { toast.error(t("Kural kaydedilemedi. Paketinizde otomasyon olduğundan emin olun.")); }
    finally { setSaving(false); }
  }

  async function toggle(rule: AutomationRule) {
    if (!businessId || !canManage) return;
    setBusy(rule.id);
    try { await setAutomationRuleEnabled(businessId, rule.id, !rule.enabled); setRules((items) => items.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item)); toast.success(rule.enabled ? t("Otomasyon duraklatıldı.") : t("Otomasyon çalıştırıldı.")); }
    catch { toast.error(t("Durum değiştirilemedi.")); }
    finally { setBusy(""); }
  }

  async function runTest(rule: AutomationRule) {
    if (!businessId || !canManage) return;
    setBusy(`test:${rule.id}`);
    try {
      await testAutomationRule(businessId, rule.id);
      toast.success(t("Deneme bildirimi gönderildi."), { description: rule.channels.teamPush ? t("Bildirim kutusuna ve telefonunuza bakın. Müşteriye bir şey gitmedi.") : t("Zil simgesindeki bildirim kutusuna bakın. Müşteriye bir şey gitmedi.") });
      setRuns(await listAutomationRuns(businessId).catch(() => runs));
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      toast.error(code.includes("resource-exhausted") ? t("Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.") : t("Deneme gönderilemedi."));
    } finally { setBusy(""); }
  }

  async function remove(ruleId: string) {
    if (!businessId || !canManage) return;
    setBusy(ruleId);
    try { await removeAutomationRule(businessId, ruleId); setRules((items) => items.filter((item) => item.id !== ruleId)); toast.success(t("Otomasyon kaldırıldı.")); }
    catch { toast.error(t("Otomasyon kaldırılamadı.")); }
    finally { setBusy(""); setPendingDelete(null); }
  }

  function conditionSummary(rule: AutomationRule) {
    const parts: string[] = [];
    const names = (ids: string[], map: Map<string, string>, count: string) => (ids.length === 1 ? map.get(ids[0]) : undefined) ?? t(count, { count: ids.length });
    if (rule.conditions.serviceIds.length) parts.push(names(rule.conditions.serviceIds, serviceName, "{count} hizmet"));
    if (rule.conditions.staffIds.length) parts.push(names(rule.conditions.staffIds, staffName, "{count} personel"));
    if (rule.trigger === "appointment_cancelled" && rule.conditions.cancelledBy !== "any") parts.push(rule.conditions.cancelledBy === "customer" ? t("müşteri iptal ederse") : t("işletme iptal ederse"));
    return parts.length ? parts.join(" · ") : t("Her zaman");
  }

  const firstLoad = loading && rules.length === 0;
  const recipes = RECIPES.filter((recipe) => recipe.category === category);

  return (
    <StudioPage label={t("Otomasyonlar")}>
      {firstLoad ? <StudioSkeleton stats={0} rows={3} label={t("Kurallar hazırlanıyor")} /> : (
        <>
          <StudioHero
            eyebrow={t("Akıllı akış motoru")}
            icon={WandSparkles}
            title={<>{t("Tekrarlanan işleri,")}<br />{t("panel sizin için yönetsin.")}</>}
            description={t("Bir randevu alındığında, iptal edildiğinde ya da tamamlandığında ne olacağını bir kez belirleyin; gerisini sistem 7/24 kendiliğinden yapsın.")}
            actions={<button type="button" className={cx(studio.btn, studio.btnBright, studio.btnLg)} onClick={() => setEditor({ id: null, input: blankRule() })} disabled={!canManage}><Plus size={18} aria-hidden /> {t("Yeni otomasyon")}</button>}
            mascot="idle"
          >
            <HeroChip icon={Activity} value={activeCount} label={t("aktif kural")} />
            <HeroChip icon={Zap} value={weekRuns} label={t("bu hafta çalıştı")} />
            <HeroChip icon={Sparkles} value={totalRuns} label={t("toplam")} />
          </StudioHero>

          <details className={css.explainer} open={rules.length === 0 || undefined}>
            <summary>
              <span className={css.explainerIcon}><Lightbulb size={18} aria-hidden /></span>
              <span><b>{t("Otomasyon nedir, nasıl çalışır?")}</b><small>{t("30 saniyede anlayın")}</small></span>
              <ChevronDown size={18} className={css.chevron} aria-hidden />
            </summary>
            <div className={css.howGrid}>
              <div className={css.how}><span className={css.howNo}>1</span><b>{t("Bir olay olur")}</b><p>{t("Örneğin bir müşteri randevusunu iptal eder.")}</p></div>
              <div className={css.how}><span className={css.howNo}>2</span><b>{t("Koşullar kontrol edilir")}</b><p>{t("İsterseniz yalnız belirli hizmet ya da personel için çalışsın.")}</p></div>
              <div className={css.how}><span className={css.howNo}>3</span><b>{t("Haber verilir")}</b><p>{t("Panelinize, ekibinizin telefonuna ya da müşterinizin uygulamasına bildirim gider.")}</p></div>
            </div>
            <ul className={css.facts}>
              <li><Check size={15} aria-hidden /> {t("Kural açıldığı andan sonraki olaylarda çalışır; geçmiş randevulara dokunmaz.")}</li>
              <li><Check size={15} aria-hidden /> {t("Aynı olay için her kural yalnız bir kez çalışır; müşteriniz iki kez rahatsız edilmez.")}</li>
              <li><Check size={15} aria-hidden /> {t("Bildirimler ücretsizdir; SMS göndermez, SMS kotanızdan düşmez.")}</li>
              <li><Check size={15} aria-hidden /> {t("İstediğiniz an duraklatın, düzenleyin ya da “Dene” ile örnek bilgilerle test edin.")}</li>
            </ul>
          </details>

          <div className={css.engine} role="status">
            <span className={cx(css.engineDot, activeCount > 0 && css.engineLive)} aria-hidden />
            <div className={css.engineText}>
              <small>{t("Otomasyon motoru")}</small>
              <b>{activeCount ? t("{count} kural olayları dinliyor", { count: activeCount }) : rules.length ? t("Tüm kurallar duraklatıldı") : t("İlk kuralınızı kurmaya hazırsınız")}</b>
              <span>{runs[0]?.createdAt ? t("Son çalışma {time}: {name}", { time: ago(runs[0].createdAt), name: runs[0].ruleName }) : t("Henüz bir çalışma yok. Bir olay olduğunda burada görünür.")}</span>
            </div>
            {loading ? <LoaderCircle size={18} className={studio.spin} aria-label={t("Yenileniyor")} /> : null}
          </div>

          {!canManage ? <Notice icon={Lock} title={t("Yalnızca görüntüleme")}>{t("Kuralları işletme sahibi ve yöneticiler ekleyip değiştirebilir.")}</Notice> : null}

          {rules.length === 0 ? (
            <EmptyState
              mood="wave"
              title={t("Operasyonunuzu otomatikleştirin")}
              description={t("Aşağıdaki hazır tariflerden birini seçin ya da sıfırdan kendi kuralınızı kurun.")}
              action={<button type="button" className={cx(studio.btn, studio.btnPrimary)} onClick={() => setEditor({ id: null, input: blankRule() })} disabled={!canManage}><Plus size={16} aria-hidden /> {t("Kendi kuralımı kur")}</button>}
            />
          ) : (
            <>
              <div className={css.toolbar}>
                <p className={studio.sectionLabel}>{t("Kurallarınız")}</p>
                <Segmented<Filter> label={t("Kural filtresi")} value={filter} onChange={setFilter} options={[
                  { value: "all", label: t("Tümü"), count: rules.length },
                  { value: "active", label: t("Aktif"), count: activeCount },
                  { value: "paused", label: t("Duraklatılan"), count: rules.length - activeCount },
                ]} />
              </div>
              <div className={css.rules}>
                {visible.map((rule) => {
                  const meta = TRIGGERS[rule.trigger];
                  const Icon = meta?.icon ?? BellRing;
                  const isBusy = busy === rule.id;
                  return (
                    <article key={rule.id} className={cx(css.rule, css.accent, !rule.enabled && css.rulePaused)} data-accent={meta?.accent ?? "ocean"}>
                      <header className={css.ruleHead}>
                        <span className={css.ruleIcon}><Icon size={19} aria-hidden /></span>
                        <span className={css.ruleTitle}>
                          <small>{meta ? t(meta.label) : rule.trigger}</small>
                          <b>{rule.name}</b>
                        </span>
                        <Pill tone={rule.enabled ? "ok" : "neutral"} dot>{rule.enabled ? t("Aktif") : t("Duraklatıldı")}</Pill>
                      </header>

                      <div className={css.flow}>
                        <div className={css.flowStep}><span>{t("Ne zaman")}</span><p>{meta ? t(meta.when) : "—"}</p></div>
                        <ArrowRight size={16} className={css.flowArrow} aria-hidden />
                        <div className={css.flowStep}><span>{t("Koşul")}</span><p>{conditionSummary(rule)}</p></div>
                      </div>

                      <div className={css.channelPills} aria-label={t("Bildirim kanalları")}>
                        <span><MonitorSmartphone size={13} aria-hidden /> {t("Panel")}</span>
                        {rule.channels.teamPush ? <span><Users size={13} aria-hidden /> {t("Ekip telefonu")}</span> : null}
                        {rule.channels.customerPush ? <span><Smartphone size={13} aria-hidden /> {t("Müşteri")}</span> : null}
                      </div>

                      <label className={css.switchRow}>
                        <span className={css.switchText}>
                          <b>{rule.enabled ? t("Çalışıyor") : t("Duraklatıldı")}</b>
                          <small>{rule.enabled ? t("Yeni olaylar dinleniyor") : t("Açınca yeni olayları dinler")}</small>
                        </span>
                        {isBusy ? <LoaderCircle size={18} className={studio.spin} aria-hidden /> : null}
                        <Toggle checked={rule.enabled} onChange={() => void toggle(rule)} disabled={isBusy || !canManage} label={rule.enabled ? t("{name} otomasyonunu duraklat", { name: rule.name }) : t("{name} otomasyonunu etkinleştir", { name: rule.name })} />
                      </label>

                      <footer className={css.ruleFoot}>
                        <span><Activity size={14} aria-hidden /> {t("{count} kez", { count: rule.runs })}</span>
                        {rule.lastRunAt ? <time dateTime={rule.lastRunAt}><Clock3 size={14} aria-hidden /> {ago(rule.lastRunAt)}</time> : null}
                        {canManage ? (
                          <span className={css.ruleActions}>
                            <button type="button" className={cx(studio.btn, studio.btnSoft, studio.btnSm)} onClick={() => void runTest(rule)} disabled={busy === `test:${rule.id}`} title={t("Örnek bilgilerle yalnız size bildirim gönderir")}>
                              {busy === `test:${rule.id}` ? <LoaderCircle size={14} className={studio.spin} aria-hidden /> : <FlaskConical size={14} aria-hidden />} {t("Dene")}
                            </button>
                            <button type="button" className={cx(studio.btn, studio.btnGhost, studio.iconBtn)} onClick={() => setEditor({ id: rule.id, input: toInput(rule) })} aria-label={t("{name} kuralını düzenle", { name: rule.name })}><Pencil size={16} aria-hidden /></button>
                            <button type="button" className={cx(studio.btn, studio.btnGhost, studio.iconBtn)} onClick={() => setEditor({ id: null, input: { ...toInput(rule), name: t("{name} (kopya)", { name: rule.name }) } })} aria-label={t("{name} kuralını kopyala", { name: rule.name })}><Copy size={16} aria-hidden /></button>
                            <button type="button" className={cx(studio.btn, studio.btnGhost, studio.iconBtn, css.deleteBtn)} onClick={() => setPendingDelete(rule.id)} aria-label={t("{name} kuralını kaldır", { name: rule.name })}><Trash2 size={16} aria-hidden /></button>
                          </span>
                        ) : null}
                      </footer>
                    </article>
                  );
                })}
                {visible.length === 0 ? <p className={css.muted}>{t("Bu filtrede kural yok.")}</p> : null}
              </div>
            </>
          )}

          {canManage ? (
            <Panel title={t("Hazır tarifler")} description={t("Tek dokunuşla açın, mesajları dilediğiniz gibi değiştirin.")} icon={Sparkles}>
              <Segmented<Recipe["category"]> label={t("Tarif kategorisi")} value={category} onChange={setCategory} options={RECIPE_CATEGORIES.map((item) => ({ value: item.id, label: t(item.label) }))} />
              <p className={css.categoryNote}>{t(RECIPE_CATEGORIES.find((item) => item.id === category)?.note ?? "")}</p>
              <div className={css.templates}>
                {recipes.map((recipe) => {
                  const meta = TRIGGERS[recipe.rule.trigger];
                  const Icon = meta.icon;
                  const added = usedNames.has(recipe.name.toLocaleLowerCase("tr")) || usedNames.has(t(recipe.name).toLocaleLowerCase("tr"));
                  return (
                    <button type="button" key={recipe.id} className={cx(css.template, css.accent)} data-accent={meta.accent} onClick={() => setEditor({ id: null, input: recipeRuleInput(recipe, t) })}>
                      <span className={css.ruleIcon}><Icon size={19} aria-hidden /></span>
                      <span className={css.templateText}>
                        <b>{t(recipe.name)} {recipe.badge ? <i className={css.badge}>{t(recipe.badge)}</i> : null}</b>
                        <small>{t(recipe.why)}</small>
                        <em>{t(meta.when)}{recipe.rule.channels.customerPush ? ` · ${t("müşteriye bildirim")}` : recipe.rule.channels.teamPush ? ` · ${t("ekibe bildirim")}` : ""}</em>
                      </span>
                      <span className={cx(css.templateAdd, added && css.templateAdded)} aria-hidden>{added ? <Check size={18} /> : <Plus size={18} />}</span>
                      {added ? <span className={studio.srOnly}>{t("(zaten ekli, yeniden ekleyebilirsiniz)")}</span> : null}
                    </button>
                  );
                })}
              </div>
            </Panel>
          ) : null}

          <Panel title={t("Son çalışmalar")} description={t("Son 30 günde kuralların gönderdiği bildirimler.")} icon={History}>
            {runs.length === 0 ? (
              <p className={css.muted}>{t("Henüz çalışma yok. Bir kural tetiklendiğinde ya da “Dene”ye bastığınızda burada listelenir.")}</p>
            ) : (
              <ol className={css.log}>
                {runs.map((run) => {
                  const meta = TRIGGERS[run.trigger];
                  const Icon = meta?.icon ?? BellRing;
                  return (
                    <li key={run.id} className={cx(css.logItem, css.accent)} data-accent={meta?.accent ?? "ocean"}>
                      <span className={css.logIcon}><Icon size={15} aria-hidden /></span>
                      <div className={css.logText}>
                        <b>{run.ruleName}{run.test ? <i className={css.badge}>{t("Deneme")}</i> : null}</b>
                        <p>{run.body}</p>
                        <small>
                          {ago(run.createdAt)} · {t("Panel")}{run.channels.teamPush ? ` · ${t("Ekip")}` : ""}{run.channels.customerPush ? ` · ${t("Müşteri")}` : ""}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>

          <Panel title={t("Sık sorulanlar")} icon={ShieldCheck}>
            <div className={css.faq}>
              <details><summary>{t("Müşterime SMS gider mi?")}</summary><p>{t("Hayır. Otomasyonlar yalnız uygulama içi bildirim gönderir ve ücretsizdir. Randevu onay/hatırlatma SMS’leri “SMS ayarları”ndan ayrıca yönetilir.")}</p></details>
              <details><summary>{t("Müşteri bildirimi herkese ulaşır mı?")}</summary><p>{t("Yalnız Senin Randevun uygulamasında hesabıyla randevu alan ve bildirimlere izin veren müşterilere ulaşır. Misafir olarak randevu alanlara gitmez.")}</p></details>
              <details><summary>{t("“Dene” butonu ne yapar?")}</summary><p>{t("Kuralı örnek bilgilerle (Örnek Müşteri, Örnek hizmet) çalıştırır. Bildirim yalnız size gelir, müşteriye hiçbir şey gönderilmez ve sayaç artmaz.")}</p></details>
              <details><summary>{t("Personelim kuralları görebilir mi?")}</summary><p>{t("Personel kuralları ve son çalışmaları görebilir ama değiştiremez. Ekip bildirimi açıksa yalnız kendi randevularıyla ilgili olanlar telefonuna gider.")}</p></details>
              <details><summary>{t("Paketimi düşürürsem ne olur?")}</summary><p>{t("Otomasyon içermeyen bir pakete geçerseniz kurallarınız silinmez, yalnız çalışmayı durdurur. Paketi tekrar yükseltince kaldığı yerden devam eder.")}</p></details>
            </div>
          </Panel>
        </>
      )}

      <RuleEditor
        open={editor !== null}
        initial={editor?.input ?? blankRule()}
        editing={Boolean(editor?.id)}
        services={services}
        staff={staff}
        businessName={businessName}
        saving={saving}
        onClose={closeEditor}
        onSave={(input) => void save(input)}
      />

      <ConfirmSheet
        open={pendingDelete !== null}
        title={t("Bu kural kalıcı olarak kaldırılsın mı?")}
        description={deleteTarget ? t("“{name}” otomasyonu kalıcı olarak silinir. Bu işlem geri alınamaz. Yalnız durdurmak istiyorsanız anahtarı kapatmanız yeterli.", { name: deleteTarget.name }) : undefined}
        confirmLabel={t("Kaldır")}
        busy={pendingDelete !== null && busy === pendingDelete}
        onConfirm={() => { if (pendingDelete) void remove(pendingDelete); }}
        onClose={closeDelete}
      />
    </StudioPage>
  );
}
