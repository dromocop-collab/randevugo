"use client";

import Link from "@/i18n/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, XCircle } from "lucide-react";
import { watchSubscriptionPayment, type SubscriptionPayment } from "@/features/subscriptions/subscription-repository";
import { EmptyState, Notice, Panel, StudioPage, StudioSkeleton, cx, studio } from "@/app/[lang]/dashboard/_studio";

// PayTR ödeme sonrası buraya döner (merchant_ok_url / merchant_fail_url).
// Dönüş adresi ödemenin sonucu DEĞİLDİR; sonuç yalnız PayTR bildirimiyle yazılan kayıttan okunur.
export default function SubscriptionPaymentResultPage() {
  return (
    <Suspense fallback={<StudioPage label="Ödeme sonucu"><StudioSkeleton stats={0} rows={1} label="Ödeme sonucu yükleniyor" /></StudioPage>}>
      <PaymentResult />
    </Suspense>
  );
}

const SLOW_AFTER_MS = 45_000;

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : null;
}

function PaymentResult() {
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

  const back = <Link href="/dashboard/abonelik" className={cx(studio.btn, studio.btnPrimary)}><CreditCard size={16} aria-hidden /> Abonelik sayfasına dön</Link>;

  if (!validOid || payment === null) {
    return <StudioPage label="Ödeme sonucu"><Panel><EmptyState mood="thinking" title="Ödeme kaydı bulunamadı." description="Bağlantı eksik olabilir veya bu ödeme başka bir işletmeye ait." action={back} /></Panel></StudioPage>;
  }
  if (payment === undefined) {
    return <StudioPage label="Ödeme sonucu"><StudioSkeleton stats={0} rows={1} label="Ödeme sonucu yükleniyor" /></StudioPage>;
  }

  const amount = `${(payment.amountKurus / 100).toLocaleString("tr-TR")} ₺`;
  const isSmsPack = payment.kind === "sms_pack";
  const summary = isSmsPack
    ? `${(payment.smsCount ?? 0).toLocaleString("tr-TR")} ek SMS · ${amount}${payment.testMode ? " (test)" : ""}`
    : `${payment.planLabel} · ${payment.billingCycle === "yearly" ? "1 yıl" : "1 ay"} · ${amount}${payment.testMode ? " (test)" : ""}`;

  if (payment.status === "paid" && isSmsPack) {
    return (
      <StudioPage label="Ödeme sonucu">
        <Panel icon={CheckCircle2} title="Ödemeniz alındı, SMS krediniz eklendi." description={summary}>
          <Notice tone="accent" icon={CheckCircle2}>
            {typeof payment.extraBalanceAfter === "number" ? <>Toplam ek krediniz: <b>{payment.extraBalanceAfter.toLocaleString("tr-TR")} SMS</b>. </> : null}
            Ek krediler ay sonunda silinmez; aylık kotanız bittiğinde kullanılır.
          </Notice>
          <div style={{ marginTop: 16 }}>{back}</div>
        </Panel>
      </StudioPage>
    );
  }

  if (payment.status === "paid") {
    const until = formatDate(payment.periodEnd);
    return (
      <StudioPage label="Ödeme sonucu">
        <Panel icon={CheckCircle2} title="Ödemeniz alındı, paketiniz aktif." description={summary}>
          <Notice tone="accent" icon={CheckCircle2}>
            {until ? <>Paketiniz <b>{until}</b> tarihine kadar geçerli. </> : null}
            Otomatik yenileme yoktur; dönem sonundan önce size hatırlatırız.
          </Notice>
          <div style={{ marginTop: 16 }}>{back}</div>
        </Panel>
      </StudioPage>
    );
  }

  if (payment.status === "failed" || payment.status === "token_failed" || payment.status === "amount_mismatch") {
    const reason = payment.status === "amount_mismatch"
      ? "Ödeme tutarı doğrulanamadı. Ekibimiz kontrol edip sizinle iletişime geçecek."
      : payment.failedReasonMsg || "Ödeme tamamlanmadı. Kartınızdan ücret çekilmedi.";
    return (
      <StudioPage label="Ödeme sonucu">
        <Panel icon={XCircle} title="Ödeme tamamlanamadı." description={summary}>
          <Notice tone="bad" icon={XCircle}>{reason}</Notice>
          <div style={{ marginTop: 16 }}>{back}</div>
        </Panel>
      </StudioPage>
    );
  }

  return (
    <StudioPage label="Ödeme sonucu">
      <Panel icon={Clock3} title={returnedWithError ? "Ödeme sonucu bekleniyor" : "Ödemeniz onaylanıyor…"} description={summary}>
        <Notice tone={slow ? "warn" : "neutral"} icon={Clock3}>
          {slow
            ? "Onay beklenenden uzun sürüyor. Kartınızdan çekim yapıldıysa paketiniz birkaç dakika içinde otomatik açılır; bu sayfayı kapatabilirsiniz."
            : "Ödeme kuruluşundan onay bekleniyor. Bu genellikle birkaç saniye sürer, sayfa kendiliğinden güncellenecek."}
        </Notice>
        <div style={{ marginTop: 16 }}>{back}</div>
      </Panel>
    </StudioPage>
  );
}
