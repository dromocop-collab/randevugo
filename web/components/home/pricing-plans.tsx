"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BadgeCheck, Check, Gift, Minus, Sparkles, Store, UsersRound } from "lucide-react";
import { PLAN_FEATURE_LIST } from "@/constants/plans";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, SUBSCRIPTION_ENTITLEMENTS } from "@/constants/subscription-entitlements";
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
      {plans.map((plan) => <PlanCard key={plan.id} plan={plan} cycle={cycle} href={cta.href} label={cta.label} single={plans.length === 1} compare={plans.length > 1} />)}
    </div>
  </div>;
}

/** Everything every plan has (shown once per card, not as a differentiator). */
const BASE_FEATURES = ["Online randevu sayfası", "Keşfet'te görünme", "QR randevu linki", "Destek"];
const DEFAULT_FEATURE_TEXTS = new Set<string>(PLAN_FEATURE_LIST);

function PlanCard({ plan, cycle, href, label, single, compare }: { plan: PlatformPlan; cycle: Cycle; href: string; label: string; single: boolean; compare: boolean }) {
  const symbol = currencySymbol(plan.currency);
  const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const monthlyEquivalent = plan.yearlyPrice > 0 ? plan.yearlyPrice / 12 : 0;
  const saving = yearlySavingPercent(plan);
  // The card lists the plan's real entitlements (what the panel unlocks); with
  // several plans, missing ones are shown greyed so the difference is visible.
  const entitlements = new Set(plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS);
  const rows = SUBSCRIPTION_ENTITLEMENTS
    .filter((item) => compare || entitlements.has(item.key))
    .map((item) => ({ key: item.key, label: item.label, included: entitlements.has(item.key) }))
    .sort((a, b) => Number(b.included) - Number(a.included));
  // Free-text extras from the plan editor, minus the old copied default list.
  const extras = plan.features.filter((feature) => !DEFAULT_FEATURE_TEXTS.has(feature));
  const includedCount = rows.filter((row) => row.included).length + BASE_FEATURES.length + extras.length;

  return <article className={`${styles.planCard} ${plan.isRecommended ? styles.planRecommended : ""} ${single ? styles.planSingle : ""}`}>
    <div className={styles.planMain}>
      <div className={styles.planTop}>
        <h3>{plan.label}</h3>
        {plan.isRecommended && <span className={styles.planBadge}><Sparkles size={12} aria-hidden="true" /> Önerilen</span>}
      </div>
      <p className={styles.planDesc}>{plan.description || (single ? "İşletmenizin tüm randevu operasyonu için tek paket." : `${includedCount} özellik dahil.`)}</p>
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
      <ul>
        {BASE_FEATURES.map((feature) => <li key={feature}><span><Check size={12} aria-hidden="true" /></span>{feature}</li>)}
        {extras.map((feature) => <li key={`x-${feature}`}><span><Check size={12} aria-hidden="true" /></span>{feature}</li>)}
        {rows.map((row) => row.included
          ? <li key={row.key}><span><Check size={12} aria-hidden="true" /></span>{row.label}</li>
          : <li key={row.key} className={styles.planFeatureOff} aria-label={`${row.label}: bu pakette yok`}><span><Minus size={12} aria-hidden="true" /></span>{row.label}</li>)}
      </ul>
      <p className={styles.planNote}><BadgeCheck size={14} aria-hidden="true" /> Siz onaylamadan ücretli dönem başlamaz.</p>
    </div>
  </article>;
}

/** Oturuma göre "Panelime devam et" / "Ücretsiz denemeyi başlat" bağlantısı. */
export function BusinessCtaLink({ className }: { className?: string }) {
  const cta = useBusinessCta();
  return <Link href={cta.href} className={className}>{cta.label} <ArrowUpRight size={17} aria-hidden="true" /></Link>;
}
