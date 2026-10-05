"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, Clock3, Eye, FileText, Hourglass, Info, ListPlus,
  LoaderCircle, Lock, Phone, Plus, RotateCcw, Send, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, UserRound, X, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useBusinessContext } from "@/features/businesses/business-context";
import { getBusinessById } from "@/features/businesses/business-repository";
import { listServices } from "@/features/services/service-repository";
import type { Business } from "@/types/business";
import type { Service } from "@/types/service";
import {
  FIELD_TYPE_LABELS, HELP_MAX, LABEL_MAX, MAX_CUSTOM_FIELDS, NUMBER_LIMIT, OPTION_MAX, OPTIONS_MAX, PLACEHOLDER_MAX, TEXTAREA_LIMIT, TEXT_LIMIT,
  CUSTOM_FIELD_TYPES, fieldsForService, normalizeFieldsForSubmit, parseCustomFields, sameFields, uniqueFieldId, validateFieldDefinitions, withTypeDefaults,
  type CustomBookingField, type CustomFieldInputValues, type CustomFieldType,
} from "./booking-fields-domain";
import {
  bookingFieldsErrorMessage, getBookingFieldSettings, parseBusinessFieldsRequest, submitBookingFieldRequest,
  type BusinessBookingFieldsRequest,
} from "./booking-fields-repository";
import { BLANK_TEMPLATE, BOOKING_FIELD_TEMPLATES, suggestedTemplates, type BookingFieldTemplate } from "./templates";
import { CustomFieldInputs } from "./custom-field-inputs";
import styles from "./booking-fields-editor.module.css";

type DraftItem = { key: string; field: CustomBookingField };

let keySeed = 0;
const nextKey = () => `f${Date.now().toString(36)}${(keySeed += 1)}`;
const toDraft = (fields: CustomBookingField[]): DraftItem[] => fields.map((field) => ({ key: nextKey(), field }));

