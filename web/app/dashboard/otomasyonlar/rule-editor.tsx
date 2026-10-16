"use client";

import { useRef, useState } from "react";
import { BellRing, Info, LoaderCircle, Lock, MonitorSmartphone, Smartphone, Users } from "lucide-react";
import type { AutomationCancelledBy, AutomationRuleInput, AutomationTrigger } from "@/features/automations/automation-repository";
import { Segmented, Sheet, Toggle, cx, studio } from "@/app/dashboard/_studio";
import { TRIGGERS, TRIGGER_ORDER, previewText, variablesFor } from "./automation-catalog";
import css from "./otomasyonlar.module.css";

type Option = { id: string; name: string };
type Field = "title" | "message" | "customerTitle" | "customerMessage";

export function RuleEditor({ open, initial, editing, services, staff, businessName, saving, onClose, onSave }: {
  open: boolean;
  initial: AutomationRuleInput;
  editing: boolean;
  services: Option[];
  staff: Option[];
  businessName?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (input: AutomationRuleInput) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Kuralı düzenle" : "Yeni otomasyon"} description="Üç adım: ne olduğunda, hangi durumlarda ve kime haber verilsin.">
      {/* key: başka bir kural/şablon açılınca form sıfırdan başlar */}
      {open ? <EditorBody key={JSON.stringify(initial)} initial={initial} services={services} staff={staff} businessName={businessName} saving={saving} onClose={onClose} onSave={onSave} /> : null}
    </Sheet>
  );
}

