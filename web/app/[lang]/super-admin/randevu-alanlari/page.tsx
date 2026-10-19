"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownUp, BadgeCheck, Building2, Check, CheckCircle2, ClipboardList, ExternalLink, Hourglass, LockKeyhole, Mail, MessageSquareText,
  Minus, PencilLine, Phone, Plus, RefreshCw, RotateCcw, Save, ShieldCheck, SlidersHorizontal, Store, Trash2, UserRound, XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  AdminButton, AdminPage, Badge, Callout, ConfirmSheet, EmptyState, PageHeader, Panel, SegmentedControl, Sheet, SkeletonList,
} from "@/components/super-admin/ui";
import { cn } from "@/lib/utils/cn";
import {
  bookingFieldsErrorMessage, getBookingFieldSettings, listPendingBookingFieldRequests, listReviewedBookingFieldRequests,
  reviewBookingFieldRequest, updateBookingFieldSettings,
  type BookingFieldRequest, type PlatformBookingFieldToggles,
} from "@/features/booking-fields/booking-fields-repository";
import {
  FIELD_TYPE_LABELS, LABEL_MAX, HELP_MAX, OPTIONS_MAX, OPTION_MAX, NUMBER_LIMIT,
  diffFields, normalizeFieldsForSubmit, validateFieldDefinitions,
  type CustomBookingField, type CustomFieldInputValues,
} from "@/features/booking-fields/booking-fields-domain";
import { CustomFieldInputs } from "@/features/booking-fields/custom-field-inputs";
import p from "./booking-fields.module.css";

type ToggleKey = keyof PlatformBookingFieldToggles;
type Tab = "pending" | "history";

const TOGGLES: Array<{ key: ToggleKey; title: string; description: string; tag: string; icon: LucideIcon }> = [
  { key: "collectName", title: "Ad soyad", description: "Müşterinin adı randevu ve takvim kayıtlarında görünür.", tag: "Kimlik", icon: UserRound },
  { key: "collectEmail", title: "E-posta", description: "İsteğe bağlı e-posta adresi; bildirim ve iletişim için.", tag: "İletişim", icon: Mail },
  { key: "collectNotes", title: "Randevu notu", description: "Müşteri işletmeye serbest bir not bırakabilir.", tag: "Serbest metin", icon: MessageSquareText },
  { key: "businessCustomFieldsEnabled", title: "İşletmeler ek alan ekleyebilsin", description: "Kişi sayısı, evcil hayvan türü gibi işletmeye özel sorular. Her set bu sayfadan onaylanır; kapalıyken yayındaki ek alanlar da gizlenir.", tag: "Gelişmiş", icon: ClipboardList },
];

const CATEGORY_LABELS: Record<string, string> = {
  kuafor: "Kuaför", berber: "Berber", guzellik: "Güzellik", nail: "Nail Studio", spa: "Spa / Masaj", spor: "Spor", saglik: "Sağlık",
  danismanlik: "Danışmanlık", veteriner: "Veteriner", egitim: "Eğitim", servis: "Servis / Teknik", yazilim: "Yazılım", diger: "Diğer",
};

const REJECT_REASONS = [
  "Hassas kişisel veri (sağlık/kimlik) istendiği için uygun değil.",
  "Alan standart formda zaten var.",
  "Alan adı veya seçenekler anlaşılır değil, lütfen sadeleştirin.",
  "Zorunlu alan sayısı müşteriyi zorlayacak kadar fazla.",
];