function formatDate(millis: number | null) {
  if (!millis) return "";
  return new Date(millis).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function BusinessBookingFieldsEditor({ business }: { business: Business }) {
  const { access } = useBusinessContext();
  const readOnly = access?.role === "staff";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [platformEnabled, setPlatformEnabled] = useState(true);
  const [approved, setApproved] = useState<CustomBookingField[]>([]);
  const [request, setRequest] = useState<BusinessBookingFieldsRequest | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [confirm, setConfirm] = useState<"submit" | "clear" | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewServiceId, setPreviewServiceId] = useState("");
  const [previewValues, setPreviewValues] = useState<CustomFieldInputValues>({});
  const [reloadToken, setReloadToken] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) { setLoading(true); setLoadError(""); } });
    Promise.all([
      getBookingFieldSettings(business.id).catch(() => null),
      getBusinessById(business.id),
      listServices(business.id, true).catch(() => [] as Service[]),
    ]).then(([settings, fresh, serviceRows]) => {
      if (!active) return;
      const raw = (fresh ?? business) as unknown as Record<string, unknown>;
      const approvedFields = parseCustomFields(raw.customBookingFields);
      setPlatformEnabled(settings?.businessCustomFieldsEnabled !== false);
      setApproved(approvedFields);
      setRequest(parseBusinessFieldsRequest(raw.bookingFieldsRequest));
      setServices(serviceRows);
      setDraft(toDraft(approvedFields));
      setOpenKey(null);
      setShowErrors(false);
    }).catch(() => {
      if (active) setLoadError("Randevu alanları yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [business, reloadToken]);

  const fields = useMemo(() => draft.map((item) => item.field), [draft]);
  const errors = useMemo(() => validateFieldDefinitions(fields), [fields]);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = !sameFields(fields, approved);
  const pendingSame = request?.status === "pending" && sameFields(fields, request.fields);
  const approvedIds = useMemo(() => new Set(approved.map((field) => field.id)), [approved]);
  const usedLabels = useMemo(() => new Set(fields.map((field) => field.label.toLocaleLowerCase("tr"))), [fields]);
  const full = draft.length >= MAX_CUSTOM_FIELDS;
  const editable = platformEnabled && !readOnly;
  const suggestions = useMemo(() => suggestedTemplates(business.category), [business.category]);
  const previewFields = useMemo(
    () => (previewServiceId ? fieldsForService(fields, previewServiceId) : fields).filter((field) => field.label.trim().length >= 2),
    [fields, previewServiceId]
  );
  const serviceName = useCallback((id: string) => services.find((service) => service.id === id)?.name ?? "Silinmiş hizmet", [services]);

  function updateField(key: string, patch: Partial<CustomBookingField> | ((field: CustomBookingField) => CustomBookingField)) {
    setDraft((items) => items.map((item) => {
      if (item.key !== key) return item;
      let next = typeof patch === "function" ? patch(item.field) : { ...item.field, ...patch };
      // Henüz yayında olmayan alanların kimliği adla birlikte güncellenir; yayındakilerin kimliği sabit kalır (eski randevu yanıtları için).
      if (!approvedIds.has(item.field.id) && next.label !== item.field.label && next.label.trim().length >= 2) {
        const taken = items.filter((other) => other.key !== key).map((other) => other.field.id);
        next = { ...next, id: uniqueFieldId(next.label, taken) };
      }
      return { ...item, field: next };
    }));
  }

  function addTemplate(template: BookingFieldTemplate) {
    if (!editable || full) return;
    const key = nextKey();
    setDraft((items) => {
      let label = template.field.label;
      if (items.some((item) => item.field.label.toLocaleLowerCase("tr") === label.toLocaleLowerCase("tr"))) {
        label = `${label} ${items.length + 1}`.slice(0, LABEL_MAX);
      }
      const field = { ...template.field, label, id: uniqueFieldId(label, items.map((item) => item.field.id)) } as CustomBookingField;
      return [...items, { key, field }];
    });
    setOpenKey(template.key === BLANK_TEMPLATE.key ? key : null);
    setTemplatesOpen(false);
    toast.success(`"${template.field.label}" eklendi. Yayına almak için onaya gönderin.`);
    requestAnimationFrame(() => listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  function move(index: number, delta: number) {
    setDraft((items) => {
      const target = index + delta;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(key: string) {
    setDraft((items) => items.filter((item) => item.key !== key));
    if (openKey === key) setOpenKey(null);
  }

  function loadFields(source: CustomBookingField[]) {
    setDraft(toDraft(source));
    setOpenKey(null);
    setShowErrors(false);
  }

  function askSubmit() {
    if (!editable) return;
    if (hasErrors) {
      setShowErrors(true);
      const firstIndex = Number(Object.keys(errors).map(Number).filter((index) => index >= 0).sort((a, b) => a - b)[0]);
      if (Number.isInteger(firstIndex) && draft[firstIndex]) setOpenKey(draft[firstIndex].key);
      toast.error(errors[-1]?.[0] ?? "Bazı alanlarda düzeltme gerekiyor.");
      return;
    }
    setConfirm(fields.length === 0 ? "clear" : "submit");
  }

  async function send(nextFields: CustomBookingField[]) {
    setBusy(true);
    try {
      const payload = normalizeFieldsForSubmit(nextFields);
      const result = await submitBookingFieldRequest(business.id, payload);
      if (result.status === "approved") {
        setApproved([]);
        setDraft([]);
        setRequest({ status: "approved", requestId: null, note: "Ek alanlar kaldırıldı.", fields: [], updatedAtMillis: Date.now() });
        toast.success("Ek alanlar randevu formunuzdan kaldırıldı.");
      } else {
        setRequest({ status: "pending", requestId: result.requestId, note: null, fields: payload, updatedAtMillis: Date.now() });
        setShowErrors(false);
        toast.success("Talebiniz süper admin onayına gönderildi.");
      }
      setConfirm(null);
    } catch (error) {
      toast.error(bookingFieldsErrorMessage(error, "Talep gönderilemedi. Lütfen tekrar deneyin."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <section className={styles.root} aria-busy="true"><div className={styles.card}><div className={styles.skeletonTitle}/><div className={styles.skeleton}/><div className={styles.skeleton}/></div></section>;
  }
  if (loadError) {
    return <section className={styles.root}><div className={cn(styles.card, styles.notice)}><AlertTriangle size={20}/><div><b>{loadError}</b><button type="button" className={styles.linkBtn} onClick={() => setReloadToken((value) => value + 1)}>Tekrar dene</button></div></div></section>;
  }

  return (
    <section className={styles.root} aria-labelledby="booking-fields-title">
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}><SlidersHorizontal size={13}/> RANDEVU FORMU</span>
          <h2 id="booking-fields-title">Ek randevu alanları</h2>
          <p>Müşteriden işinize özel bilgiler isteyin: kişi sayısı, evcil hayvan türü, araç plakası… Her değişiklik süper admin onayından sonra yayına girer.</p>
        </div>
        <div className={styles.heroStats}>
          <span><small>YAYINDA</small><b>{approved.length}</b></span>
          <span><small>TASLAK</small><b>{draft.length}/{MAX_CUSTOM_FIELDS}</b></span>
        </div>
      </header>

      {!platformEnabled && (
        <div className={cn(styles.card, styles.notice)}>
          <Lock size={20}/>
          <div><b>Ek alanlar şu anda platform genelinde kapalı.</b><p>Seninrandevun ekibi bu özelliği yeniden açtığında alanlarınızı buradan yönetebilirsiniz. Standart form (ad, telefon, not) çalışmaya devam eder.</p></div>
        </div>
      )}
      {platformEnabled && readOnly && (
        <div className={cn(styles.card, styles.notice)}>
          <Lock size={20}/>
          <div><b>Bu alanları yalnızca işletme yöneticileri düzenleyebilir.</b><p>Aşağıda müşterilerin gördüğü formu inceleyebilirsiniz.</p></div>
        </div>
      )}

      {platformEnabled && <StatusBanner request={request} approvedCount={approved.length} editable={editable} onLoad={loadFields} />}

      <div className={styles.grid}>
        <div className={styles.main}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div><h3>Alanlarınız</h3><p>Sıralama müşterinin gördüğü sırayla aynıdır.</p></div>
              {editable && dirty && <button type="button" className={styles.ghostBtn} onClick={() => loadFields(approved)}><RotateCcw size={15}/> Geri al</button>}
            </div>

            {draft.length === 0 ? (
              <div className={styles.empty}>
                <span><ListPlus size={22}/></span>
                <b>Henüz ek alan yok</b>
                <p>Aşağıdaki önerilerden birini seçin veya kendi sorunuzu ekleyin.</p>
              </div>
            ) : (
              <ol className={styles.list} ref={listRef}>
                {draft.map((item, index) => (
                  <FieldCard
                    key={item.key}
                    item={item}
                    index={index}
                    count={draft.length}
                    open={openKey === item.key}
                    published={approvedIds.has(item.field.id)}
                    errors={showErrors ? errors[index] ?? [] : []}
                    services={services}
                    serviceName={serviceName}
                    editable={editable}
                    onToggle={() => setOpenKey((current) => current === item.key ? null : item.key)}
                    onMove={(delta) => move(index, delta)}
                    onRemove={() => remove(item.key)}
                    onChange={(patch) => updateField(item.key, patch)}
                  />
                ))}
              </ol>
            )}
            {showErrors && errors[-1] && <p className={styles.errorLine}><AlertTriangle size={14}/> {errors[-1][0]}</p>}

            {editable && (
              <div className={styles.addArea}>
                <div className={styles.addHead}>
                  <b><Sparkles size={15}/> {suggestions.length ? "İşletmenize önerilenler" : "Hazır alanlar"}</b>
                  {full && <small>En fazla {MAX_CUSTOM_FIELDS} alan</small>}
                </div>
                <div className={styles.templateRow}>
                  {suggestions.map((template) => (
                    <TemplateChip key={template.key} template={template} added={usedLabels.has(template.field.label.toLocaleLowerCase("tr"))} disabled={full} onAdd={() => addTemplate(template)} />
                  ))}
                  <TemplateChip template={BLANK_TEMPLATE} disabled={full} onAdd={() => addTemplate(BLANK_TEMPLATE)} />
                </div>
                <button type="button" className={styles.moreBtn} aria-expanded={templatesOpen} onClick={() => setTemplatesOpen((value) => !value)}>
                  {templatesOpen ? "Tüm şablonları gizle" : `Tüm şablonlar (${BOOKING_FIELD_TEMPLATES.length})`} <ChevronDown size={15} className={cn(templatesOpen && styles.rotated)}/>
                </button>
                {templatesOpen && (
                  <div className={styles.templateGrid}>
                    {BOOKING_FIELD_TEMPLATES.map((template) => (
                      <TemplateChip key={template.key} template={template} wide added={usedLabels.has(template.field.label.toLocaleLowerCase("tr"))} disabled={full} onAdd={() => addTemplate(template)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {editable && (
            <div className={styles.actionBar}>
              <div className={styles.actionText}>
                <b>{pendingSame ? "Bu alanlar zaten onay bekliyor" : dirty ? "Kaydedilmemiş değişiklikler" : "Yayındaki alanlarla aynı"}</b>
                <small>{dirty ? "Onaya gönderdiğinizde mevcut alanlar onaylanana kadar yayında kalır." : "Bir alan ekleyin veya düzenleyin."}</small>
              </div>
              <div className={styles.actionBtns}>
                {approved.length > 0 && <button type="button" className={styles.dangerBtn} onClick={() => setConfirm("clear")}><Trash2 size={15}/> <span>Tüm ek alanları kaldır</span></button>}
                <button type="button" className={styles.primaryBtn} disabled={!dirty || pendingSame || busy} onClick={askSubmit}>
                  <Send size={16}/> {fields.length === 0 && approved.length > 0 ? "Alanları kaldır" : "Onaya gönder"}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className={styles.previewCol} aria-label="Müşteri önizlemesi">
          <div className={cn(styles.card, styles.previewCard)}>
            <div className={styles.cardHead}>
              <div><h3><Eye size={16}/> Müşteri böyle görecek</h3><p>Canlı önizleme · deneyebilirsiniz</p></div>
            </div>
            {services.length > 0 && fields.some((field) => field.serviceIds?.length) && (
              <label className={styles.previewSelect}>
                <span>Hizmet</span>
                <select value={previewServiceId} onChange={(event) => setPreviewServiceId(event.target.value)}>
                  <option value="">Tüm alanlar</option>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
              </label>
            )}
            <div className={styles.phone}>
              <div className={styles.phoneHead}><span><FileText size={16}/></span><div><b>Size nasıl ulaşalım?</b><small>{business.name}</small></div></div>
              <MockInput icon={UserRound} label="Ad Soyad" placeholder="Adınız Soyadınız"/>
              <MockInput icon={Phone} label="Cep telefonu" placeholder="05XX XXX XX XX" locked/>
              {previewFields.length > 0
                ? <CustomFieldInputs preview fields={previewFields} values={previewValues} idPrefix="bf-preview" onChange={(id, value) => setPreviewValues((previous) => { const next = { ...previous }; if (value === undefined) delete next[id]; else next[id] = value; return next; })} />
                : <p className={styles.previewEmpty}>Ek alan eklediğinizde burada görünür.</p>}
              <div className={styles.mockBtn}>Devam</div>
            </div>
            <p className={styles.previewNote}><Info size={14}/> Standart alanlar (ad, telefon, e-posta, not) platform ayarlarından gelir; ek alanlar onaydan sonra eklenir.</p>
          </div>
        </aside>
      </div>

      <BottomSheet
        open={confirm === "submit"}
        busy={busy}
        onClose={() => setConfirm(null)}
        icon={<ShieldCheck size={22}/>}
        title="Süper admin onayına gönderilsin mi?"
        confirmLabel="Onaya gönder"
        onConfirm={() => void send(fields)}
      >
        <p>Seninrandevun ekibi alanlarınızı müşteri gizliliği ve uygunluk açısından kontrol eder. Genellikle kısa sürede sonuçlanır; karar verildiğinde bildirim alırsınız.</p>
        <ul className={styles.sheetList}>
          <li><Clock3 size={15}/> Onaylanana kadar mevcut formunuz ({approved.length} ek alan) yayında kalır.</li>
          <li><Hourglass size={15}/> Bekleyen eski bir talebiniz varsa bu talep onun yerini alır.</li>
          <li><Info size={15}/> Hassas sağlık, kimlik veya ödeme bilgisi isteyen alanlar reddedilebilir.</li>
        </ul>
        <div className={styles.sheetFields}>{fields.map((field) => <span key={field.id}>{field.label}{field.required ? " *" : ""}</span>)}</div>
      </BottomSheet>

      <BottomSheet
        open={confirm === "clear"}
        busy={busy}
        danger
        onClose={() => setConfirm(null)}
        icon={<Trash2 size={22}/>}
        title="Tüm ek alanlar kaldırılsın mı?"
        confirmLabel="Hepsini kaldır"
        onConfirm={() => void send([])}
      >
        <p>Kaldırma işlemi onay beklemeden hemen uygulanır. Müşteriler artık bu soruları görmez; geçmiş randevulardaki yanıtlar korunur.</p>
        {request?.status === "pending" && <p><b>Bekleyen talebiniz de iptal edilir.</b></p>}
      </BottomSheet>
    </section>
  );
}

function StatusBanner({ request, approvedCount, editable, onLoad }: {
  request: BusinessBookingFieldsRequest | null;
  approvedCount: number;
  editable: boolean;
  onLoad: (fields: CustomBookingField[]) => void;
}) {
  if (request?.status === "pending") {
    return (
      <div className={cn(styles.banner, styles.bannerPending)} role="status">
        <span className={styles.bannerIcon}><Hourglass size={18}/></span>
        <div className={styles.bannerText}>
          <b>Onay bekliyor</b>
          <p>{request.fields.length} alanlık talebiniz süper admin incelemesinde{request.updatedAtMillis ? ` · ${formatDate(request.updatedAtMillis)}` : ""}.</p>
          {request.fields.length > 0 && <div className={styles.bannerChips}>{request.fields.map((field) => <span key={field.id}>{field.label}</span>)}</div>}
        </div>
        {editable && <button type="button" className={styles.bannerBtn} onClick={() => onLoad(request.fields)}>Talebi düzenle</button>}
      </div>
    );
  }
  if (request?.status === "rejected") {
    return (
      <div className={cn(styles.banner, styles.bannerRejected)} role="status">
        <span className={styles.bannerIcon}><XCircle size={18}/></span>
        <div className={styles.bannerText}>
          <b>Reddedildi</b>
          {request.note && <p className={styles.adminNote}><small>Süper admin notu</small>{request.note}</p>}
          <p>Notu dikkate alıp alanları düzenleyerek yeniden gönderebilirsiniz.</p>
        </div>
        {editable && request.fields.length > 0 && <button type="button" className={styles.bannerBtn} onClick={() => onLoad(request.fields)}>Düzenleyip yeniden gönder</button>}
      </div>
    );
  }
  if (approvedCount > 0) {
    return (
      <div className={cn(styles.banner, styles.bannerLive)} role="status">
        <span className={styles.bannerIcon}><CheckCircle2 size={18}/></span>
        <div className={styles.bannerText}>
          <b>Yayında</b>
          <p>{approvedCount} ek alan müşterilerinizin randevu formunda görünüyor.</p>
          {request?.note && request.status === "approved" && <p className={styles.adminNote}><small>Süper admin notu</small>{request.note}</p>}
        </div>
      </div>
    );
  }
  return null;
}

function TemplateChip({ template, added = false, disabled, wide = false, onAdd }: { template: BookingFieldTemplate; added?: boolean; disabled: boolean; wide?: boolean; onAdd: () => void }) {
  return (
    <button type="button" className={cn(styles.template, wide && styles.templateWide, added && styles.templateAdded)} disabled={disabled || added} onClick={onAdd}>
      <span className={styles.templateEmoji} aria-hidden>{template.emoji}</span>
      <span className={styles.templateText}><b>{template.key === BLANK_TEMPLATE.key ? "Boş alan" : template.field.label}</b><small>{added ? "Eklendi" : template.hint}</small></span>
      {added ? <Check size={16}/> : <Plus size={16}/>}
    </button>
  );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={cn(styles.switch, checked && styles.switchOn)} onClick={() => onChange(!checked)}>
      <span>{checked && <Check size={12} strokeWidth={3}/>}</span>
    </button>
  );
}

function FieldCard({
  item, index, count, open, published, errors, services, serviceName, editable, onToggle, onMove, onRemove, onChange,
}: {
  item: DraftItem;
  index: number;
  count: number;
  open: boolean;
  published: boolean;
  errors: string[];
  services: Service[];
  serviceName: (id: string) => string;
  editable: boolean;
  onToggle: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onChange: (patch: Partial<CustomBookingField> | ((field: CustomBookingField) => CustomBookingField)) => void;
}) {
  const { field } = item;
  const panelId = `bf-panel-${item.key}`;
  const scope = field.serviceIds?.length
    ? field.serviceIds.length === 1 ? serviceName(field.serviceIds[0]) : `${field.serviceIds.length} hizmet`
    : "Tüm hizmetler";
  const options = field.options ?? [];

  function setOptions(next: string[]) { onChange({ options: next }); }
  function toggleService(id: string) {
    const current = new Set(field.serviceIds ?? []);
    if (current.has(id)) current.delete(id); else current.add(id);
    onChange({ serviceIds: [...current] });
  }

  return (
    <li className={cn(styles.field, open && styles.fieldOpen, errors.length > 0 && styles.fieldInvalid)}>
      <div className={styles.fieldHead}>
        <button type="button" className={styles.fieldSummary} onClick={onToggle} aria-expanded={open} aria-controls={panelId}>
          <span className={styles.fieldIndex}>{index + 1}</span>
          <span className={styles.fieldMeta}>
            <b>{field.label || "Adsız alan"}</b>
            <span className={styles.badges}>
              <span className={styles.badge}>{FIELD_TYPE_LABELS[field.type]}</span>
              {field.required && <span className={cn(styles.badge, styles.badgeRequired)}>Zorunlu</span>}
              <span className={styles.badge}>{scope}</span>
              {!published && <span className={cn(styles.badge, styles.badgeNew)}>Yeni</span>}
            </span>
          </span>
          <ChevronDown size={18} className={cn(styles.chevron, open && styles.rotated)} aria-hidden/>
        </button>
        {editable && (
          <div className={styles.fieldTools}>
            <button type="button" className={styles.iconBtn} onClick={() => onMove(-1)} disabled={index === 0} aria-label={`${field.label} yukarı taşı`}><ArrowUp size={16}/></button>
            <button type="button" className={styles.iconBtn} onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`${field.label} aşağı taşı`}><ArrowDown size={16}/></button>
            <button type="button" className={cn(styles.iconBtn, styles.iconDanger)} onClick={onRemove} aria-label={`${field.label} alanını sil`}><Trash2 size={16}/></button>
          </div>
        )}
      </div>
      {errors.length > 0 && <ul className={styles.fieldErrors}>{errors.map((error) => <li key={error}><AlertTriangle size={13}/> {error}</li>)}</ul>}

      {open && (
        <fieldset id={panelId} className={styles.editor} disabled={!editable}>
          <legend className={styles.srOnly}>{field.label} ayarları</legend>
          <label className={styles.control}>
            <span>Alan adı <em>{field.label.length}/{LABEL_MAX}</em></span>
            <input value={field.label} maxLength={LABEL_MAX} onChange={(event) => onChange({ label: event.target.value })} placeholder="Örn. Kişi sayısı" className={styles.input}/>
          </label>

          <div className={styles.control}>
            <span>Tür</span>
            <div className={styles.segment} role="radiogroup" aria-label="Alan türü">
              {CUSTOM_FIELD_TYPES.map((type) => (
                <button key={type} type="button" role="radio" aria-checked={field.type === type} className={cn(styles.segmentItem, field.type === type && styles.segmentOn)}
                  onClick={() => onChange((current) => withTypeDefaults(current, type as CustomFieldType))}>
                  {FIELD_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.toggleRow}>
            <span><b>Zorunlu</b><small>{field.type === "checkbox" ? "Müşteri kutuyu işaretlemeden devam edemez." : "Müşteri bu alanı boş bırakamaz."}</small></span>
            <Toggle checked={field.required} onChange={(required) => onChange({ required })} label="Zorunlu alan" disabled={!editable}/>
          </div>

          <label className={styles.control}>
            <span>Açıklama <small>isteğe bağlı</small><em>{(field.helpText ?? "").length}/{HELP_MAX}</em></span>
            <input value={field.helpText ?? ""} maxLength={HELP_MAX} onChange={(event) => onChange({ helpText: event.target.value })} placeholder="Müşteriye kısa bir ipucu" className={styles.input}/>
          </label>

          {(field.type === "text" || field.type === "textarea" || field.type === "number") && (
            <label className={styles.control}>
              <span>Örnek metin <small>isteğe bağlı</small></span>
              <input value={field.placeholder ?? ""} maxLength={PLACEHOLDER_MAX} onChange={(event) => onChange({ placeholder: event.target.value })} placeholder={field.type === "number" ? "Örn. 2" : "Örn. 34 ABC 123"} className={styles.input}/>
            </label>
          )}

          {field.type === "select" && (
            <div className={styles.control}>
              <span>Seçenekler <em>{options.length}/{OPTIONS_MAX}</em></span>
              <ol className={styles.options}>
                {options.map((option, optionIndex) => (
                  <li key={optionIndex}>
                    <input value={option} maxLength={OPTION_MAX} aria-label={`${optionIndex + 1}. seçenek`} className={styles.input}
                      onChange={(event) => setOptions(options.map((value, i) => i === optionIndex ? event.target.value : value))}/>
                    <button type="button" className={styles.iconBtn} disabled={optionIndex === 0} aria-label="Seçeneği yukarı taşı"
                      onClick={() => { const next = [...options]; [next[optionIndex - 1], next[optionIndex]] = [next[optionIndex], next[optionIndex - 1]]; setOptions(next); }}><ArrowUp size={15}/></button>
                    <button type="button" className={styles.iconBtn} disabled={optionIndex === options.length - 1} aria-label="Seçeneği aşağı taşı"
                      onClick={() => { const next = [...options]; [next[optionIndex + 1], next[optionIndex]] = [next[optionIndex], next[optionIndex + 1]]; setOptions(next); }}><ArrowDown size={15}/></button>
                    <button type="button" className={cn(styles.iconBtn, styles.iconDanger)} disabled={options.length <= 2} aria-label="Seçeneği sil"
                      onClick={() => setOptions(options.filter((_, i) => i !== optionIndex))}><X size={15}/></button>
                  </li>
                ))}
              </ol>
              <button type="button" className={styles.ghostBtn} disabled={options.length >= OPTIONS_MAX} onClick={() => setOptions([...options, `Seçenek ${options.length + 1}`])}><Plus size={15}/> Seçenek ekle</button>
              <small className={styles.hint}>4 veya daha az seçenek hap düğmeler, daha fazlası açılır liste olarak gösterilir.</small>
            </div>
          )}

          {field.type === "number" && (
            <div className={styles.pair}>
              <label className={styles.control}>
                <span>En az</span>
                <input type="number" inputMode="numeric" min={0} max={NUMBER_LIMIT} value={field.min ?? ""} className={styles.input}
                  onChange={(event) => onChange({ min: event.target.value === "" ? undefined : Math.trunc(Number(event.target.value)) })}/>
              </label>
              <label className={styles.control}>
                <span>En çok</span>
                <input type="number" inputMode="numeric" min={0} max={NUMBER_LIMIT} value={field.max ?? ""} className={styles.input}
                  onChange={(event) => onChange({ max: event.target.value === "" ? undefined : Math.trunc(Number(event.target.value)) })}/>
              </label>
            </div>
          )}

          {(field.type === "text" || field.type === "textarea") && (
            <label className={styles.control}>
              <span>Karakter sınırı <small>en fazla {field.type === "text" ? TEXT_LIMIT : TEXTAREA_LIMIT}</small></span>
              <input type="number" inputMode="numeric" min={1} max={field.type === "text" ? TEXT_LIMIT : TEXTAREA_LIMIT} value={field.maxLength ?? ""} className={styles.input}
                onChange={(event) => onChange({ maxLength: event.target.value === "" ? undefined : Math.max(1, Math.min(field.type === "text" ? TEXT_LIMIT : TEXTAREA_LIMIT, Math.trunc(Number(event.target.value)))) })}/>
            </label>
          )}

          <div className={styles.control}>
            <span>Hangi hizmetlerde sorulsun?</span>
            <div className={styles.serviceChips}>
              <button type="button" className={cn(styles.chip, !field.serviceIds?.length && styles.chipOn)} aria-pressed={!field.serviceIds?.length} onClick={() => onChange({ serviceIds: [] })}>
                {!field.serviceIds?.length && <Check size={14}/>} Tüm hizmetler
              </button>
              {services.map((service) => {
                const on = Boolean(field.serviceIds?.includes(service.id));
                return (
                  <button key={service.id} type="button" className={cn(styles.chip, on && styles.chipOn)} aria-pressed={on} onClick={() => toggleService(service.id)}>
                    {on && <Check size={14}/>} {service.name}
                  </button>
                );
              })}
              {(field.serviceIds ?? []).filter((id) => !services.some((service) => service.id === id)).map((id) => (
                <button key={id} type="button" className={cn(styles.chip, styles.chipOn)} aria-pressed onClick={() => toggleService(id)}><X size={14}/> Silinmiş hizmet</button>
              ))}
            </div>
            {services.length === 0 && <small className={styles.hint}>Aktif hizmet bulunamadı; alan tüm hizmetlerde sorulur.</small>}
          </div>
        </fieldset>
      )}
    </li>
  );
}

function MockInput({ icon: Icon, label, placeholder, locked = false }: { icon: typeof UserRound; label: string; placeholder: string; locked?: boolean }) {
  return (
    <div className={styles.mock} aria-hidden="true">
      <span className={styles.mockLabel}>{label}{locked && <em>*</em>}</span>
      <span className={styles.mockInput}><Icon size={16}/>{placeholder}{locked && <Lock size={13} className={styles.mockLock}/>}</span>
    </div>
  );
}

function BottomSheet({ open, busy, danger = false, icon, title, confirmLabel, onConfirm, onClose, children }: {
  open: boolean;
  busy: boolean;
  danger?: boolean;
  icon: ReactNode;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) closeRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); };
  }, [open, busy]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={panelRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="bf-sheet-title">
        <span className={styles.grip} aria-hidden/>
        <span className={cn(styles.sheetIcon, danger && styles.sheetIconDanger)}>{icon}</span>
        <h3 id="bf-sheet-title">{title}</h3>
        <div className={styles.sheetBody}>{children}</div>
        <div className={styles.sheetActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={busy}>Vazgeç</button>
          <button type="button" data-autofocus className={danger ? styles.dangerSolidBtn : styles.primaryBtn} onClick={onConfirm} disabled={busy}>
            {busy ? <LoaderCircle size={16} className={styles.spin}/> : null} {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
