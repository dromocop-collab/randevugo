"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Minus, Plus, ReceiptText, X } from "lucide-react";
import { toast } from "sonner";
import { finalizeCheckout } from "@/features/operations/operations-repository";
import type { Appointment } from "@/types/appointments";
import type { LoyaltyAccount, PaymentMethod, Product, RewardProgramSettings } from "@/types/operations";
import { EmptyState, Panel, Pill, SearchField, cx, studio } from "../_studio";
import { BusyIcon, Empty, Field, Line, SelectPayment, date, errorText, money, scrollToEl, type TabProps } from "./shared";
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
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState(0); const [pointsUsed, setPointsUsed] = useState(0); const [paidOverride, setPaidOverride] = useState<number | null>(null); const [method, setMethod] = useState<PaymentMethod>("card");
  const summaryRef = useRef<HTMLElement>(null);
  const productTotal = products.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * item.salePrice, 0);
  const phoneDigits = (selected?.customerPhone ?? "").replace(/\D/g, "").slice(-10);
  const pointBalance = loyalty.find(item => item.customerPhone.replace(/\D/g, "").slice(-10) === phoneDigits)?.points ?? 0;
  const availablePoints = rewardProgram.enabled && pointBalance >= rewardProgram.minimumRedeemPoints ? pointBalance : 0;
  const payableBeforePoints = Math.max(0, Number(selected?.servicePrice ?? 0) + productTotal - discount);
  const maxPointsForCheckout = Math.min(availablePoints, Math.floor((payableBeforePoints * rewardProgram.maxRedemptionPercent / 100) / rewardProgram.pointValueTl));
  const pointDiscount = Math.round(pointsUsed * rewardProgram.pointValueTl * 100) / 100;
  const total = Math.max(0, payableBeforePoints - pointDiscount);
  const paid = Math.min(total, paidOverride ?? total);
  async function submit() { if (!selected) return; setBusy("checkout"); try { await finalizeCheckout({ businessId, appointment: selected, products: Object.entries(quantities).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity })), discount, paidAmount: paid, paymentMethod: method, loyaltyPointsToUse: pointsUsed }); toast.success("Ödeme kaydedildi. Kasa, stok ve müşteri puanı güncellendi."); onSelect(null); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }

  // Mobilde müşteri seçilince özet listenin altında kalır; görünür alana kaydır.
  useEffect(() => {
    if (!selected || typeof window === "undefined" || !window.matchMedia("(max-width: 1199px)").matches) return;
    scrollToEl(summaryRef.current);
  }, [selected]);

  const steps = [
    { n: "1", title: "Müşteriyi seç", text: "Ödeme bekleyen işlemi bul" },
    { n: "2", title: "Tutarı kontrol et", text: "Ürün, indirim ve puanı ekle" },
    { n: "3", title: "Ödemeyi kaydet", text: "Kasa ve stok otomatik işlensin" },
  ];
  const activeProducts = products.filter(p => p.isActive);

  return <div className={o.stack}>
    <ol className={o.steps} aria-label="Tahsilat adımları">
      {steps.map((step, index) => <li key={step.n} className={cx(o.step, (selected || index === 0) && o.stepActive)}>
        <span className={o.stepNum}>{step.n}</span>
        <span className={o.stepText}><b>{step.title}</b><small>{step.text}</small></span>
      </li>)}
    </ol>

    <div className={o.splitCheckout}>
      <Panel title="Müşteriyi seçin" description="Ödemesini almak istediğiniz müşteriye dokunun." icon={ReceiptText}
        actions={<Pill tone={appointments.length ? "warn" : "ok"}>{appointments.length}</Pill>}>
        <SearchField value={search} onChange={setSearch} placeholder="Müşteri veya hizmet ara" />
        <div className={o.pickList}>
          {appointments.length ? appointments.map(item => <button key={item.id} type="button" onClick={() => onSelect(item)} aria-pressed={selected?.id === item.id} className={o.pick}>
            <span className={o.pickText}><b>{item.customerName}</b><small>{item.serviceName} · {date(item.startAt)}</small></span>
            <strong className={o.pickAmount}>{money(Number(item.servicePrice ?? 0))}</strong>
          </button>) : <Empty text="Ödeme bekleyen işlem bulunmuyor." />}
        </div>
      </Panel>

      <section ref={summaryRef} className={cx(studio.panel, o.summary)} aria-label="Ödeme özeti">
        {selected ? <>
          <div className={o.summaryHead}>
            <div className={o.summaryWho}>
              <span className={o.kicker}>Ödeme özeti</span>
              <h2>{selected.customerName}</h2>
              <p>{selected.serviceName} · {selected.staffName}</p>
            </div>
            <button type="button" onClick={() => onSelect(null)} className={cx(studio.btn, studio.btnGhost, studio.btnSm)}><X size={15} aria-hidden /> Seçimi kaldır</button>
          </div>

          <div className={o.lineBox}>
            <Line label={selected.serviceName ?? "Ana hizmet"} value={money(Number(selected.primaryServicePrice ?? selected.servicePrice ?? 0))} />
            {selected.additionalServices?.map(item => <Line key={item.serviceId} label={item.name} value={money(item.price)} />)}
          </div>

          {activeProducts.length > 0 && <>
            <h3 className={o.subTitle}>Satılan ürün varsa ekleyin</h3>
            <div className={o.productPick}>
              {activeProducts.map(product => {
                const quantity = quantities[product.id] ?? 0;
                return <div key={product.id} className={cx(o.productRow, quantity > 0 && o.productRowOn)}>
                  <div className={o.productText}><b>{product.name}</b><small>{money(product.salePrice)} · {product.stock} adet var</small></div>
                  <div className={o.stepper}>
                    <button type="button" disabled={!quantity} onClick={() => setQuantities(q => ({ ...q, [product.id]: Math.max(0, quantity - 1) }))} aria-label={`${product.name} adedini azalt`}><Minus size={16} aria-hidden /></button>
                    <b aria-live="polite">{quantity}</b>
                    <button type="button" className={o.stepperPlus} disabled={quantity >= product.stock} onClick={() => setQuantities(q => ({ ...q, [product.id]: quantity + 1 }))} aria-label={`${product.name} adedini artır`}><Plus size={16} aria-hidden /></button>
                  </div>
                </div>;
              })}
            </div>
          </>}

          <div className={o.fieldsCheckout}>
            <Field label="İndirim (₺)" type="number" min="0" max={Number(selected.servicePrice ?? 0) + productTotal} value={discount} onChange={e => setDiscount(Math.max(0, Number(e.target.value)))} />
            <Field label={rewardProgram.enabled ? `Kullanılacak puan (${pointBalance} var)` : "Puan kullanımı kapalı"} type="number" inputMode="numeric" min="0" max={maxPointsForCheckout} disabled={!rewardProgram.enabled || maxPointsForCheckout < rewardProgram.minimumRedeemPoints} value={pointsUsed} onChange={e => setPointsUsed(Math.min(maxPointsForCheckout, Math.max(0, Math.floor(Number(e.target.value)))))} />
            <Field label="Müşteriden alınan (₺)" type="number" min="0" max={total} value={paid} onChange={e => setPaidOverride(Math.max(0, Number(e.target.value)))} />
            <SelectPayment value={method} onChange={setMethod} />
          </div>

          <div className={o.totalCard}>
            <Line label="Hizmetler" value={money(Number(selected.servicePrice ?? 0))} />
            <Line label="Ürünler" value={money(productTotal)} />
            <Line label="İndirim" value={`-${money(discount)}`} />
            <Line label={`Kullanılan puan (${pointsUsed})`} value={`-${money(pointDiscount)}`} />
            <div className={o.totalDivider} />
            <Line label="Ödenecek toplam" value={money(total)} strong />
            <Line label="Daha sonra ödenecek" value={money(Math.max(0, total - paid))} />
          </div>

          <button type="button" className={cx(studio.btn, studio.btnPrimary, studio.btnLg, studio.btnBlock, o.submitBig)} onClick={() => void submit()} disabled={busy === "checkout"}>
            <BusyIcon busy={busy === "checkout"} icon={CheckCircle2} size={19} /> Ödemeyi kaydet ve işlemi tamamla
          </button>
        </> : <EmptyState mood="thinking" title="Müşteri seçilmedi" description="Listeden ödeme bekleyen müşteriyi seçin. Tutar ve ödeme seçenekleri burada açılacak." />}
      </section>
    </div>
  </div>;
}
