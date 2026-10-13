"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, Building2, Check, ChevronDown, CreditCard, Crown, ListChecks, LoaderCircle, MessageSquareText, Minus, Sparkles, UsersRound } from "lucide-react";
import type { PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { smsQuotaLabel, staffLimitLabel, storeLimitLabel } from "@/features/subscriptions/platform-plan-domain";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, SUBSCRIPTION_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import type { Subscription } from "@/types/subscription";
import { Pill, cx, studio } from "@/app/dashboard/_studio";
import css from "./abonelik.module.css";

export type Cycle = "monthly" | "yearly";

export function money(value: number, currency: string) {
  return `${value.toLocaleString("tr-TR")} ${currency === "TRY" ? "₺" : currency}`;
}

export function yearlySaving(plan: PlatformPlan) {
  const full = plan.monthlyPrice * 12;
  if (!full || plan.yearlyPrice <= 0 || plan.yearlyPrice >= full) return 0;
  return Math.round((full - plan.yearlyPrice) / full * 100);
}

export function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : null;
}

export type PlanRelation = "current" | "upgrade" | "downgrade" | "new";

const DAY_MS = 86_400_000;

export function CurrentSubscription({ subscription, plan, active, lifetime, trialing, busy, onRenew }: {
  subscription: Subscription | null; plan: PlatformPlan | null; active: boolean; lifetime: boolean; trialing: boolean; busy: boolean; onRenew: (() => void) | null;
}) {
  const endRaw = trialing ? subscription?.trialEndsAt : subscription?.subscriptionEndsAt;
  const startRaw = trialing ? subscription?.trialStartedAt : subscription?.subscriptionStartedAt;
  const end = endRaw ? new Date(endRaw).getTime() : NaN;
  const start = startRaw ? new Date(startRaw).getTime() : NaN;
  const [now] = useState(() => Date.now());
  const daysLeft = Number.isFinite(end) ? Math.max(0, Math.ceil((end - now) / DAY_MS)) : null;
  const total = Number.isFinite(end) && Number.isFinite(start) && end > start ? end - start : null;
  const progress = total ? Math.min(100, Math.max(0, Math.round((now - start) / total * 100))) : null;
  const status = lifetime ? { label: "Süresiz", tone: "ok" as const } : trialing ? { label: "Deneme", tone: "accent" as const } : active ? { label: "Aktif", tone: "ok" as const } : { label: "Süresi doldu", tone: "bad" as const };
  const urgent = !lifetime && daysLeft !== null && daysLeft <= 7;

  return (
    <section className={cx(css.current, !active && !lifetime && css.currentExpired)} aria-label="Mevcut abonelik">
      <div className={css.currentMain}>
        <span className={css.currentIcon} aria-hidden><Crown size={20} /></span>
        <div className={css.currentText}>
          <small>Mevcut paketiniz</small>
          <h1>{plan?.label ?? subscription?.plan ?? "Paket seçilmedi"} <Pill tone={status.tone} dot>{status.label}</Pill></h1>
          <p>
            {lifetime ? "Süresiz erişim tanımlı; ödeme gerekmiyor."
              : !Number.isFinite(end) ? "Paket seçerek başlayın."
              : active ? <>{trialing ? "Deneme" : "Paket"} <b>{formatDate(endRaw)}</b> tarihinde bitiyor{daysLeft !== null ? <> · <b className={urgent ? css.urgent : undefined}>{daysLeft} gün kaldı</b></> : null}</>
              : <>Paket <b>{formatDate(endRaw)}</b> tarihinde sona erdi. Yeni randevu almak için yenileyin.</>}
          </p>
          {plan ? (
            <span className={css.currentLimits}>
              <span><Building2 size={13} aria-hidden />{storeLimitLabel(plan.maxStores)}</span>
              <span><UsersRound size={13} aria-hidden />{staffLimitLabel(plan.maxStaff)}</span>
              {smsQuotaLabel(plan.smsMonthlyQuota) ? <span><MessageSquareText size={13} aria-hidden />{smsQuotaLabel(plan.smsMonthlyQuota)}</span> : null}
            </span>
          ) : null}
        </div>
        {!lifetime ? (
          onRenew
            ? <button type="button" className={cx(studio.btn, studio.btnPrimary, css.currentCta)} disabled={busy} onClick={onRenew}><CreditCard size={16} aria-hidden />{active ? "Süreyi uzat" : "Paketi yenile"}</button>
            : <a href="#paketler" className={cx(studio.btn, studio.btnPrimary, css.currentCta)}><ArrowDown size={16} aria-hidden />{trialing ? "Paket seç" : "Paketleri gör"}</a>
        ) : null}
      </div>
      {progress !== null && !lifetime ? (
        <div className={css.currentBar} role="progressbar" aria-label={trialing ? "Deneme süresi" : "Paket dönemi"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <i style={{ width: `${progress}%` }} data-urgent={urgent || undefined} />
        </div>
      ) : null}
    </section>
  );
}

export function PlanCard({ plan, cycle, relation, trialing, expired, recommended, base, lifetime, busy, pending, onChoose }: {
  plan: PlatformPlan; cycle: Cycle; relation: PlanRelation; trialing: boolean; expired: boolean; recommended: boolean; base: PlatformPlan | null;
  lifetime: boolean; busy: boolean; pending: boolean; onChoose: () => void;
}) {
  const entitlements = plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS;
  const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const saving = yearlySaving(plan);
  const perMonth = cycle === "yearly" && plan.yearlyPrice > 0 ? Math.round(plan.yearlyPrice / 12) : 0;
  // Üst paket: alttaki paketin üzerine eklenenler; alt paket: kendi özellikleri.
  const extras = base ? entitlements.filter((key) => !base.entitlements.includes(key)) : [];
  const highlights = base && extras.length ? extras : entitlements;
  const shown = highlights.slice(0, 6);
  const isCurrent = relation === "current";
  const badge = isCurrent ? <Pill tone={expired ? "bad" : "ok"} dot>{trialing ? "Denemedesiniz" : expired ? "Süresi doldu" : "Mevcut paket"}</Pill>
    : recommended ? <Pill tone="accent"><Sparkles size={12} aria-hidden /> Önerilen</Pill>
    : relation === "upgrade" ? <Pill tone="accent"><ArrowUpRight size={12} aria-hidden /> Yükseltme</Pill> : null;
  const label = lifetime ? "Süresiz erişim aktif" : busy && pending ? "Hazırlanıyor…"
    : isCurrent ? (trialing ? "Bu paketle devam et" : expired ? "Paketi yenile" : "Süreyi uzat")
    : relation === "upgrade" ? `${plan.label}'e yükselt` : relation === "downgrade" ? "Bu pakete geç" : "Bu paketi seç";
  const primary = relation === "upgrade" || relation === "new" || (isCurrent && (expired || trialing));

  return (
    <article className={cx(css.plan, isCurrent && css.planCurrent, relation === "upgrade" && css.planUpgrade)} aria-current={isCurrent ? "true" : undefined}>
      <header className={css.planHead}>
        <h3>{plan.label}</h3>
        {badge}
      </header>
      {plan.description ? <p className={css.planDesc}>{plan.description}</p> : null}

      <div className={css.price}>
        <b>{money(price, plan.currency)}</b>
        <span>/ {cycle === "yearly" ? "yıl" : "ay"}</span>
        {cycle === "yearly" && saving ? <em>%{saving} tasarruf</em> : null}
      </div>
      <p className={css.priceNote}>{perMonth ? `Aylık ~${money(perMonth, plan.currency)} · tek seferde ödenir` : "Aylık, tek seferlik ödeme"}</p>

      <ul className={css.limits}>
        <li><Building2 size={14} aria-hidden />{storeLimitLabel(plan.maxStores)}</li>
        <li><UsersRound size={14} aria-hidden />{staffLimitLabel(plan.maxStaff)}</li>
        {smsQuotaLabel(plan.smsMonthlyQuota) ? <li><MessageSquareText size={14} aria-hidden />{smsQuotaLabel(plan.smsMonthlyQuota)}</li> : null}
      </ul>

      <div className={css.features}>
        <small>{base && extras.length ? <>{base.label}&apos;deki her şey, artı:</> : "Neler dahil"}</small>
        <ul>
          {shown.map((key) => <li key={key}><Check size={14} strokeWidth={2.6} aria-hidden />{entitlementLabel(key)}</li>)}
          {highlights.length > shown.length ? <li className={css.more}>+{highlights.length - shown.length} özellik daha</li> : null}
        </ul>
      </div>

      <button type="button" disabled={lifetime || busy} onClick={onChoose}
        className={cx(studio.btn, studio.btnBlock, primary ? studio.btnPrimary : studio.btnSoft, css.planCta)}>
        {pending ? <LoaderCircle size={16} className={studio.spin} aria-hidden /> : relation === "upgrade" ? <ArrowUpRight size={16} aria-hidden /> : <CreditCard size={16} aria-hidden />}
        {label}
      </button>
    </article>
  );
}

export function CompareTable({ plans, currentId }: { plans: PlatformPlan[]; currentId: string | null }) {
  const has = (plan: PlatformPlan, key: string) => (plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS).includes(key as never);
  const rows: Array<{ label: string; cell: (plan: PlatformPlan) => ReactNode }> = [
    { label: "Şube", cell: (plan) => storeLimitLabel(plan.maxStores) },
    { label: "Çalışan", cell: (plan) => staffLimitLabel(plan.maxStaff) },
    { label: "Aylık SMS", cell: (plan) => plan.smsMonthlyQuota === null ? "Sınırsız" : plan.smsMonthlyQuota.toLocaleString("tr-TR") },
    ...SUBSCRIPTION_ENTITLEMENTS.map((item) => ({
      label: item.label,
      cell: (plan: PlatformPlan) => has(plan, item.key)
        ? <span className={css.yes}><Check size={15} strokeWidth={2.6} aria-label="Var" /></span>
        : <span className={css.no}><Minus size={15} aria-label="Yok" /></span>,
    })),
  ];
  return (
    <details className={css.compare}>
      <summary><ListChecks size={16} aria-hidden /> Tüm özellikleri karşılaştır <ChevronDown size={16} className={css.chev} aria-hidden /></summary>
      <div className={css.compareScroll}>
        <table>
          <thead>
            <tr><th scope="col"><span className={studio.srOnly}>Özellik</span></th>{plans.map((plan) => <th key={plan.id} scope="col" data-current={plan.id === currentId || undefined}>{plan.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {plans.map((plan) => <td key={plan.id} data-current={plan.id === currentId || undefined}>{row.cell(plan)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
