"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Minus, Plus, ReceiptText, X } from "lucide-react";
import { toast } from "sonner";
import { finalizeCheckout } from "@/features/operations/operations-repository";
import { appointmentPriceLabel, extrasTotal, localizedAppointmentServiceName, needsFinalPrice } from "@/features/services/service-pricing";
import { useLocale } from "@/i18n/client";
import type { Appointment } from "@/types/appointments";
import type { LoyaltyAccount, PaymentMethod, Product, RewardProgramSettings } from "@/types/operations";
import { EmptyState, Panel, Pill, SearchField, cx, studio } from "../_studio";
import { BusyIcon, Empty, Field, Line, SelectPayment, scrollToEl, useOps, type TabProps } from "./shared";
import o from "./ops.module.css";

export function CheckoutTab({ appointments, products, loyalty, rewardProgram, search, setSearch, selected, onSelect, businessId, busy, setBusy, onDone }: TabProps & {
  appointments: Appointment[];
  products: Product[];
  loyalty: LoyaltyAccount[];
  rewardProgram: RewardProgramSettings;
  search: string;
  setSearch: (value: string) => void;
  selected: Appointment | null;
  onSelect: (value: Appointment | null) => void;
}) {
  const { t, money, date, errorText } = useOps();
  const locale = useLocale();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState(0); const [pointsUsed, setPointsUsed] = useState(0); const [paidOverride, setPaidOverride] = useState<number | null>(null); const [method, setMethod] = useState<PaymentMethod>("card");
  const summaryRef = useRef<HTMLElement>(null);
  // Hizmet tutarı (ek hizmetler dahil). Fiyatı kesinleşmemiş randevuda vurgulanır; "görüşmede" fiyatında boş başlar.
  const [priceDraft, setPriceDraft] = useState<{ id: string; value: string } | null>(null);
  const mustFinalize = selected ? needsFinalPrice(selected) : false;
  const isQuote = selected?.servicePriceType === "quote" && mustFinalize;
  const defaultPriceText = selected && !isQuote ? String(Number(selected.servicePrice ?? 0)) : "";
  const priceText = selected && priceDraft?.id === selected.id ? priceDraft.value : defaultPriceText;
  const priceNumber = priceText.trim() === "" ? Number.NaN : Number(priceText);
  const extras = selected ? extrasTotal(selected) : 0;
  const priceValid = Number.isFinite(priceNumber) && priceNumber >= extras;
  const priceChanged = Boolean(selected) && priceText !== defaultPriceText;
  const serviceAmount = priceValid ? priceNumber : Number.isFinite(priceNumber) ? Math.max(0, priceNumber) : 0;
  const productTotal = products.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * item.salePrice, 0);
  const phoneDigits = (selected?.customerPhone ?? "").replace(/\D/g, "").slice(-10);
  const pointBalance = loyalty.find(item => item.customerPhone.replace(/\D/g, "").slice(-10) === phoneDigits)?.points ?? 0;
  const availablePoints = rewardProgram.enabled && pointBalance >= rewardProgram.minimumRedeemPoints ? pointBalance : 0;
  const payableBeforePoints = Math.max(0, serviceAmount + productTotal - discount);
  const maxPointsForCheckout = Math.min(availablePoints, Math.floor((payableBeforePoints * rewardProgram.maxRedemptionPercent / 100) / rewardProgram.pointValueTl));
  const pointDiscount = Math.round(pointsUsed * rewardProgram.pointValueTl * 100) / 100;
  const total = Math.max(0, payableBeforePoints - pointDiscount);
  const paid = Math.min(total, paidOverride ?? total);
  async function submit() { if (!selected) return; if (!priceValid) { toast.error(priceText.trim() === "" ? t("Ödemeyi kaydetmeden önce kesin hizmet tutarını girin.") : t("Hizmet tutarı ek hizmetlerin toplamından ({amount}) az olamaz.", { amount: money(extras) })); return; } setBusy("checkout"); try { await finalizeCheckout({ businessId, appointment: selected, ...(mustFinalize || priceChanged ? { servicePrice: priceNumber } : {}), products: Object.entries(quantities).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity })), discount, paidAmount: paid, paymentMethod: method, loyaltyPointsToUse: pointsUsed }); toast.success(t("Ödeme kaydedildi. Kasa, stok ve müşteri puanı güncellendi.")); onSelect(null); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }

  // Mobilde müşteri seçilince özet listenin altında kalır; görünür alana kaydır.
  useEffect(() => {
    if (!selected || typeof window === "undefined" || !window.matchMedia("(max-width: 1199px)").matches) return;
    scrollToEl(summaryRef.current);
  }, [selected]);

  const steps = [
    { n: "1", title: t("Müşteriyi seç"), text: t("Ödeme bekleyen işlemi bul") },
    { n: "2", title: t("Tutarı kontrol et"), text: t("Ürün, indirim ve puanı ekle") },
    { n: "3", title: t("Ödemeyi kaydet"), text: t("Kasa ve stok otomatik işlensin") },
  ];
  const activeProducts = products.filter(p => p.isActive);

  return <div className={o.stack}>
    <ol className={o.steps} aria-label={t("Tahsilat adımları")}>
      {steps.map((step, index) => <li key={step.n} className={cx(o.step, (selected || index === 0) && o.stepActive)}>
        <span className={o.stepNum}>{step.n}</span>
        <span className={o.stepText}><b>{step.title}</b><small>{step.text}</small></span>
      </li>)}
    </ol>

    <div className={o.splitCheckout}>
      <Panel title={t("Müşteriyi seçin")} description={t("Ödemesini almak istediğiniz müşteriye dokunun.")} icon={ReceiptText}
        actions={<Pill tone={appointments.length ? "warn" : "ok"}>{appointments.length}</Pill>}>
        <SearchField value={search} onChange={setSearch} placeholder={t("Müşteri veya hizmet ara")} />
        <div className={o.pickList}>
          {appointments.length ? appointments.map(item => <button key={item.id} type="button" onClick={() => onSelect(item)} aria-pressed={selected?.id === item.id} className={o.pick}>
            <span className={o.pickText}><b>{item.customerName}</b><small>{localizedAppointmentServiceName(item, locale)} · {date(item.startAt)}</small>{needsFinalPrice(item) && <Pill tone="warn" className={o.pickBadge}>{t("Fiyat bekliyor")}</Pill>}</span>
            <strong className={o.pickAmount}>{appointmentPriceLabel(item, t, money)}</strong>
          </button>) : <Empty text={t("Ödeme bekleyen işlem bulunmuyor.")} />}
        </div>
      </Panel>

      <section ref={summaryRef} className={cx(studio.panel, o.summary)} aria-label={t("Ödeme özeti")}>
        {selected ? <>
          <div className={o.summaryHead}>
            <div className={o.summaryWho}>
              <span className={o.kicker}>{t("Ödeme özeti")}</span>
              <h2>{selected.customerName}</h2>
              <p>{localizedAppointmentServiceName(selected, locale)} · {selected.staffName}</p>
            </div>
            <button type="button" onClick={() => onSelect(null)} className={cx(studio.btn, studio.btnGhost, studio.btnSm)}><X size={15} aria-hidden /> {t("Seçimi kaldır")}</button>
          </div>

          <div className={o.lineBox}>
            <Line label={localizedAppointmentServiceName(selected, locale) || t("Ana hizmet")} value={mustFinalize || priceChanged ? (priceValid ? money(priceNumber - extras) : appointmentPriceLabel(selected, t, money)) : money(Number(selected.primaryServicePrice ?? selected.servicePrice ?? 0))} />
            {selected.additionalServices?.map(item => <Line key={item.serviceId} label={item.name} value={money(item.price)} />)}
          </div>

          <div className={cx(o.priceBox, mustFinalize && o.priceBoxAlert)}>
            <Field label={mustFinalize ? t("Kesin tutarı girin (₺)") : t("Hizmet tutarı (₺)")} type="number" min={extras} step="any" required={mustFinalize}
              value={priceText} placeholder={isQuote ? t("Örn. 750") : undefined} aria-invalid={priceText.trim() !== "" && !priceValid}
              onChange={e => setPriceDraft({ id: selected.id, value: e.target.value })}
              help={mustFinalize || extras > 0 || (priceText.trim() !== "" && !priceValid) ? <>
                {mustFinalize && <span className={o.priceEstimate}>{t("Tahmini: {price}", { price: appointmentPriceLabel(selected, t, money) })}</span>}
                {extras > 0 && <span>{t("Ek hizmetler dahil toplam tutar.")}</span>}
                {priceText.trim() !== "" && !priceValid && <span className={o.priceError}>{t("Hizmet tutarı ek hizmetlerin toplamından ({amount}) az olamaz.", { amount: money(extras) })}</span>}
              </> : undefined} />
          </div>

          {activeProducts.length > 0 && <>
            <h3 className={o.subTitle}>{t("Satılan ürün varsa ekleyin")}</h3>
            <div className={o.productPick}>
              {activeProducts.map(product => {
                const quantity = quantities[product.id] ?? 0;
                return <div key={product.id} className={cx(o.productRow, quantity > 0 && o.productRowOn)}>
                  <div className={o.productText}><b>{product.name}</b><small>{money(product.salePrice)} · {t("{count} adet var", { count: product.stock })}</small></div>
                  <div className={o.stepper}>
                    <button type="button" disabled={!quantity} onClick={() => setQuantities(q => ({ ...q, [product.id]: Math.max(0, quantity - 1) }))} aria-label={t("{name} adedini azalt", { name: product.name })}><Minus size={16} aria-hidden /></button>
                    <b aria-live="polite">{quantity}</b>
                    <button type="button" className={o.stepperPlus} disabled={quantity >= product.stock} onClick={() => setQuantities(q => ({ ...q, [product.id]: quantity + 1 }))} aria-label={t("{name} adedini artır", { name: product.name })}><Plus size={16} aria-hidden /></button>
                  </div>
                </div>;
              })}
            </div>
          </>}

          <div className={o.fieldsCheckout}>
            <Field label={t("İndirim (₺)")} type="number" min="0" max={serviceAmount + productTotal} value={discount} onChange={e => setDiscount(Math.max(0, Number(e.target.value)))} />
            <Field label={rewardProgram.enabled ? t("Kullanılacak puan ({count} var)", { count: pointBalance }) : t("Puan kullanımı kapalı")} type="number" inputMode="numeric" min="0" max={maxPointsForCheckout} disabled={!rewardProgram.enabled || maxPointsForCheckout < rewardProgram.minimumRedeemPoints} value={pointsUsed} onChange={e => setPointsUsed(Math.min(maxPointsForCheckout, Math.max(0, Math.floor(Number(e.target.value)))))} />
            <Field label={t("Müşteriden alınan (₺)")} type="number" min="0" max={total} value={paid} onChange={e => setPaidOverride(Math.max(0, Number(e.target.value)))} />
            <SelectPayment value={method} onChange={setMethod} />
          </div>

          <div className={o.totalCard}>
            <Line label={t("Hizmetler")} value={priceValid || !mustFinalize ? money(serviceAmount) : "—"} />
            <Line label={t("Ürünler")} value={money(productTotal)} />
            <Line label={t("İndirim")} value={`-${money(discount)}`} />
            <Line label={t("Kullanılan puan ({count})", { count: pointsUsed })} value={`-${money(pointDiscount)}`} />
            <div className={o.totalDivider} />
            <Line label={t("Ödenecek toplam")} value={money(total)} strong />
            <Line label={t("Daha sonra ödenecek")} value={money(Math.max(0, total - paid))} />
          </div>

          <button type="button" className={cx(studio.btn, studio.btnPrimary, studio.btnLg, studio.btnBlock, o.submitBig)} onClick={() => void submit()} disabled={busy === "checkout" || !priceValid}>
            <BusyIcon busy={busy === "checkout"} icon={CheckCircle2} size={19} /> {t("Ödemeyi kaydet ve işlemi tamamla")}
          </button>
        </> : <EmptyState mood="thinking" title={t("Müşteri seçilmedi")} description={t("Listeden ödeme bekleyen müşteriyi seçin. Tutar ve ödeme seçenekleri burada açılacak.")} />}
      </section>
    </div>
  </div>;
}
