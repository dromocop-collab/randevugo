"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, Building2, Check, ChevronDown, CreditCard, Crown, ListChecks, LoaderCircle, MessageSquareText, Minus, Sparkles, UsersRound } from "lucide-react";
import type { PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, SUBSCRIPTION_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import type { Subscription } from "@/types/subscription";
import { Pill, cx, studio } from "@/app/[lang]/dashboard/_studio";
import { useIntlLocale, useT } from "@/i18n/client";
import type { TFunction } from "@/i18n/config";
import css from "./abonelik.module.css";

export type Cycle = "monthly" | "yearly";

export function money(value: number, currency: string, locale = "tr-TR") {
  return `${value.toLocaleString(locale)} ${currency === "TRY" ? "₺" : currency}`;
}

// platform-plan-domain'deki etiketlerin (staffLimitLabel, storeLimitLabel, smsQuotaLabel) çevrilebilir eşleri; kurallar aynı.
function staffLimitLabel(maxStaff: number, t: TFunction) {
  return maxStaff >= 100 ? t("Sınırsız çalışan") : t("{count} çalışan", { count: maxStaff });
}

function storeLimitLabel(maxStores: number, t: TFunction) {
  return maxStores <= 1 ? t("1 şube") : t("{count} şubeye kadar", { count: maxStores });
}

function smsQuotaLabel(quota: number | null, t: TFunction, locale: string) {
  return quota === null ? null : t("Ayda {count} SMS", { count: quota.toLocaleString(locale) });
}

export function yearlySaving(plan: PlatformPlan) {
  const full = plan.monthlyPrice * 12;
  if (!full || plan.yearlyPrice <= 0 || plan.yearlyPrice >= full) return 0;
  return Math.round((full - plan.yearlyPrice) / full * 100);
}

export function formatDate(value?: string, locale = "tr-TR") {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : null;
}

export type PlanRelation = "current" | "upgrade" | "downgrade" | "new";

const DAY_MS = 86_400_000;

export function CurrentSubscription({ subscription, plan, active, lifetime, trialing, busy, onRenew }: {
  subscription: Subscription | null; plan: PlatformPlan | null; active: boolean; lifetime: boolean; trialing: boolean; busy: boolean; onRenew: (() => void) | null;
}) {
  const t = useT();
  const intl = useIntlLocale();
  const endRaw = trialing ? subscription?.trialEndsAt : subscription?.subscriptionEndsAt;
  const startRaw = trialing ? subscription?.trialStartedAt : subscription?.subscriptionStartedAt;
  const end = endRaw ? new Date(endRaw).getTime() : NaN;
  const start = startRaw ? new Date(startRaw).getTime() : NaN;
  const [now] = useState(() => Date.now());
  const daysLeft = Number.isFinite(end) ? Math.max(0, Math.ceil((end - now) / DAY_MS)) : null;
  const total = Number.isFinite(end) && Number.isFinite(start) && end > start ? end - start : null;
  const progress = total ? Math.min(100, Math.max(0, Math.round((now - start) / total * 100))) : null;
  const status = lifetime ? { label: t("Süresiz"), tone: "ok" as const } : trialing ? { label: t("Deneme"), tone: "accent" as const } : active ? { label: t("Aktif"), tone: "ok" as const } : { label: t("Süresi doldu"), tone: "bad" as const };
  const urgent = !lifetime && daysLeft !== null && daysLeft <= 7;

  return (
    <section className={cx(css.current, !active && !lifetime && css.currentExpired)} aria-label={t("Mevcut abonelik")}>
      <div className={css.currentMain}>
        <span className={css.currentIcon} aria-hidden><Crown size={20} /></span>
        <div className={css.currentText}>
          <small>{t("Mevcut paketiniz")}</small>
          <h1>{plan?.label ?? subscription?.plan ?? t("Paket seçilmedi")} <Pill tone={status.tone} dot>{status.label}</Pill></h1>
          <p>
            {lifetime ? t("Süresiz erişim tanımlı; ödeme gerekmiyor.")
              : !Number.isFinite(end) ? t("Paket seçerek başlayın.")
              : active ? <>{trialing ? t("Deneme {date} tarihinde bitiyor", { date: formatDate(endRaw, intl) }) : t("Paket {date} tarihinde bitiyor", { date: formatDate(endRaw, intl) })}{daysLeft !== null ? <> · <b className={urgent ? css.urgent : undefined}>{t("{count} gün kaldı", { count: daysLeft })}</b></> : null}</>
              : <>{t("Paket {date} tarihinde sona erdi. Yeni randevu almak için yenileyin.", { date: formatDate(endRaw, intl) })}</>}
          </p>
          {plan ? (
            <span className={css.currentLimits}>
              <span><Building2 size={13} aria-hidden />{storeLimitLabel(plan.maxStores, t)}</span>
              <span><UsersRound size={13} aria-hidden />{staffLimitLabel(plan.maxStaff, t)}</span>
              {smsQuotaLabel(plan.smsMonthlyQuota, t, intl) ? <span><MessageSquareText size={13} aria-hidden />{smsQuotaLabel(plan.smsMonthlyQuota, t, intl)}</span> : null}
            </span>
          ) : null}
        </div>
        {!lifetime ? (
          onRenew
            ? <button type="button" className={cx(studio.btn, studio.btnPrimary, css.currentCta)} disabled={busy} onClick={onRenew}><CreditCard size={16} aria-hidden />{active ? t("Süreyi uzat") : t("Paketi yenile")}</button>
            : <a href="#paketler" className={cx(studio.btn, studio.btnPrimary, css.currentCta)}><ArrowDown size={16} aria-hidden />{trialing ? t("Paket seç") : t("Paketleri gör")}</a>
        ) : null}
      </div>
      {progress !== null && !lifetime ? (
        <div className={css.currentBar} role="progressbar" aria-label={trialing ? t("Deneme süresi") : t("Paket dönemi")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
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
  const t = useT();
  const intl = useIntlLocale();
  const entitlements = plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS;
  const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const saving = yearlySaving(plan);
  const perMonth = cycle === "yearly" && plan.yearlyPrice > 0 ? Math.round(plan.yearlyPrice / 12) : 0;
  // Üst paket: alttaki paketin üzerine eklenenler; alt paket: kendi özellikleri.
  const extras = base ? entitlements.filter((key) => !base.entitlements.includes(key)) : [];
  const highlights = base && extras.length ? extras : entitlements;
  const shown = highlights.slice(0, 6);
  const isCurrent = relation === "current";
  const badge = isCurrent ? <Pill tone={expired ? "bad" : "ok"} dot>{trialing ? t("Denemedesiniz") : expired ? t("Süresi doldu") : t("Mevcut paket")}</Pill>
    : recommended ? <Pill tone="accent"><Sparkles size={12} aria-hidden /> {t("Önerilen")}</Pill>
    : relation === "upgrade" ? <Pill tone="accent"><ArrowUpRight size={12} aria-hidden /> {t("Yükseltme")}</Pill> : null;
  const label = lifetime ? t("Süresiz erişim aktif") : busy && pending ? t("Hazırlanıyor…")
    : isCurrent ? (trialing ? t("Bu paketle devam et") : expired ? t("Paketi yenile") : t("Süreyi uzat"))
    : relation === "upgrade" ? t("{plan}'e yükselt", { plan: plan.label }) : relation === "downgrade" ? t("Bu pakete geç") : t("Bu paketi seç");
  const primary = relation === "upgrade" || relation === "new" || (isCurrent && (expired || trialing));

  return (
    <article className={cx(css.plan, isCurrent && css.planCurrent, relation === "upgrade" && css.planUpgrade)} aria-current={isCurrent ? "true" : undefined}>
      <header className={css.planHead}>
        <h3>{plan.label}</h3>
        {badge}
      </header>
      {plan.description ? <p className={css.planDesc}>{plan.description}</p> : null}

      <div className={css.price}>
        <b>{money(price, plan.currency, intl)}</b>
        <span>/ {cycle === "yearly" ? t("yıl") : t("ay")}</span>
        {cycle === "yearly" && saving ? <em>{t("%{percent} tasarruf", { percent: saving })}</em> : null}
      </div>
      <p className={css.priceNote}>{perMonth ? t("Aylık ~{amount} · tek seferde ödenir", { amount: money(perMonth, plan.currency, intl) }) : t("Aylık, tek seferlik ödeme")}</p>

      <ul className={css.limits}>
        <li><Building2 size={14} aria-hidden />{storeLimitLabel(plan.maxStores, t)}</li>
        <li><UsersRound size={14} aria-hidden />{staffLimitLabel(plan.maxStaff, t)}</li>
        {smsQuotaLabel(plan.smsMonthlyQuota, t, intl) ? <li><MessageSquareText size={14} aria-hidden />{smsQuotaLabel(plan.smsMonthlyQuota, t, intl)}</li> : null}
      </ul>

      <div className={css.features}>
        <small>{base && extras.length ? t("{plan}'deki her şey, artı:", { plan: base.label }) : t("Neler dahil")}</small>
        <ul>
          {shown.map((key) => <li key={key}><Check size={14} strokeWidth={2.6} aria-hidden />{t(entitlementLabel(key))}</li>)}
          {highlights.length > shown.length ? <li className={css.more}>{t("+{count} özellik daha", { count: highlights.length - shown.length })}</li> : null}
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
  const t = useT();
  const intl = useIntlLocale();
  const has = (plan: PlatformPlan, key: string) => (plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS).includes(key as never);
  const rows: Array<{ label: string; cell: (plan: PlatformPlan) => ReactNode }> = [
    { label: t("Şube"), cell: (plan) => storeLimitLabel(plan.maxStores, t) },
    { label: t("Çalışan"), cell: (plan) => staffLimitLabel(plan.maxStaff, t) },
    { label: t("Aylık SMS"), cell: (plan) => plan.smsMonthlyQuota === null ? t("Sınırsız") : plan.smsMonthlyQuota.toLocaleString(intl) },
    ...SUBSCRIPTION_ENTITLEMENTS.map((item) => ({
      label: t(item.label),
      cell: (plan: PlatformPlan) => has(plan, item.key)
        ? <span className={css.yes}><Check size={15} strokeWidth={2.6} aria-label={t("Var")} /></span>
        : <span className={css.no}><Minus size={15} aria-label={t("Yok")} /></span>,
    })),
  ];
  return (
    <details className={css.compare}>
      <summary><ListChecks size={16} aria-hidden /> {t("Tüm özellikleri karşılaştır")} <ChevronDown size={16} className={css.chev} aria-hidden /></summary>
      <div className={css.compareScroll}>
        <table>
          <thead>
            <tr><th scope="col"><span className={studio.srOnly}>{t("Özellik")}</span></th>{plans.map((plan) => <th key={plan.id} scope="col" data-current={plan.id === currentId || undefined}>{plan.label}</th>)}</tr>
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
