"use client";

import { useState, type FormEvent } from "react";
import { BadgePercent, Coins, Gift, ShieldAlert, Sparkles, Star, UsersRound } from "lucide-react";
import type { LoyaltyAccount, RewardProgramSettings } from "@/types/operations";
import { Notice, Panel, Pill, StatTile, Toggle, ToggleRow, cx, studio } from "../_studio";
import { BusyIcon, Empty, Field, useOps } from "./shared";
import o from "./ops.module.css";

export function LoyaltyTab({ rows, settings, canEdit, busy, onSave }: { rows: LoyaltyAccount[]; settings: RewardProgramSettings; canEdit: boolean; busy: string; onSave: (settings: RewardProgramSettings) => Promise<void> }) {
  const { t, locale, money } = useOps();
  const [form, setForm] = useState(settings);
  const total = rows.reduce((sum, row) => sum + row.points, 0);
  const change = (key: keyof RewardProgramSettings, value: number | boolean) => setForm(current => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); await onSave({
      enabled: form.enabled,
      spendPerPoint: Math.max(1, Number(form.spendPerPoint) || 1),
      pointValueTl: Math.max(.01, Number(form.pointValueTl) || .01),
      minimumRedeemPoints: Math.max(0, Math.floor(Number(form.minimumRedeemPoints) || 0)),
      maxRedemptionPercent: Math.min(100, Math.max(1, Math.floor(Number(form.maxRedemptionPercent) || 1))),
      earnOnPackages: form.earnOnPackages,
    });
  }
  // Vurgulu parçalar yer tutucularla tek cümlede çevrilir.
  const example = t("{spend} harcayan müşteri {points} kazanır; bu puanlar kasada {discount} indirim sağlar.").split(/(\{spend\}|\{points\}|\{discount\})/);
  return <div className={o.stack}>
    <div className={studio.stats}>
      <StatTile label={t("Program durumu")} value={settings.enabled ? t("Aktif") : t("Kapalı")} icon={Sparkles} accent={settings.enabled} />
      <StatTile label={t("Aktif puan")} value={total.toLocaleString(locale)} icon={Star} />
      <StatTile label={t("Kazanım kuralı")} value={t("{amount} = 1 puan", { amount: money(settings.spendPerPoint) })} icon={Coins} />
      <StatTile label={t("Puan değeri")} value={t("1 puan = {amount}", { amount: money(settings.pointValueTl) })} icon={BadgePercent} />
    </div>
    <div className={o.splitLoyalty}>
      <form onSubmit={submit} className={o.sticky}>
        <Panel title={t("Kendi puan kuralınızı belirleyin")} description={t("Yeni tahsilatlar kaydedildiği anda bu kurallara göre puan kazanılır ve kasada indirime dönüşür.")} icon={Gift}
          actions={<Toggle checked={form.enabled} disabled={!canEdit} label={t("Puan & Ödül programı")} onChange={checked => change("enabled", checked)} />}>
          <div className={cx(studio.fields, studio.fields2)}>
            <Field label={t("Kaç ₺ harcamaya 1 puan?")} type="number" min="1" step="0.01" disabled={!canEdit} value={form.spendPerPoint} onChange={event => change("spendPerPoint", Number(event.target.value))} />
            <Field label={t("1 puan kaç ₺ değerinde?")} type="number" min="0.01" step="0.01" disabled={!canEdit} value={form.pointValueTl} onChange={event => change("pointValueTl", Number(event.target.value))} />
            <Field label={t("Minimum kullanım puanı")} type="number" inputMode="numeric" min="0" step="1" disabled={!canEdit} value={form.minimumRedeemPoints} onChange={event => change("minimumRedeemPoints", Number(event.target.value))} />
            <Field label={t("Sepetin en fazla yüzde kaçı?")} type="number" inputMode="numeric" min="1" max="100" step="1" disabled={!canEdit} value={form.maxRedemptionPercent} onChange={event => change("maxRedemptionPercent", Number(event.target.value))} />
          </div>
          <div className={cx(studio.group, o.gapTop)}>
            <ToggleRow title={t("Paket satışlarından puan kazandır")} note={t("Kapalıysa yalnız normal hizmet ödemeleri puan kazandırır.")} checked={form.earnOnPackages} disabled={!canEdit} onChange={checked => change("earnOnPackages", checked)} />
          </div>
          <div className={o.example}>
            <b>{t("Canlı örnek")}</b>
            <p>{example.map((part, index) => part === "{points}" ? <strong key={index}>{t("{count} puan", { count: 10 })}</strong> : part === "{discount}" ? <strong key={index}>{money(form.pointValueTl * 10)}</strong> : part === "{spend}" ? <span key={index}>{money(form.spendPerPoint * 10)}</span> : part)}</p>
          </div>
          {canEdit ? <button type="submit" className={cx(studio.btn, studio.btnPrimary, studio.btnBlock, o.formSubmit)} disabled={busy === "reward-program"}><BusyIcon busy={busy === "reward-program"} />{t("Ayarları kaydet")}</button>
            : <div className={o.gapTop}><Notice tone="warn" icon={ShieldAlert}>{t("Bu ayarları yalnız işletme yöneticileri değiştirebilir.")}</Notice></div>}
        </Panel>
      </form>
      <Panel title={t("Puan hesapları")} description={t("Müşteri ödülleri")} icon={UsersRound} actions={rows.length ? <Pill>{t("{count} müşteri", { count: rows.length })}</Pill> : undefined}>
        <div className={o.cards}>
          {rows.length ? rows.map(item => <article key={item.id} className={o.card}>
            <div className={o.cardHead}>
              <div className={o.cardTitle}><b>{item.customerName}</b><small>{item.customerPhone}</small></div>
              <span className={o.points}>{item.points}<small>{t("puan")}</small></span>
            </div>
            <div className={o.cardMeta}><span>{t("Toplam harcama {amount}", { amount: money(item.totalSpent) })}</span><span>{t("Toplam kazanım {count} puan", { count: item.lifetimePoints })}</span></div>
          </article>) : <Empty text={t("İlk uygun tahsilatla puan hesabı otomatik oluşacak.")} />}
        </div>
      </Panel>
    </div>
  </div>;
}
