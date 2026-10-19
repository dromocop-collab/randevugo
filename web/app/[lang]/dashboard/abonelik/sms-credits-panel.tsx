"use client";

import Link from "@/i18n/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquareText, Plus } from "lucide-react";
import { getSmsUsage, SMS_PACKS, startSmsPackCheckout, type SmsPack, type SmsUsage } from "@/features/subscriptions/subscription-repository";
import { TERMS_VERSION } from "@/lib/legal/seller";
import { ConfirmSheet, Panel, Pill } from "@/app/[lang]/dashboard/_studio";
import css from "./abonelik.module.css";

/** Abonelik › SMS: bu ayki kullanım, ek kredi ve ek SMS paketi satın alma (yalnız web). */
export function SmsCreditsPanel({ businessId, quota, unlimited, needsBilling }: { businessId: string; quota: number | null; unlimited: boolean; needsBilling: () => boolean }) {
  const [usage, setUsage] = useState<SmsUsage | null>(null);
  const [pack, setPack] = useState<SmsPack | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getSmsUsage(businessId).then((row) => { if (alive) setUsage(row); }).catch(() => { if (alive) setUsage({ periodKey: "", used: 0, extraBalance: 0 }); });
    return () => { alive = false; };
  }, [businessId]);

  if (!usage) return null;
  const limited = !unlimited && quota !== null;
  const remaining = limited ? Math.max(0, quota - usage.used) : null;
  const percent = limited && quota > 0 ? Math.min(100, Math.round(usage.used / quota * 100)) : 0;
  const tone = !limited ? "ok" : remaining === 0 && usage.extraBalance === 0 ? "bad" : percent >= 80 ? "warn" : "ok";

  async function buy() {
    if (!pack || busy) return;
    setBusy(true);
    try {
      const checkout = await startSmsPackCheckout({ businessId, packId: pack.id, acceptedTerms: true, termsVersion: TERMS_VERSION });
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      const message = String((error as Error).message ?? "");
      if (message.includes("BILLING_PROFILE_REQUIRED")) { setPack(null); setBusy(false); needsBilling(); return; }
      toast.error(message.includes("PAYMENT_NOT_CONFIGURED") ? "Online ödeme şu anda kapalı. Destek ekibimizden ek SMS talep edebilirsiniz." : message || "Ödeme sayfası açılamadı.");
      setBusy(false);
    }
  }

  return (
    <Panel icon={MessageSquareText} title="Randevu SMS'leri" description="Onay, hatırlatma, iptal ve değişiklik SMS'leri bu kotadan düşer; uygulama bildirimleri sınırsızdır.">
      <div className={css.smsStats}>
        <div>
          <small>Bu ay gönderilen</small>
          <b>{usage.used.toLocaleString("tr-TR")}{limited ? <span> / {quota.toLocaleString("tr-TR")}</span> : null}</b>
        </div>
        <div>
          <small>Ek kredi</small>
          <b>{usage.extraBalance.toLocaleString("tr-TR")}</b>
        </div>
        <Pill tone={tone} dot>{!limited ? "Sınırsız" : tone === "bad" ? "Kota doldu" : tone === "warn" ? "Azalıyor" : `${remaining?.toLocaleString("tr-TR")} SMS kaldı`}</Pill>
      </div>
      {limited ? <div className={css.smsBar} role="progressbar" aria-valuemin={0} aria-valuemax={quota} aria-valuenow={usage.used} aria-label="Aylık SMS kullanımı"><i style={{ width: `${percent}%` }} data-tone={tone} /></div> : null}
      {limited ? <p className={css.smsNote}>Kota her ayın 1&apos;inde yenilenir. Ek krediler ay sonunda silinmez; aylık kota bittiğinde kullanılır.</p> : null}
      {!unlimited ? (
        <div className={css.smsPacks}>
          {SMS_PACKS.map((item) => (
            <button key={item.id} type="button" className={css.smsPack} onClick={() => { if (needsBilling()) return; setAccepted(false); setPack(item); }}>
              <span><Plus size={14} aria-hidden /> {item.count.toLocaleString("tr-TR")} SMS</span>
              <b>{item.price.toLocaleString("tr-TR")} ₺</b>
              <small>SMS başı {(item.price / item.count).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺</small>
            </button>
          ))}
        </div>
      ) : null}

      <ConfirmSheet
        open={pack !== null}
        tone="primary"
        title={pack ? `${pack.count.toLocaleString("tr-TR")} ek SMS` : "Ek SMS"}
        description="PayTR güvenli ödeme sayfasına yönlendirileceksiniz. Ödeme onaylanınca kredi hesabınıza anında eklenir."
        confirmLabel={busy ? "Hazırlanıyor…" : "Ödemeye geç"}
        busy={busy}
        confirmDisabled={!accepted}
        onConfirm={() => void buy()}
        onClose={() => setPack(null)}
      >
        {pack ? <div className={css.confirmSummary}><span>Tek seferlik, KDV dahil</span><b>{pack.price.toLocaleString("tr-TR")} ₺</b></div> : null}
        <label className={css.terms}>
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>
            <Link href="/on-bilgilendirme-formu" target="_blank">Ön Bilgilendirme Formu</Link>&apos;nu,{" "}
            <Link href="/mesafeli-satis-sozlesmesi" target="_blank">Mesafeli Satış Sözleşmesi</Link>&apos;ni ve{" "}
            <Link href="/iptal-ve-iade" target="_blank">İptal ve İade Koşulları</Link>&apos;nı okudum, onaylıyorum. Kredinin ödeme anında
            tanımlanmasını talep ediyorum ve bu nedenle cayma hakkımın bulunmadığını biliyorum.
          </span>
        </label>
      </ConfirmSheet>
    </Panel>
  );
}
