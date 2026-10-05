"use client";

import { useState, type FormEvent } from "react";
import { BadgePercent, Coins, Gift, ShieldAlert, Sparkles, Star, UsersRound } from "lucide-react";
import type { LoyaltyAccount, RewardProgramSettings } from "@/types/operations";
import { Notice, Panel, Pill, StatTile, Toggle, ToggleRow, cx, studio } from "../_studio";
import { BusyIcon, Empty, Field, money } from "./shared";
import o from "./ops.module.css";

export function LoyaltyTab({ rows, settings, canEdit, busy, onSave }: { rows: LoyaltyAccount[]; settings: RewardProgramSettings; canEdit: boolean; busy: string; onSave: (settings: RewardProgramSettings) => Promise<void> }) {
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
  return <div className={o.stack}>
    <div className={studio.stats}>
      <StatTile label="Program durumu" value={settings.enabled ? "Aktif" : "Kapalı"} icon={Sparkles} accent={settings.enabled} />
      <StatTile label="Aktif puan" value={total.toLocaleString("tr-TR")} icon={Star} />
      <StatTile label="Kazanım kuralı" value={`${money(settings.spendPerPoint)} = 1 puan`} icon={Coins} />
      <StatTile label="Puan değeri" value={`1 puan = ${money(settings.pointValueTl)}`} icon={BadgePercent} />
    </div>
    <div className={o.splitLoyalty}>
      <form onSubmit={submit} className={o.sticky}>
        <Panel title="Kendi puan kuralınızı belirleyin" description="Yeni tahsilatlar kaydedildiği anda bu kurallara göre puan kazanılır ve kasada indirime dönüşür." icon={Gift}
          actions={<Toggle checked={form.enabled} disabled={!canEdit} label="Puan & Ödül programı" onChange={checked => change("enabled", checked)} />}>
          <div className={cx(studio.fields, studio.fields2)}>
            <Field label="Kaç ₺ harcamaya 1 puan?" type="number" min="1" step="0.01" disabled={!canEdit} value={form.spendPerPoint} onChange={event => change("spendPerPoint", Number(event.target.value))} />
            <Field label="1 puan kaç ₺ değerinde?" type="number" min="0.01" step="0.01" disabled={!canEdit} value={form.pointValueTl} onChange={event => change("pointValueTl", Number(event.target.value))} />
            <Field label="Minimum kullanım puanı" type="number" inputMode="numeric" min="0" step="1" disabled={!canEdit} value={form.minimumRedeemPoints} onChange={event => change("minimumRedeemPoints", Number(event.target.value))} />
            <Field label="Sepetin en fazla yüzde kaçı?" type="number" inputMode="numeric" min="1" max="100" step="1" disabled={!canEdit} value={form.maxRedemptionPercent} onChange={event => change("maxRedemptionPercent", Number(event.target.value))} />
          </div>
          <div className={cx(studio.group, o.gapTop)}>
            <ToggleRow title="Paket satışlarından puan kazandır" note="Kapalıysa yalnız normal hizmet ödemeleri puan kazandırır." checked={form.earnOnPackages} disabled={!canEdit} onChange={checked => change("earnOnPackages", checked)} />
          </div>
          <div className={o.example}>
            <b>Canlı örnek</b>
            <p>{money(form.spendPerPoint * 10)} harcayan müşteri <strong>10 puan</strong> kazanır; bu puanlar kasada <strong>{money(form.pointValueTl * 10)}</strong> indirim sağlar.</p>
          </div>
          {canEdit ? <button type="submit" className={cx(studio.btn, studio.btnPrimary, studio.btnBlock, o.formSubmit)} disabled={busy === "reward-program"}><BusyIcon busy={busy === "reward-program"} />Ayarları kaydet</button>
            : <div className={o.gapTop}><Notice tone="warn" icon={ShieldAlert}>Bu ayarları yalnız işletme yöneticileri değiştirebilir.</Notice></div>}
        </Panel>
      </form>
      <Panel title="Puan hesapları" description="Müşteri ödülleri" icon={UsersRound} actions={rows.length ? <Pill>{rows.length} müşteri</Pill> : undefined}>
        <div className={o.cards}>
          {rows.length ? rows.map(item => <article key={item.id} className={o.card}>
            <div className={o.cardHead}>
              <div className={o.cardTitle}><b>{item.customerName}</b><small>{item.customerPhone}</small></div>
              <span className={o.points}>{item.points}<small>puan</small></span>
            </div>
            <div className={o.cardMeta}><span>Toplam harcama {money(item.totalSpent)}</span><span>Toplam kazanım {item.lifetimePoints} puan</span></div>
          </article>) : <Empty text="İlk uygun tahsilatla puan hesabı otomatik oluşacak." />}
        </div>
      </Panel>
    </div>
  </div>;
}
