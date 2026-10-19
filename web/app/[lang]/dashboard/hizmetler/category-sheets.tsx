"use client";

import { FormEvent, useState } from "react";
import { Check, ChevronDown, FolderPlus, Languages, Pencil, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";
import { Badge, Button, Callout, EmptyState, Field, Input, NativeSelect, Sheet } from "@/components/dashboard/ui";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import { normalizeCategoryName } from "@/features/services/service-category-repository";
import { localizedCategoryName } from "@/features/services/service-pricing";
import { LOCALE_LABELS } from "@/i18n/config";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";
import { OrderButtons, cx, ws } from "../_workspace/kit";
import { CATEGORY_COLORS, CATEGORY_ICONS, TRANSLATION_LOCALES } from "./service-shared";
import styles from "./services.module.css";
import { useLocale, useT } from "@/i18n/client";

export type CategoryInput = { name: string; icon: string; color: string; translations?: ServiceCategory["translations"] };

/* ── Kategori oluştur / düzenle ── */
export function CategoryEditorSheet({ open, category, categories, onClose, onSubmit }: {
  open: boolean;
  category: ServiceCategory | null;
  categories: ServiceCategory[];
  onClose: () => void;
  onSubmit: (input: CategoryInput) => Promise<boolean>;
}) {
  const t = useT();
  const [name, setName] = useState(category?.name ?? "");
  const [translatedNames, setTranslatedNames] = useState<Record<string, string>>(() => Object.fromEntries(TRANSLATION_LOCALES.map((locale) => [locale, category?.translations?.[locale]?.name ?? ""])));
  /** Elle değiştirilen diller; yalnız bunlar kaydedilir (diğerlerini sunucu otomatik çevirir). */
  const [touchedLocales, setTouchedLocales] = useState<Record<string, boolean>>({});
  const [openLocales, setOpenLocales] = useState<Record<string, boolean>>({});
  const [icon, setIcon] = useState(category?.icon || "✂️");
  const [color, setColor] = useState(category?.color || CATEGORY_COLORS[0]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const duplicate = categories.some((item) => item.id !== category?.id && normalizeCategoryName(item.name) === normalizeCategoryName(name));
  const error = !name.trim() ? t("Kategori adı boş bırakılamaz.") : duplicate ? t("Bu isimde bir kategori zaten var.") : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (error) return;
    setBusy(true);
    try {
      const edited = TRANSLATION_LOCALES.filter((locale) => touchedLocales[locale]);
      let translations: ServiceCategory["translations"] | undefined;
      if (edited.length) {
        const next: NonNullable<ServiceCategory["translations"]> = {};
        Object.entries(category?.translations ?? {}).forEach(([locale, value]) => { if (value) next[locale] = value; });
        edited.forEach((locale) => {
          const value = translatedNames[locale]?.trim();
          // Boşaltılan dil silinir; sunucu yeniden otomatik çevirir. Elle yazılan ad manual: true ile korunur.
          if (value) next[locale] = { name: value, manual: true };
          else delete next[locale];
        });
        translations = next;
      }
      const ok = await onSubmit({ name: name.trim(), icon, color, ...(translations ? { translations } : {}) });
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy}
      size="md"
      title={category ? t("Kategoriyi düzenle") : t("Yeni kategori")}
      description={t("Hizmetlerinizi müşterilerin kolayca bulacağı gruplara ayırın.")}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t("Vazgeç")}</Button>
        <Button type="submit" form="category-editor-form" variant="primary" icon={category ? Save : FolderPlus} loading={busy}>{category ? t("Kaydet") : t("Oluştur")}</Button>
      </>}
    >
      <form id="category-editor-form" className={ws.stack} onSubmit={submit} noValidate>
        <div className={styles.catPreview} style={{ "--cat-color": color } as React.CSSProperties}>
          <span aria-hidden="true"><ServiceCategoryIcon icon={icon} name={name} size={24} /></span>
          <b>{name.trim() || t("Kategori adı")}</b>
        </div>
        <Field label={t("Kategori adı")} error={submitted ? error : null}>
          <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Örn. Saç kesim, Cilt bakımı")} maxLength={48} aria-invalid={Boolean(submitted && error)} className={cx(submitted && error && styles.invalid)} />
        </Field>
        {TRANSLATION_LOCALES.map((locale) => {
          const expanded = Boolean(openLocales[locale]);
          const bodyId = `category-lang-${locale}`;
          return (
            <section key={locale} className={styles.langBox}>
              <button type="button" className={styles.langToggle} aria-expanded={expanded} aria-controls={bodyId} onClick={() => setOpenLocales((current) => ({ ...current, [locale]: !expanded }))}>
                <Languages size={18} aria-hidden="true" />
                <span className={styles.langTitle}>
                  <b>{locale === "en" ? t("İngilizce metni düzelt (isteğe bağlı)") : t("{language} metni düzelt (isteğe bağlı)", { language: LOCALE_LABELS[locale].name })}</b>
                  <small>{touchedLocales[locale] ? t("Elle düzeltildi") : translatedNames[locale]?.trim() ? translatedNames[locale] : t("Kaydettiğinizde otomatik oluşturulur")}</small>
                </span>
                <ChevronDown size={18} aria-hidden="true" className={cx(styles.langChevron, expanded && styles.langChevronOpen)} />
              </button>
              {expanded ? (
                <div id={bodyId} className={styles.langBody}>
                  <p className={styles.langNote}>{locale === "en" ? t("İngilizce metin kaydettiğinizde otomatik oluşturulur. İsterseniz burada düzeltebilirsiniz.") : t("Bu dildeki metin kaydettiğinizde otomatik oluşturulur. İsterseniz burada düzeltebilirsiniz.")}</p>
                  <Field label={t("Kategori adı")}>
                    <Input lang={locale} value={translatedNames[locale] ?? ""} onChange={(e) => { const value = e.target.value; setTouchedLocales((current) => ({ ...current, [locale]: true })); setTranslatedNames((current) => ({ ...current, [locale]: value })); }} placeholder={name} maxLength={48} />
                  </Field>
                </div>
              ) : null}
            </section>
          );
        })}
        <fieldset className={styles.fieldset}>
          <legend>{t("İkon")}</legend>
          <div className={styles.iconGrid}>
            {CATEGORY_ICONS.map((item) => (
              <button key={item} type="button" className={cx(styles.iconOption, icon === item && styles.iconOptionActive)} onClick={() => setIcon(item)} aria-pressed={icon === item} aria-label={t("{icon} ikonunu seç", { icon: item })}>
                <ServiceCategoryIcon icon={item} size={21} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend>{t("Renk")}</legend>
          <div className={styles.swatches}>
            {CATEGORY_COLORS.map((item) => (
              <button key={item} type="button" className={cx(styles.swatch, color === item && styles.swatchActive)} style={{ backgroundColor: item }} onClick={() => setColor(item)} aria-pressed={color === item} aria-label={t("{color} rengini seç", { color: item })}>
                {color === item ? <Check size={16} strokeWidth={3} /> : null}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Sheet>
  );
}

/* ── Kategorileri yönet ── */
export function CategoryManagerSheet({
  open, categories, services, seededCount, busy, onClose, onCreate, onEdit, onDelete, onMove, onRemoveTemplates,
}: {
  open: boolean;
  categories: ServiceCategory[];
  services: Service[];
  seededCount: number;
  busy: boolean;
  onClose: () => void;
  onCreate: () => void;
  onEdit: (category: ServiceCategory) => void;
  onDelete: (category: ServiceCategory) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemoveTemplates: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      placement="side"
      title={t("Kategoriler")}
      description={t("Sırayı oklarla değiştirin; mağazanızda bu sırayla görünür.")}
      footer={<>
        {seededCount > 0 ? <Button variant="dangerSoft" icon={RotateCcw} onClick={onRemoveTemplates} disabled={busy}>{t("Hazır paketi kaldır")}</Button> : null}
        <Button variant="primary" icon={FolderPlus} onClick={onCreate}>{t("Yeni kategori")}</Button>
      </>}
    >
      {categories.length === 0 ? (
        <EmptyState compact mascot="wave" title={t("Henüz kategori yok")} description={t("Saç, cilt bakımı gibi gruplar oluşturun; hizmetleriniz düzenli görünsün.")} />
      ) : (
        <ul className={styles.catList}>
          {categories.map((category, index) => {
            const count = services.filter((service) => service.category === category.id).length;
            return (
              <li key={category.id} className={styles.catItem} style={{ "--cat-color": category.color } as React.CSSProperties}>
                <OrderButtons label={localizedCategoryName(category, locale)} canUp={index > 0} canDown={index < categories.length - 1} onUp={() => onMove(index, -1)} onDown={() => onMove(index, 1)} disabled={busy} />
                <span className={styles.catIcon} aria-hidden="true"><ServiceCategoryIcon icon={category.icon} name={category.name} size={19} /></span>
                <span className={styles.catText}>
                  <b>{localizedCategoryName(category, locale)}</b>
                  <small>{t("{count} hizmet", { count })}{category.templateSource ? ` · ${t("hazır paket")}` : ""}</small>
                </span>
                <Button variant="ghost" iconOnly icon={Pencil} onClick={() => onEdit(category)} aria-label={t("{name} kategorisini düzenle", { name: localizedCategoryName(category, locale) })} />
                <Button variant="ghost" iconOnly icon={Trash2} onClick={() => onDelete(category)} aria-label={t("{name} kategorisini sil", { name: localizedCategoryName(category, locale) })} className={styles.deleteBtn} />
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

/* ── Kategori silme (bağlı çalışan varsa taşınacak branş seçilir) ── */
export function DeleteCategorySheet({ open, category, categories, services, staff, onClose, onConfirm }: {
  open: boolean;
  category: ServiceCategory | null;
  categories: ServiceCategory[];
  services: Service[];
  staff: Staff[];
  onClose: () => void;
  onConfirm: (replacementCategoryId: string) => Promise<void>;
}) {
  const t = useT();
  const [replacementId, setReplacementId] = useState("");
  const [busy, setBusy] = useState(false);
  if (!category) return null;
  const linkedServices = services.filter((service) => service.category === category.id);
  const linkedStaff = staff.filter((member) => member.specialtyCategoryIds?.includes(category.id));
  const alternatives = categories.filter((item) => item.id !== category.id);
  const needsReplacement = linkedStaff.length > 0;
  const blocked = needsReplacement && alternatives.length === 0;
  const canConfirm = !blocked && (!needsReplacement || Boolean(replacementId));

  async function confirm() {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await onConfirm(replacementId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy}
      size="sm"
      title={t("“{name}” silinsin mi?", { name: category.name })}
      footer={<>
        <Button onClick={onClose} disabled={busy}>{t("Vazgeç")}</Button>
        <Button variant="danger" icon={Trash2} onClick={() => void confirm()} loading={busy} disabled={!canConfirm}>{t("Kategoriyi sil")}</Button>
      </>}
    >
      <div className={ws.stack}>
        <span className={styles.dangerIcon} aria-hidden="true"><TriangleAlert size={22} /></span>
        <p className={styles.dangerText}>
          {linkedServices.length > 0
            ? t("İçindeki {count} hizmet silinmez; “Kategorisiz” alanına taşınır.", { count: linkedServices.length })
            : t("Bu kategori kalıcı olarak silinecek.")}
        </p>
        {needsReplacement ? (
          blocked ? (
            <Callout tone="red" title={t("Bu branşa bağlı {count} çalışan var.", { count: linkedStaff.length })}>{t("Önce yeni bir kategori oluşturun, sonra bu kategoriyi silin.")}</Callout>
          ) : (
            <>
              <Callout tone="amber" title={t("{count} çalışanın branşı bu kategori", { count: linkedStaff.length })}>
                <span className={ws.row} style={{ marginTop: 6 }}>{linkedStaff.map((member) => <Badge key={member.id} size="sm">{member.fullName}</Badge>)}</span>
              </Callout>
              <Field label={t("Çalışanlar hangi branşa taşınsın?")}>
                <NativeSelect value={replacementId} onChange={(event) => setReplacementId(event.target.value)}>
                  <option value="" disabled>{t("Branş seçin…")}</option>
                  {alternatives.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </NativeSelect>
              </Field>
            </>
          )
        ) : null}
      </div>
    </Sheet>
  );
}