function relative(millis: number | null) {
  if (!millis) return "";
  const diff = Date.now() - millis;
  const minute = 60_000;
  if (diff < minute) return "az önce";
  if (diff < 60 * minute) return `${Math.floor(diff / minute)} dk önce`;
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))} sa önce`;
  if (diff < 7 * 24 * 60 * minute) return `${Math.floor(diff / (24 * 60 * minute))} gün önce`;
  return new Date(millis).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={cn(p.switch, checked && p.switchOn)}>
      <span>{checked && <Check size={12} strokeWidth={3} />}</span>
    </button>
  );
}

export default function BookingFieldsPage() {
  const [settings, setSettings] = useState<PlatformBookingFieldToggles | null>(null);
  const [saved, setSaved] = useState<PlatformBookingFieldToggles | null>(null);
  const [settingsError, setSettingsError] = useState("");
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<BookingFieldRequest[] | null>(null);
  const [history, setHistory] = useState<BookingFieldRequest[] | null>(null);
  const [listError, setListError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [approveTarget, setApproveTarget] = useState<BookingFieldRequest | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [editTarget, setEditTarget] = useState<BookingFieldRequest | null>(null);
  const [editFields, setEditFields] = useState<CustomBookingField[]>([]);
  const [rejectTarget, setRejectTarget] = useState<BookingFieldRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBookingFieldSettings()
      .then((value) => {
        const toggles = { collectName: value.collectName, collectEmail: value.collectEmail, collectNotes: value.collectNotes, businessCustomFieldsEnabled: value.businessCustomFieldsEnabled };
        setSettings(toggles);
        setSaved(toggles);
      })
      .catch(() => setSettingsError("Platform form ayarları yüklenemedi."));
  }, []);

  const loadPending = useCallback(async () => {
    setListError("");
    try { setPending(await listPendingBookingFieldRequests()); }
    catch (error) { setPending([]); setListError(bookingFieldsErrorMessage(error, "Talepler yüklenemedi.")); }
  }, []);
  const loadHistory = useCallback(async () => {
    setListError("");
    try { setHistory(await listReviewedBookingFieldRequests()); }
    catch (error) { setHistory([]); setListError(bookingFieldsErrorMessage(error, "Geçmiş yüklenemedi.")); }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadPending); }, [loadPending]);
  useEffect(() => { if (tab === "history" && history === null) void Promise.resolve().then(loadHistory); }, [tab, history, loadHistory]);

  async function refresh() {
    setRefreshing(true);
    await (tab === "pending" ? loadPending() : loadHistory());
    setRefreshing(false);
  }

  const dirty = Boolean(settings && saved && TOGGLES.some(({ key }) => settings[key] !== saved[key]));
  const activeStandard = settings ? TOGGLES.filter(({ key }) => key !== "businessCustomFieldsEnabled" && settings[key]).length : 0;

  async function save() {
    if (!settings || !dirty) return;
    setSaving(true);
    try {
      const next = await updateBookingFieldSettings(settings);
      setSaved(next);
      setSettings(next);
      toast.success("Randevu formu ayarları yayına alındı.");
    } catch (error) {
      toast.error(bookingFieldsErrorMessage(error, "Ayarlar kaydedilemedi."));
    } finally {
      setSaving(false);
    }
  }

  function dropRequest(id: string) {
    setPending((rows) => rows?.filter((row) => row.id !== id) ?? rows);
    setHistory(null); // bir sonraki açılışta taze okunur
  }

  async function decide(target: BookingFieldRequest, decision: "approved" | "rejected", options: { note?: string; fields?: CustomBookingField[] } = {}) {
    setBusy(true);
    try {
      await reviewBookingFieldRequest({ requestId: target.id, decision, ...(options.note?.trim() ? { note: options.note.trim() } : {}), ...(options.fields ? { fields: options.fields } : {}) });
      dropRequest(target.id);
      toast.success(decision === "approved" ? `${target.businessName} için alanlar yayına alındı.` : `${target.businessName} talebi reddedildi; işletmeye bildirildi.`);
      setApproveTarget(null); setEditTarget(null); setRejectTarget(null);
      setApproveNote(""); setRejectNote("");
    } catch (error) {
      toast.error(bookingFieldsErrorMessage(error, "Karar kaydedilemedi."));
      if (String((error as { code?: string })?.code ?? "").includes("failed-precondition")) void loadPending();
    } finally {
      setBusy(false);
    }
  }

  const editErrors = useMemo(() => validateFieldDefinitions(editFields), [editFields]);
  const editInvalid = Object.keys(editErrors).length > 0 || editFields.length === 0;

  return (
    <AdminPage className={p.page}>
      <PageHeader
        icon={SlidersHorizontal}
        eyebrow="RANDEVU DENEYİMİ"
        title="Randevu alanları"
        description="Tüm işletmelerin randevu formunda hangi bilgilerin istendiğini yönetin ve işletmelerin özel alan taleplerini onaylayın."
        meta={<>
          <Badge tone="green" icon={BadgeCheck}>Telefon doğrulaması zorunlu</Badge>
          {settings && <Badge tone="neutral">{activeStandard}/3 standart alan açık</Badge>}
          {pending && pending.length > 0 && <Badge tone="amber" icon={Hourglass} dot>{pending.length} talep bekliyor</Badge>}
        </>}
      />

      <Panel
        title="Platform formu"
        description="Değişiklikler kaydedildiğinde tüm işletmelerin çevrimiçi formuna anında uygulanır."
        actions={!dirty && saved ? <Badge tone="green" icon={CheckCircle2} size="sm">Canlı ayarlar güncel</Badge> : dirty ? <Badge tone="amber" size="sm" dot>Kaydedilmedi</Badge> : null}
      >
        {settingsError ? (
          <Callout tone="red" title={settingsError} action={<AdminButton size="sm" icon={RefreshCw} onClick={() => window.location.reload()}>Yenile</AdminButton>} />
        ) : !settings ? (
          <SkeletonList rows={3} height={72} label="Ayarlar yükleniyor" />
        ) : (
          <div className={p.toggleGrid}>
            <article className={cn(p.toggleCard, p.lockedCard)}>
              <span className={cn(p.toggleIcon, p.lockedIcon)}><LockKeyhole size={19} /></span>
              <div className={p.toggleBody}>
                <div className={p.toggleTop}>
                  <div><small>GÜVENLİK · HER ZAMAN AÇIK</small><h3>Telefon + SMS doğrulaması</h3></div>
                  <Badge tone="green" size="sm" icon={ShieldCheck}>Zorunlu</Badge>
                </div>
                <p>Sahte randevuları önler; müşteri numarasının sahibi olduğunu SMS kodu ile doğrular. Kapatılamaz.</p>
              </div>
            </article>
            {TOGGLES.map(({ key, title, description, tag, icon: Icon }) => {
              const on = settings[key];
              const changed = saved ? saved[key] !== on : false;
              return (
                <article key={key} className={cn(p.toggleCard, on && p.toggleOn, key === "businessCustomFieldsEnabled" && p.toggleWide)}>
                  <span className={p.toggleIcon}><Icon size={19} /></span>
                  <div className={p.toggleBody}>
                    <div className={p.toggleTop}>
                      <div><small>{tag.toLocaleUpperCase("tr-TR")}{changed ? " · DEĞİŞTİ" : ""}</small><h3>{title}</h3></div>
                      <Switch checked={on} label={title} onChange={() => setSettings({ ...settings, [key]: !on })} />
                    </div>
                    <p>{description}</p>
                    <span className={cn(p.stateLine, on && p.stateOn)}>{on ? <><Check size={12} /> Formda gösteriliyor</> : "Kapalı · formdan ve kayıttan çıkarılır"}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel
        title="İşletme talepleri"
        description="İşletmelerin istediği ek alanlar onaylanana kadar müşteri formunda görünmez."
        actions={<AdminButton size="sm" variant="ghost" icon={RefreshCw} loading={refreshing} onClick={() => void refresh()}>Yenile</AdminButton>}
      >
        <SegmentedControl
          ariaLabel="Talep görünümü"
          value={tab}
          onChange={setTab}
          options={[
            { value: "pending", label: "Bekleyen", icon: Hourglass, count: pending?.length },
            { value: "history", label: "Geçmiş", icon: ClipboardList },
          ]}
        />
        {settings && !settings.businessCustomFieldsEnabled && (
          <div className={p.gap}><Callout tone="amber" title="İşletme ek alanları platformda kapalı.">Talepleri yine inceleyebilirsiniz; onaylanan alanlar özellik açılana kadar formda görünmez.</Callout></div>
        )}
        {listError && <div className={p.gap}><Callout tone="red" title={listError} /></div>}

        <div className={p.queue}>
          {tab === "pending" && (pending === null ? <SkeletonList rows={2} height={180} label="Talepler yükleniyor" /> : pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Bekleyen talep yok" description="İşletmeler ayarlar › Randevu Motoru bölümünden ek alan gönderdiğinde burada görünür." />
          ) : pending.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onApprove={() => { setApproveNote(""); setApproveTarget(request); }}
              onEdit={() => { setEditFields(request.fields.map((field) => ({ ...field }))); setEditTarget(request); }}
              onReject={() => { setRejectNote(""); setRejectTarget(request); }}
            />
          )))}
          {tab === "history" && (history === null ? <SkeletonList rows={3} height={96} label="Geçmiş yükleniyor" /> : history.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Henüz karar verilmiş talep yok" />
          ) : history.map((request) => <HistoryCard key={request.id} request={request} />))}
        </div>
      </Panel>

      {dirty && (
        <div className={p.saveBar} role="region" aria-label="Kaydedilmemiş değişiklikler">
          <div className={p.saveText}><b>Kaydedilmemiş değişiklikler</b><small>Yayınlandığında tüm işletmelerin formuna uygulanır.</small></div>
          <div className={p.saveBtns}>
            <AdminButton variant="secondary" icon={RotateCcw} disabled={saving} onClick={() => saved && setSettings({ ...saved })}>Geri al</AdminButton>
            <AdminButton variant="primary" icon={Save} loading={saving} onClick={() => void save()}>Kaydet ve yayınla</AdminButton>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={approveTarget !== null}
        tone="primary"
        icon={CheckCircle2}
        busy={busy}
        title="Alanlar onaylansın mı?"
        description={approveTarget ? `${approveTarget.businessName} randevu formunda ${approveTarget.fields.length} ek alan hemen yayına girer ve işletmeye bildirim gider.` : undefined}
        confirmLabel="Onayla ve yayınla"
        onClose={() => setApproveTarget(null)}
        onConfirm={() => approveTarget && void decide(approveTarget, "approved", { note: approveNote })}
      >
        <label className={p.noteLabel}>İşletmeye not <small>isteğe bağlı</small>
          <textarea className={p.textarea} rows={2} maxLength={300} value={approveNote} onChange={(event) => setApproveNote(event.target.value)} placeholder="Örn. Seçenekleri sadeleştirdik." />
        </label>
      </ConfirmSheet>

      <Sheet
        open={rejectTarget !== null}
        dismissible={!busy}
        onClose={() => setRejectTarget(null)}
        title="Talebi reddet"
        description={rejectTarget ? `${rejectTarget.businessName} bu notu ayarlar sayfasında ve bildirimde görecek.` : undefined}
        footer={<>
          <AdminButton variant="secondary" onClick={() => setRejectTarget(null)} disabled={busy}>Vazgeç</AdminButton>
          <AdminButton variant="danger" icon={XCircle} loading={busy} disabled={rejectNote.trim().length < 3} onClick={() => rejectTarget && void decide(rejectTarget, "rejected", { note: rejectNote })}>Reddet</AdminButton>
        </>}
      >
        <div className={p.reasons}>
          {REJECT_REASONS.map((reason) => (
            <button key={reason} type="button" className={cn(p.reason, rejectNote === reason && p.reasonOn)} onClick={() => setRejectNote(reason)}>{reason}</button>
          ))}
        </div>
        <label className={p.noteLabel}>Süper admin notu <small>zorunlu · en az 3 karakter</small>
          <textarea className={p.textarea} rows={3} maxLength={300} value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} placeholder="Neden reddedildiğini ve nasıl düzeltilebileceğini yazın" data-autofocus />
          <span className={p.counter}>{rejectNote.trim().length}/300</span>
        </label>
      </Sheet>

      <Sheet
        open={editTarget !== null}
        size="lg"
        dismissible={!busy}
        onClose={() => setEditTarget(null)}
        title="Düzenle ve onayla"
        description={editTarget ? `${editTarget.businessName} talebini düzeltip yayına alın. İşletme onaylanan son hali görür.` : undefined}
        footer={<>
          <AdminButton variant="secondary" onClick={() => setEditTarget(null)} disabled={busy}>Vazgeç</AdminButton>
          <AdminButton variant="primary" icon={CheckCircle2} loading={busy} disabled={editInvalid}
            onClick={() => editTarget && void decide(editTarget, "approved", { fields: normalizeFieldsForSubmit(editFields), note: "Alanlar süper admin tarafından düzenlenerek onaylandı." })}>
            Düzenlenmiş hali onayla
          </AdminButton>
        </>}
      >
        <AdminFieldEditor fields={editFields} errors={editErrors} onChange={setEditFields} />
        <div className={p.sheetPreview}>
          <span className={p.sectionLabel}>Önizleme</span>
          <PreviewForm fields={editFields.filter((field) => field.label.trim().length >= 2)} idPrefix="sa-edit-preview" />
        </div>
      </Sheet>
    </AdminPage>
  );
}

function RequestCard({ request, onApprove, onEdit, onReject }: { request: BookingFieldRequest; onApprove: () => void; onEdit: () => void; onReject: () => void }) {
  const diff = useMemo(() => diffFields(request.currentFields, request.fields), [request]);
  const category = request.category ? CATEGORY_LABELS[request.category] ?? request.category : null;
  return (
    <article className={p.request}>
      <header className={p.requestHead}>
        <span className={p.requestIcon}><Building2 size={19} /></span>
        <div className={p.requestTitle}>
          <h3>{request.businessName}</h3>
          <div className={p.requestMeta}>
            {category && <Badge size="sm" tone="neutral">{category}</Badge>}
            <Badge size="sm" tone="amber" dot>Onay bekliyor</Badge>
            <span>{relative(request.createdAtMillis)}</span>
          </div>
        </div>
        <div className={p.requestLinks}>
          {request.businessSlug && <AdminButton size="sm" variant="ghost" icon={Store} href={`/isletme/${encodeURIComponent(request.businessSlug)}`} external aria-label="Mağaza sayfasını aç">Mağaza</AdminButton>}
          <AdminButton size="sm" variant="ghost" icon={ExternalLink} href={`/super-admin/isletmeler?q=${encodeURIComponent(request.businessId)}`} aria-label="İşletme kaydını aç">Kayıt</AdminButton>
        </div>
      </header>

      <div className={p.requestBody}>
        <section className={p.diff} aria-label="Değişiklikler">
          <span className={p.sectionLabel}>Değişiklikler · yayındaki {request.currentFields.length} alana göre</span>
          {diff.added.map((field) => <DiffRow key={`a-${field.id}`} kind="added" field={field} />)}
          {diff.changed.map(({ after, changes }) => <DiffRow key={`c-${after.id}`} kind="changed" field={after} changes={changes} />)}
          {diff.removed.map((field) => <DiffRow key={`r-${field.id}`} kind="removed" field={field} />)}
          {diff.reordered && <p className={p.reordered}><ArrowDownUp size={14} /> Alan sırası değişti</p>}
          {!diff.added.length && !diff.changed.length && !diff.removed.length && !diff.reordered && <p className={p.reordered}>Yayındaki alanlarla aynı görünüyor.</p>}
        </section>
        <section className={p.previewBox} aria-label="Müşteri önizlemesi">
          <span className={p.sectionLabel}>Müşteri böyle görecek</span>
          <PreviewForm fields={request.fields} idPrefix={`sa-preview-${request.id}`} />
        </section>
      </div>

      <footer className={p.requestActions}>
        <AdminButton variant="danger" icon={XCircle} onClick={onReject}>Reddet</AdminButton>
        <AdminButton variant="secondary" icon={PencilLine} onClick={onEdit}>Düzenle</AdminButton>
        <AdminButton variant="primary" icon={CheckCircle2} onClick={onApprove}>Onayla</AdminButton>
      </footer>
    </article>
  );
}

function fieldSpec(field: CustomBookingField) {
  const parts = [FIELD_TYPE_LABELS[field.type], field.required ? "zorunlu" : "isteğe bağlı"];
  if (field.type === "number") parts.push(`${field.min ?? 1}–${field.max ?? 10}`);
  if (field.type === "select" && field.options?.length) parts.push(field.options.join(" / "));
  if (field.serviceIds?.length) parts.push(`${field.serviceIds.length} hizmete özel`);
  return parts.join(" · ");
}

function DiffRow({ kind, field, changes }: { kind: "added" | "changed" | "removed"; field: CustomBookingField; changes?: string[] }) {
  const Icon = kind === "added" ? Plus : kind === "removed" ? Minus : PencilLine;
  const label = kind === "added" ? "Eklenen" : kind === "removed" ? "Kaldırılan" : "Değişen";
  return (
    <div className={cn(p.diffRow, p[`diff-${kind}`])}>
      <span className={p.diffIcon} aria-hidden><Icon size={14} strokeWidth={2.6} /></span>
      <div className={p.diffText}>
        <b><span className={p.srOnly}>{label}: </span>{field.label}</b>
        <small>{fieldSpec(field)}</small>
        {field.helpText && kind !== "removed" && <small className={p.diffHelp}>“{field.helpText}”</small>}
        {changes?.length ? <ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul> : null}
      </div>
      <span className={p.diffTag}>{label}</span>
    </div>
  );
}

function PreviewForm({ fields, idPrefix }: { fields: CustomBookingField[]; idPrefix: string }) {
  const [values, setValues] = useState<CustomFieldInputValues>({});
  if (fields.length === 0) return <p className={p.previewEmpty}>Tüm ek alanlar kaldırılıyor; müşteri yalnızca standart formu görür.</p>;
  return (
    <div className={p.phone}>
      <div className={p.mock} aria-hidden><span>Cep telefonu *</span><i><Phone size={14} /> 05XX XXX XX XX</i></div>
      <CustomFieldInputs
        preview
        fields={fields}
        values={values}
        idPrefix={idPrefix}
        onChange={(id, value) => setValues((previous) => { const next = { ...previous }; if (value === undefined) delete next[id]; else next[id] = value; return next; })}
      />
    </div>
  );
}

function HistoryCard({ request }: { request: BookingFieldRequest }) {
  const approved = request.status === "approved";
  const fields = approved && request.approvedFields.length ? request.approvedFields : request.fields;
  const edited = approved && request.approvedFields.length > 0 && JSON.stringify(request.approvedFields) !== JSON.stringify(request.fields);
  return (
    <article className={p.history}>
      <div className={p.historyHead}>
        <span className={cn(p.historyIcon, approved ? p.historyOk : p.historyNo)}>{approved ? <CheckCircle2 size={17} /> : <XCircle size={17} />}</span>
        <div className={p.requestTitle}>
          <h3>{request.businessName}</h3>
          <div className={p.requestMeta}>
            <Badge size="sm" tone={approved ? "green" : "red"}>{approved ? "Onaylandı" : "Reddedildi"}</Badge>
            {edited && <Badge size="sm" tone="blue">Düzenlenerek</Badge>}
            <span>{relative(request.reviewedAtMillis ?? request.createdAtMillis)}</span>
          </div>
        </div>
        {request.businessSlug && <AdminButton size="sm" variant="ghost" icon={Store} href={`/isletme/${encodeURIComponent(request.businessSlug)}`} external aria-label="Mağaza sayfasını aç" iconOnly />}
      </div>
      <div className={p.chips}>{fields.map((field) => <span key={field.id} title={fieldSpec(field)}>{field.label}{field.required ? " *" : ""}</span>)}</div>
      {request.note && <p className={p.historyNote}><small>Not</small>{request.note}</p>}
    </article>
  );
}

function AdminFieldEditor({ fields, errors, onChange }: { fields: CustomBookingField[]; errors: Record<number, string[]>; onChange: (fields: CustomBookingField[]) => void }) {
  const update = (index: number, patch: Partial<CustomBookingField>) => onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  if (fields.length === 0) return <EmptyState compact title="Alan kalmadı" description="Onaylamak için en az bir alan gerekli; tümünü kaldırmak isteyen işletme bunu kendisi yapabilir." />;
  return (
    <ol className={p.editList}>
      {fields.map((field, index) => (
        <li key={field.id} className={cn(p.editItem, errors[index] && p.editInvalid)}>
          <div className={p.editTop}>
            <Badge size="sm" tone="neutral">{FIELD_TYPE_LABELS[field.type]}</Badge>
            <label className={p.requiredToggle}>
              <Switch checked={field.required} label={`${field.label} zorunlu`} onChange={() => update(index, { required: !field.required })} />
              Zorunlu
            </label>
            <AdminButton size="sm" variant="ghost" icon={Trash2} iconOnly aria-label={`${field.label} alanını çıkar`} onClick={() => onChange(fields.filter((_, i) => i !== index))} />
          </div>
          <label className={p.noteLabel}>Alan adı
            <input className={p.input} value={field.label} maxLength={LABEL_MAX} onChange={(event) => update(index, { label: event.target.value })} />
          </label>
          <label className={p.noteLabel}>Açıklama <small>isteğe bağlı</small>
            <input className={p.input} value={field.helpText ?? ""} maxLength={HELP_MAX} onChange={(event) => update(index, { helpText: event.target.value })} />
          </label>
          {field.type === "select" && (
            <label className={p.noteLabel}>Seçenekler <small>her satıra bir seçenek · en fazla {OPTIONS_MAX}</small>
              <textarea className={p.textarea} rows={Math.min(6, Math.max(2, field.options?.length ?? 2))} value={(field.options ?? []).join("\n")}
                onChange={(event) => update(index, { options: event.target.value.split("\n").map((option) => option.slice(0, OPTION_MAX)).slice(0, OPTIONS_MAX) })} />
            </label>
          )}
          {field.type === "number" && (
            <div className={p.pair}>
              <label className={p.noteLabel}>En az<input className={p.input} type="number" min={0} max={NUMBER_LIMIT} value={field.min ?? ""} onChange={(event) => update(index, { min: event.target.value === "" ? undefined : Math.trunc(Number(event.target.value)) })} /></label>
              <label className={p.noteLabel}>En çok<input className={p.input} type="number" min={0} max={NUMBER_LIMIT} value={field.max ?? ""} onChange={(event) => update(index, { max: event.target.value === "" ? undefined : Math.trunc(Number(event.target.value)) })} /></label>
            </div>
          )}
          {errors[index]?.map((error) => <p key={error} className={p.editError}>{error}</p>)}
        </li>
      ))}
    </ol>
  );
}
