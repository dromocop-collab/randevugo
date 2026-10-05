"use client";

import { useState } from "react";
import { Check, Clock, Globe2, Pencil, Trash2, Wallet, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Switch } from "@/components/dashboard/ui";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import { OrderButtons, cx } from "../_workspace/kit";
import { formatPrice } from "./service-shared";
import styles from "./services.module.css";

export function ServiceRow({
  service, category, staffCount, order, onEdit, onToggle, onDelete, onQuickPrice,
}: {
  service: Service;
  category?: ServiceCategory;
  staffCount: number;
  order?: { canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void; busy?: boolean };
  onEdit: () => void;
  onToggle: () => Promise<void>;
  onDelete: () => void;
  onQuickPrice: (price: number) => Promise<void>;
}) {
  const [quickPrice, setQuickPrice] = useState(String(service.price || ""));
  const [quickSaving, setQuickSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const priceChanged = quickPrice.trim() !== "" && Number(quickPrice) !== service.price;
  const priceInvalid = quickPrice.trim() !== "" && (!Number.isFinite(Number(quickPrice)) || Number(quickPrice) <= 0);
  const isDraft = Boolean(service.templateDraft) && !service.isActive;

  async function saveQuickPrice() {
    const value = Number(quickPrice);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Fiyat sıfırdan büyük olmalı.");
      return;
    }
    setQuickSaving(true);
    try {
      await onQuickPrice(value);
    } catch (error) {
      if (error instanceof Error && error.message === "invalid-price") return;
      toast.error("Fiyat güncellenemedi.");
    } finally {
      setQuickSaving(false);
    }
  }

  async function toggle() {
    setToggling(true);
    try { await onToggle(); } finally { setToggling(false); }
  }

  return (
    <article className={cx(styles.row, !service.isActive && styles.rowInactive)} style={{ "--cat-color": category?.color ?? "var(--dui-faint)" } as React.CSSProperties}>
      <div className={styles.rowMain}>
        {order ? <OrderButtons label={service.name} canUp={order.canUp} canDown={order.canDown} onUp={order.onUp} onDown={order.onDown} disabled={order.busy} /> : null}
        <span className={styles.rowIcon} aria-hidden="true">{category ? <ServiceCategoryIcon icon={category.icon} name={category.name} size={20} /> : <Clock size={18} />}</span>
        <div className={styles.rowText}>
          <button type="button" className={styles.rowName} onClick={onEdit}>{service.name}</button>
          <div className={styles.rowBadges}>
            {isDraft ? <Badge size="sm" tone="amber" dot>Fiyat bekliyor</Badge> : !service.isActive ? <Badge size="sm" tone="neutral">Pasif</Badge> : !service.isBookableOnline ? <Badge size="sm" tone="blue" icon={Globe2}>Yalnızca işletmede</Badge> : null}
            {service.requiresDeposit && service.depositAmount > 0 ? <Badge size="sm" tone="violet" icon={Wallet}>Kapora {formatPrice(service.depositAmount)}</Badge> : null}
            <span className={styles.rowFact}><Clock size={13} aria-hidden="true" /> {service.durationMinutes} dk</span>
            <span className={cx(styles.rowFact, staffCount === 0 && styles.rowFactWarn)}><Users size={13} aria-hidden="true" /> {staffCount ? `${staffCount} uzman` : "Uzman atanmadı"}</span>
          </div>
          {service.description ? <p className={styles.rowDesc}>{service.description}</p> : null}
        </div>
      </div>

      <div className={styles.rowSide}>
        <div className={cx(styles.price, priceInvalid && styles.priceInvalid, isDraft && styles.priceDraft)}>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="decimal"
            value={quickPrice}
            onChange={(event) => setQuickPrice(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void saveQuickPrice(); }}
            placeholder={isDraft ? "Fiyat" : "0"}
            aria-label={`${service.name} fiyatı`}
            aria-invalid={priceInvalid}
          />
          <span aria-hidden="true">₺</span>
          {priceChanged || isDraft ? (
            <button type="button" onClick={() => void saveQuickPrice()} disabled={quickSaving || !priceChanged || priceInvalid} aria-label={isDraft ? `${service.name} fiyatını kaydet ve yayınla` : `${service.name} fiyatını kaydet`} title={isDraft ? "Kaydet ve yayınla" : "Fiyatı kaydet"}>
              {quickSaving ? <span className={styles.miniSpin} /> : <Check size={16} strokeWidth={3} />}
            </button>
          ) : null}
        </div>
        <div className={styles.rowActions}>
          <Switch checked={service.isActive} onChange={() => void toggle()} disabled={toggling} ariaLabel={service.isActive ? `${service.name} hizmetini duraklat` : `${service.name} hizmetini yayınla`} />
          <Button variant="ghost" iconOnly icon={Pencil} onClick={onEdit} aria-label={`${service.name} hizmetini düzenle`} />
          <Button variant="ghost" iconOnly icon={Trash2} onClick={onDelete} aria-label={`${service.name} hizmetini sil`} className={styles.deleteBtn} />
        </div>
      </div>
    </article>
  );
}
