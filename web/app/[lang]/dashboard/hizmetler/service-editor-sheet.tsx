"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ImagePlus, Info, Languages, Layers3, Plus, Save, Scissors, Sparkles, Trash2, Upload, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Badge, Button, Callout, EmptyState, Field, FormGrid, Input, NativeSelect, Sheet, Switch, Textarea,
} from "@/components/dashboard/ui";
import { createService, updateService } from "@/features/services/service-repository";
import { MAX_SERVICE_VARIANTS, PRICE_TYPE_OPTIONS, newVariantId, priceTypeOf } from "@/features/services/service-pricing";
import { updateStaff } from "@/features/staff/staff-repository";
import { deleteStorageFile, uploadServiceImage } from "@/lib/firebase/upload";
import { firstErrorMessage, serviceCreateSchema } from "@/lib/validation/schemas";
import { LOCALE_LABELS } from "@/i18n/config";
import type { Service, ServicePriceType, ServiceTranslations, ServiceVariant } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";
import { Avatar, OrderButtons, cx, ws } from "../_workspace/kit";
import { DURATION_PRESETS, TRANSLATION_LOCALES, cleanOverrides, formatPrice, withManualServiceTranslation, type ServiceTextDraft } from "./service-shared";
import styles from "./services.module.css";
import { useT } from "@/i18n/client";

type Tab = "details" | "staff";
type StaffDraft = { assigned: boolean; duration: string; price: string };
type VariantDraft = { id: string; name: string; price: string; duration: string };

const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;

function initialTranslationDrafts(service: Service | null): Record<string, ServiceTextDraft> {
  return Object.fromEntries(TRANSLATION_LOCALES.map((locale) => {
    const entry = service?.translations?.[locale];
    return [locale, { name: entry?.name ?? "", description: entry?.description ?? "", variants: { ...(entry?.variants ?? {}) } }];
  }));
}