function EditorBody({ initial, services, staff, businessName, saving, onClose, onSave }: {
  initial: AutomationRuleInput;
  services: Option[];
  staff: Option[];
  businessName?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (input: AutomationRuleInput) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [focus, setFocus] = useState<Field>("message");
  const refs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const meta = TRIGGERS[draft.trigger];
  const isWaitlist = draft.trigger === "waitlist_created";
  const customerPush = draft.channels.customerPush && !isWaitlist;
  const errors = [
    !draft.name.trim() && "Kurala bir ad verin.",
    !draft.title.trim() && "Ekip bildirimi için başlık yazın.",
    !draft.message.trim() && "Ekip bildirimi için mesaj yazın.",
    customerPush && !draft.customerMessage.trim() && "Müşteriye gidecek mesajı yazın.",
  ].filter(Boolean) as string[];

  const set = (patch: Partial<AutomationRuleInput>) => setDraft((current) => ({ ...current, ...patch }));
  const setConditions = (patch: Partial<AutomationRuleInput["conditions"]>) => setDraft((current) => ({ ...current, conditions: { ...current.conditions, ...patch } }));
  const setChannels = (patch: Partial<AutomationRuleInput["channels"]>) => setDraft((current) => ({ ...current, channels: { ...current.channels, ...patch } }));
  const toggleId = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

  function insertVariable(key: string) {
    const field = focus === "customerTitle" || focus === "customerMessage" ? (customerPush ? focus : "message") : focus;
    const element = refs.current[field];
    const token = `{{${key}}}`;
    const value = draft[field];
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    set({ [field]: value.slice(0, start) + token + value.slice(end) } as Partial<AutomationRuleInput>);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const textField = (field: Field, label: string, placeholder: string, multiline = false, max = 120) => (
    <label className={studio.field}>
      <span className={studio.label}>{label}</span>
      {multiline ? (
        <textarea ref={(node) => { refs.current[field] = node; }} className={studio.textarea} value={draft[field]} maxLength={max} placeholder={placeholder} onFocus={() => setFocus(field)} onChange={(event) => set({ [field]: event.target.value } as Partial<AutomationRuleInput>)} rows={3} />
      ) : (
        <input ref={(node) => { refs.current[field] = node; }} className={studio.input} value={draft[field]} maxLength={max} placeholder={placeholder} onFocus={() => setFocus(field)} onChange={(event) => set({ [field]: event.target.value } as Partial<AutomationRuleInput>)} />
      )}
      <small className={css.counter}>{draft[field].length}/{max}</small>
    </label>
  );

  return (
    <form className={css.editor} onSubmit={(event) => { event.preventDefault(); if (!errors.length) onSave({ ...draft, channels: { ...draft.channels, customerPush } }); }}>
      <label className={studio.field}>
        <span className={studio.label}>Kural adı</span>
        <input className={studio.input} value={draft.name} maxLength={80} placeholder="Örn. İptal alarmı" onChange={(event) => set({ name: event.target.value })} data-autofocus />
      </label>

      <section className={css.step}>
        <header className={css.stepHead}><span className={css.stepNo}>1</span><div><b>Ne olduğunda?</b><small>Kuralı başlatacak olayı seçin.</small></div></header>
        <div className={css.triggerGrid} role="radiogroup" aria-label="Tetikleyici">
          {TRIGGER_ORDER.map((trigger: AutomationTrigger) => {
            const item = TRIGGERS[trigger];
            const Icon = item.icon;
            return (
              <button type="button" key={trigger} role="radio" aria-checked={draft.trigger === trigger} className={cx(css.triggerOption, css.accent)} data-accent={item.accent} onClick={() => set({ trigger })}>
                <span className={css.triggerIcon}><Icon size={16} aria-hidden /></span>
                <span><b>{item.label}</b><small>{item.when}</small></span>
              </button>
            );
          })}
        </div>
        <p className={css.hint}><Info size={14} aria-hidden /> Örnek: {meta.example}</p>
      </section>

      <section className={css.step}>
        <header className={css.stepHead}><span className={css.stepNo}>2</span><div><b>Hangi durumlarda?</b><small>Hiçbirini seçmezseniz tüm {isWaitlist ? "taleplerde" : "randevularda"} çalışır.</small></div></header>
        {services.length ? (
          <div className={studio.field}>
            <span className={studio.label}>Yalnız bu hizmetlerde {draft.conditions.serviceIds.length ? `· ${draft.conditions.serviceIds.length} seçili` : "· tümü"}</span>
            <div className={css.pickList}>
              {services.map((service) => (
                <button type="button" key={service.id} className={css.pick} aria-pressed={draft.conditions.serviceIds.includes(service.id)} onClick={() => setConditions({ serviceIds: toggleId(draft.conditions.serviceIds, service.id) })}>{service.name}</button>
              ))}
            </div>
          </div>
        ) : null}
        {staff.length > 1 ? (
          <div className={studio.field}>
            <span className={studio.label}>Yalnız bu personelde {draft.conditions.staffIds.length ? `· ${draft.conditions.staffIds.length} seçili` : "· tümü"}</span>
            <div className={css.pickList}>
              {staff.map((person) => (
                <button type="button" key={person.id} className={css.pick} aria-pressed={draft.conditions.staffIds.includes(person.id)} onClick={() => setConditions({ staffIds: toggleId(draft.conditions.staffIds, person.id) })}>{person.name}</button>
              ))}
            </div>
          </div>
        ) : null}
        {draft.trigger === "appointment_cancelled" ? (
          <div className={studio.field}>
            <span className={studio.label}>İptali kim yaptı?</span>
            <Segmented<AutomationCancelledBy>
              label="İptali yapan"
              value={draft.conditions.cancelledBy}
              onChange={(cancelledBy) => setConditions({ cancelledBy })}
              options={[{ value: "any", label: "Fark etmez" }, { value: "customer", label: "Müşteri" }, { value: "business", label: "İşletme" }]}
            />
          </div>
        ) : null}
      </section>

      <section className={css.step}>
        <header className={css.stepHead}><span className={css.stepNo}>3</span><div><b>Kime haber verilsin?</b><small>Bildirimler ücretsizdir; SMS kotanızdan düşmez.</small></div></header>
        <div className={css.channels}>
          <div className={css.channel}>
            <span className={css.channelIcon}><MonitorSmartphone size={17} aria-hidden /></span>
            <span className={css.channelText}><b>Panel bildirimi</b><small>Her zaman açık · zil simgesindeki bildirim kutusuna düşer.</small></span>
            <Lock size={16} aria-label="Her zaman açık" />
          </div>
          <label className={css.channel}>
            <span className={css.channelIcon}><Users size={17} aria-hidden /></span>
            <span className={css.channelText}><b>Ekibin telefonuna bildirim</b><small>Sahip, yöneticiler ve randevunun personeli uygulamada anında görür.</small></span>
            <Toggle checked={draft.channels.teamPush} onChange={(teamPush) => setChannels({ teamPush })} label="Ekibe telefon bildirimi" />
          </label>
          <label className={cx(css.channel, isWaitlist && css.channelOff)}>
            <span className={css.channelIcon}><Smartphone size={17} aria-hidden /></span>
            <span className={css.channelText}><b>Müşteriye uygulama bildirimi</b><small>{isWaitlist ? "Bekleme taleplerinde kullanılamaz." : "Yalnız Senin Randevun uygulamasında hesabı olan müşterilere gider."}</small></span>
            <Toggle checked={customerPush} onChange={(value) => setChannels({ customerPush: value })} label="Müşteriye uygulama bildirimi" disabled={isWaitlist} />
          </label>
        </div>
      </section>

      <section className={css.step}>
        <header className={css.stepHead}><span className={css.stepNo}><BellRing size={13} aria-hidden /></span><div><b>Mesajlar</b><small>Değişkenler gerçek bilgilerle doldurulur. Eklemek için dokunun.</small></div></header>
        <div className={css.varChips} aria-label="Değişkenler">
          {variablesFor(draft.trigger).map((variable) => (
            <button type="button" key={variable.key} className={css.varChip} onMouseDown={(event) => event.preventDefault()} onClick={() => insertVariable(variable.key)} title={`Örn. ${variable.sample}`}>+ {variable.label}</button>
          ))}
        </div>
        <div className={css.messageBlock}>
          <small className={css.blockLabel}>Ekibe giden</small>
          {textField("title", "Başlık", "Örn. Takvimde boşluk oluştu")}
          {textField("message", "Mesaj", "Örn. {{customerName}} randevusunu iptal etti.", true, 500)}
        </div>
        {customerPush ? (
          <div className={css.messageBlock}>
            <small className={css.blockLabel}>Müşteriye giden</small>
            {textField("customerTitle", "Başlık (boşsa işletme adı)", "Örn. Teşekkürler!")}
            {textField("customerMessage", "Mesaj", "Örn. {{customerName}}, bizi tercih ettiğiniz için teşekkürler.", true, 240)}
          </div>
        ) : null}

        <div className={css.previews} aria-label="Önizleme">
          <p className={css.previewLabel}>Önizleme · örnek bilgilerle</p>
          <div className={css.preview}>
            <span className={css.previewApp}>SR İşletme · şimdi</span>
            <b>{previewText(draft.title, businessName) || "Başlık"}</b>
            <p>{previewText(draft.message, businessName) || "Mesajınız burada görünecek."}</p>
          </div>
          {customerPush ? (
            <div className={cx(css.preview, css.previewCustomer)}>
              <span className={css.previewApp}>Senin Randevun · şimdi</span>
              <b>{previewText(draft.customerTitle, businessName) || businessName || "İşletmeniz"}</b>
              <p>{previewText(draft.customerMessage, businessName) || "Müşteriye gidecek mesaj burada görünecek."}</p>
            </div>
          ) : null}
        </div>
      </section>

      {errors.length ? <p className={css.formError} role="status">{errors[0]}</p> : null}
      <div className={css.editorActions}>
        <button type="button" className={cx(studio.btn, studio.btnGhost)} onClick={onClose}>Vazgeç</button>
        <button type="submit" className={cx(studio.btn, studio.btnPrimary)} disabled={saving || errors.length > 0}>
          {saving ? <LoaderCircle size={16} className={studio.spin} aria-hidden /> : null} Kaydet ve çalıştır
        </button>
      </div>
    </form>
  );
}
