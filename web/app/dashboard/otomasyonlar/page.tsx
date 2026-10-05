"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useBusinessContext } from "@/features/businesses/business-context";
import { createAutomationRule, listAutomationRules, removeAutomationRule, setAutomationRuleEnabled, type AutomationRule, type AutomationTrigger } from "@/features/automations/automation-repository";
import { Activity, ArrowRight, BellRing, CalendarCheck2, Check, Clock3, LoaderCircle, Lock, Plus, Sparkles, Trash2, WandSparkles, XCircle } from "lucide-react";
import { ConfirmSheet, EmptyState, HeroChip, Notice, Pill, Sheet, StudioHero, StudioPage, StudioSkeleton, Toggle, cx, studio } from "@/app/dashboard/_studio";
import css from "./otomasyonlar.module.css";

const triggerMeta: Record<AutomationTrigger, { label: string; note: string; icon: typeof BellRing }> = {
  appointment_created: { label: "Yeni randevu", note: "Yeni kayıt oluşturulduğunda", icon: CalendarCheck2 },
  appointment_cancelled: { label: "Randevu iptali", note: "Aktif bir randevu iptal edildiğinde", icon: XCircle },
  appointment_completed: { label: "İşlem tamamlandı", note: "Randevu tamamlandı olarak işaretlendiğinde", icon: Check },
  waitlist_created: { label: "Bekleme talebi", note: "Müşteri bekleme listesine katıldığında", icon: BellRing },
};

const templates: Array<{ name: string; trigger: AutomationTrigger; title: string; message: string; accent: string }> = [
  { name: "İptal alarmı", trigger: "appointment_cancelled", title: "Takvimde boşluk oluştu", message: "{{customerName}} adlı müşterinin {{serviceName}} randevusu iptal edildi. Boşluğu bekleme listesiyle değerlendirin.", accent: "rose" },
  { name: "Bekleme listesi radarı", trigger: "waitlist_created", title: "Yeni bekleme talebi", message: "{{customerName}}, {{serviceName}} için {{preferredDate}} tarihini bekliyor.", accent: "amber" },
  { name: "Tamamlama takibi", trigger: "appointment_completed", title: "Hizmet tamamlandı", message: "{{customerName}} için {{serviceName}} tamamlandı. Müşteri ilişkileri kaydı güncellendi.", accent: "violet" },
  { name: "Yeni randevu akışı", trigger: "appointment_created", title: "Yeni randevu alındı", message: "{{customerName}} için {{serviceName}} randevusu oluşturuldu.", accent: "ocean" },
];

const triggerAccent: Record<AutomationTrigger, string> = {
  appointment_cancelled: "rose",
  waitlist_created: "amber",
  appointment_completed: "violet",
  appointment_created: "ocean",
};