export function ServiceEditorSheet({
  open, businessId, service, categories, staff, defaultCategoryId, nextSortOrder, onClose, onSaved,
}: {
  open: boolean;
  businessId: string;
  /** Yoksa yeni hizmet oluşturulur. */
  service: Service | null;
  categories: ServiceCategory[];
  staff: Staff[];
  defaultCategoryId?: string;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const t = useT();
  const isCreate = !service;
  const isDraft = Boolean(service?.templateDraft);
  const [tab, setTab] = useState<Tab>("details");
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [category, setCategory] = useState(service?.category ?? defaultCategoryId ?? "");
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [duration, setDuration] = useState(service ? String(service.durationMinutes) : "30");
  const [isActive, setIsActive] = useState(service ? service.isActive || isDraft : true);
  const [bookable, setBookable] = useState(service ? service.isBookableOnline || isDraft : true);
  const [requiresDeposit, setRequiresDeposit] = useState(Boolean(service?.requiresDeposit));
  const [depositAmount, setDepositAmount] = useState(service?.depositAmount ? String(service.depositAmount) : "");
  const [priceType, setPriceType] = useState<ServicePriceType>(priceTypeOf(service));
  const [priceMax, setPriceMax] = useState(service?.priceMax ? String(service.priceMax) : "");
  const [variants, setVariants] = useState<VariantDraft[]>(() => (service?.variants ?? [])
    .filter((item) => item && item.id)
    .slice(0, MAX_SERVICE_VARIANTS)
    .map((item) => ({ id: item.id, name: item.name ?? "", price: String(item.price ?? ""), duration: String(item.durationMinutes ?? "") })));
  const [imageUrl, setImageUrl] = useState(service?.imageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [translationDrafts, setTranslationDrafts] = useState<Record<string, ServiceTextDraft>>(() => initialTranslationDrafts(service));
  const [openLocales, setOpenLocales] = useState<Record<string, boolean>>({});
  /** Elle değiştirilen diller; yalnız bunlar kaydedilir (diğerlerini sunucu otomatik çevirir). */
  const [touchedLocales, setTouchedLocales] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffTouched, setStaffTouched] = useState(false);
  const activeStaff = useMemo(() => staff.filter((member) => !member.archivedAt), [staff]);

  const initialStaffDraft = (categoryId: string): Record<string, StaffDraft> => Object.fromEntries(activeStaff.map((member) => {
    const override = service ? member.serviceOverrides?.[service.id] : undefined;
    const assigned = service ? member.serviceIds.includes(service.id) : Boolean(categoryId && member.isActive && member.specialtyCategoryIds?.includes(categoryId));
    return [member.id, { assigned, duration: override?.durationMinutes ? String(override.durationMinutes) : "", price: override?.price !== undefined ? String(override.price) : "" }];
  }));
  const [staffDraft, setStaffDraft] = useState<Record<string, StaffDraft>>(() => initialStaffDraft(service?.category ?? defaultCategoryId ?? ""));
  const assignedCount = Object.values(staffDraft).filter((item) => item.assigned).length;

  const priceNumber = Number(price);
  const priceMaxNumber = Number(priceMax);
  const durationNumber = Number(duration);
  const depositNumber = Number(depositAmount);
  const allowsVariants = priceType === "fixed" || priceType === "from";
  const usesVariants = allowsVariants && variants.length > 0;
  const parsedVariants: ServiceVariant[] = variants.map((item) => ({ id: item.id, name: item.name.trim(), price: Number(item.price), durationMinutes: Number(item.duration) }));

  const errors: Partial<Record<"name" | "category" | "price" | "priceMax" | "duration" | "deposit", string>> = {};
  if (name.trim().length < 2) errors.name = t("Hizmet adı en az 2 karakter olmalı.");
  if (isCreate && !category) errors.category = categories.length ? t("Bir kategori seçin.") : t("Önce bir kategori oluşturun.");
  if (!usesVariants) {
    if (priceType === "quote") {
      if (price.trim() !== "" && (!Number.isFinite(priceNumber) || priceNumber < 0)) errors.price = t("Geçerli bir fiyat girin.");
    } else if (price.trim() === "" || !Number.isFinite(priceNumber) || priceNumber < 0) errors.price = t("Geçerli bir fiyat girin.");
    else if ((isCreate || isDraft || isActive) && priceNumber <= 0) errors.price = isDraft ? t("Hazır hizmeti yayınlamak için sıfırdan büyük bir fiyat girin.") : t("Fiyat sıfırdan büyük olmalı.");
    if (priceType === "range") {
      if (priceMax.trim() === "" || !Number.isFinite(priceMaxNumber) || priceMaxNumber <= 0) errors.priceMax = t("En çok tutarı girin.");
      else if (Number.isFinite(priceNumber) && priceMaxNumber <= priceNumber) errors.priceMax = t("En çok tutar, en az tutardan büyük olmalı.");
    }
    if (!Number.isFinite(durationNumber) || durationNumber <= 0) errors.duration = t("Geçerli bir süre girin.");
    else if (isCreate && (!Number.isInteger(durationNumber) || durationNumber < 5)) errors.duration = t("Süre en az 5 dakika ve tam sayı olmalı.");
  }
  const variantErrors: Record<string, string> = {};
  if (usesVariants) {
    variants.forEach((item) => {
      const priceValue = Number(item.price);
      const durationValue = Number(item.duration);
      if (!item.name.trim()) variantErrors[item.id] = t("Seçenek adı boş olamaz.");
      else if (item.price.trim() === "" || !Number.isFinite(priceValue) || priceValue < 0) variantErrors[item.id] = t("Seçenek fiyatı geçersiz.");
      else if (!Number.isInteger(durationValue) || durationValue < 5 || durationValue > 480) variantErrors[item.id] = t("Seçenek süresi 5–480 dk arasında olmalı.");
    });
  }
  const variantsValid = usesVariants && Object.keys(variantErrors).length === 0;
  /** Kaydedilecek fiyat: seçenek varsa en düşük seçenek, teklif fiyatında boşsa 0. */
  const effectivePrice = usesVariants
    ? (variantsValid ? Math.min(...parsedVariants.map((item) => item.price)) : NaN)
    : priceType === "quote" && price.trim() === "" ? 0 : priceNumber;
  /** Kaydedilecek varsayılan süre: seçenek varsa ilk seçeneğin süresi. */
  const effectiveDuration = usesVariants ? parsedVariants[0]?.durationMinutes ?? NaN : durationNumber;
  if (requiresDeposit) {
    if (!Number.isFinite(depositNumber) || depositNumber <= 0) errors.deposit = t("Kapora tutarını girin.");
    else if (priceType !== "quote" && Number.isFinite(effectivePrice) && depositNumber > effectivePrice) errors.deposit = t("Kapora, hizmet fiyatından yüksek olamaz.");
  }
  const staffErrors: Record<string, string> = {};
  Object.entries(staffDraft).forEach(([id, item]) => {
    if (!item.assigned) return;
    if (item.duration && (!Number.isFinite(Number(item.duration)) || Number(item.duration) < 5 || Number(item.duration) > 480)) staffErrors[id] = t("Özel süre 5–480 dk arasında olmalı.");
    else if (item.price && (!Number.isFinite(Number(item.price)) || Number(item.price) < 0)) staffErrors[id] = t("Özel fiyat geçersiz.");
  });
  const detailErrorCount = Object.keys(errors).length + Object.keys(variantErrors).length;
  const errorCount = detailErrorCount + Object.keys(staffErrors).length;
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("Lütfen bir görsel dosyası seçin."));
      return;
    }
    if (file.size > MAX_IMAGE_INPUT_BYTES) {
      toast.error(t("Görsel en fazla 20 MB olabilir."));
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview("");
    setImageUrl("");
  }

  function patchVariant(id: string, patch: Partial<VariantDraft>) {
    setVariants((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function addVariant() {
    setVariants((current) => {
      if (current.length >= MAX_SERVICE_VARIANTS) return current;
      const last = current[current.length - 1];
      return [...current, {
        id: newVariantId(),
        name: "",
        price: current.length ? "" : price,
        duration: last?.duration || duration || "30",
      }];
    });
  }

  function removeVariant(id: string) {
    const removed = variants.find((item) => item.id === id);
    // Son seçenek silinince ana fiyat/süre alanları seçeneğin değerleriyle dolsun.
    if (variants.length === 1 && removed) {
      if (removed.price.trim()) setPrice(removed.price);
      if (removed.duration.trim()) setDuration(removed.duration);
    }
    setVariants((current) => current.filter((item) => item.id !== id));
  }

  function moveVariant(index: number, direction: -1 | 1) {
    setVariants((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function patchTranslation(locale: string, patch: Partial<ServiceTextDraft>) {
    setTouchedLocales((current) => ({ ...current, [locale]: true }));
    setTranslationDrafts((current) => ({ ...current, [locale]: { ...current[locale], ...patch } }));
  }

  function changeCategory(next: string) {
    setCategory(next);
    if (isCreate && !staffTouched) setStaffDraft(initialStaffDraft(next));
  }

  function patchStaff(id: string, patch: Partial<StaffDraft>) {
    setStaffTouched(true);
    setStaffDraft((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function syncStaff(serviceId: string) {
    const updates = activeStaff.flatMap((member) => {
      const draft = staffDraft[member.id];
      if (!draft) return [];
      const hadService = member.serviceIds.includes(serviceId);
      const previous = member.serviceOverrides?.[serviceId];
      const nextOverride = draft.assigned ? {
        ...(draft.duration ? { durationMinutes: Number(draft.duration) } : {}),
        ...(draft.price ? { price: Number(draft.price) } : {}),
      } : {};
      const overrideChanged = JSON.stringify(previous ?? {}) !== JSON.stringify(nextOverride);
      if (hadService === draft.assigned && !overrideChanged) return [];
      const serviceIds = draft.assigned ? Array.from(new Set([...member.serviceIds, serviceId])) : member.serviceIds.filter((id) => id !== serviceId);
      const overrides = { ...(member.serviceOverrides ?? {}) };
      if (Object.keys(nextOverride).length) overrides[serviceId] = nextOverride;
      else delete overrides[serviceId];
      return [updateStaff(businessId, member.id, { serviceIds, serviceOverrides: cleanOverrides(overrides) })];
    });
    await Promise.all(updates);
    return updates.length;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (errorCount) {
      if (detailErrorCount) setTab("details");
      else setTab("staff");
      toast.error(t("İşaretli alanları kontrol edin."));
      return;
    }
    setSaving(true);
    try {
      const deposit = requiresDeposit ? { requiresDeposit: true, depositAmount: depositNumber } : { requiresDeposit: false, depositAmount: 0 };
      const previousImageUrl = service?.imageUrl ?? "";
      let nextImageUrl = imageUrl;
      if (imageFile) {
        try {
          nextImageUrl = await uploadServiceImage(businessId, imageFile);
        } catch {
          toast.error(t("Görsel yüklenemedi. Başka bir görsel deneyin."));
          return;
        }
      }
      const variantIds = usesVariants ? parsedVariants.map((item) => item.id) : [];
      // Çeviriyi sunucu kayıttan sonra otomatik yazar; yalnız elle düzeltilen dil gönderilir.
      const editedLocales = TRANSLATION_LOCALES.filter((locale) => touchedLocales[locale]);
      let translations: ServiceTranslations | null = null;
      if (editedLocales.length) {
        translations = service?.translations ?? {};
        editedLocales.forEach((locale) => {
          translations = withManualServiceTranslation(translations ?? {}, locale, translationDrafts[locale] ?? {}, variantIds);
        });
      }
      const translationPatch = translations ? { translations } : {};
      const pricing = {
        priceType,
        ...(priceType === "range" ? { priceMax: priceMaxNumber } : {}),
        variants: usesVariants ? parsedVariants : [],
      };
      if (isCreate) {
        const validated = serviceCreateSchema.omit({ price: true }).safeParse({ name, category, description, duration: effectiveDuration });
        if (!validated.success) {
          toast.error(t(firstErrorMessage(validated.error)));
          return;
        }
        const { name: n, category: c, description: d, duration: dur } = validated.data;
        const serviceId = await createService(businessId, {
          name: n,
          description: d ?? "",
          category: c,
          price: effectivePrice,
          durationMinutes: dur,
          ...pricing,
          currency: "TRY",
          isActive,
          isBookableOnline: isActive && bookable,
          ...deposit,
          assignableStaffIds: [],
          imageUrl: nextImageUrl,
          ...translationPatch,
          sortOrder: nextSortOrder,
        });
        const changedStaff = serviceId ? await syncStaff(serviceId) : 0;
        await onSaved();
        toast.success(changedStaff ? t("Hizmet eklendi ve {count} uzmana atandı.", { count: changedStaff }) : t("Hizmet eklendi."));
      } else if (service) {
        const publishDraft = isDraft && isActive && (effectivePrice > 0 || priceType === "quote");
        await updateService(businessId, service.id, {
          name: name.trim(),
          description: description.trim(),
          category,
          price: effectivePrice,
          durationMinutes: effectiveDuration,
          ...pricing,
          imageUrl: nextImageUrl,
          ...translationPatch,
          isActive,
          isBookableOnline: isActive && bookable,
          ...deposit,
          ...(publishDraft ? { templateDraft: false } : {}),
        });
        await syncStaff(service.id);
        await onSaved();
        toast.success(publishDraft ? t("Fiyat kaydedildi; hizmet yayına alındı.") : t("Hizmet güncellendi."));
      }
      // Değiştirilen/kaldırılan eski hizmet görseli artık kullanılmıyor.
      if (previousImageUrl && previousImageUrl !== nextImageUrl && previousImageUrl.includes("%2Fpublic%2Fservices%2F")) void deleteStorageFile(previousImageUrl);
      onClose();
    } catch {
      toast.error(isCreate ? t("Hizmet eklenemedi.") : t("Güncelleme başarısız."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!saving}
      placement="side"
      size="lg"
      title={isCreate ? t("Yeni hizmet") : service?.name ?? t("Hizmeti düzenle")}
      description={isCreate ? t("Müşterilerin randevu alacağı hizmeti tanımlayın.") : isDraft ? t("Hazır kütüphaneden geldi; fiyat girdiğinizde yayına alınır.") : t("Değişiklikler mağaza vitrininize anında yansır.")}
      headerExtra={
        <div className={ws.tabs} role="tablist" aria-label={t("Hizmet düzenleme bölümleri")}>
          <button type="button" role="tab" aria-selected={tab === "details"} className={cx(ws.tab, tab === "details" && ws.tabActive)} onClick={() => setTab("details")}><Scissors size={15} /> {t("Bilgiler")}{submitted && detailErrorCount ? <span className={ws.tabDot} /> : null}</button>
          <button type="button" role="tab" aria-selected={tab === "staff"} className={cx(ws.tab, tab === "staff" && ws.tabActive)} onClick={() => setTab("staff")}><Users size={15} /> {t("Uzmanlar")} <span className={ws.tabBadge}>{assignedCount}</span>{submitted && Object.keys(staffErrors).length ? <span className={ws.tabDot} /> : null}</button>
        </div>
      }
      footer={<>
        {submitted && errorCount ? <p className={cx(ws.footNote, ws.footNoteError)}>{t("{count} alan düzeltilmeli", { count: errorCount })}</p> : <p className={ws.footNote}><Info size={13} /> {isActive ? t("Kaydettiğinizde müşteriler görür.") : t("Pasif hizmetler müşterilere gösterilmez.")}</p>}
        <Button variant="ghost" onClick={onClose} disabled={saving}>{t("Vazgeç")}</Button>
        <Button type="submit" form="service-editor-form" variant="primary" icon={Save} loading={saving}>{isCreate ? t("Hizmeti ekle") : isDraft ? t("Kaydet ve yayınla") : t("Kaydet")}</Button>
      </>}
    >
      <form id="service-editor-form" onSubmit={submit} noValidate className={ws.stack}>
        {tab === "details" ? (
          <>
            <section className={styles.imagePicker}>
              <span className={cx(styles.imageThumb, (imagePreview || imageUrl) && styles.imageThumbOn)} style={imagePreview || imageUrl ? { backgroundImage: `url("${imagePreview || imageUrl}")` } : undefined} role={imagePreview || imageUrl ? "img" : undefined} aria-label={imagePreview || imageUrl ? t("Hizmet görseli") : undefined}>
                {imagePreview || imageUrl ? null : <ImagePlus size={22} aria-hidden="true" />}
              </span>
              <div className={styles.imageText}>
                <b>{t("Hizmet görseli")}</b>
                <small>{t("İsteğe bağlı. Kare olarak kırpılır ve küçültülür.")}</small>
                <div className={ws.row}>
                  <Button size="sm" variant="soft" icon={Upload} onClick={() => fileInputRef.current?.click()} disabled={saving}>{imagePreview || imageUrl ? t("Değiştir") : t("Görsel yükle")}</Button>
                  {imagePreview || imageUrl ? <Button size="sm" variant="ghost" icon={Trash2} onClick={removeImage} disabled={saving} className={styles.deleteBtn}>{t("Kaldır")}</Button> : null}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={pickImage} />
            </section>

            <FormGrid>
              <Field label={t("Hizmet adı")} error={show("name")}>
                <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Örn. Klasik cilt bakımı")} maxLength={80} aria-invalid={Boolean(show("name"))} className={cx(show("name") && styles.invalid)} />
              </Field>
              <Field label={t("Kategori")} error={show("category")}>
                <NativeSelect value={category} onChange={(e) => changeCategory(e.target.value)} aria-invalid={Boolean(show("category"))} className={cx(show("category") && styles.invalid)}>
                  {isCreate ? <option value="" disabled>{t("Kategori seçin…")}</option> : <option value="">{t("Kategorisiz")}</option>}
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </NativeSelect>
              </Field>
              <Field label={t("Açıklama (isteğe bağlı)")} wide hint={t("Müşterilerinize hizmetin içeriğini kısaca anlatın.")}>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={400} placeholder={t("Hizmet kapsamı, kullanılan ürünler…")} />
              </Field>
            </FormGrid>

            <section className={ws.section}>
              <div className={ws.fieldGroup}>
                <span className={ws.fieldGroupLabel} id="service-price-type-label">{t("Fiyat tipi")}</span>
                <div className={ws.checkGrid} role="radiogroup" aria-labelledby="service-price-type-label">
                  {PRICE_TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className={ws.checkCard}>
                      <input type="radio" name="service-price-type" value={option.value} checked={priceType === option.value} onChange={() => setPriceType(option.value)} />
                      <span className={ws.checkText}>
                        <b>{t(option.label)}</b>
                        {priceType === option.value ? <small>{t(option.hint)}</small> : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {usesVariants ? (
                <Callout tone="accent" icon={Layers3} title={t("Fiyat ve süre seçeneklerden gelir")}>
                  {t("Hizmetin fiyatı en düşük seçenek, varsayılan süresi ilk seçeneğin süresi olarak kaydedilir.")}
                </Callout>
              ) : (
                <>
                  <FormGrid>
                    <Field label={priceType === "range" ? t("En az") : priceType === "from" ? t("Başlangıç fiyatı") : priceType === "quote" ? t("Tahmini başlangıç (isteğe bağlı)") : t("Fiyat")} error={show("price")} hint={priceType === "quote" ? t("Müşterilere gösterilmez.") : undefined}>
                      <span className={ws.affix}><Input type="number" inputMode="decimal" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" aria-invalid={Boolean(show("price"))} className={cx(show("price") && styles.invalid)} /><span>₺</span></span>
                    </Field>
                    {priceType === "range" ? (
                      <Field label={t("En çok")} error={show("priceMax")}>
                        <span className={ws.affix}><Input type="number" inputMode="decimal" min="0" step="1" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="0" aria-invalid={Boolean(show("priceMax"))} className={cx(show("priceMax") && styles.invalid)} /><span>₺</span></span>
                      </Field>
                    ) : null}
                    <Field label={t("Süre")} error={show("duration")}>
                      <span className={ws.affix}><Input type="number" inputMode="numeric" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} aria-invalid={Boolean(show("duration"))} className={cx(show("duration") && styles.invalid)} /><span>{t("dk")}</span></span>
                    </Field>
                  </FormGrid>
                  <div className={ws.chips} aria-label={t("Hızlı süre seçimi")}>
                    {DURATION_PRESETS.map((minutes) => <button key={minutes} type="button" className={cx(ws.chip, Number(duration) === minutes && ws.chipActive)} onClick={() => setDuration(String(minutes))} aria-pressed={Number(duration) === minutes}>{t("{minutes} dk", { minutes })}</button>)}
                  </div>
                </>
              )}

              {allowsVariants ? (
                <div className={styles.variantBox}>
                  <div className={styles.variantIntro}>
                    <b>{t("Seçenekler")}</b>
                    <small>{t("Kısa, orta, uzun saç gibi; her seçeneğin kendi fiyatı ve süresi olur. Müşteri randevu alırken seçer.")}</small>
                  </div>
                  {variants.length ? (
                    <ul className={styles.variantList}>
                      {variants.map((item, index) => {
                        const label = item.name.trim() || t("Seçenek {number}", { number: index + 1 });
                        const error = submitted ? variantErrors[item.id] : undefined;
                        return (
                          <li key={item.id} className={cx(styles.variantItem, error && styles.variantItemInvalid)}>
                            <div className={styles.variantTop}>
                              <OrderButtons label={label} canUp={index > 0} canDown={index < variants.length - 1} onUp={() => moveVariant(index, -1)} onDown={() => moveVariant(index, 1)} />
                              <Input value={item.name} onChange={(e) => patchVariant(item.id, { name: e.target.value })} placeholder={t("Seçenek adı (örn. Kısa saç)")} maxLength={60} aria-label={t("Seçenek adı")} aria-invalid={Boolean(error)} />
                              <Button variant="ghost" iconOnly icon={Trash2} onClick={() => removeVariant(item.id)} aria-label={t("{name} seçeneğini sil", { name: label })} className={styles.deleteBtn} />
                            </div>
                            <div className={ws.grid2}>
                              <span className={ws.affix}><Input type="number" inputMode="decimal" min="0" step="1" value={item.price} onChange={(e) => patchVariant(item.id, { price: e.target.value })} placeholder="0" aria-label={t("{name} fiyatı", { name: label })} /><span>₺</span></span>
                              <span className={ws.affix}><Input type="number" inputMode="numeric" min="5" max="480" step="5" value={item.duration} onChange={(e) => patchVariant(item.id, { duration: e.target.value })} aria-label={t("{name} süresi", { name: label })} /><span>{t("dk")}</span></span>
                            </div>
                            {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  <div className={ws.row}>
                    <Button size="sm" variant="soft" icon={Plus} onClick={addVariant} disabled={variants.length >= MAX_SERVICE_VARIANTS}>{t("Seçenek ekle")}</Button>
                    {variants.length >= MAX_SERVICE_VARIANTS ? <small className={ws.muted}>{t("En fazla {count} seçenek eklenebilir.", { count: MAX_SERVICE_VARIANTS })}</small> : null}
                  </div>
                </div>
              ) : null}
            </section>

            <section className={styles.settingsBox}>
              <Switch checked={isActive} onChange={(next) => { setIsActive(next); if (next) setBookable(true); }} label={t("Yayında")} description={t("Kapalıyken hizmet menünüzde görünmez.")} />
              <Switch checked={isActive && bookable} disabled={!isActive} onChange={setBookable} label={t("Online randevuya açık")} description={t("Kapalıysa müşteriler yalnızca işletmeden randevu alabilir.")} />
              <Switch checked={requiresDeposit} onChange={setRequiresDeposit} label={t("Kapora iste")} description={t("Kapora tutarı mağazanızda hizmetin yanında gösterilir.")} />
              {requiresDeposit ? (
                <Field label={t("Kapora tutarı")} error={show("deposit")} hint={priceType !== "quote" && Number.isFinite(effectivePrice) && effectivePrice > 0 ? t("Hizmet fiyatı {price}", { price: formatPrice(effectivePrice) }) : undefined}>
                  <span className={ws.affix}><Input type="number" inputMode="decimal" min="1" step="1" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} aria-invalid={Boolean(show("deposit"))} className={cx(show("deposit") && styles.invalid)} /><span>₺</span></span>
                </Field>
              ) : null}
            </section>
            {TRANSLATION_LOCALES.map((locale) => {
              const draft = translationDrafts[locale] ?? { name: "", description: "", variants: {} };
              const expanded = Boolean(openLocales[locale]);
              const filled = [draft.name, draft.description, ...(usesVariants ? variants.map((item) => draft.variants[item.id] ?? "") : [])].filter((value) => value.trim()).length;
              const bodyId = `service-lang-${locale}`;
              return (
                <section key={locale} className={styles.langBox}>
                  <button type="button" className={styles.langToggle} aria-expanded={expanded} aria-controls={bodyId} onClick={() => setOpenLocales((current) => ({ ...current, [locale]: !expanded }))}>
                    <Languages size={18} aria-hidden="true" />
                    <span className={styles.langTitle}>
                      <b>{locale === "en" ? t("İngilizce metni düzelt (isteğe bağlı)") : t("{language} metni düzelt (isteğe bağlı)", { language: LOCALE_LABELS[locale].name })}</b>
                      <small>{touchedLocales[locale] ? t("Elle düzeltildi") : filled ? t("{count} alan dolu", { count: filled }) : t("Kaydettiğinizde otomatik oluşturulur")}</small>
                    </span>
                    <ChevronDown size={18} aria-hidden="true" className={cx(styles.langChevron, expanded && styles.langChevronOpen)} />
                  </button>
                  {expanded ? (
                    <div id={bodyId} className={styles.langBody}>
                      <p className={styles.langNote}>{locale === "en" ? t("İngilizce metin kaydettiğinizde otomatik oluşturulur. İsterseniz burada düzeltebilirsiniz.") : t("Bu dildeki metin kaydettiğinizde otomatik oluşturulur. İsterseniz burada düzeltebilirsiniz.")}</p>
                      <Field label={t("Hizmet adı")}>
                        <Input lang={locale} value={draft.name} onChange={(e) => patchTranslation(locale, { name: e.target.value })} placeholder={name || t("Hizmet adı")} maxLength={80} />
                      </Field>
                      <Field label={t("Açıklama (isteğe bağlı)")}>
                        <Textarea lang={locale} value={draft.description} onChange={(e) => patchTranslation(locale, { description: e.target.value })} rows={3} maxLength={400} placeholder={description} />
                      </Field>
                      {usesVariants ? variants.map((item, index) => {
                        const label = item.name.trim() || t("Seçenek {number}", { number: index + 1 });
                        return (
                          <Field key={item.id} label={t("Seçenek: {name}", { name: label })}>
                            <Input lang={locale} value={draft.variants[item.id] ?? ""} onChange={(e) => patchTranslation(locale, { variants: { ...draft.variants, [item.id]: e.target.value } })} placeholder={item.name} maxLength={60} />
                          </Field>
                        );
                      }) : null}
                    </div>
                  ) : null}
                </section>
              );
            })}
            {isDraft ? <Callout tone="amber" icon={Sparkles} title={t("Bu hizmet henüz yayında değil")}>{t("Fiyatı girip kaydettiğinizde otomatik olarak yayına alınır.")}</Callout> : null}
          </>
        ) : (
          <section className={ws.section}>
            <div className={ws.sectionHead}>
              <Users size={18} />
              <div><h3>{t("Bu hizmeti kim veriyor?")}</h3><p>{t("Seçilen uzmanlar online randevuda listelenir. Uzmana özel süre ve fiyat boş bırakılırsa hizmetin varsayılanı kullanılır.")}</p></div>
            </div>
            {isCreate && !staffTouched && assignedCount > 0 ? <Callout tone="accent" icon={Sparkles} title={t("Branşı bu kategori olan uzmanlar seçildi")} /> : null}
            {activeStaff.length === 0 ? (
              <EmptyState compact mascot="wave" title={t("Henüz ekip üyesi yok")} description={t("Çalışanlar sayfasından ekibinizi ekleyin; ardından hizmetleri atayabilirsiniz.")} action={<Button variant="soft" href="/dashboard/calisanlar" icon={UserRound}>{t("Çalışanlara git")}</Button>} />
            ) : (
              <ul className={styles.staffList}>
                {activeStaff.map((member) => {
                  const draft = staffDraft[member.id] ?? { assigned: false, duration: "", price: "" };
                  const error = submitted ? staffErrors[member.id] : undefined;
                  const outsideBranch = Boolean(category && member.specialtyCategoryIds?.length && !member.specialtyCategoryIds.includes(category));
                  return (
                    <li key={member.id} className={cx(styles.staffItem, draft.assigned && styles.staffItemOn)}>
                      <label className={styles.staffHead}>
                        <input type="checkbox" checked={draft.assigned} onChange={(e) => patchStaff(member.id, { assigned: e.target.checked })} />
                        <Avatar name={member.fullName} photoUrl={member.photoUrl} muted={!member.isActive} />
                        <span className={ws.checkText}>
                          <b>{member.fullName}</b>
                          <small>{member.position}{!member.isActive ? ` · ${t("pasif")}` : ""}{outsideBranch ? ` · ${t("branşı farklı")}` : ""}</small>
                        </span>
                        {draft.assigned ? <Badge size="sm" tone="green">{t("Veriyor")}</Badge> : null}
                      </label>
                      {draft.assigned ? (
                        <div className={ws.grid2}>
                          <Field label={t("Özel süre")}>
                            <span className={ws.affix}><Input type="number" inputMode="numeric" min="5" max="480" value={draft.duration} placeholder={duration || "—"} onChange={(e) => patchStaff(member.id, { duration: e.target.value })} aria-label={t("{name} özel süre", { name: member.fullName })} /><span>{t("dk")}</span></span>
                          </Field>
                          <Field label={t("Özel fiyat")}>
                            <span className={ws.affix}><Input type="number" inputMode="decimal" min="0" value={draft.price} placeholder={price || "—"} onChange={(e) => patchStaff(member.id, { price: e.target.value })} aria-label={t("{name} özel fiyat", { name: member.fullName })} /><span>₺</span></span>
                          </Field>
                          {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </form>
    </Sheet>
  );
}
