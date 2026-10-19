"use client";

import Link from "@/i18n/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, XCircle } from "lucide-react";
import { watchSubscriptionPayment, type SubscriptionPayment } from "@/features/subscriptions/subscription-repository";
import { EmptyState, Notice, Panel, StudioPage, StudioSkeleton, cx, studio } from "@/app/[lang]/dashboard/_studio";
import { useIntlLocale, useT } from "@/i18n/client";

// PayTR ödeme sonrası buraya döner (merchant_ok_url / merchant_fail_url).
// Dönüş adresi ödemenin sonucu DEĞİLDİR; sonuç yalnız PayTR bildirimiyle yazılan kayıttan okunur.
export default function SubscriptionPaymentResultPage() {
  const t = useT();
  return (
    <Suspense fallback={<StudioPage label={t("Ödeme sonucu")}><StudioSkeleton stats={0} rows={1} label={t("Ödeme sonucu yükleniyor")} /></StudioPage>}>
      <PaymentResult />
    </Suspense>
  );
}

const SLOW_AFTER_MS = 45_000;

function formatDate(value: string | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : null;
}

function PaymentResult() {
  const t = useT();
  const intl = useIntlLocale();
  const params = useSearchParams();
  const oid = params.get("oid") ?? "";
  const returnedWithError = params.get("sonuc") === "hata";
  const validOid = /^SR[A-Z0-9]{8,62}$/.test(oid);
  const [payment, setPayment] = useState<SubscriptionPayment | null | undefined>(undefined);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    // PayTR bazı durumlarda dönüş adresini kendi çerçevesinde açar; üst pencereye taşı.
    if (window.top && window.top !== window.self) window.top.location.href = window.location.href;
  }, []);

  useEffect(() => {
    if (!validOid) return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    const stop = watchSubscriptionPayment(oid, setPayment, () => setPayment(null));
    return () => { window.clearTimeout(timer); stop(); };
  }, [oid, validOid]);

  const back = <Link href="/dashboard/abonelik" className={cx(studio.btn, studio.btnPrimary)}><CreditCard size={16} aria-hidden /> {t("Abonelik sayfasına dön")}</Link>;

  if (!validOid || payment === null) {
    return <StudioPage label={t("Ödeme sonucu")}><Panel><EmptyState mood="thinking" title={t("Ödeme kaydı bulunamadı.")} description={t("Bağlantı eksik olabilir veya bu ödeme başka bir işletmeye ait.")} action={back} /></Panel></StudioPage>;
  }
  if (payment === undefined) {
    return <StudioPage label={t("Ödeme sonucu")}><StudioSkeleton stats={0} rows={1} label={t("Ödeme sonucu yükleniyor")} /></StudioPage>;
  }

  const amount = `${(payment.amountKurus / 100).toLocaleString(intl)} ₺`;
  const isSmsPack = payment.kind === "sms_pack";
  const summary = isSmsPack
    ? `${t("{count} ek SMS", { count: (payment.smsCount ?? 0).toLocaleString(intl) })} · ${amount}${payment.testMode ? " (test)" : ""}`
    : `${payment.planLabel} · ${payment.billingCycle === "yearly" ? t("1 yıl") : t("1 ay")} · ${amount}${payment.testMode ? " (test)" : ""}`;

  if (payment.status === "paid" && isSmsPack) {
    return (
      <StudioPage label={t("Ödeme sonucu")}>
        <Panel icon={CheckCircle2} title={t("Ödemeniz alındı, SMS krediniz eklendi.")} description={summary}>
          <Notice tone="accent" icon={CheckCircle2}>
            {typeof payment.extraBalanceAfter === "number" ? <>{t("Toplam ek krediniz: {count} SMS.", { count: payment.extraBalanceAfter.toLocaleString(intl) })} </> : null}
            {t("Ek krediler ay sonunda silinmez; aylık kotanız bittiğinde kullanılır.")}
          </Notice>
          <div style={{ marginTop: 16 }}>{back}</div>
        </Panel>
      </StudioPage>
    );
  }

  if (payment.status === "paid") {
    const until = formatDate(payment.periodEnd, intl);
    return (
      <StudioPage label={t("Ödeme sonucu")}>
        <Panel icon={CheckCircle2} title={t("Ödemeniz alındı, paketiniz aktif.")} description={summary}>
          <Notice tone="accent" icon={CheckCircle2}>
            {until ? <>{t("Paketiniz {date} tarihine kadar geçerli.", { date: until })} </> : null}
            {t("Otomatik yenileme yoktur; dönem sonundan önce size hatırlatırız.")}
          </Notice>
          <div style={{ marginTop: 16 }}>{back}</div>
        </Panel>
      </StudioPage>
    );
  }

  if (payment.status === "failed" || payment.status === "token_failed" || payment.status === "amount_mismatch") {
    const reason = payment.status === "amount_mismatch"
      ? t("Ödeme tutarı doğrulanamadı. Ekibimiz kontrol edip sizinle iletişime geçecek.")
      : payment.failedReasonMsg ? t(payment.failedReasonMsg) : t("Ödeme tamamlanmadı. Kartınızdan ücret çekilmedi.");
    return (
      <StudioPage label={t("Ödeme sonucu")}>
        <Panel icon={XCircle} title={t("Ödeme tamamlanamadı.")} description={summary}>
          <Notice tone="bad" icon={XCircle}>{reason}</Notice>
          <div style={{ marginTop: 16 }}>{back}</div>
        </Panel>
      </StudioPage>
    );
  }

  return (
    <StudioPage label={t("Ödeme sonucu")}>
      <Panel icon={Clock3} title={returnedWithError ? t("Ödeme sonucu bekleniyor") : t("Ödemeniz onaylanıyor…")} description={summary}>
        <Notice tone={slow ? "warn" : "neutral"} icon={Clock3}>
          {slow
            ? t("Onay beklenenden uzun sürüyor. Kartınızdan çekim yapıldıysa paketiniz birkaç dakika içinde otomatik açılır; bu sayfayı kapatabilirsiniz.")
            : t("Ödeme kuruluşundan onay bekleniyor. Bu genellikle birkaç saniye sürer, sayfa kendiliğinden güncellenecek.")}
        </Notice>
        <div style={{ marginTop: 16 }}>{back}</div>
      </Panel>
    </StudioPage>
  );
}
