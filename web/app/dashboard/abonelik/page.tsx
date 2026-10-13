"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Check, CreditCard, Crown, LoaderCircle, MessageSquareText, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { getBusinessSubscription, requestSubscriptionPurchase, startSubscriptionCheckout } from "@/features/subscriptions/subscription-repository";
import { activePlatformPlans, featuredPlanId, listPlatformPlans, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { smsQuotaLabel, staffLimitLabel, storeLimitLabel } from "@/features/subscriptions/platform-plan-domain";
import { TERMS_VERSION } from "@/lib/legal/seller";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import { isSubscriptionActive, type Subscription } from "@/types/subscription";
import { ConfirmSheet, EmptyState, HeroChip, Notice, Panel, Pill, Segmented, StudioHero, StudioPage, StudioSkeleton, cx, studio } from "@/app/dashboard/_studio";
import css from "./abonelik.module.css";
import { SmsCreditsPanel } from "./sms-credits-panel";

type Cycle = "monthly" | "yearly";

function money(value: number, currency: string) {
  return `${value.toLocaleString("tr-TR")} ${currency === "TRY" ? "₺" : currency}`;
}

function yearlySaving(plan: PlatformPlan) {
  const full = plan.monthlyPrice * 12;
  if (!full || plan.yearlyPrice <= 0 || plan.yearlyPrice >= full) return 0;
  return Math.round((full - plan.yearlyPrice) / full * 100);
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : null;
}

export default function SubscriptionPage() {
  const { businessId } = useBusiness();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  // allPlans: mevcut (satıştan kalkmış olabilecek) paketin adı için; plans: satıştakiler, fiyat sayfasıyla aynı sırada.
  const [allPlans, setAllPlans] = useState<PlatformPlan[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<PlatformPlan | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    Promise.all([getBusinessSubscription(businessId), listPlatformPlans()])
      .then(([current, rows]) => { if (alive) { setSubscription(current); setAllPlans(rows); setPlans(activePlatformPlans(rows)); } })
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
      toast.error((error as Error).message || "Paket seçimi tamamlanamadı.");
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
  const currentPlan = allPlans.find((plan) => plan.id === subscription?.plan);
  const highlightedId = featuredPlanId(plans);
  const statusLabel = lifetime ? "Süresiz" : active ? "Aktif" : "Süresi doldu";
  const endsAt = lifetime ? null : formatDate(subscription?.status === "trialing" ? subscription?.trialEndsAt : subscription?.subscriptionEndsAt);
  const bestSaving = plans.reduce((max, plan) => Math.max(max, yearlySaving(plan)), 0);
  const cycleOptions = [
    { value: "monthly" as const, label: "Aylık" },
    { value: "yearly" as const, label: bestSaving ? <>Yıllık <span className={css.saveTag}>-%{bestSaving}</span></> : "Yıllık" },
  ];
  const confirmPrice = confirmPlan ? (cycle === "yearly" ? confirmPlan.yearlyPrice : confirmPlan.monthlyPrice) : 0;

  return (
    <StudioPage label="Abonelik">
      <StudioHero
        eyebrow="Abonelik merkezi"
        icon={CreditCard}
        title="İşletmenize uygun paketi seçin."
        description="Paketinizde bulunan özellikler panelinize yansır. Paket değişiminde mevcut verileriniz korunur."
        mascot="happy"
      >
        <HeroChip icon={Crown} value={currentPlan?.label ?? subscription?.plan ?? "Tanımsız"} label="mevcut paket" />
        <Pill tone={active ? "ok" : "bad"} dot className={css.heroPill}>{statusLabel}</Pill>
        {endsAt ? <HeroChip value={endsAt} label={subscription?.status === "trialing" ? "deneme bitişi" : "yenileme"} /> : null}
      </StudioHero>

      <Notice tone="accent" icon={ShieldCheck} title="Güvenli ödeme, otomatik yenileme yok">
        Ödeme PayTR güvencesiyle 3D Secure ile alınır; kart bilgileriniz bizde saklanmaz. Paket dönem sonunda kendiliğinden yenilenmez,
        kalan deneme veya abonelik süreniz yeni dönemin önüne eklenir. Kayıtlarınız hiçbir zaman silinmez.
      </Notice>

      <Panel icon={Sparkles} title="İhtiyacınız kadarını seçin" description="Tüm paketlerde verileriniz korunur.">
        {plans.length ? <div className={css.cycleRow}><Segmented label="Ödeme dönemi" options={cycleOptions} value={cycle} onChange={setCycle} /></div> : null}
        {plans.length === 0
          ? <EmptyState mood="thinking" title="Şu anda satışa açık paket bulunmuyor." description="Yeni paketler yayınlandığında burada görünecek." />
          : (
            <div className={css.plans}>
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} highlighted={plan.id === highlightedId} cycle={cycle} selected={plan.id === subscription?.plan} active={active} lifetime={lifetime}
                  busy={busyPlan !== null} pending={busyPlan === plan.id} onChoose={() => { setAcceptedTerms(false); setConfirmPlan(plan); }} />
              ))}
            </div>
          )}
        <p className={css.footnote}>
          Fiyatlara KDV dahildir. Ödeme öncesinde <Link href="/on-bilgilendirme-formu" target="_blank">Ön Bilgilendirme Formu</Link>, <Link href="/mesafeli-satis-sozlesmesi" target="_blank">Mesafeli Satış Sözleşmesi</Link> ve <Link href="/iptal-ve-iade" target="_blank">İptal ve İade Koşulları</Link> onayınıza sunulur.
        </p>
      </Panel>

      {businessId ? <SmsCreditsPanel businessId={businessId} quota={currentPlan?.smsMonthlyQuota ?? null} unlimited={lifetime || (currentPlan?.smsMonthlyQuota ?? null) === null} /> : null}

      <ConfirmSheet
        open={confirmPlan !== null}
        tone="primary"
        title={confirmPlan ? `${confirmPlan.label} paketini seçiyorsunuz` : "Paket seçimi"}
        description="PayTR güvenli ödeme sayfasına yönlendirileceksiniz. Ödeme onaylanınca paketiniz otomatik tanımlanır."
        confirmLabel={busyPlan ? "Hazırlanıyor…" : confirmPrice > 0 ? "Ödemeye geç" : "Onayla"}
        busy={busyPlan !== null}
        confirmDisabled={confirmPrice > 0 && !acceptedTerms}
        onConfirm={confirmChoice}
        onClose={() => setConfirmPlan(null)}
      >
        {confirmPlan ? (
          <div className={css.confirmSummary}>
            <span>{cycle === "yearly" ? "Yıllık ödeme" : "Aylık ödeme"}</span>
            <b>{money(confirmPrice, confirmPlan.currency)}<small> / {cycle === "yearly" ? "yıl" : "ay"}</small></b>
          </div>
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

function PlanCard({ plan, highlighted, cycle, selected, active, lifetime, busy, pending, onChoose }: { plan: PlatformPlan; highlighted: boolean; cycle: Cycle; selected: boolean; active: boolean; lifetime: boolean; busy: boolean; pending: boolean; onChoose: () => void }) {
  const entitlements = plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS;
  const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const saving = yearlySaving(plan);
  const perMonth = cycle === "yearly" && plan.yearlyPrice > 0 ? Math.round(plan.yearlyPrice / 12) : 0;
  return (
    <article className={cx(css.plan, highlighted && css.planRecommended, selected && css.planCurrent)} aria-current={selected ? "true" : undefined}>
      <div className={css.planHead}>
        <small className={css.planCode}>{plan.id}</small>
        <div className={css.planBadges}>
          {selected ? <Pill tone={active || lifetime ? "ok" : "warn"} dot>Mevcut paket</Pill> : null}
          {highlighted ? <Pill tone="accent"><Sparkles size={12} aria-hidden /> Önerilen</Pill> : null}
        </div>
      </div>
      <h3 className={css.planName}>{plan.label}</h3>
      {plan.description ? <p className={css.planDesc}>{plan.description}</p> : null}
      <div className={css.price}>
        <b>{money(price, plan.currency)}</b>
        <span>/ {cycle === "yearly" ? "yıl" : "ay"}</span>
      </div>
      <div className={css.priceNote}>
        {perMonth ? <span>Aylık ~{money(perMonth, plan.currency)}</span> : null}
        {cycle === "yearly" && saving ? <Pill tone="ok">%{saving} tasarruf</Pill> : null}
      </div>
      <div className={css.limits}>
        <span><Building2 size={14} aria-hidden />{storeLimitLabel(plan.maxStores)}</span>
        <span><UsersRound size={14} aria-hidden />{staffLimitLabel(plan.maxStaff)}</span>
        {smsQuotaLabel(plan.smsMonthlyQuota) ? <span><MessageSquareText size={14} aria-hidden />{smsQuotaLabel(plan.smsMonthlyQuota)}</span> : null}
      </div>
      <ul className={css.features}>
        {entitlements.map((key) => <li key={key}><span className={css.check} aria-hidden><Check size={12} strokeWidth={3} /></span>{entitlementLabel(key)}</li>)}
      </ul>
      <button type="button" disabled={lifetime || busy} onClick={onChoose}
        className={cx(studio.btn, studio.btnLg, studio.btnBlock, studio.btnPrimary)}>
        {pending ? <LoaderCircle size={17} className={studio.spin} aria-hidden /> : <CreditCard size={17} aria-hidden />}
        {lifetime ? "Süresiz erişim aktif" : busy ? "Hazırlanıyor…" : selected ? (active ? "Süreyi uzat" : "Paketi yenile") : "Bu paketi seç"}
      </button>
    </article>
  );
}
