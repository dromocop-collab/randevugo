"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ReceiptText, RefreshCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { getBillingProfile, getBusinessSubscription, requestSubscriptionPurchase, startSubscriptionCheckout, type BillingProfile } from "@/features/subscriptions/subscription-repository";
import { activePlatformPlans, featuredPlanId, listPlatformPlans, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { TERMS_VERSION } from "@/lib/legal/seller";
import { entitlementLabel } from "@/constants/subscription-entitlements";
import { isSubscriptionActive, type Subscription } from "@/types/subscription";
import { ConfirmSheet, EmptyState, Panel, Segmented, StudioPage, StudioSkeleton } from "@/app/dashboard/_studio";
import css from "./abonelik.module.css";
import { CompareTable, CurrentSubscription, PlanCard, money, yearlySaving, type Cycle, type PlanRelation } from "./plan-cards";
import { SmsCreditsPanel } from "./sms-credits-panel";
import { BillingProfilePanel, BillingProfileSheet } from "./billing-profile";


export default function SubscriptionPage() {
  const { businessId, businesses } = useBusiness();
  const business = businesses.find((item) => item.id === businessId) ?? null;
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  // allPlans: mevcut (satıştan kalkmış olabilecek) paketin adı için; plans: satıştakiler, fiyat sayfasıyla aynı sırada.
  const [allPlans, setAllPlans] = useState<PlatformPlan[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<PlatformPlan | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [billing, setBilling] = useState<BillingProfile | null>(null);
  const [billingOpen, setBillingOpen] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    Promise.all([getBusinessSubscription(businessId), listPlatformPlans(), getBillingProfile(businessId).catch(() => null)])
      .then(([current, rows, profile]) => { if (alive) { setSubscription(current); setAllPlans(rows); setPlans(activePlatformPlans(rows)); setBilling(profile); } })
      .catch(() => { if (alive) toast.error("Paket bilgileri alınamadı."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [businessId]);

  async function choosePlan(plan: PlatformPlan) {
    if (!businessId || busyPlan) return;
    setBusyPlan(plan.id);
    try {
      const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
      if (price > 0) {
        try {
          // Ücretli paket: PayTR güvenli ödeme sayfasına tam sayfa yönlendirme. Erişimi yalnız PayTR bildirimi açar.
          const checkout = await startSubscriptionCheckout({ businessId, planId: plan.id, billingCycle: cycle, acceptedTerms: true, termsVersion: TERMS_VERSION });
          return window.location.assign(checkout.checkoutUrl);
        } catch (error) {
          // Online ödeme henüz açılmadıysa (ayar yok ya da fonksiyon henüz deploy edilmemiş) eski manuel talep akışına düşer.
          const code = String((error as { code?: string }).code ?? "");
          const notReady = String((error as Error).message).includes("PAYMENT_NOT_CONFIGURED") || code === "functions/not-found" || code === "functions/internal";
          if (!notReady) throw error;
        }
      }
      const result = await requestSubscriptionPurchase({ businessId, planId: plan.id, billingCycle: cycle });
      if (result.checkoutUrl) return window.location.assign(result.checkoutUrl);
      if (result.status === "completed") {
        setSubscription(await getBusinessSubscription(businessId));
        toast.success(`${plan.label} paketi hesabınıza tanımlandı.`);
      } else toast.success("Paket talebiniz ödeme bekleyen işlemlere alındı.");
    } catch (error) {
      const message = String((error as Error).message ?? "");
      if (message.includes("BILLING_PROFILE_REQUIRED")) { setBillingOpen(true); toast.error("Ödemeden önce fatura bilgilerinizi tamamlayın."); return; }
      toast.error(message || "Paket seçimi tamamlanamadı.");
    } finally { setBusyPlan(null); }
  }

  function confirmChoice() {
    const plan = confirmPlan;
    if (!plan) return;
    void choosePlan(plan).finally(() => setConfirmPlan(null));
  }

  if (loading) return <StudioPage label="Abonelik"><StudioSkeleton stats={0} rows={3} label="Paket bilgileri yükleniyor" /></StudioPage>;
  const active = isSubscriptionActive(subscription);
  const lifetime = subscription?.isLifetime === true || subscription?.accessMode === "lifetime";
  const trialing = subscription?.status === "trialing" && active;
  const currentPlan = allPlans.find((plan) => plan.id === subscription?.plan);
  const currentForSale = plans.find((plan) => plan.id === subscription?.plan) ?? null;
  const highlightedId = featuredPlanId(plans);
  const cheapest = plans.reduce<PlatformPlan | null>((min, plan) => !min || plan.monthlyPrice < min.monthlyPrice ? plan : min, null);
  const bestSaving = plans.reduce((max, plan) => Math.max(max, yearlySaving(plan)), 0);
  const cycleOptions = [
    { value: "monthly" as const, label: "Aylık" },
    { value: "yearly" as const, label: bestSaving ? <>Yıllık <span className={css.saveTag}>-%{bestSaving}</span></> : "Yıllık" },
  ];
  const confirmPrice = confirmPlan ? (cycle === "yearly" ? confirmPlan.yearlyPrice : confirmPlan.monthlyPrice) : 0;
  const lostOnSwitch = confirmPlan && currentPlan && active && !trialing && confirmPlan.id !== currentPlan.id
    ? currentPlan.entitlements.filter((key) => !confirmPlan.entitlements.includes(key))
    : [];
  const needsBilling = () => { if (billing) return false; toast.message("Önce fatura bilgilerinizi ekleyin; e-Arşiv faturanız bu bilgilerle kesilir."); setBillingOpen(true); return true; };
  const open = (plan: PlatformPlan) => {
    const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    if (price > 0 && needsBilling()) return;
    setAcceptedTerms(false); setConfirmPlan(plan);
  };

  return (
    <StudioPage label="Abonelik">
      <CurrentSubscription
        subscription={subscription} plan={currentPlan ?? null} active={active} lifetime={lifetime} trialing={trialing}
        busy={busyPlan !== null}
        onRenew={currentForSale && !trialing ? () => open(currentForSale) : null}
      />

      <section className={css.section} aria-labelledby="plans-title" id="paketler">
        <div className={css.sectionHead}>
          <div>
            <h2 id="plans-title">{trialing ? "Deneme bitmeden paketinizi seçin" : "Paketler"}</h2>
            <p>{trialing ? "Deneme süresince tüm özellikler açık. Kalan gün, seçtiğiniz paketin önüne eklenir." : "İstediğiniz zaman geçiş yapın; verileriniz her zaman korunur."}</p>
          </div>
          {plans.length ? <Segmented label="Ödeme dönemi" options={cycleOptions} value={cycle} onChange={setCycle} /> : null}
        </div>

        {plans.length === 0
          ? <Panel><EmptyState mood="thinking" title="Şu anda satışa açık paket bulunmuyor." description="Yeni paketler yayınlandığında burada görünecek." /></Panel>
          : (
            <div className={css.plans} data-count={plans.length}>
              {plans.map((plan) => {
                const isCurrent = plan.id === subscription?.plan;
                const relation: PlanRelation = isCurrent ? "current" : !currentPlan ? "new" : plan.monthlyPrice > currentPlan.monthlyPrice ? "upgrade" : "downgrade";
                return (
                  <PlanCard key={plan.id} plan={plan} cycle={cycle} relation={relation} trialing={trialing && isCurrent} expired={!active && !lifetime}
                    recommended={plan.id === highlightedId && !isCurrent} base={cheapest && cheapest.id !== plan.id ? cheapest : null}
                    lifetime={lifetime} busy={busyPlan !== null} pending={busyPlan === plan.id} onChoose={() => open(plan)} />
                );
              })}
            </div>
          )}

        {plans.length > 1 ? <CompareTable plans={plans} currentId={subscription?.plan ?? null} /> : null}

        <ul className={css.trust} aria-label="Ödeme güvencesi">
          <li><ShieldCheck size={15} aria-hidden /> PayTR · 3D Secure</li>
          <li><RefreshCcw size={15} aria-hidden /> Otomatik yenileme yok</li>
          <li><CalendarClock size={15} aria-hidden /> Kalan süre kaybolmaz</li>
          <li><ReceiptText size={15} aria-hidden /> Fiyatlara KDV dahil</li>
        </ul>
        <p className={css.footnote}>
          Ödeme öncesinde <Link href="/on-bilgilendirme-formu" target="_blank">Ön Bilgilendirme Formu</Link>, <Link href="/mesafeli-satis-sozlesmesi" target="_blank">Mesafeli Satış Sözleşmesi</Link> ve <Link href="/iptal-ve-iade" target="_blank">İptal ve İade Koşulları</Link> onayınıza sunulur.
        </p>
      </section>

      {businessId ? <SmsCreditsPanel businessId={businessId} quota={currentPlan?.smsMonthlyQuota ?? null} unlimited={lifetime || (currentPlan?.smsMonthlyQuota ?? null) === null} needsBilling={needsBilling} /> : null}

      {!lifetime ? <BillingProfilePanel profile={billing} onEdit={() => setBillingOpen(true)} /> : null}
      {businessId && billingOpen ? (
        <BillingProfileSheet open businessId={businessId} initial={billing}
          defaults={{ name: business?.name ?? "", address: business?.address ?? "", district: business?.district ?? "", city: business?.city ?? "", email: business?.email ?? "" }}
          onClose={() => setBillingOpen(false)} onSaved={(profile) => { setBilling(profile); setBillingOpen(false); }} />
      ) : null}

      <ConfirmSheet
        open={confirmPlan !== null}
        tone="primary"
        title={confirmPlan ? (confirmPlan.id === subscription?.plan ? `${confirmPlan.label} · süreyi uzat` : `${confirmPlan.label} paketine geç`) : "Paket seçimi"}
        description="PayTR güvenli ödeme sayfasına yönlendirileceksiniz. Ödeme onaylanınca paketiniz otomatik tanımlanır."
        confirmLabel={busyPlan ? "Hazırlanıyor…" : confirmPrice > 0 ? "Ödemeye geç" : "Onayla"}
        busy={busyPlan !== null}
        confirmDisabled={confirmPrice > 0 && !acceptedTerms}
        onConfirm={confirmChoice}
        onClose={() => setConfirmPlan(null)}
      >
        {confirmPlan ? (
          <div className={css.confirmSummary}>
            <span>{cycle === "yearly" ? "1 yıl" : "1 ay"} · {confirmPlan.label}</span>
            <b>{money(confirmPrice, confirmPlan.currency)}</b>
          </div>
        ) : null}
        {lostOnSwitch.length ? (
          <p className={css.downgradeNote}>
            <TriangleAlert size={15} aria-hidden /> Geçişle birlikte şu özellikler kapanır: {lostOnSwitch.map(entitlementLabel).join(", ")}. Kalan süreniz yeni paketin önüne eklenir.
          </p>
        ) : null}
        {confirmPlan && confirmPrice > 0 ? (
          <label className={css.terms}>
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
            <span>
              <Link href="/on-bilgilendirme-formu" target="_blank">Ön Bilgilendirme Formu</Link>&apos;nu,{" "}
              <Link href="/mesafeli-satis-sozlesmesi" target="_blank">Mesafeli Satış Sözleşmesi</Link>&apos;ni ve{" "}
              <Link href="/iptal-ve-iade" target="_blank">İptal ve İade Koşulları</Link>&apos;nı okudum, onaylıyorum. Hizmetin ödeme anında
              başlamasını talep ediyorum ve bu nedenle cayma hakkımın bulunmadığını biliyorum.
            </span>
          </label>
        ) : null}
      </ConfirmSheet>
    </StudioPage>
  );
}

