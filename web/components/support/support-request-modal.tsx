"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Check, Headphones, LoaderCircle, MessageCircleMore, Send, ShieldCheck, Store, X } from "lucide-react";
import { getFirebaseApp } from "@/lib/firebase/client";

type SupportAudience = "customer" | "business" | "storefront";

export function SupportRequestModal({ audience, businessId, businessName, triggerLabel, triggerClassName = "support-modal-trigger" }: { audience: SupportAudience; businessId?: string; businessName?: string; triggerLabel?: string; triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const storefront = audience === "storefront";

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
    if (name.trim().length < 2) return setError("Lütfen adınızı yazın.");
    if (!/^\+?[0-9()\s-]{10,22}$/.test(phone.trim())) return setError("Geçerli bir telefon numarası yazın.");
    if (message.trim().length < 10) return setError("Mesajınız en az 10 karakter olmalıdır.");

    setLoading(true);
    try {
      const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "submitPublicSupportRequest");
      await callable({ name: name.trim(), phone: phone.trim(), message: message.trim(), website, audience, businessId: businessId ?? null });
      setSuccess(true);
      setName(""); setPhone(""); setMessage(""); setWebsite("");
    } catch (reason) {
      const raw = reason as { code?: string; message?: string };
      setError(raw.code === "functions/resource-exhausted" ? "Çok hızlı mesaj gönderildi. Lütfen bir dakika sonra tekrar deneyin." : raw.message?.replace(/^Firebase:\s*/i, "") || "Mesaj gönderilemedi. Lütfen tekrar deneyin.");
    } finally { setLoading(false); }
  }

  const label = triggerLabel ?? (storefront ? "İşletmeye mesaj gönder" : "Destek mesajı gönder");

  return <>
    <button type="button" className={triggerClassName} onClick={() => setOpen(true)}><MessageCircleMore size={16}/>{label}<Send size={14}/></button>
    {open && typeof document !== "undefined" && createPortal(<div className="support-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="support-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="support-modal-close" onClick={close} aria-label="Pencereyi kapat"><X size={18}/></button>
        {!success ? <>
          <div className="support-modal-heading"><span>{storefront ? <Store size={22}/> : <Headphones size={22}/>}</span><div><small>{storefront ? "DOĞRUDAN İŞLETMEYE" : audience === "business" ? "İŞLETME DESTEĞİ" : "MÜŞTERİ DESTEĞİ"}</small><h2 id={titleId}>{storefront ? `${businessName ?? "İşletme"} ile iletişime geçin.` : "Size nasıl yardımcı olabiliriz?"}</h2><p>{storefront ? "Mesajınız ilgili mağazanın yönetim paneline güvenle iletilir." : "Bilgilerinizi bırakın; destek ekibimiz talebinizi super-admin ekranından takip etsin."}</p></div></div>
          <form onSubmit={submit} className="support-modal-form">
            <label><span>İsim soyisim</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} placeholder="Adınız ve soyadınız" autoFocus/></label>
            <label><span>Telefon</span><input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" maxLength={22} placeholder="05xx xxx xx xx"/></label>
            <label className="support-modal-message"><span>Mesajınız</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={5} placeholder={storefront ? "Hizmet, müsaitlik veya randevu hakkında sorunuzu yazın…" : "Size yardımcı olabilmemiz için konuyu kısaca anlatın…"}/><small>{message.length}/2000</small></label>
            <label className="support-honeypot" aria-hidden="true">Web sitesi<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)}/></label>
            {error && <p className="support-modal-error" role="alert">{error}</p>}
            <div className="support-modal-footer"><span><ShieldCheck size={14}/> Bilgileriniz yalnızca talebiniz için kullanılır.</span><button type="submit" disabled={loading}>{loading ? <><LoaderCircle className="animate-spin" size={16}/> Gönderiliyor</> : <>Mesajı gönder <Send size={15}/></>}</button></div>
          </form>
        </> : <div className="support-modal-success"><span><Check size={32}/></span><small>MESAJINIZ ALINDI</small><h2 id={titleId}>{storefront ? "İşletmeye ulaştırdık." : "Destek ekibimize ulaştı."}</h2><p>{storefront ? "İşletme mesajınızı kendi panelinde görecek ve verdiğiniz telefon üzerinden sizinle iletişime geçebilecek." : "Talebiniz super-admin destek ekranına düştü. Ekibimiz verdiğiniz telefon üzerinden sizinle iletişime geçecek."}</p><button type="button" onClick={close}>Tamam, kapat</button></div>}
      </section>
    </div>, document.body)}
  </>;
}
