"use client";

import Link from "@/i18n/link";
import { useState } from "react";
import { ArrowUpRight, BadgeCheck, Check, Gift, MessageSquareText, Minus, Sparkles, Store, UsersRound } from "lucide-react";
import { PLAN_FEATURE_LIST } from "@/constants/plans";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, SUBSCRIPTION_ENTITLEMENTS } from "@/constants/subscription-entitlements";
import type { PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { useAuth } from "@/hooks/use-auth";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk, type TFunction } from "@/i18n/config";
import { currencySymbol, formatPrice, yearlySavingPercent } from "./public-plans";
import styles from "./business.module.css";

type Cycle = "monthly" | "yearly";

/** Giriş yapmış işletme sahibini panele, diğerlerini kayda yönlendiren birincil CTA. */
export function useBusinessCta() {
  const { user, status } = useAuth();
  const signedIn = status === "authenticated" && Boolean(user);
  // label tk() ile işaretli; gösterirken t(cta.label).
  return signedIn ? { href: "/dashboard", label: tk("Panelime devam et") } : { href: "/isletmeler/kayit", label: tk("Ücretsiz denemeyi başlat") };
}

export function PricingPlans({ plans }: { plans: PlatformPlan[] }) {
  const t = useT();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const cta = useBusinessCta();
  const bestSaving = Math.max(0, ...plans.map(yearlySavingPercent));

  return <div className={styles.pricing}>
    <div className={styles.cycle} role="radiogroup" aria-label={t("Ödeme dönemi")}>
      <button type="button" role="radio" aria-checked={cycle === "monthly"} className={cycle === "monthly" ? styles.cycleOn : ""} onClick={() => setCycle("monthly")}>{t("Aylık")}</button>
      <button type="button" role="radio" aria-checked={cycle === "yearly"} className={cycle === "yearly" ? styles.cycleOn : ""} onClick={() => setCycle("yearly")}>{t("Yıllık")}{bestSaving > 0 && <small>{t("%{percent} avantaj", { percent: bestSaving })}</small>}</button>
      <span className={styles.cycleThumb} data-cycle={cycle} aria-hidden="true" />
    </div>
    {/* data-count: 1 → yatay tek kart, 2–3 → yan yana, 4+ → sarmalanan ızgara (CSS). */}
    <div className={`${styles.planGrid} ${plans.length === 1 ? styles.planGridSingle : ""}`} data-count={Math.min(plans.length, 4)}>
      {plans.map((plan) => <PlanCard key={plan.id} plan={plan} cycle={cycle} href={cta.href} label={t(cta.label)} single={plans.length === 1} compare={plans.length > 1} />)}
    </div>
  </div>;
}

/** Everything every plan has (shown once per card, not as a differentiator). */
const BASE_FEATURES = [tk("Online randevu sayfası"), tk("Keşfet'te görünme"), tk("QR randevu linki"), tk("Destek")];
const DEFAULT_FEATURE_TEXTS = new Set<string>(PLAN_FEATURE_LIST);

function staffLimitText(t: TFunction, maxStaff: number) {
  return maxStaff >= 100 ? t("Sınırsız çalışan") : t("{count} çalışan", { count: maxStaff });
}

function storeLimitText(t: TFunction, maxStores: number) {
  return maxStores <= 1 ? t("1 şube") : t("{count} şubeye kadar", { count: maxStores });
}

function smsQuotaText(t: TFunction, quota: number | null, locale: string) {
  return quota === null ? null : t("Ayda {quota} SMS", { quota: quota.toLocaleString(locale) });
}

function PlanCard({ plan, cycle, href, label, single, compare }: { plan: PlatformPlan; cycle: Cycle; href: string; label: string; single: boolean; compare: boolean }) {
  const t = useT();
  const intlLocale = useIntlLocale();
  const smsText = smsQuotaText(t, plan.smsMonthlyQuota, intlLocale);
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
        {plan.isRecommended && <span className={styles.planBadge}><Sparkles size={12} aria-hidden="true" /> {t("Önerilen")}</span>}
      </div>
      <p className={styles.planDesc}>{plan.description || (single ? t("İşletmenizin tüm randevu operasyonu için tek paket.") : t("{count} özellik dahil.", { count: includedCount }))}</p>
      <div className={styles.planPrice} aria-live="polite">
        <b>{formatPrice(price, intlLocale)} {symbol}</b><span>/ {cycle === "yearly" ? t("yıl") : t("ay")}</span>
      </div>
      <p className={styles.planSub}>
        {cycle === "yearly"
          ? monthlyEquivalent > 0 ? <>{t("Aylık yaklaşık")} <b>{formatPrice(monthlyEquivalent, intlLocale)} {symbol}</b>{saving > 0 && <> · {t("%{percent} tasarruf", { percent: saving })}</>}</> : t("Yıllık ödeme")
          : saving > 0 ? t("Yıllık öderseniz %{percent} tasarruf", { percent: saving }) : t("Aylık ödeme, istediğiniz zaman bırakın")}
      </p>
      {plan.trialDays > 0 && <p className={styles.planTrial}><Gift size={15} aria-hidden="true" /> {t("İlk {count} gün ücretsiz · Kredi kartı gerekmez", { count: plan.trialDays })}</p>}
      <Link href={href} className={`${styles.planCta} ${!single && !plan.isRecommended ? styles.planCtaQuiet : ""}`}>{label} <ArrowUpRight size={17} aria-hidden="true" /></Link>
      <div className={styles.planLimits}>
        <span><Store size={14} aria-hidden="true" /> {storeLimitText(t, plan.maxStores)}</span>
        <span><UsersRound size={14} aria-hidden="true" /> {staffLimitText(t, plan.maxStaff)}</span>
        {smsText ? <span><MessageSquareText size={14} aria-hidden="true" /> {smsText}</span> : null}
      </div>
    </div>
    <div className={styles.planFeatures}>
      <span className={styles.planFeaturesLabel}>{single ? t("PAKETTE HER ŞEY DAHİL") : t("PAKETTE NELER VAR")}</span>
      <ul>
        {BASE_FEATURES.map((feature) => <li key={feature}><span><Check size={12} aria-hidden="true" /></span>{t(feature)}</li>)}
        {extras.map((feature) => <li key={`x-${feature}`}><span><Check size={12} aria-hidden="true" /></span>{feature}</li>)}
        {rows.map((row) => row.included
          ? <li key={row.key}><span><Check size={12} aria-hidden="true" /></span>{t(row.label)}</li>
          : <li key={row.key} className={styles.planFeatureOff} aria-label={t("{feature}: bu pakette yok", { feature: t(row.label) })}><span><Minus size={12} aria-hidden="true" /></span>{t(row.label)}</li>)}
      </ul>
      <p className={styles.planNote}><BadgeCheck size={14} aria-hidden="true" /> {t("Siz onaylamadan ücretli dönem başlamaz.")}</p>
    </div>
  </article>;
}

/** Oturuma göre "Panelime devam et" / "Ücretsiz denemeyi başlat" bağlantısı. */
export function BusinessCtaLink({ className }: { className?: string }) {
  const t = useT();
  const cta = useBusinessCta();
  return <Link href={cta.href} className={className}>{t(cta.label)} <ArrowUpRight size={17} aria-hidden="true" /></Link>;
}
