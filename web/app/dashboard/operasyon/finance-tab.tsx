"use client";

import { useState, type FormEvent } from "react";
import { CircleDollarSign, ReceiptText, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createExpense } from "@/features/operations/operations-repository";
import type { FinanceTransaction, PaymentMethod } from "@/types/operations";
import { Panel, Pill, StatTile, cx, studio } from "../_studio";
import { BusyIcon, Empty, Field, SelectPayment, date, errorText, money, paymentLabels, type TabProps } from "./shared";
import o from "./ops.module.css";

export function FinanceTab({ rows, income, expenses, businessId, busy, setBusy, onDone }: TabProps & { rows: FinanceTransaction[]; income: number; expenses: number }) {
  const [form, setForm] = useState({ amount: 0, category: "Genel gider", description: "", paymentMethod: "cash" as PaymentMethod });
  async function submit(e: FormEvent) { e.preventDefault(); setBusy("expense"); try { await createExpense(businessId, form); toast.success("Gider kaydı oluşturuldu."); setForm({ amount: 0, category: "Genel gider", description: "", paymentMethod: "cash" }); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  return <div className={o.stack}>
    <div className={o.stats3}>
      <StatTile label="Toplam gelir" value={money(income)} icon={TrendingUp} />
      <StatTile label="Toplam gider" value={money(expenses)} icon={TrendingDown} />
      <StatTile label="Net kasa" value={money(income - expenses)} icon={Wallet} accent />
    </div>
    <div className={o.splitForm}>
      <form onSubmit={submit} className={o.sticky}>
        <Panel title="Masraf kaydet" description="Gider girişi" icon={ReceiptText}>
          <div className={studio.fields}>
            <Field label="Tutar" type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            <Field label="Kategori" required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            <Field label="Açıklama" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <SelectPayment value={form.paymentMethod} onChange={value => setForm(f => ({ ...f, paymentMethod: value }))} />
            <button type="submit" className={cx(studio.btn, studio.btnPrimary, studio.btnBlock)} disabled={busy === "expense"}><BusyIcon busy={busy === "expense"} />Gideri kaydet</button>
          </div>
        </Panel>
      </form>
      <Panel title="Son işlemler" description="Kasa hareketleri" icon={Wallet} actions={rows.length ? <Pill>{Math.min(rows.length, 60)} kayıt</Pill> : undefined}>
        <div className={o.txList}>
          {rows.length ? rows.slice(0, 60).map(item => {
            const isIncome = item.type === "income";
            return <article key={item.id} className={o.tx}>
              <span className={cx(o.txIcon, isIncome ? o.txIn : o.txOut)}>{isIncome ? <TrendingUp size={18} aria-hidden /> : <CircleDollarSign size={18} aria-hidden />}</span>
              <div className={o.txText}><b>{item.description}</b><small>{item.category} · {paymentLabels[item.paymentMethod]} · {date(item.occurredAt)}</small></div>
              <strong className={cx(o.txAmount, isIncome ? o.amountIn : o.amountOut)}>{isIncome ? "+" : "-"}{money(item.amount)}</strong>
            </article>;
          }) : <Empty text="Henüz kasa hareketi yok." />}
        </div>
      </Panel>
    </div>
  </div>;
}
