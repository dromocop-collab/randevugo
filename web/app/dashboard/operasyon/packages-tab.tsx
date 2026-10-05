"use client";

import { useRef, useState, type FormEvent } from "react";
import { Layers, Package, PencilLine, ShoppingBag, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteServicePackage, redeemPackage, saveServicePackage, sellPackage } from "@/features/operations/operations-repository";
import type { Customer } from "@/types/customer";
import type { CustomerPackage, PaymentMethod, ServicePackage } from "@/types/operations";
import { ConfirmSheet, Panel, Pill, ToggleRow, cx, studio } from "../_studio";
import { BusyIcon, Empty, Field, SelectField, SelectPayment, date, errorText, money, scrollToEl, type TabProps } from "./shared";
import o from "./ops.module.css";

export function PackagesTab({ packages, sold, customers, businessId, busy, setBusy, onDone }: TabProps & { packages: ServicePackage[]; sold: CustomerPackage[]; customers: Customer[] }) {
  const emptyPackage = { name: "", serviceName: "", sessionCount: 5, price: 0, validityDays: 365, isActive: true };
  const [form, setForm] = useState<typeof emptyPackage & { id?: string }>(emptyPackage); const [sale, setSale] = useState({ packageId: "", customerId: "", customerName: "", customerPhone: "", paymentMethod: "card" as PaymentMethod });
  const [deleting, setDeleting] = useState<ServicePackage | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  async function create(e: FormEvent) { e.preventDefault(); setBusy("package"); try { await saveServicePackage(businessId, form); toast.success(form.id ? "Paket güncellendi." : "Paket oluşturuldu."); setForm(emptyPackage); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  async function sell(e: FormEvent) { e.preventDefault(); if (!sale.packageId) return toast.error("Satılacak paketi seçin."); if (!sale.customerId) return toast.error("Paketin tanımlanacağı müşteriyi seçin."); setBusy("sale"); try { await sellPackage({ businessId, ...sale }); toast.success("Paket müşterinin hesabına tanımlandı."); setSale({ packageId: "", customerId: "", customerName: "", customerPhone: "", paymentMethod: "card" }); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  function selectCustomer(customerId: string) { const customer = customers.find(item => item.id === customerId); setSale(current => ({ ...current, customerId, customerName: customer?.fullName ?? "", customerPhone: customer?.phone ?? "" })); }
  async function use(id: string) { setBusy(id); try { await redeemPackage(businessId, id); toast.success("Bir seans kullanıldı."); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  function editPackage(item: ServicePackage) { setForm({ id: item.id, name: item.name, serviceName: item.serviceName, sessionCount: item.sessionCount, price: item.price, validityDays: item.validityDays, isActive: item.isActive }); scrollToEl(formRef.current); }
  async function removePackage(item: ServicePackage) { setBusy(`delete-${item.id}`); try { await deleteServicePackage(businessId, item.id); if (form.id === item.id) setForm(emptyPackage); if (sale.packageId === item.id) setSale(current => ({ ...current, packageId: "" })); toast.success("Paket listeden kaldırıldı."); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  async function confirmRemove() { if (!deleting) return; await removePackage(deleting); setDeleting(null); }
  const deletingUsedCount = deleting ? sold.filter(row => row.packageId === deleting.id).length : 0;

  return <div className={o.stack}>
    <div className={o.splitHalf}>
      <form ref={formRef} onSubmit={create} className={o.formWrap}>
        <Panel title={form.id ? form.name : "Hizmet paketi oluştur"} description="Müşteriye satacağınız seans paketinin bilgilerini girin." icon={Package}
          actions={form.id ? <button type="button" className={cx(studio.btn, studio.btnGhost, studio.btnSm)} onClick={() => setForm(emptyPackage)}>Vazgeç</button> : undefined}>
          <div className={cx(studio.fields, studio.fields2)}>
            <Field label="Paket adı" value={form.name} required onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Field label="Verilecek hizmet" value={form.serviceName} required onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))} />
            <Field label="Kaç seans?" type="number" inputMode="numeric" min="1" value={form.sessionCount} onChange={e => setForm(f => ({ ...f, sessionCount: Number(e.target.value) }))} />
            <Field label="Toplam fiyat" type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
            <Field label="Kaç gün geçerli?" type="number" inputMode="numeric" min="1" value={form.validityDays} onChange={e => setForm(f => ({ ...f, validityDays: Number(e.target.value) }))} />
            <div className={cx(studio.group, o.toggleCell)}>
              <ToggleRow title={form.isActive ? "Satışa açık" : "Satışa kapalı"} note="Kapalı paketler satış listesinde görünmez." checked={form.isActive} onChange={checked => setForm(f => ({ ...f, isActive: checked }))} />
            </div>
          </div>
          <button type="submit" className={cx(studio.btn, studio.btnPrimary, studio.btnBlock, o.formSubmit)} disabled={busy === "package"}><BusyIcon busy={busy === "package"} />{form.id ? "Değişiklikleri kaydet" : "Paketi oluştur"}</button>
        </Panel>
      </form>

      <form onSubmit={sell} className={o.formWrap}>
        <Panel title="Paket satışı" description="Paketi ve müşteriyi seçin; ödeme tek adımda kaydedilsin." icon={ShoppingBag}>
          <div className={studio.fields}>
            <SelectField label="Paket" required value={sale.packageId} onChange={value => setSale(s => ({ ...s, packageId: value }))}
              help={packages.find(p => p.id === sale.packageId) ? undefined : "Satışa açık paketlerden birini seçin"}
              options={[{ value: "", label: "Paket seçin" }, ...packages.filter(p => p.isActive).map(p => ({ value: p.id, label: `${p.name} · ${p.sessionCount} seans · ${money(p.price)}` }))]} />
            <SelectField label="Müşteri" required value={sale.customerId} onChange={selectCustomer}
              options={[{ value: "", label: "Müşteri seçin" }, ...customers.slice().sort((a, b) => a.fullName.localeCompare(b.fullName, "tr")).map(customer => ({ value: customer.id, label: customer.phone ? `${customer.fullName} · ${customer.phone}` : customer.fullName }))]} />
            <div className={o.pair}>
              <Field label="Müşteri adı" required readOnly value={sale.customerName} />
              <Field label="Telefon" type="tel" required readOnly value={sale.customerPhone} />
            </div>
            <SelectPayment value={sale.paymentMethod} onChange={value => setSale(s => ({ ...s, paymentMethod: value }))} />
            <button type="submit" className={cx(studio.btn, studio.btnPrimary, studio.btnBlock, o.wrapBtn)} disabled={busy === "sale"}><BusyIcon busy={busy === "sale"} />Paketi müşteriye ekle ve ödemeyi kaydet</button>
          </div>
        </Panel>
      </form>
    </div>

    <Panel title="Paket listesi" description="Düzenleyebilir, satışa kapatabilir veya silebilirsiniz." icon={Layers} actions={<Pill>{packages.length} paket</Pill>}>
      <div className={o.cards}>
        {packages.length ? packages.map(item => <article key={item.id} className={cx(o.card, form.id === item.id && o.cardEditing)}>
          <div className={o.cardHead}>
            <div className={o.cardTitle}><b>{item.name}</b><small>{item.serviceName}</small></div>
            <Pill tone={item.isActive ? "ok" : "neutral"} dot>{item.isActive ? "Satışta" : "Kapalı"}</Pill>
          </div>
          <div className={o.mini}>
            <span><b>{item.sessionCount}</b><small>seans</small></span>
            <span><b>{money(item.price)}</b><small>fiyat</small></span>
            <span><b>{item.validityDays}</b><small>gün</small></span>
          </div>
          <div className={o.cardActions}>
            <button type="button" onClick={() => editPackage(item)} className={cx(studio.btn, studio.btnSoft)}><PencilLine size={15} aria-hidden /> Düzenle</button>
            <button type="button" disabled={busy === `delete-${item.id}`} onClick={() => setDeleting(item)} className={cx(studio.btn, studio.btnDangerSoft)}><Trash2 size={15} aria-hidden /> Sil</button>
          </div>
        </article>) : <Empty text="Henüz paket oluşturulmadı." />}
      </div>
    </Panel>

    <Panel title="Kalan seanslar" description="Müşterilerdeki paketler" icon={Ticket}>
      <div className={o.cards}>
        {sold.length ? sold.map(item => <article key={item.id} className={o.card}>
          <div className={o.cardHead}>
            <div className={o.cardTitle}><b>{item.customerName}</b><small>{item.packageName} · {item.serviceName}</small></div>
            <Pill tone={item.status === "active" && item.remainingSessions > 0 ? "accent" : "neutral"}>{item.remainingSessions}/{item.totalSessions} seans</Pill>
          </div>
          <div className={o.progress} aria-hidden><i style={{ width: `${item.totalSessions ? Math.min(100, Math.max(0, (item.remainingSessions / item.totalSessions) * 100)) : 0}%` }} /></div>
          <div className={o.cardFoot}>
            <small>Son geçerlilik: {date(item.expiresAt)}</small>
            <button type="button" className={cx(studio.btn, studio.btnSoft, studio.btnSm)} disabled={item.status !== "active" || item.remainingSessions < 1 || busy === item.id} onClick={() => void use(item.id)}><BusyIcon busy={busy === item.id} />1 seans kullan</button>
          </div>
        </article>) : <Empty text="Müşteriye tanımlanmış paket bulunmuyor." />}
      </div>
    </Panel>

    <ConfirmSheet open={!!deleting} busy={!!deleting && busy === `delete-${deleting.id}`}
      title={deleting ? `“${deleting.name}” paketi silinsin mi?` : "Paket silinsin mi?"}
      description={deletingUsedCount ? `Bu paket ${deletingUsedCount} müşteriye daha önce tanımlanmış. Müşterilerdeki paketler korunacak, yalnız yeni satış listesinden kaldırılacak.` : "Paket satış listesinden kaldırılır."}
      confirmLabel="Paketi sil" onConfirm={() => void confirmRemove()} onClose={() => setDeleting(null)} />
  </div>;
}
