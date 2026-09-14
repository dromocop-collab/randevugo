"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useBusinessContext } from "@/features/businesses/business-context";
import { createAutomationRule, listAutomationRules, removeAutomationRule, setAutomationRuleEnabled, type AutomationRule, type AutomationTrigger } from "@/features/automations/automation-repository";
import { Activity, BellRing, CalendarCheck2, Check, ChevronRight, Clock3, LoaderCircle, Pause, Play, Plus, Sparkles, Trash2, WandSparkles, XCircle } from "lucide-react";

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

  return <div className="automation-studio-page">
    <section className="automation-hero"><div><span><WandSparkles size={15}/> AKILLI AKIŞ MOTORU</span><h1>Tekrarlanan işleri,<br/>panel sizin için yönetsin.</h1><p>Randevu ve bekleme listesi olaylarını takip eden kurallar kurun. Her çalışma kayıt altına alınır ve anında işletme bildirimi üretir.</p><button type="button" onClick={() => setShowCreate(true)} disabled={!canManage}><Plus size={16}/> Yeni otomasyon</button></div><aside><div><Activity size={18}/><span><strong>{activeCount}</strong><small>aktif kural</small></span></div><div><Sparkles size={18}/><span><strong>{totalRuns}</strong><small>toplam çalışma</small></span></div><i><span/></i></aside></section>
    <section className="automation-status-line"><span><i/> OTOMASYON MOTORU</span><b>{activeCount ? `${activeCount} kural olayları dinliyor` : "İlk kuralınızı kurmaya hazırsınız"}</b><small>SMS ve ödeme aksiyonları daha sonra güvenle eklenebilir.</small></section>
    {loading ? <div className="automation-loading"><LoaderCircle className="animate-spin"/><span>Kurallar hazırlanıyor…</span></div> : rules.length === 0 ? <section className="automation-empty"><WandSparkles/><h2>Operasyonunuzu otomatikleştirin</h2><p>Hazır bir akış seçin; istediğiniz zaman duraklatabilir veya tamamen kaldırabilirsiniz.</p><button type="button" onClick={() => setShowCreate(true)}><Plus size={15}/> Hazır akışları keşfet</button></section> : <section className="automation-rule-grid">{rules.map((rule) => { const meta = triggerMeta[rule.trigger]; const Icon = meta?.icon ?? BellRing; return <article key={rule.id} className={rule.enabled ? "active" : "paused"}><header><i><Icon size={18}/></i><span><small>{meta?.label ?? rule.trigger}</small><b>{rule.name}</b></span><button type="button" className={rule.enabled ? "enabled" : ""} onClick={() => void toggle(rule)} disabled={busy === rule.id || !canManage} aria-label={rule.enabled ? "Duraklat" : "Etkinleştir"}>{busy === rule.id ? <LoaderCircle className="animate-spin"/> : rule.enabled ? <Pause size={14}/> : <Play size={14}/>}</button></header><div><span>OLAY</span><p>{meta?.note}</p><ChevronRight size={15}/><span>AKSİYON</span><p>İşletme bildirimi oluştur</p></div><footer><span><Activity size={13}/> {rule.runs} kez çalıştı</span>{rule.lastRunAt && <time>{new Date(rule.lastRunAt).toLocaleDateString("tr-TR")}</time>}<button type="button" onClick={() => setPendingDelete(rule.id)} disabled={!canManage}><Trash2 size={14}/></button></footer>{pendingDelete === rule.id && <div className="automation-delete-confirm"><p>Bu kural kalıcı olarak kaldırılsın mı?</p><button type="button" onClick={() => setPendingDelete(null)}>Vazgeç</button><button type="button" onClick={() => void remove(rule.id)}>Kaldır</button></div>}</article>; })}</section>}
    {showCreate && <div className="automation-template-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><section role="dialog" aria-modal="true" aria-label="Hazır otomasyonlar"><header><div><span><Sparkles size={14}/> AKIŞ KÜTÜPHANESİ</span><h2>Bir tetikleyici seçin.</h2><p>Kurallar etkinleştiği andan itibaren yeni olayları dinler.</p></div><button type="button" onClick={() => setShowCreate(false)} aria-label="Kapat"><XCircle/></button></header><div>{templates.map((template) => { const Icon = triggerMeta[template.trigger].icon; return <button type="button" key={template.name} data-accent={template.accent} onClick={() => void addTemplate(template)} disabled={busy === template.name}><i><Icon/></i><span><b>{template.name}</b><small>{triggerMeta[template.trigger].note}</small><em>{template.title}</em></span>{busy === template.name ? <LoaderCircle className="animate-spin"/> : <Plus/>}</button>; })}</div><footer><Clock3 size={14}/> Oluşturulan kuralı ana ekrandan tek dokunuşla duraklatabilirsiniz.</footer></section></div>}
  </div>;
}
