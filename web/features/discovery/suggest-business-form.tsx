"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, Send } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { CATEGORY_CATALOG } from "@/components/marketing/category-catalog";
import { CitySelect } from "@/components/ui/place-combobox";
import { useT } from "@/i18n/client";
import s from "./suggest-business-form.module.css";

// Müşteri bölgesindeki işletmeyi önerir (functions submitBusinessSuggestion → süper admin › İşletme Önerileri).
// Önerenden kişisel bilgi istenmez. city verilirse şehir sabittir (boş şehir sayfası), verilmezse seçilir (keşif).
export function SuggestBusinessForm({ city: fixedCity, initialCity = "" }: { city?: string; initialCity?: string }) {
  const t = useT();
  const ids = useId();
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const selectedCity = fixedCity ?? city;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (businessName.trim().length < 2) { setError(t("İşletmenin adını yaz.")); return; }
    if (!selectedCity) { setError(t("Şehri seç.")); return; }
    setBusy(true);
    setError(null);
    try {
      await httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "submitBusinessSuggestion")({ businessName, city: selectedCity, category, phone, website });
      setSent(true);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code ?? "";
      setError(code.includes("invalid-argument") ? t("Bilgileri kontrol edip tekrar dene. Numara yazdıysan geçerli olmalı.") : code.includes("resource-exhausted") ? t("Çok fazla öneri gönderildi, biraz sonra tekrar dene.") : t("Gönderilemedi. Bağlantını kontrol edip tekrar dene."));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className={s.sent} role="status">
        <span aria-hidden="true"><Check size={20} /></span>
        <p><b>{t("Teşekkürler, önerin bize ulaştı.")}</b>{t("Bu işletmeyle iletişime geçeceğiz.")}</p>
        <button type="button" onClick={() => { setSent(false); setBusinessName(""); setPhone(""); setCategory(""); }}>{t("Başka işletme öner")}</button>
      </div>
    );
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <label className={s.field} htmlFor={`${ids}-name`}><span>{t("İşletmenin adı")}</span>
        <input id={`${ids}-name`} value={businessName} onChange={(event) => setBusinessName(event.target.value.slice(0, 100))} placeholder={t("Örn: Elif Güzellik Salonu")} autoComplete="off" />
      </label>
      {fixedCity ? null : (
        <div className={s.field}><label htmlFor={`${ids}-city`}>{t("Şehir")}</label>
          <CitySelect id={`${ids}-city`} value={city} onChange={setCity} placeholder={t("Şehir seç veya yaz")} inputClassName={s.input} />
        </div>
      )}
      <label className={s.field} htmlFor={`${ids}-category`}><span>{t("Kategori (isteğe bağlı)")}</span>
        <select id={`${ids}-category`} value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">{t("Seç")}</option>
          {CATEGORY_CATALOG.map((item) => <option key={item.slug} value={item.slug}>{t(item.label)}</option>)}
        </select>
      </label>
      <label className={s.field} htmlFor={`${ids}-phone`}><span>{t("İşletmenin telefonu (isteğe bağlı)")}</span>
        <input id={`${ids}-phone`} type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value.slice(0, 20))} placeholder="0XXX XXX XX XX" autoComplete="off" />
      </label>
      {/* Bot tuzağı: gerçek kullanıcı görmez. */}
      <input className={s.trap} tabIndex={-1} aria-hidden="true" autoComplete="off" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} />
      {error ? <p className={s.error} role="alert">{error}</p> : null}
      <button type="submit" className={s.submit} disabled={busy}><Send size={16} aria-hidden="true" /> {busy ? t("Gönderiliyor…") : t("İşletmeyi öner")}</button>
    </form>
  );
}
