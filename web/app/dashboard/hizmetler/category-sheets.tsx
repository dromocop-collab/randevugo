"use client";

import { FormEvent, useState } from "react";
import { Check, FolderPlus, Pencil, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";
import { Badge, Button, Callout, EmptyState, Field, Input, NativeSelect, Sheet } from "@/components/dashboard/ui";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import { normalizeCategoryName } from "@/features/services/service-category-repository";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";
import { OrderButtons, cx, ws } from "../_workspace/kit";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "./service-shared";
import styles from "./services.module.css";

/* ── Kategori oluştur / düzenle ── */
export function CategoryEditorSheet({ open, category, categories, onClose, onSubmit }: {
  open: boolean;
  category: ServiceCategory | null;
  categories: ServiceCategory[];
  onClose: () => void;
  onSubmit: (input: { name: string; icon: string; color: string }) => Promise<boolean>;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon || "✂️");
  const [color, setColor] = useState(category?.color || CATEGORY_COLORS[0]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const duplicate = categories.some((item) => item.id !== category?.id && normalizeCategoryName(item.name) === normalizeCategoryName(name));
  const error = !name.trim() ? "Kategori adı boş bırakılamaz." : duplicate ? "Bu isimde bir kategori zaten var." : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (error) return;
    setBusy(true);
    try {
      const ok = await onSubmit({ name: name.trim(), icon, color });
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
      title={category ? "Kategoriyi düzenle" : "Yeni kategori"}
      description="Hizmetlerinizi müşterilerin kolayca bulacağı gruplara ayırın."
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Vazgeç</Button>
        <Button type="submit" form="category-editor-form" variant="primary" icon={category ? Save : FolderPlus} loading={busy}>{category ? "Kaydet" : "Oluştur"}</Button>
      </>}
    >
      <form id="category-editor-form" className={ws.stack} onSubmit={submit} noValidate>
        <div className={styles.catPreview} style={{ "--cat-color": color } as React.CSSProperties}>
          <span aria-hidden="true"><ServiceCategoryIcon icon={icon} name={name} size={24} /></span>
          <b>{name.trim() || "Kategori adı"}</b>
        </div>
        <Field label="Kategori adı" error={submitted ? error : null}>
          <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Saç kesim, Cilt bakımı" maxLength={48} aria-invalid={Boolean(submitted && error)} className={cx(submitted && error && styles.invalid)} />
        </Field>
        <fieldset className={styles.fieldset}>
          <legend>İkon</legend>
          <div className={styles.iconGrid}>
            {CATEGORY_ICONS.map((item) => (
              <button key={item} type="button" className={cx(styles.iconOption, icon === item && styles.iconOptionActive)} onClick={() => setIcon(item)} aria-pressed={icon === item} aria-label={`${item} ikonunu seç`}>
                <ServiceCategoryIcon icon={item} size={21} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend>Renk</legend>
          <div className={styles.swatches}>
            {CATEGORY_COLORS.map((item) => (
              <button key={item} type="button" className={cx(styles.swatch, color === item && styles.swatchActive)} style={{ backgroundColor: item }} onClick={() => setColor(item)} aria-pressed={color === item} aria-label={`${item} rengini seç`}>
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
  return (
    <Sheet
      open={open}
      onClose={onClose}
      placement="side"
      title="Kategoriler"
      description="Sırayı oklarla değiştirin; mağazanızda bu sırayla görünür."
      footer={<>
        {seededCount > 0 ? <Button variant="dangerSoft" icon={RotateCcw} onClick={onRemoveTemplates} disabled={busy}>Hazır paketi kaldır</Button> : null}
        <Button variant="primary" icon={FolderPlus} onClick={onCreate}>Yeni kategori</Button>
      </>}
    >
      {categories.length === 0 ? (
        <EmptyState compact mascot="wave" title="Henüz kategori yok" description="Saç, cilt bakımı gibi gruplar oluşturun; hizmetleriniz düzenli görünsün." />
      ) : (
        <ul className={styles.catList}>
          {categories.map((category, index) => {
            const count = services.filter((service) => service.category === category.id).length;
            return (
              <li key={category.id} className={styles.catItem} style={{ "--cat-color": category.color } as React.CSSProperties}>
                <OrderButtons label={category.name} canUp={index > 0} canDown={index < categories.length - 1} onUp={() => onMove(index, -1)} onDown={() => onMove(index, 1)} disabled={busy} />
                <span className={styles.catIcon} aria-hidden="true"><ServiceCategoryIcon icon={category.icon} name={category.name} size={19} /></span>
                <span className={styles.catText}>
                  <b>{category.name}</b>
                  <small>{count} hizmet{category.templateSource ? " · hazır paket" : ""}</small>
                </span>
                <Button variant="ghost" iconOnly icon={Pencil} onClick={() => onEdit(category)} aria-label={`${category.name} kategorisini düzenle`} />
                <Button variant="ghost" iconOnly icon={Trash2} onClick={() => onDelete(category)} aria-label={`${category.name} kategorisini sil`} className={styles.deleteBtn} />
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
      title={`“${category.name}” silinsin mi?`}
      footer={<>
        <Button onClick={onClose} disabled={busy}>Vazgeç</Button>
        <Button variant="danger" icon={Trash2} onClick={() => void confirm()} loading={busy} disabled={!canConfirm}>Kategoriyi sil</Button>
      </>}
    >
      <div className={ws.stack}>
        <span className={styles.dangerIcon} aria-hidden="true"><TriangleAlert size={22} /></span>
        <p className={styles.dangerText}>
          {linkedServices.length > 0
            ? `İçindeki ${linkedServices.length} hizmet silinmez; “Kategorisiz” alanına taşınır.`
            : "Bu kategori kalıcı olarak silinecek."}
        </p>
        {needsReplacement ? (
          blocked ? (
            <Callout tone="red" title={`Bu branşa bağlı ${linkedStaff.length} çalışan var.`}>Önce yeni bir kategori oluşturun, sonra bu kategoriyi silin.</Callout>
          ) : (
            <>
              <Callout tone="amber" title={`${linkedStaff.length} çalışanın branşı bu kategori`}>
                <span className={ws.row} style={{ marginTop: 6 }}>{linkedStaff.map((member) => <Badge key={member.id} size="sm">{member.fullName}</Badge>)}</span>
              </Callout>
              <Field label="Çalışanlar hangi branşa taşınsın?">
                <NativeSelect value={replacementId} onChange={(event) => setReplacementId(event.target.value)}>
                  <option value="" disabled>Branş seçin…</option>
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
