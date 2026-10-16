"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ClipboardCopy, ExternalLink, RotateCcw } from "lucide-react";
import type { AdminPaymentRow } from "@/features/subscriptions/admin-payments-repository";
import { Btn } from "../_pages-ui";
import s from "./odemeler.module.css";

const GIB_PORTAL_URL = "https://earsivportal.efatura.gov.tr/";

type Step = { label: string; value: string; hint?: string };

/** Bireysel alıcıda portal ad ve soyadı ayrı ister: son kelime soyad, öncesi ad. */
function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { first: full.trim(), last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

const amount = (kurus: number) => (kurus / 100).toFixed(2).replace(".", ",");

export function gibSteps(row: AdminPaymentRow, item: string): Step[] {
  const billing = row.billing;
  if (!billing) return [];
  const company = billing.type === "company";
  const name = splitName(billing.name);
  return [
    { label: billing.taxId.length === 10 ? "VKN" : "TCKN", value: billing.taxId },
    ...(company
      ? [{ label: "Unvan", value: billing.name, hint: billing.taxId.length === 11 ? "Şahıs şirketi: portal ad/soyad da isterse işletme sahibinin adını yazın" : undefined }]
      : [{ label: "Adı", value: name.first }, { label: "Soyadı", value: name.last }]),
    ...(billing.taxOffice ? [{ label: "Vergi dairesi", value: billing.taxOffice }] : []),
    { label: "Adres", value: billing.address },
    ...(billing.district ? [{ label: "İlçe", value: billing.district }] : []),
    { label: "İl", value: billing.city },
    { label: "E-posta", value: billing.email, hint: "Fatura alıcıya bu adresten iletilir" },
    { label: "Mal / hizmet", value: item },
    { label: "Birim fiyat (KDV hariç)", value: amount(row.vat.netKurus), hint: `Miktar 1 · Birim Adet · KDV %${row.vat.rate} seçin` },
  ].filter((step) => step.value.trim()) as Step[];
}

/**
 * GİB e-Arşiv Portalı yardımcısı: faturaya yazılacak alanları portaldaki sırayla verir.
 * "Sıradakini kopyala" her basışta bir alanı panoya alır ve sonrakine geçer; portala yapıştırmak yeterli.
 * Portalda oturum açmak ve faturayı onaylamak kullanıcıya aittir (şifre burada tutulmaz).
 */
export function GibAssistant({ row, item }: { row: AdminPaymentRow; item: string }) {
  const steps = gibSteps(row, item);
  const [index, setIndex] = useState(0);
  const done = index >= steps.length;
  if (!steps.length) return null;

  async function copy(at: number) {
    try {
      await navigator.clipboard.writeText(steps[at].value);
      setIndex(at + 1);
      toast.success(`${steps[at].label} kopyalandı`, { description: at + 1 < steps.length ? `Sıradaki: ${steps[at + 1].label}` : "Tüm alanlar hazır. Faturayı onaylayıp numarasını aşağıya girin." });
    } catch {
      toast.error("Panoya kopyalanamadı. Tarayıcı izin vermiyor olabilir.");
    }
  }

  return (
    <section className={s.gib} aria-label="GİB e-Arşiv portalı asistanı">
      <header className={s.gibHead}>
        <div>
          <b>GİB e-Arşiv asistanı</b>
          <small>Portalda “Fatura Oluştur”u açın; her alan için kopyalayıp yapıştırın.</small>
        </div>
        <a className={s.gibLink} href={GIB_PORTAL_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden /> Portalı aç</a>
      </header>

      <div className={s.gibActions}>
        <Btn variant="primary" icon={done ? Check : ClipboardCopy} disabled={done} onClick={() => void copy(index)}>
          {done ? "Hepsi kopyalandı" : `Sıradakini kopyala: ${steps[index].label} (${index + 1}/${steps.length})`}
        </Btn>
        {index > 0 ? <Btn size="sm" icon={RotateCcw} onClick={() => setIndex(0)}>Baştan</Btn> : null}
      </div>

      <ol className={s.gibSteps}>
        {steps.map((step, at) => (
          <li key={step.label} data-state={at < index ? "done" : at === index ? "current" : undefined}>
            <button type="button" onClick={() => void copy(at)} aria-label={`${step.label} kopyala: ${step.value}`}>
              <span className={s.gibNo}>{at < index ? <Check size={12} aria-hidden /> : at + 1}</span>
              <span className={s.gibText}><small>{step.label}</small><b>{step.value}</b>{step.hint ? <em>{step.hint}</em> : null}</span>
              <ClipboardCopy size={14} aria-hidden className={s.gibCopy} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
