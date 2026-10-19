"use client";

import { LegalConsentText } from "./legal-consent-text";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquareText, Plus } from "lucide-react";
import { getSmsUsage, SMS_PACKS, startSmsPackCheckout, type SmsPack, type SmsUsage } from "@/features/subscriptions/subscription-repository";
import { TERMS_VERSION } from "@/lib/legal/seller";
import { ConfirmSheet, Panel, Pill } from "@/app/[lang]/dashboard/_studio";
import { useIntlLocale, useT } from "@/i18n/client";
import css from "./abonelik.module.css";

/** Abonelik › SMS: bu ayki kullanım, ek kredi ve ek SMS paketi satın alma (yalnız web). */
export function SmsCreditsPanel({ businessId, quota, unlimited, needsBilling }: { businessId: string; quota: number | null; unlimited: boolean; needsBilling: () => boolean }) {
  const t = useT();
  const intl = useIntlLocale();
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
      toast.error(message.includes("PAYMENT_NOT_CONFIGURED") ? t("Online ödeme şu anda kapalı. Destek ekibimizden ek SMS talep edebilirsiniz.") : message ? t(message) : t("Ödeme sayfası açılamadı."));
      setBusy(false);
    }
  }

  return (
    <Panel icon={MessageSquareText} title={t("Randevu SMS'leri")} description={t("Onay, hatırlatma, iptal ve değişiklik SMS'leri bu kotadan düşer; uygulama bildirimleri sınırsızdır.")}>
      <div className={css.smsStats}>
        <div>
          <small>{t("Bu ay gönderilen")}</small>
          <b>{usage.used.toLocaleString(intl)}{limited ? <span> / {quota.toLocaleString(intl)}</span> : null}</b>
        </div>
        <div>
          <small>{t("Ek kredi")}</small>
          <b>{usage.extraBalance.toLocaleString(intl)}</b>
        </div>
        <Pill tone={tone} dot>{!limited ? t("Sınırsız") : tone === "bad" ? t("Kota doldu") : tone === "warn" ? t("Azalıyor") : t("{count} SMS kaldı", { count: remaining?.toLocaleString(intl) })}</Pill>
      </div>
      {limited ? <div className={css.smsBar} role="progressbar" aria-valuemin={0} aria-valuemax={quota} aria-valuenow={usage.used} aria-label={t("Aylık SMS kullanımı")}><i style={{ width: `${percent}%` }} data-tone={tone} /></div> : null}
      {limited ? <p className={css.smsNote}>{t("Kota her ayın 1'inde yenilenir. Ek krediler ay sonunda silinmez; aylık kota bittiğinde kullanılır.")}</p> : null}
      {!unlimited ? (
        <div className={css.smsPacks}>
          {SMS_PACKS.map((item) => (
            <button key={item.id} type="button" className={css.smsPack} onClick={() => { if (needsBilling()) return; setAccepted(false); setPack(item); }}>
              <span><Plus size={14} aria-hidden /> {item.count.toLocaleString(intl)} SMS</span>
              <b>{item.price.toLocaleString(intl)} ₺</b>
              <small>{t("SMS başı {price} ₺", { price: (item.price / item.count).toLocaleString(intl, { maximumFractionDigits: 2 }) })}</small>
            </button>
          ))}
        </div>
      ) : null}

      <ConfirmSheet
        open={pack !== null}
        tone="primary"
        title={pack ? t("{count} ek SMS", { count: pack.count.toLocaleString(intl) }) : t("Ek SMS")}
        description={t("PayTR güvenli ödeme sayfasına yönlendirileceksiniz. Ödeme onaylanınca kredi hesabınıza anında eklenir.")}
        confirmLabel={busy ? t("Hazırlanıyor…") : t("Ödemeye geç")}
        busy={busy}
        confirmDisabled={!accepted}
        onConfirm={() => void buy()}
        onClose={() => setPack(null)}
      >
        {pack ? <div className={css.confirmSummary}><span>{t("Tek seferlik, KDV dahil")}</span><b>{pack.price.toLocaleString(intl)} ₺</b></div> : null}
        <label className={css.terms}>
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>
            <LegalConsentText kind="sms" />
          </span>
        </label>
      </ConfirmSheet>
    </Panel>
  );
}
