"use client";

import { FormEvent, useMemo, useState } from "react";
import { Info, Save, Scissors, Sparkles, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Badge, Button, Callout, EmptyState, Field, FormGrid, Input, NativeSelect, Sheet, Switch, Textarea,
} from "@/components/dashboard/ui";
import { createService, updateService } from "@/features/services/service-repository";
import { updateStaff } from "@/features/staff/staff-repository";
import { firstErrorMessage, serviceCreateSchema } from "@/lib/validation/schemas";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";
import { Avatar, cx, ws } from "../_workspace/kit";
import { DURATION_PRESETS, cleanOverrides, formatPrice } from "./service-shared";
import styles from "./services.module.css";
import { useT } from "@/i18n/client";

type Tab = "details" | "staff";
type StaffDraft = { assigned: boolean; duration: string; price: string };

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
  const durationNumber = Number(duration);
  const depositNumber = Number(depositAmount);
  const errors: Partial<Record<"name" | "category" | "price" | "duration" | "deposit", string>> = {};
  if (name.trim().length < 2) errors.name = t("Hizmet adı en az 2 karakter olmalı.");
  if (isCreate && !category) errors.category = categories.length ? t("Bir kategori seçin.") : t("Önce bir kategori oluşturun.");
  if (price.trim() === "" || !Number.isFinite(priceNumber) || priceNumber < 0) errors.price = t("Geçerli bir fiyat girin.");
  else if ((isCreate || isDraft || isActive) && priceNumber <= 0) errors.price = isDraft ? t("Hazır hizmeti yayınlamak için sıfırdan büyük bir fiyat girin.") : t("Fiyat sıfırdan büyük olmalı.");
  if (!Number.isFinite(durationNumber) || durationNumber <= 0) errors.duration = t("Geçerli bir süre girin.");
  else if (isCreate && (!Number.isInteger(durationNumber) || durationNumber < 5)) errors.duration = t("Süre en az 5 dakika ve tam sayı olmalı.");
  if (requiresDeposit) {
    if (!Number.isFinite(depositNumber) || depositNumber <= 0) errors.deposit = t("Kapora tutarını girin.");
    else if (Number.isFinite(priceNumber) && depositNumber > priceNumber) errors.deposit = t("Kapora, hizmet fiyatından yüksek olamaz.");
  }
  const staffErrors: Record<string, string> = {};
  Object.entries(staffDraft).forEach(([id, item]) => {
    if (!item.assigned) return;
    if (item.duration && (!Number.isFinite(Number(item.duration)) || Number(item.duration) < 5 || Number(item.duration) > 480)) staffErrors[id] = t("Özel süre 5–480 dk arasında olmalı.");
    else if (item.price && (!Number.isFinite(Number(item.price)) || Number(item.price) < 0)) staffErrors[id] = t("Özel fiyat geçersiz.");
  });
  const errorCount = Object.keys(errors).length + Object.keys(staffErrors).length;
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

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
      if (Object.keys(errors).length) setTab("details");
      else setTab("staff");
      toast.error(t("İşaretli alanları kontrol edin."));
      return;
    }
    setSaving(true);
    try {
      const deposit = requiresDeposit ? { requiresDeposit: true, depositAmount: depositNumber } : { requiresDeposit: false, depositAmount: 0 };
      if (isCreate) {
        const validated = serviceCreateSchema.safeParse({ name, category, description, price, duration });
        if (!validated.success) {
          toast.error(t(firstErrorMessage(validated.error)));
          return;
        }
        const { name: n, category: c, description: d, price: p, duration: dur } = validated.data;
        const serviceId = await createService(businessId, {
          name: n,
          description: d ?? "",
          category: c,
          price: p,
          durationMinutes: dur,
          currency: "TRY",
          isActive,
          isBookableOnline: isActive && bookable,
          ...deposit,
          assignableStaffIds: [],
          imageUrl: "",
          sortOrder: nextSortOrder,
        });
        const changedStaff = serviceId ? await syncStaff(serviceId) : 0;
        await onSaved();
        toast.success(changedStaff ? t("Hizmet eklendi ve {count} uzmana atandı.", { count: changedStaff }) : t("Hizmet eklendi."));
      } else if (service) {
        const publishDraft = isDraft && isActive && priceNumber > 0;
        await updateService(businessId, service.id, {
          name: name.trim(),
          description: description.trim(),
          category,
          price: priceNumber,
          durationMinutes: durationNumber,
          isActive,
          isBookableOnline: isActive && bookable,
          ...deposit,
          ...(publishDraft ? { templateDraft: false } : {}),
        });
        await syncStaff(service.id);
        await onSaved();
        toast.success(publishDraft ? t("Fiyat kaydedildi; hizmet yayına alındı.") : t("Hizmet güncellendi."));
      }
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
          <button type="button" role="tab" aria-selected={tab === "details"} className={cx(ws.tab, tab === "details" && ws.tabActive)} onClick={() => setTab("details")}><Scissors size={15} /> {t("Bilgiler")}{submitted && Object.keys(errors).length ? <span className={ws.tabDot} /> : null}</button>
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
              <Field label={t("Fiyat")} error={show("price")}>
                <span className={ws.affix}><Input type="number" inputMode="decimal" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" aria-invalid={Boolean(show("price"))} className={cx(show("price") && styles.invalid)} /><span>₺</span></span>
              </Field>
              <Field label={t("Süre")} error={show("duration")}>
                <span className={ws.affix}><Input type="number" inputMode="numeric" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} aria-invalid={Boolean(show("duration"))} className={cx(show("duration") && styles.invalid)} /><span>{t("dk")}</span></span>
              </Field>
            </FormGrid>
            <div className={ws.chips} aria-label={t("Hızlı süre seçimi")}>
              {DURATION_PRESETS.map((minutes) => <button key={minutes} type="button" className={cx(ws.chip, Number(duration) === minutes && ws.chipActive)} onClick={() => setDuration(String(minutes))} aria-pressed={Number(duration) === minutes}>{t("{minutes} dk", { minutes })}</button>)}
            </div>

            <section className={styles.settingsBox}>
              <Switch checked={isActive} onChange={(next) => { setIsActive(next); if (next) setBookable(true); }} label={t("Yayında")} description={t("Kapalıyken hizmet menünüzde görünmez.")} />
              <Switch checked={isActive && bookable} disabled={!isActive} onChange={setBookable} label={t("Online randevuya açık")} description={t("Kapalıysa müşteriler yalnızca işletmeden randevu alabilir.")} />
              <Switch checked={requiresDeposit} onChange={setRequiresDeposit} label={t("Kapora iste")} description={t("Kapora tutarı mağazanızda hizmetin yanında gösterilir.")} />
              {requiresDeposit ? (
                <Field label={t("Kapora tutarı")} error={show("deposit")} hint={Number.isFinite(priceNumber) && priceNumber > 0 ? t("Hizmet fiyatı {price}", { price: formatPrice(priceNumber) }) : undefined}>
                  <span className={ws.affix}><Input type="number" inputMode="decimal" min="1" step="1" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} aria-invalid={Boolean(show("deposit"))} className={cx(show("deposit") && styles.invalid)} /><span>₺</span></span>
                </Field>
              ) : null}
            </section>
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
