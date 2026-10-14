"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, PencilLine, TriangleAlert } from "lucide-react";
import { saveBillingProfile, type BillingProfile } from "@/features/subscriptions/subscription-repository";
import { Panel, Segmented, Sheet, cx, studio } from "@/app/dashboard/_studio";
import css from "./abonelik.module.css";

const EMPTY: BillingProfile = { type: "individual", name: "", taxId: "", taxOffice: "", address: "", district: "", city: "", email: "" };

/** Fatura bilgileri özeti; eksikse uyarı. Ödeme öncesi zorunlu (e-Arşiv için). */
export function BillingProfilePanel({ profile, onEdit }: { profile: BillingProfile | null; onEdit: () => void }) {
  return (
    <Panel icon={FileText} title="Fatura bilgileri" description="Ödemeleriniz için e-Arşiv fatura bu bilgilerle kesilir ve e-postanıza gönderilir."
      actions={<button type="button" className={cx(studio.btn, studio.btnSoft, studio.btnSm)} onClick={onEdit}><PencilLine size={14} aria-hidden />{profile ? "Düzenle" : "Ekle"}</button>}>
      {profile ? (
        <dl className={css.billingList}>
          <div><dt>{profile.type === "company" ? "Unvan" : "Ad soyad"}</dt><dd>{profile.name}</dd></div>
          <div><dt>{profile.type === "company" ? "Vergi no / dairesi" : "T.C. kimlik no"}</dt><dd>{maskId(profile.taxId)}{profile.taxOffice ? ` · ${profile.taxOffice}` : ""}</dd></div>
          <div><dt>Adres</dt><dd>{[profile.address, profile.district, profile.city].filter(Boolean).join(", ")}</dd></div>
          <div><dt>Fatura e-postası</dt><dd>{profile.email}</dd></div>
        </dl>
      ) : (
        <p className={css.billingMissing}><TriangleAlert size={15} aria-hidden /> Ödeme yapabilmek için fatura bilgilerinizi ekleyin.</p>
      )}
    </Panel>
  );
}

function maskId(value: string) {
  return value.length > 5 ? `${value.slice(0, 3)}${"•".repeat(value.length - 5)}${value.slice(-2)}` : value;
}

export function BillingProfileSheet({ open, businessId, initial, defaults, onClose, onSaved }: {
  open: boolean; businessId: string; initial: BillingProfile | null; defaults: Partial<BillingProfile>;
  onClose: () => void; onSaved: (profile: BillingProfile) => void;
}) {
  const [form, setForm] = useState<BillingProfile>(() => initial ?? { ...EMPTY, ...defaults });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof BillingProfile) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const company = form.type === "company";

  async function save() {
    setSaving(true);
    try {
      const saved = await saveBillingProfile(businessId, form);
      toast.success("Fatura bilgileri kaydedildi.");
      onSaved(saved);
    } catch (error) {
      toast.error(String((error as Error).message ?? "").replace(/^.*?:\s*/, "") || "Fatura bilgileri kaydedilemedi.");
    } finally { setSaving(false); }
  }

  return (
    <Sheet open={open} onClose={saving ? () => undefined : onClose} title="Fatura bilgileri"
      description="e-Arşiv fatura bu bilgilerle düzenlenir. Kimlik/vergi numaranız yalnız işletme yöneticileri ve faturalama için görülür."
      footer={<>
        <button type="button" className={studio.btn} onClick={onClose} disabled={saving}>Vazgeç</button>
        <button type="button" className={cx(studio.btn, studio.btnPrimary)} onClick={() => void save()} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
      </>}>
      <div className={css.billingForm}>
        <Segmented label="Fatura türü" value={form.type} onChange={(type) => setForm((current) => ({ ...current, type }))}
          options={[{ value: "individual", label: "Bireysel" }, { value: "company", label: "Kurumsal / şahıs şirketi" }] as const} />
        <label className={studio.field}><span className={studio.label}>{company ? "Ticari unvan" : "Ad soyad"}</span>
          <input className={studio.input} value={form.name} onChange={set("name")} autoComplete={company ? "organization" : "name"} maxLength={160} /></label>
        <div className={css.billingRow}>
          <label className={studio.field}><span className={studio.label}>{company ? "Vergi kimlik no (VKN veya TCKN)" : "T.C. kimlik no"}</span>
            <input className={studio.input} value={form.taxId} onChange={set("taxId")} inputMode="numeric" maxLength={11} /></label>
          {company ? <label className={studio.field}><span className={studio.label}>Vergi dairesi</span>
            <input className={studio.input} value={form.taxOffice} onChange={set("taxOffice")} maxLength={80} /></label> : null}
        </div>
        <label className={studio.field}><span className={studio.label}>Fatura adresi</span>
          <textarea className={studio.textarea} value={form.address} onChange={set("address")} rows={2} autoComplete="street-address" maxLength={300} /></label>
        <div className={css.billingRow}>
          <label className={studio.field}><span className={studio.label}>İlçe</span>
            <input className={studio.input} value={form.district} onChange={set("district")} maxLength={60} /></label>
          <label className={studio.field}><span className={studio.label}>İl</span>
            <input className={studio.input} value={form.city} onChange={set("city")} maxLength={60} /></label>
        </div>
        <label className={studio.field}><span className={studio.label}>Faturanın gönderileceği e-posta</span>
          <input className={studio.input} type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={160} /></label>
      </div>
    </Sheet>
  );
}
