"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, PencilLine, TriangleAlert } from "lucide-react";
import { saveBillingProfile, type BillingProfile } from "@/features/subscriptions/subscription-repository";
import { Panel, Segmented, Sheet, cx, studio } from "@/app/[lang]/dashboard/_studio";
import { useT } from "@/i18n/client";
import css from "./abonelik.module.css";

const EMPTY: BillingProfile = { type: "individual", name: "", taxId: "", taxOffice: "", address: "", district: "", city: "", email: "" };

/** Fatura bilgileri özeti; eksikse uyarı. Ödeme öncesi zorunlu (e-Arşiv için). */
export function BillingProfilePanel({ profile, onEdit }: { profile: BillingProfile | null; onEdit: () => void }) {
  const t = useT();
  return (
    <Panel icon={FileText} title={t("Fatura bilgileri")} description={t("Ödemeleriniz için e-Arşiv fatura bu bilgilerle kesilir ve e-postanıza gönderilir.")}
      actions={<button type="button" className={cx(studio.btn, studio.btnSoft, studio.btnSm)} onClick={onEdit}><PencilLine size={14} aria-hidden />{profile ? t("Düzenle") : t("Ekle")}</button>}>
      {profile ? (
        <dl className={css.billingList}>
          <div><dt>{profile.type === "company" ? t("Unvan") : t("Ad soyad")}</dt><dd>{profile.name}</dd></div>
          <div><dt>{profile.type === "company" ? t("Vergi no / dairesi") : t("T.C. kimlik no")}</dt><dd>{maskId(profile.taxId)}{profile.taxOffice ? ` · ${profile.taxOffice}` : ""}</dd></div>
          <div><dt>{t("Adres")}</dt><dd>{[profile.address, profile.district, profile.city].filter(Boolean).join(", ")}</dd></div>
          <div><dt>{t("Fatura e-postası")}</dt><dd>{profile.email}</dd></div>
        </dl>
      ) : (
        <p className={css.billingMissing}><TriangleAlert size={15} aria-hidden /> {t("Ödeme yapabilmek için fatura bilgilerinizi ekleyin.")}</p>
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
  const t = useT();
  const [form, setForm] = useState<BillingProfile>(() => initial ?? { ...EMPTY, ...defaults });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof BillingProfile) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const company = form.type === "company";

  async function save() {
    setSaving(true);
    try {
      const saved = await saveBillingProfile(businessId, form);
      toast.success(t("Fatura bilgileri kaydedildi."));
      onSaved(saved);
    } catch (error) {
      const message = String((error as Error).message ?? "").replace(/^.*?:\s*/, "");
      toast.error(message ? t(message) : t("Fatura bilgileri kaydedilemedi."));
    } finally { setSaving(false); }
  }

  return (
    <Sheet open={open} onClose={saving ? () => undefined : onClose} title={t("Fatura bilgileri")}
      description={t("e-Arşiv fatura bu bilgilerle düzenlenir. Kimlik/vergi numaranız yalnız işletme yöneticileri ve faturalama için görülür.")}
      footer={<>
        <button type="button" className={studio.btn} onClick={onClose} disabled={saving}>{t("Vazgeç")}</button>
        <button type="button" className={cx(studio.btn, studio.btnPrimary)} onClick={() => void save()} disabled={saving}>{saving ? t("Kaydediliyor…") : t("Kaydet")}</button>
      </>}>
      <div className={css.billingForm}>
        <Segmented label={t("Fatura türü")} value={form.type} onChange={(type) => setForm((current) => ({ ...current, type }))}
          options={[{ value: "individual", label: t("Bireysel") }, { value: "company", label: t("Kurumsal / şahıs şirketi") }] as const} />
        <label className={studio.field}><span className={studio.label}>{company ? t("Ticari unvan") : t("Ad soyad")}</span>
          <input className={studio.input} value={form.name} onChange={set("name")} autoComplete={company ? "organization" : "name"} maxLength={160} /></label>
        <div className={css.billingRow}>
          <label className={studio.field}><span className={studio.label}>{company ? t("Vergi kimlik no (VKN veya TCKN)") : t("T.C. kimlik no")}</span>
            <input className={studio.input} value={form.taxId} onChange={set("taxId")} inputMode="numeric" maxLength={11} /></label>
          {company ? <label className={studio.field}><span className={studio.label}>{t("Vergi dairesi")}</span>
            <input className={studio.input} value={form.taxOffice} onChange={set("taxOffice")} maxLength={80} /></label> : null}
        </div>
        <label className={studio.field}><span className={studio.label}>{t("Fatura adresi")}</span>
          <textarea className={studio.textarea} value={form.address} onChange={set("address")} rows={2} autoComplete="street-address" maxLength={300} /></label>
        <div className={css.billingRow}>
          <label className={studio.field}><span className={studio.label}>{t("İlçe")}</span>
            <input className={studio.input} value={form.district} onChange={set("district")} maxLength={60} /></label>
          <label className={studio.field}><span className={studio.label}>{t("İl")}</span>
            <input className={studio.input} value={form.city} onChange={set("city")} maxLength={60} /></label>
        </div>
        <label className={studio.field}><span className={studio.label}>{t("Faturanın gönderileceği e-posta")}</span>
          <input className={studio.input} type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={160} /></label>
      </div>
    </Sheet>
  );
}
