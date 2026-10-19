"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Check, Headphones, LoaderCircle, MessageCircleMore, Send, ShieldCheck, Store, X } from "lucide-react";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useT } from "@/i18n/client";
import type { TFunction } from "@/i18n/config";

type SupportAudience = "customer" | "business" | "storefront";

function getSupportErrorMessage(reason: unknown, t: TFunction) {
  const error = reason as { code?: string; message?: string };
  const code = String(error?.code ?? "").toLowerCase();
  const message = String(error?.message ?? "").replace(/^Firebase:\s*/i, "").trim();

  if (code === "functions/resource-exhausted") {
    return t("Çok hızlı mesaj gönderildi. Lütfen bir dakika sonra tekrar deneyin.");
  }
  if (code === "functions/invalid-argument" || code === "functions/not-found") {
    return message ? t(message) : t("Mesaj bilgileri doğrulanamadı. Lütfen alanları kontrol edin.");
  }
  if (
    code === "functions/internal" ||
    code === "functions/unavailable" ||
    code === "functions/deadline-exceeded" ||
    /internal|failed to fetch|network|cors/i.test(message)
  ) {
    return t("Mesaj servisine şu anda ulaşılamıyor. Lütfen kısa süre sonra yeniden deneyin.");
  }
  return message ? t(message) : t("Mesaj gönderilemedi. Lütfen tekrar deneyin.");
}

export function SupportRequestModal({ audience, businessId, businessName, triggerLabel, triggerClassName = "support-modal-trigger", iconOnly = false }: {
  audience: SupportAudience; businessId?: string; businessName?: string; triggerLabel?: string; triggerClassName?: string;
  /** Yalnız ikon (ör. mağazanın alt çubuğu); metin ekran okuyucu için aria-label olur. */
  iconOnly?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const storefront = audience === "storefront";

  // Mobil klavye: iOS Safari'de klavye açılınca sabit konumlu katman klavyenin altında kalır. Katman görünür alana
  // (visualViewport) oturtulur; pencere klavyenin üstünde kalır ve odaklanan alan görünür alana kaydırılır.
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const layer = layerRef.current;
    if (!viewport || !layer) return;
    const sync = () => {
      layer.style.setProperty("--support-vh", `${viewport.height}px`);
      layer.style.setProperty("--support-vt", `${viewport.offsetTop}px`);
    };
    const reveal = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea")) window.setTimeout(() => target.scrollIntoView({ block: "center", behavior: "smooth" }), 280);
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    layer.addEventListener("focusin", reveal);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      layer.removeEventListener("focusin", reveal);
    };
  }, [open]);

  // Masaüstünde ilk alana odaklan; dokunmatikte klavye kendiliğinden açılıp formu kapatmasın.
  const autoFocusName = typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !loading) setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [open, loading]);

  function close() {
    if (loading) return;
    setOpen(false);
    window.setTimeout(() => { setSuccess(false); setError(""); }, 250);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError(t("Lütfen adınızı yazın."));
    if (!/^\+?[0-9()\s-]{10,22}$/.test(phone.trim())) return setError(t("Geçerli bir telefon numarası yazın."));
    if (message.trim().length < 10) return setError(t("Mesajınız en az 10 karakter olmalıdır."));

    setLoading(true);
    try {
      const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "submitPublicSupportRequest");
      await callable({ name: name.trim(), phone: phone.trim(), message: message.trim(), website, audience, businessId: businessId ?? null });
      setSuccess(true);
      setName(""); setPhone(""); setMessage(""); setWebsite("");
    } catch (reason) {
      setError(getSupportErrorMessage(reason, t));
    } finally { setLoading(false); }
  }

  const label = triggerLabel ?? (storefront ? t("İşletmeye mesaj gönder") : t("Destek mesajı gönder"));

  return <>
    {iconOnly
      ? <button type="button" className={triggerClassName} onClick={() => setOpen(true)} aria-label={label} title={label}><MessageCircleMore size={20} aria-hidden/></button>
      : <button type="button" className={triggerClassName} onClick={() => setOpen(true)}><MessageCircleMore size={16}/>{label}<Send size={14}/></button>}
    {open && typeof document !== "undefined" && createPortal(<div ref={layerRef} className="support-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="support-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="support-modal-close" onClick={close} aria-label={t("Pencereyi kapat")}><X size={18}/></button>
        {!success ? <>
          <div className="support-modal-heading"><span>{storefront ? <Store size={22}/> : <Headphones size={22}/>}</span><div><small>{storefront ? t("DOĞRUDAN İŞLETMEYE") : audience === "business" ? t("İŞLETME DESTEĞİ") : t("MÜŞTERİ DESTEĞİ")}</small><h2 id={titleId}>{storefront ? t("{name} ile iletişime geçin.", { name: businessName ?? t("İşletme") }) : t("Size nasıl yardımcı olabiliriz?")}</h2><p>{storefront ? t("Mesajınız ilgili mağazanın yönetim paneline güvenle iletilir.") : t("Bilgilerinizi bırakın; destek ekibimiz talebinizi super-admin ekranından takip etsin.")}</p></div></div>
          <form onSubmit={submit} className="support-modal-form">
            <label><span>{t("İsim soyisim")}</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} placeholder={t("Adınız ve soyadınız")} autoFocus={autoFocusName}/></label>
            <label><span>{t("Telefon")}</span><input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" maxLength={22} placeholder="05xx xxx xx xx"/></label>
            <label className="support-modal-message"><span>{t("Mesajınız")}</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={5} placeholder={storefront ? t("Hizmet, müsaitlik veya randevu hakkında sorunuzu yazın…") : t("Size yardımcı olabilmemiz için konuyu kısaca anlatın…")}/><small>{message.length}/2000</small></label>
            <label className="support-honeypot" aria-hidden="true">{t("Web sitesi")}<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)}/></label>
            {error && <p className="support-modal-error" role="alert">{error}</p>}
            <div className="support-modal-footer"><span><ShieldCheck size={14}/> {t("Bilgileriniz yalnızca talebiniz için kullanılır.")}</span><button type="submit" disabled={loading}>{loading ? <><LoaderCircle className="animate-spin" size={16}/> {t("Gönderiliyor")}</> : <>{t("Mesajı gönder")} <Send size={15}/></>}</button></div>
          </form>
        </> : <div className="support-modal-success"><span><Check size={32}/></span><small>{t("MESAJINIZ ALINDI")}</small><h2 id={titleId}>{storefront ? t("İşletmeye ulaştırdık.") : t("Destek ekibimize ulaştı.")}</h2><p>{storefront ? t("İşletme mesajınızı kendi panelinde görecek ve verdiğiniz telefon üzerinden sizinle iletişime geçebilecek.") : t("Talebiniz super-admin destek ekranına düştü. Ekibimiz verdiğiniz telefon üzerinden sizinle iletişime geçecek.")}</p><button type="button" onClick={close}>{t("Tamam, kapat")}</button></div>}
      </section>
    </div>, document.body)}
  </>;
}
