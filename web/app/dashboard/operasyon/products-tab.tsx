"use client";

import { useRef, useState, type FormEvent } from "react";
import { Boxes, PackagePlus, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct, saveProduct } from "@/features/operations/operations-repository";
import type { Product } from "@/types/operations";
import { ConfirmSheet, Panel, Pill, cx, studio } from "../_studio";
import { BusyIcon, Empty, Field, errorText, money, scrollToEl, type TabProps } from "./shared";
import o from "./ops.module.css";

export function ProductsTab({ products, businessId, busy, setBusy, onDone }: TabProps & { products: Product[] }) {
  const empty = { name: "", sku: "", salePrice: 0, costPrice: 0, stock: 0, criticalStock: 3, isActive: true }; const [form, setForm] = useState<typeof empty & { id?: string }>(empty);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  async function submit(e: FormEvent) { e.preventDefault(); if (!form.name.trim()) return toast.error("Ürün adı zorunludur."); setBusy("product"); try { await saveProduct(businessId, form); toast.success(form.id ? "Ürün güncellendi." : "Ürün stoğa eklendi."); setForm(empty); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  async function remove(product: Product) { setBusy(`delete-product-${product.id}`); try { await deleteProduct(businessId, product.id); if (form.id === product.id) setForm(empty); toast.success("Ürün stok listesinden silindi."); await onDone(); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }
  async function confirmRemove() { if (!deleting) return; await remove(deleting); setDeleting(null); }
  function edit(product: Product) {
    setForm({ id: product.id, name: product.name, sku: product.sku ?? "", salePrice: product.salePrice, costPrice: product.costPrice, stock: product.stock, criticalStock: product.criticalStock, isActive: product.isActive });
    scrollToEl(formRef.current);
  }
  const criticalCount = products.filter(p => p.stock <= p.criticalStock).length;

  return <div className={o.splitForm}>
    <form ref={formRef} onSubmit={submit} className={o.sticky}>
      <Panel title={form.id ? "Ürünü düzenle" : "Yeni ürün"} description="Stok kartı" icon={PackagePlus}>
        <div className={studio.fields}>
          <Field label="Ürün adı" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Field label="Stok kodu" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          <div className={o.pair}>
            <Field label="Satış fiyatı" type="number" min="0" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: Number(e.target.value) }))} />
            <Field label="Maliyet" type="number" min="0" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: Number(e.target.value) }))} />
            <Field label="Stok" type="number" inputMode="numeric" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
            <Field label="Kritik sınır" type="number" inputMode="numeric" min="0" value={form.criticalStock} onChange={e => setForm(f => ({ ...f, criticalStock: Number(e.target.value) }))} />
          </div>
          <button type="submit" className={cx(studio.btn, studio.btnPrimary, studio.btnBlock)} disabled={busy === "product"}><BusyIcon busy={busy === "product"} />{form.id ? "Güncelle" : "Ürünü ekle"}</button>
          {form.id && <button type="button" className={cx(studio.btn, studio.btnGhost, studio.btnBlock)} onClick={() => setForm(empty)}>Vazgeç</button>}
        </div>
      </Panel>
    </form>

    <Panel title={`${products.length} ürün`} description="Canlı stok" icon={Boxes} actions={criticalCount ? <Pill tone="warn" dot>{criticalCount} kritik</Pill> : <Pill tone="ok" dot>Stoklar yeterli</Pill>}>
      <div className={o.cards}>
        {products.length ? products.map(product => {
          const low = product.stock <= product.criticalStock;
          return <article key={product.id} className={cx(o.card, form.id === product.id && o.cardEditing)}>
            <div className={o.cardHead}>
              <div className={o.cardTitle}><b>{product.name}</b><small>{product.sku || "Stok kodu yok"}</small></div>
              <Pill tone={low ? "warn" : "ok"}>{product.stock} adet</Pill>
            </div>
            <div className={o.cardPrice}><span>Maliyet {money(product.costPrice)}</span><strong>{money(product.salePrice)}</strong></div>
            <div className={o.cardActions}>
              <button type="button" onClick={() => edit(product)} className={cx(studio.btn, studio.btnSoft)}><PencilLine size={15} aria-hidden /> Düzenle</button>
              <button type="button" disabled={busy === `delete-product-${product.id}`} onClick={() => setDeleting(product)} className={cx(studio.btn, studio.btnDangerSoft)}><Trash2 size={15} aria-hidden /> Sil</button>
            </div>
          </article>;
        }) : <Empty text="Henüz ürün eklenmedi." />}
      </div>
    </Panel>

    <ConfirmSheet open={!!deleting} busy={!!deleting && busy === `delete-product-${deleting.id}`}
      title={deleting ? `“${deleting.name}” ürünü silinsin mi?` : "Ürün silinsin mi?"}
      description="Ürün stok listesinden kaldırılır. Geçmiş satış kayıtları korunur."
      confirmLabel="Ürünü sil" onConfirm={() => void confirmRemove()} onClose={() => setDeleting(null)} />
  </div>;
}
