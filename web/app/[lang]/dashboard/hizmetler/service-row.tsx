"use client";

import { useState } from "react";
import { Check, Clock, Globe2, Layers3, Pencil, Trash2, Wallet, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Switch } from "@/components/dashboard/ui";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import { PRICE_TYPE_OPTIONS, localizedServiceDescription, localizedServiceName, moneyFormatter, priceTypeOf, servicePriceLabel, variantsOf } from "@/features/services/service-pricing";
import type { Service, ServicePriceType } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import { OrderButtons, cx } from "../_workspace/kit";
import { formatPrice } from "./service-shared";
import styles from "./services.module.css";
import { useIntlLocale, useLocale, useT } from "@/i18n/client";

export function ServiceRow({
  service, category, staffCount, order, onEdit, onToggle, onDelete, onQuickPrice, onQuickPricing,
}: {
  service: Service;
  category?: ServiceCategory;
  staffCount: number;
  order?: { canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void; busy?: boolean };
  onEdit: () => void;
  onToggle: () => Promise<void>;
  onDelete: () => void;
  onQuickPrice: (price: number) => Promise<void>;
  /** Satırdan fiyat tipi değişimi (ve gerekirse tutarlar). */
  onQuickPricing: (next: { priceType: ServicePriceType; price?: number; priceMax?: number }) => Promise<void>;
}) {
  const t = useT();
  const locale = useLocale();
  const money = moneyFormatter(useIntlLocale());
  const displayName = localizedServiceName(service, locale);
  const displayDescription = localizedServiceDescription(service, locale);
  const variantCount = variantsOf(service).length;
  const savedType = priceTypeOf(service);
  /** Seçenekli hizmette fiyat seçeneklerden gelir; satırda yalnız etiket (dokununca düzenleyici). */
  const quickEditable = variantCount === 0;
  // Satırda seçilen tip; "Aralık" seçilince üst tutar girilene kadar kaydedilmez.
  const [type, setType] = useState<ServicePriceType>(savedType);
  const [quickPrice, setQuickPrice] = useState(String(service.price || ""));
  const [quickMax, setQuickMax] = useState(service.priceMax ? String(service.priceMax) : "");
  const [quickSaving, setQuickSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const isDraft = Boolean(service.templateDraft) && !service.isActive;
  const priceInvalid = quickPrice.trim() !== "" && (!Number.isFinite(Number(quickPrice)) || Number(quickPrice) <= 0);
  const maxInvalid = type === "range" && quickMax.trim() !== "" && !(Number(quickMax) > Number(quickPrice));
  const priceChanged = type === "range"
    ? quickPrice.trim() !== "" && quickMax.trim() !== "" && (savedType !== "range" || Number(quickPrice) !== service.price || Number(quickMax) !== (service.priceMax ?? 0))
    : quickPrice.trim() !== "" && Number(quickPrice) !== service.price;
  // Fiyatı boş bırakıp onaylamak = "Görüşmede belirlenir" (fiyatı olmayan hizmetler tek dokunuşla).
  const emptyPrice = quickPrice.trim() === "" && type !== "quote";

  async function run(action: () => Promise<void>) {
    setQuickSaving(true);
    try {
      await action();
    } catch (error) {
      if (error instanceof Error && error.message === "invalid-price") return;
      toast.error(t("Fiyat güncellenemedi."));
    } finally {
      setQuickSaving(false);
    }
  }

  function saveQuickPrice() {
    if (emptyPrice) {
      setType("quote");
      return run(() => onQuickPricing({ priceType: "quote" }));
    }
    const value = Number(quickPrice);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t("Fiyat sıfırdan büyük olmalı."));
      return;
    }
    if (type === "range") return run(() => onQuickPricing({ priceType: "range", price: value, priceMax: Number(quickMax) }));
    if (type !== savedType) return run(() => onQuickPricing({ priceType: type, price: value }));
    return run(() => onQuickPrice(value));
  }

  function changeType(next: ServicePriceType) {
    setType(next);
    if (next === "range") return; // üst tutar girilince ✓ ile kaydedilir
    if (next === "quote") return void run(() => onQuickPricing({ priceType: "quote" }));
    // Sabit/başlangıç: tutar varsa hemen kaydet, yoksa kullanıcı tutarı yazıp onaylar.
    if (Number(quickPrice) > 0) void run(() => onQuickPricing({ priceType: next, price: Number(quickPrice) }));
  }

  async function toggle() {
    setToggling(true);
    try { await onToggle(); } finally { setToggling(false); }
  }

  return (
    <article className={cx(styles.row, !service.isActive && styles.rowInactive)} style={{ "--cat-color": category?.color ?? "var(--dui-faint)" } as React.CSSProperties}>
      <div className={styles.rowMain}>
        {order ? <OrderButtons label={displayName} canUp={order.canUp} canDown={order.canDown} onUp={order.onUp} onDown={order.onDown} disabled={order.busy} /> : null}
        {service.imageUrl
          ? <span className={cx(styles.rowIcon, styles.rowImage)} style={{ backgroundImage: `url("${service.imageUrl}")` }} aria-hidden="true" />
          : <span className={styles.rowIcon} aria-hidden="true">{category ? <ServiceCategoryIcon icon={category.icon} name={category.name} size={20} /> : <Clock size={18} />}</span>}
        <div className={styles.rowText}>
          <button type="button" className={styles.rowName} onClick={onEdit}>{displayName}</button>
          <div className={styles.rowBadges}>
            {isDraft ? <Badge size="sm" tone="amber" dot>{t("Fiyat bekliyor")}</Badge> : !service.isActive ? <Badge size="sm" tone="neutral">{t("Pasif")}</Badge> : !service.isBookableOnline ? <Badge size="sm" tone="blue" icon={Globe2}>{t("Yalnızca işletmede")}</Badge> : null}
            {service.requiresDeposit && service.depositAmount > 0 ? <Badge size="sm" tone="violet" icon={Wallet}>{t("Kapora {amount}", { amount: formatPrice(service.depositAmount) })}</Badge> : null}
            {variantCount ? <Badge size="sm" tone="accent" icon={Layers3}>{t("{count} seçenek", { count: variantCount })}</Badge> : null}
            <span className={styles.rowFact}><Clock size={13} aria-hidden="true" /> {t("{minutes} dk", { minutes: service.durationMinutes })}</span>
            <span className={cx(styles.rowFact, staffCount === 0 && styles.rowFactWarn)}><Users size={13} aria-hidden="true" /> {staffCount ? t("{count} uzman", { count: staffCount }) : t("Uzman atanmadı")}</span>
          </div>
          {displayDescription ? <p className={styles.rowDesc}>{displayDescription}</p> : null}
        </div>
      </div>

      <div className={styles.rowSide}>
        {quickEditable ? (
          <div className={styles.quickPricing}>
            <label className={styles.typeSelect}>
              <span className="sr-only">{t("{name} fiyat tipi", { name: displayName })}</span>
              <select value={type} onChange={(event) => changeType(event.target.value as ServicePriceType)} disabled={quickSaving}>
                {PRICE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
              </select>
            </label>
            {type === "quote" ? (
              <span className={styles.quoteChip}>{quickSaving ? <span className={styles.miniSpin} /> : null}{t("Fiyat görüşmede")}</span>
            ) : (
              <div className={cx(styles.price, (priceInvalid || maxInvalid) && styles.priceInvalid, isDraft && styles.priceDraft, type === "range" && styles.priceRange)}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  value={quickPrice}
                  onChange={(event) => setQuickPrice(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") void saveQuickPrice(); }}
                  placeholder={type === "range" ? t("En az", { ctx: "kisa" }) : isDraft ? t("Fiyat") : "0"}
                  aria-label={type === "range" ? t("{name} en düşük fiyat", { name: displayName }) : t("{name} fiyatı", { name: displayName })}
                  aria-invalid={priceInvalid}
                />
                {type === "range" ? <>
                  <span className={styles.rangeDash} aria-hidden="true">–</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="decimal"
                    value={quickMax}
                    onChange={(event) => setQuickMax(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") void saveQuickPrice(); }}
                    placeholder={t("En çok", { ctx: "kisa" })}
                    aria-label={t("{name} en yüksek fiyat", { name: displayName })}
                    aria-invalid={maxInvalid}
                  />
                </> : null}
                <span aria-hidden="true">{type === "from" ? t("₺'den") : "₺"}</span>
                {priceChanged || isDraft || emptyPrice || type !== savedType ? (
                  <button
                    type="button"
                    onClick={() => void saveQuickPrice()}
                    disabled={quickSaving || priceInvalid || maxInvalid || (type === "range" && !priceChanged) || (!emptyPrice && !priceChanged && type === savedType)}
                    aria-label={emptyPrice ? t("{name}: fiyatı görüşmede belirlenir olarak kaydet", { name: displayName }) : isDraft ? t("{name} fiyatını kaydet ve yayınla", { name: displayName }) : t("{name} fiyatını kaydet", { name: displayName })}
                    title={emptyPrice ? t("Fiyat yok: Görüşmede belirlenir") : isDraft ? t("Kaydet ve yayınla") : t("Fiyatı kaydet")}
                  >
                    {quickSaving ? <span className={styles.miniSpin} /> : <Check size={16} strokeWidth={3} />}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <button type="button" className={styles.priceLabel} onClick={onEdit} aria-label={t("{name} fiyatını düzenle", { name: displayName })}>
            {servicePriceLabel(service, t, money)}
            <Pencil size={13} aria-hidden="true" />
          </button>
        )}
        <div className={styles.rowActions}>
          <Switch checked={service.isActive} onChange={() => void toggle()} disabled={toggling} ariaLabel={service.isActive ? t("{name} hizmetini duraklat", { name: displayName }) : t("{name} hizmetini yayınla", { name: displayName })} />
          <Button variant="ghost" iconOnly icon={Pencil} onClick={onEdit} aria-label={t("{name} hizmetini düzenle", { name: displayName })} />
          <Button variant="ghost" iconOnly icon={Trash2} onClick={onDelete} aria-label={t("{name} hizmetini sil", { name: displayName })} className={styles.deleteBtn} />
        </div>
      </div>
    </article>
  );
}
