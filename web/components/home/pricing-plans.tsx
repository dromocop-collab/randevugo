"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BadgeCheck, Check, Gift, Sparkles, Store, UsersRound } from "lucide-react";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import type { PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { useAuth } from "@/hooks/use-auth";
import { currencySymbol, formatPrice, yearlySavingPercent } from "./public-plans";
import styles from "./business.module.css";

type Cycle = "monthly" | "yearly";

/** Giriş yapmış işletme sahibini panele, diğerlerini kayda yönlendiren birincil CTA. */
export function useBusinessCta() {
  const { user, status } = useAuth();
  const signedIn = status === "authenticated" && Boolean(user);
  return signedIn ? { href: "/dashboard", label: "Panelime devam et" } : { href: "/isletmeler/kayit", label: "Ücretsiz denemeyi başlat" };
}

export function PricingPlans({ plans }: { plans: PlatformPlan[] }) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const cta = useBusinessCta();
  const bestSaving = Math.max(0, ...plans.map(yearlySavingPercent));

  return <div className={styles.pricing}>
    <div className={styles.cycle} role="radiogroup" aria-label="Ödeme dönemi">
      <button type="button" role="radio" aria-checked={cycle === "monthly"} className={cycle === "monthly" ? styles.cycleOn : ""} onClick={() => setCycle("monthly")}>Aylık</button>
      <button type="button" role="radio" aria-checked={cycle === "yearly"} className={cycle === "yearly" ? styles.cycleOn : ""} onClick={() => setCycle("yearly")}>Yıllık{bestSaving > 0 && <small>%{bestSaving} avantaj</small>}</button>
      <span className={styles.cycleThumb} data-cycle={cycle} aria-hidden="true" />
    </div>
    {/* data-count: 1 → yatay tek kart, 2–3 → yan yana, 4+ → sarmalanan ızgara (CSS). */}
    <div className={`${styles.planGrid} ${plans.length === 1 ? styles.planGridSingle : ""}`} data-count={Math.min(plans.length, 4)}>
      {plans.map((plan) => <PlanCard key={plan.id} plan={plan} cycle={cycle} href={cta.href} label={cta.label} single={plans.length === 1} />)}
    </div>
  </div>;
}

function PlanCard({ plan, cycle, href, label, single }: { plan: PlatformPlan; cycle: Cycle; href: string; label: string; single: boolean }) {
  const symbol = currencySymbol(plan.currency);
  const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const monthlyEquivalent = plan.yearlyPrice > 0 ? plan.yearlyPrice / 12 : 0;
  const saving = yearlySavingPercent(plan);
  const entitlements = plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS;
  const features = plan.features.length ? plan.features : entitlements.map(entitlementLabel);

  return <article className={`${styles.planCard} ${plan.isRecommended ? styles.planRecommended : ""} ${single ? styles.planSingle : ""}`}>
    <div className={styles.planMain}>
      <div className={styles.planTop}>
        <h3>{plan.label}</h3>
        {plan.isRecommended && <span className={styles.planBadge}><Sparkles size={12} aria-hidden="true" /> Önerilen</span>}
      </div>
      <p className={styles.planDesc}>{plan.description || (single ? "İşletmenizin tüm randevu operasyonu için tek paket." : `${features.length} özellik dahil.`)}</p>
      <div className={styles.planPrice} aria-live="polite">
        <b>{formatPrice(price)} {symbol}</b><span>/ {cycle === "yearly" ? "yıl" : "ay"}</span>
      </div>
      <p className={styles.planSub}>
        {cycle === "yearly"
          ? monthlyEquivalent > 0 ? <>Aylık yaklaşık <b>{formatPrice(monthlyEquivalent)} {symbol}</b>{saving > 0 && <> · %{saving} tasarruf</>}</> : "Yıllık ödeme"
          : saving > 0 ? <>Yıllık öderseniz %{saving} tasarruf</> : "Aylık ödeme, istediğiniz zaman bırakın"}
      </p>
      {plan.trialDays > 0 && <p className={styles.planTrial}><Gift size={15} aria-hidden="true" /> İlk {plan.trialDays} gün ücretsiz · Kredi kartı gerekmez</p>}
      <Link href={href} className={`${styles.planCta} ${!single && !plan.isRecommended ? styles.planCtaQuiet : ""}`}>{label} <ArrowUpRight size={17} aria-hidden="true" /></Link>
      <div className={styles.planLimits}>
        <span><Store size={14} aria-hidden="true" /> {plan.maxStores} şubeye kadar</span>
        <span><UsersRound size={14} aria-hidden="true" /> {plan.maxStaff} çalışana kadar</span>
      </div>
    </div>
    <div className={styles.planFeatures}>
      <span className={styles.planFeaturesLabel}>{single ? "PAKETTE HER ŞEY DAHİL" : "PAKETTE NELER VAR"}</span>
      <ul>{features.map((feature) => <li key={feature}><span><Check size={12} aria-hidden="true" /></span>{feature}</li>)}</ul>
      <p className={styles.planNote}><BadgeCheck size={14} aria-hidden="true" /> Siz onaylamadan ücretli dönem başlamaz.</p>
    </div>
  </article>;
}

/** Oturuma göre "Panelime devam et" / "Ücretsiz denemeyi başlat" bağlantısı. */
export function BusinessCtaLink({ className }: { className?: string }) {
  const cta = useBusinessCta();
  return <Link href={cta.href} className={className}>{cta.label} <ArrowUpRight size={17} aria-hidden="true" /></Link>;
}