export default function AutomationsPage() {
  const { businessId, access } = useBusinessContext();
  const params = useSearchParams();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [showCreate, setShowCreate] = useState(params.get("create") === "1");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const canManage = access?.role !== "staff";

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try { setRules(await listAutomationRules(businessId)); }
    catch { toast.error("Otomasyonlar yüklenemedi."); }
    finally { setLoading(false); }
  }, [businessId]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);
  const activeCount = useMemo(() => rules.filter((item) => item.enabled).length, [rules]);
  const totalRuns = useMemo(() => rules.reduce((sum, item) => sum + item.runs, 0), [rules]);
  const closeCreate = useCallback(() => setShowCreate(false), []);
  const closeDelete = useCallback(() => setPendingDelete(null), []);
  const deleteTarget = rules.find((item) => item.id === pendingDelete);

  async function addTemplate(template: (typeof templates)[number]) {
    if (!businessId || !canManage) return;
    setBusy(template.name);
    try {
      await createAutomationRule(businessId, { name: template.name, trigger: template.trigger, title: template.title, message: template.message, enabled: true });
      toast.success("Otomasyon etkinleştirildi.");
      setShowCreate(false);
      await load();
    } catch { toast.error("Otomasyon oluşturulamadı."); }
    finally { setBusy(""); }
  }

  async function toggle(rule: AutomationRule) {
    if (!businessId || !canManage) return;
    setBusy(rule.id);
    try { await setAutomationRuleEnabled(businessId, rule.id, !rule.enabled); setRules((items) => items.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item)); toast.success(rule.enabled ? "Otomasyon duraklatıldı." : "Otomasyon çalıştırıldı."); }
    catch { toast.error("Durum değiştirilemedi."); }
    finally { setBusy(""); }
  }

  async function remove(ruleId: string) {
    if (!businessId || !canManage) return;
    setBusy(ruleId);
    try { await removeAutomationRule(businessId, ruleId); setRules((items) => items.filter((item) => item.id !== ruleId)); toast.success("Otomasyon kaldırıldı."); }
    catch { toast.error("Otomasyon kaldırılamadı."); }
    finally { setBusy(""); setPendingDelete(null); }
  }

  const firstLoad = loading && rules.length === 0;

  return (
    <StudioPage label="Otomasyonlar">
      {firstLoad ? <StudioSkeleton stats={0} rows={3} label="Kurallar hazırlanıyor" /> : (
        <>
          <StudioHero
            eyebrow="Akıllı akış motoru"
            icon={WandSparkles}
            title={<>Tekrarlanan işleri,<br />panel sizin için yönetsin.</>}
            description="Randevu ve bekleme listesi olaylarını takip eden kurallar kurun. Her çalışma kayıt altına alınır ve anında işletme bildirimi üretir."
            actions={<button type="button" className={cx(studio.btn, studio.btnBright, studio.btnLg)} onClick={() => setShowCreate(true)} disabled={!canManage}><Plus size={18} aria-hidden /> Yeni otomasyon</button>}
            mascot="idle"
          >
            <HeroChip icon={Activity} value={activeCount} label="aktif kural" />
            <HeroChip icon={Sparkles} value={totalRuns} label="toplam çalışma" />
          </StudioHero>

          <div className={css.engine} role="status">
            <span className={cx(css.engineDot, activeCount > 0 && css.engineLive)} aria-hidden />
            <div className={css.engineText}>
              <small>Otomasyon motoru</small>
              <b>{activeCount ? `${activeCount} kural olayları dinliyor` : "İlk kuralınızı kurmaya hazırsınız"}</b>
              <span>SMS ve ödeme aksiyonları daha sonra güvenle eklenebilir.</span>
            </div>
            {loading ? <LoaderCircle size={18} className={studio.spin} aria-label="Yenileniyor" /> : null}
          </div>

          {!canManage ? <Notice icon={Lock} title="Yalnızca görüntüleme">Kuralları işletme yöneticileri ekleyip değiştirebilir.</Notice> : null}

          {rules.length === 0 ? (
            <EmptyState
              mood="wave"
              title="Operasyonunuzu otomatikleştirin"
              description="Hazır bir akış seçin; istediğiniz zaman duraklatabilir veya tamamen kaldırabilirsiniz."
              action={<button type="button" className={cx(studio.btn, studio.btnPrimary)} onClick={() => setShowCreate(true)} disabled={!canManage}><Plus size={16} aria-hidden /> Hazır akışları keşfet</button>}
            />
          ) : (
            <>
              <p className={studio.sectionLabel}>Kurallar · {rules.length}</p>
              <div className={css.rules}>
                {rules.map((rule) => {
                  const meta = triggerMeta[rule.trigger];
                  const Icon = meta?.icon ?? BellRing;
                  const isBusy = busy === rule.id;
                  return (
                    <article key={rule.id} className={cx(css.rule, css.accent, !rule.enabled && css.rulePaused)} data-accent={triggerAccent[rule.trigger] ?? "ocean"}>
                      <header className={css.ruleHead}>
                        <span className={css.ruleIcon}><Icon size={19} aria-hidden /></span>
                        <span className={css.ruleTitle}>
                          <small>{meta?.label ?? rule.trigger}</small>
                          <b>{rule.name}</b>
                        </span>
                        <Pill tone={rule.enabled ? "ok" : "neutral"} dot>{rule.enabled ? "Aktif" : "Duraklatıldı"}</Pill>
                      </header>

                      <div className={css.flow}>
                        <div className={css.flowStep}><span>Olay</span><p>{meta?.note}</p></div>
                        <ArrowRight size={16} className={css.flowArrow} aria-hidden />
                        <div className={css.flowStep}><span>Aksiyon</span><p>İşletme bildirimi oluştur</p></div>
                      </div>

                      <label className={css.switchRow}>
                        <span className={css.switchText}>
                          <b>{rule.enabled ? "Çalışıyor" : "Duraklatıldı"}</b>
                          <small>{rule.enabled ? "Yeni olaylar dinleniyor" : "Açınca yeni olayları dinler"}</small>
                        </span>
                        {isBusy ? <LoaderCircle size={18} className={studio.spin} aria-hidden /> : null}
                        <Toggle checked={rule.enabled} onChange={() => void toggle(rule)} disabled={isBusy || !canManage} label={`${rule.name} otomasyonunu ${rule.enabled ? "duraklat" : "etkinleştir"}`} />
                      </label>

                      <footer className={css.ruleFoot}>
                        <span><Activity size={14} aria-hidden /> {rule.runs} kez çalıştı</span>
                        {rule.lastRunAt ? <time dateTime={rule.lastRunAt}><Clock3 size={14} aria-hidden /> {new Date(rule.lastRunAt).toLocaleDateString("tr-TR")}</time> : null}
                        <button type="button" className={cx(studio.btn, studio.btnGhost, studio.iconBtn, css.deleteBtn)} onClick={() => setPendingDelete(rule.id)} disabled={!canManage} aria-label={`${rule.name} otomasyonunu kaldır`}>
                          <Trash2 size={17} aria-hidden />
                        </button>
                      </footer>
                    </article>
                  );
                })}
                {canManage ? (
                  <button type="button" className={css.addCard} onClick={() => setShowCreate(true)}>
                    <span><Plus size={22} aria-hidden /></span>
                    <b>Yeni otomasyon ekle</b>
                    <small>Hazır akış kütüphanesinden seçin</small>
                  </button>
                ) : null}
              </div>
            </>
          )}
        </>
      )}

      <Sheet open={showCreate} onClose={closeCreate} title="Bir tetikleyici seçin." description="Kurallar etkinleştiği andan itibaren yeni olayları dinler.">
        <p className={css.library}><Sparkles size={14} aria-hidden /> Akış kütüphanesi</p>
        <div className={css.templates}>
          {templates.map((template) => {
            const Icon = triggerMeta[template.trigger].icon;
            const isBusy = busy === template.name;
            return (
              <button type="button" key={template.name} className={cx(css.template, css.accent)} data-accent={template.accent} onClick={() => void addTemplate(template)} disabled={isBusy || !canManage}>
                <span className={css.ruleIcon}><Icon size={19} aria-hidden /></span>
                <span className={css.templateText}>
                  <b>{template.name}</b>
                  <small>{triggerMeta[template.trigger].note}</small>
                  <em>{template.title}</em>
                </span>
                <span className={css.templateAdd} aria-hidden>{isBusy ? <LoaderCircle size={18} className={studio.spin} /> : <Plus size={18} />}</span>
              </button>
            );
          })}
        </div>
        <p className={css.sheetNote}><Clock3 size={14} aria-hidden /> Oluşturulan kuralı ana ekrandan tek dokunuşla duraklatabilirsiniz.</p>
      </Sheet>

      <ConfirmSheet
        open={pendingDelete !== null}
        title="Bu kural kalıcı olarak kaldırılsın mı?"
        description={deleteTarget ? `“${deleteTarget.name}” otomasyonu kalıcı olarak silinir. Bu işlem geri alınamaz.` : undefined}
        confirmLabel="Kaldır"
        busy={pendingDelete !== null && busy === pendingDelete}
        onConfirm={() => { if (pendingDelete) void remove(pendingDelete); }}
        onClose={closeDelete}
      />
    </StudioPage>
  );
}
