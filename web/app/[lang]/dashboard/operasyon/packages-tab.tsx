"use client";

import { useRef, useState, type FormEvent } from "react";
import { Layers, Package, PencilLine, ShoppingBag, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteServicePackage, redeemPackage, saveServicePackage, sellPackage } from "@/features/operations/operations-repository";
import type { Customer } from "@/types/customer";
import type { CustomerPackage, PaymentMethod, ServicePackage } from "@/types/operations";
import { ConfirmSheet, Panel, Pill, ToggleRow, cx, studio } from "../_studio";
import { BusyIcon, Empty, Field, SelectField, SelectPayment, scrollToEl, useOps, type TabProps } from "./shared";
import o from "./ops.module.css";

export function PackagesTab({ packages, sold, customers, businessId, busy, setBusy, onDone }: TabProps & { packages: ServicePackage[]; sold: CustomerPackage[]; customers: Customer[] }) {
  const { t, money, date, errorText } = useOps();
  const emptyPackage = { name: "", serviceName: "", sessionCount: 5, price: 0, validityDays: 365, isActive: true };
  const [form, setForm] = useState<typeof emptyPackage & { id?: string }>(emptyPackage); const [sale, setSale] = useState({ packageId: "", customerId: "", customerName: "", customerPhone: "", paymentMethod: "card" as PaymentMethod });
  const [deleting, setDeleting] = useState<ServicePackage | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  async function create(e: FormEvent) { e.preventDefault(); setBusy("package"); try { await saveServicePackage(businessId, form); toast.success(form.id ? t("Paket güncellendi.") : t("Paket oluşturuldu.")); setForm(emptyPackage); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  async function sell(e: FormEvent) { e.preventDefault(); if (!sale.packageId) return toast.error(t("Satılacak paketi seçin.")); if (!sale.customerId) return toast.error(t("Paketin tanımlanacağı müşteriyi seçin.")); setBusy("sale"); try { await sellPackage({ businessId, ...sale }); toast.success(t("Paket müşterinin hesabına tanımlandı.")); setSale({ packageId: "", customerId: "", customerName: "", customerPhone: "", paymentMethod: "card" }); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  function selectCustomer(customerId: string) { const customer = customers.find(item => item.id === customerId); setSale(current => ({ ...current, customerId, customerName: customer?.fullName ?? "", customerPhone: customer?.phone ?? "" })); }
  async function use(id: string) { setBusy(id); try { await redeemPackage(businessId, id); toast.success(t("Bir seans kullanıldı.")); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  function editPackage(item: ServicePackage) { setForm({ id: item.id, name: item.name, serviceName: item.serviceName, sessionCount: item.sessionCount, price: item.price, validityDays: item.validityDays, isActive: item.isActive }); scrollToEl(formRef.current); }
  async function removePackage(item: ServicePackage) { setBusy(`delete-${item.id}`); try { await deleteServicePackage(businessId, item.id); if (form.id === item.id) setForm(emptyPackage); if (sale.packageId === item.id) setSale(current => ({ ...current, packageId: "" })); toast.success(t("Paket listeden kaldırıldı.")); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  async function confirmRemove() { if (!deleting) return; await removePackage(deleting); setDeleting(null); }
  const deletingUsedCount = deleting ? sold.filter(row => row.packageId === deleting.id).length : 0;

  return <div className={o.stack}>
    <div className={o.splitHalf}>
      <form ref={formRef} onSubmit={create} className={o.formWrap}>
        <Panel title={form.id ? form.name : t("Hizmet paketi oluştur")} description={t("Müşteriye satacağınız seans paketinin bilgilerini girin.")} icon={Package}
          actions={form.id ? <button type="button" className={cx(studio.btn, studio.btnGhost, studio.btnSm)} onClick={() => setForm(emptyPackage)}>{t("Vazgeç")}</button> : undefined}>
          <div className={cx(studio.fields, studio.fields2)}>
            <Field label={t("Paket adı")} value={form.name} required onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Field label={t("Verilecek hizmet")} value={form.serviceName} required onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))} />
            <Field label={t("Kaç seans?")} type="number" inputMode="numeric" min="1" value={form.sessionCount} onChange={e => setForm(f => ({ ...f, sessionCount: Number(e.target.value) }))} />
            <Field label={t("Toplam fiyat")} type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
            <Field label={t("Kaç gün geçerli?")} type="number" inputMode="numeric" min="1" value={form.validityDays} onChange={e => setForm(f => ({ ...f, validityDays: Number(e.target.value) }))} />
            <div className={cx(studio.group, o.toggleCell)}>
              <ToggleRow title={form.isActive ? t("Satışa açık") : t("Satışa kapalı")} note={t("Kapalı paketler satış listesinde görünmez.")} checked={form.isActive} onChange={checked => setForm(f => ({ ...f, isActive: checked }))} />
            </div>
          </div>
          <button type="submit" className={cx(studio.btn, studio.btnPrimary, studio.btnBlock, o.formSubmit)} disabled={busy === "package"}><BusyIcon busy={busy === "package"} />{form.id ? t("Değişiklikleri kaydet") : t("Paketi oluştur")}</button>
        </Panel>
      </form>

      <form onSubmit={sell} className={o.formWrap}>
        <Panel title={t("Paket satışı")} description={t("Paketi ve müşteriyi seçin; ödeme tek adımda kaydedilsin.")} icon={ShoppingBag}>
          <div className={studio.fields}>
            <SelectField label={t("Paket")} required value={sale.packageId} onChange={value => setSale(s => ({ ...s, packageId: value }))}
              help={packages.find(p => p.id === sale.packageId) ? undefined : t("Satışa açık paketlerden birini seçin")}
              options={[{ value: "", label: t("Paket seçin") }, ...packages.filter(p => p.isActive).map(p => ({ value: p.id, label: t("{name} · {count} seans · {price}", { name: p.name, count: p.sessionCount, price: money(p.price) }) }))]} />
            <SelectField label={t("Müşteri")} required value={sale.customerId} onChange={selectCustomer}
              options={[{ value: "", label: t("Müşteri seçin") }, ...customers.slice().sort((a, b) => a.fullName.localeCompare(b.fullName, "tr")).map(customer => ({ value: customer.id, label: customer.phone ? `${customer.fullName} · ${customer.phone}` : customer.fullName }))]} />
            <div className={o.pair}>
              <Field label={t("Müşteri adı")} required readOnly value={sale.customerName} />
              <Field label={t("Telefon")} type="tel" required readOnly value={sale.customerPhone} />
            </div>
            <SelectPayment value={sale.paymentMethod} onChange={value => setSale(s => ({ ...s, paymentMethod: value }))} />
            <button type="submit" className={cx(studio.btn, studio.btnPrimary, studio.btnBlock, o.wrapBtn)} disabled={busy === "sale"}><BusyIcon busy={busy === "sale"} />{t("Paketi müşteriye ekle ve ödemeyi kaydet")}</button>
          </div>
        </Panel>
      </form>
    </div>

    <Panel title={t("Paket listesi")} description={t("Düzenleyebilir, satışa kapatabilir veya silebilirsiniz.")} icon={Layers} actions={<Pill>{t("{count} paket", { count: packages.length })}</Pill>}>
      <div className={o.cards}>
        {packages.length ? packages.map(item => <article key={item.id} className={cx(o.card, form.id === item.id && o.cardEditing)}>
          <div className={o.cardHead}>
            <div className={o.cardTitle}><b>{item.name}</b><small>{item.serviceName}</small></div>
            <Pill tone={item.isActive ? "ok" : "neutral"} dot>{item.isActive ? t("Satışta") : t("Kapalı")}</Pill>
          </div>
          <div className={o.mini}>
            <span><b>{item.sessionCount}</b><small>{t("seans")}</small></span>
            <span><b>{money(item.price)}</b><small>{t("fiyat")}</small></span>
            <span><b>{item.validityDays}</b><small>{t("gün")}</small></span>
          </div>
          <div className={o.cardActions}>
            <button type="button" onClick={() => editPackage(item)} className={cx(studio.btn, studio.btnSoft)}><PencilLine size={15} aria-hidden /> {t("Düzenle")}</button>
            <button type="button" disabled={busy === `delete-${item.id}`} onClick={() => setDeleting(item)} className={cx(studio.btn, studio.btnDangerSoft)}><Trash2 size={15} aria-hidden /> {t("Sil")}</button>
          </div>
        </article>) : <Empty text={t("Henüz paket oluşturulmadı.")} />}
      </div>
    </Panel>

    <Panel title={t("Kalan seanslar")} description={t("Müşterilerdeki paketler")} icon={Ticket}>
      <div className={o.cards}>
        {sold.length ? sold.map(item => <article key={item.id} className={o.card}>
          <div className={o.cardHead}>
            <div className={o.cardTitle}><b>{item.customerName}</b><small>{item.packageName} · {item.serviceName}</small></div>
            <Pill tone={item.status === "active" && item.remainingSessions > 0 ? "accent" : "neutral"}>{t("{remaining}/{count} seans", { remaining: item.remainingSessions, count: item.totalSessions })}</Pill>
          </div>
          <div className={o.progress} aria-hidden><i style={{ width: `${item.totalSessions ? Math.min(100, Math.max(0, (item.remainingSessions / item.totalSessions) * 100)) : 0}%` }} /></div>
          <div className={o.cardFoot}>
            <small>{t("Son geçerlilik: {date}", { date: date(item.expiresAt) })}</small>
            <button type="button" className={cx(studio.btn, studio.btnSoft, studio.btnSm)} disabled={item.status !== "active" || item.remainingSessions < 1 || busy === item.id} onClick={() => void use(item.id)}><BusyIcon busy={busy === item.id} />{t("1 seans kullan")}</button>
          </div>
        </article>) : <Empty text={t("Müşteriye tanımlanmış paket bulunmuyor.")} />}
      </div>
    </Panel>

    <ConfirmSheet open={!!deleting} busy={!!deleting && busy === `delete-${deleting.id}`}
      title={deleting ? t("“{name}” paketi silinsin mi?", { name: deleting.name }) : t("Paket silinsin mi?")}
      description={deletingUsedCount ? t("Bu paket {count} müşteriye daha önce tanımlanmış. Müşterilerdeki paketler korunacak, yalnız yeni satış listesinden kaldırılacak.", { count: deletingUsedCount }) : t("Paket satış listesinden kaldırılır.")}
      confirmLabel={t("Paketi sil")} onConfirm={() => void confirmRemove()} onClose={() => setDeleting(null)} />
  </div>;
}
