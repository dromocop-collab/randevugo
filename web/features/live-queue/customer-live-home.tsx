"use client";

import Link from "@/i18n/link";
import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { ArrowRight, BellRing, Clock3, LogIn, Sparkles, Ticket, UsersRound, X, Zap } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { getMyActiveQueues, watchMyQueueEntry, type ActiveQueuePointer } from "./customer-queue-repository";
import { tk } from "@/i18n/config";
import { useT } from "@/i18n/client";

const queueStatusCopy: Record<string, { label: string; title: string; detail: string }> = {
  waiting: { label: tk("SIRADA"), title: tk("Sıran aktif"), detail: tk("İşletmenin çağrısını buradan anlık takip edebilirsin.") },
  on_the_way: { label: tk("YOLDASIN"), title: tk("İşletme seni bekliyor"), detail: tk("Yola çıktığın işletmeye iletildi.") },
  called: { label: tk("ÇAĞRILDIN"), title: tk("Sıra sende"), detail: tk("Hazırsan işletmeye geçebilirsin.") },
  in_service: { label: tk("İŞLEMDE"), title: tk("Hizmetin başladı"), detail: tk("Sıra kaydın hizmet tamamlanınca kapanacak.") },
};

export function CustomerLiveHome() {
  const t = useT();
  const { user, status } = useAuth();
  const [available, setAvailable] = useState(false);
  const [active, setActive] = useState<ActiveQueuePointer[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [queueStatus, setQueueStatus] = useState("waiting");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeLiveFeatureAvailability((flags) =>
    setAvailable(flags.isLiveAvailabilityEnabled && flags.isLiveQueueEnabled && flags.isLiveOperationsEnabled)), []);
  useEffect(() => {
    if (status !== "authenticated" || !user) { queueMicrotask(() => setActive([])); return; }
    let cancelled = false;
    getMyActiveQueues().then((rows) => { if (!cancelled) setActive(rows); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [status, user]);
  useEffect(() => {
    const first = active[0];
    if (!first) { queueMicrotask(() => { setBusinessName(""); setQueueStatus("waiting"); }); return; }
    getDoc(doc(getDb(), "businesses", first.businessId)).then((row) =>
      setBusinessName(String(row.data()?.name ?? ""))).catch(() => setBusinessName(""));
    return watchMyQueueEntry(first.businessId, first.entryId, (entry) => {
      if (!entry) return;
      setQueueStatus(entry.status);
      if (["completed", "cancelled", "expired", "no_show"].includes(entry.status))
        setActive((rows) => rows.filter((item) => item.entryId !== first.entryId));
    }, () => undefined);
  }, [active]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const authenticated = status === "authenticated" && Boolean(user);
  const current = queueStatusCopy[queueStatus] ?? queueStatusCopy.waiting;
  const close = () => { setOpen(false); window.requestAnimationFrame(() => triggerRef.current?.focus()); };

  return <>
    <button ref={triggerRef} type="button" className={`home-queue-trigger ${active.length ? "has-active" : ""}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <span><Ticket size={21}/>{active.length > 0 && <i>{active.length}</i>}</span>
      <span><small>{active.length ? t(current.label) : t("CANLI SIRA")}</small><b>{active.length ? t("Sıramı gör") : t("Sıram")}</b></span>
      <ArrowRight size={17}/>
    </button>

    {open && <div className="home-queue-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialogRef} className="home-queue-modal" role="dialog" aria-modal="true" aria-labelledby="home-queue-title" tabIndex={-1}>
        <header>
          <div><span><Sparkles size={14}/> {t("CANLI SIRA MERKEZİ")}</span><h2 id="home-queue-title">{t("Sıran, tek dokunuşla yanında.")}</h2><p>{t("Katıldığın sırayı anlık gör veya şu anda müşteri kabul eden işletmeleri keşfet.")}</p></div>
          <button type="button" onClick={close} aria-label={t("Sıra penceresini kapat")}><X size={20}/></button>
        </header>

        {status === "loading" ? <div className="home-queue-state"><span className="home-queue-loader"/><h3>{t("Hesabın kontrol ediliyor")}</h3><p>{t("Canlı sıra bilgini hazırlıyoruz.")}</p></div> : !authenticated ?
          <div className="home-queue-state"><span><LogIn size={28}/></span><small>{t("HESABINLA EŞLEŞİR")}</small><h3>{t("Sıranı görmek için giriş yap.")}</h3><p>{t("Aktif sıra kaydın güvenli biçimde hesabına bağlıdır.")}</p><div><Link href="/musteri/giris?next=%2Fsiram">{t("Giriş yap")} <ArrowRight size={16}/></Link><Link href="/simdi-musait">{t("İşletmeleri keşfet")}</Link></div></div> : active.length > 0 ?
          <div className="home-queue-active"><div className="home-queue-active__top"><span><BellRing size={24}/><i/></span><div><small>{t(current.label)} · {t("CANLI")}</small><h3>{t(current.title)}</h3><p>{t(current.detail)}</p></div></div><div className="home-queue-business"><span><UsersRound size={18}/></span><div><small>{t("İŞLETME")}</small><b>{active.length === 1 ? businessName || t("İşletme") : t("{count} işletmede aktif sıran var", { count: active.length })}</b></div></div><Link href="/siram">{t("Canlı durumumu aç")} <ArrowRight size={17}/></Link></div> :
          <div className="home-queue-state"><span><Clock3 size={28}/></span><small>{available ? t("ŞİMDİ MÜSAİT") : t("CANLI SIRA")}</small><h3>{available ? t("Şu anda aktif sıran yok.") : t("Canlı sıra şu anda kapalı.")}</h3><p>{available ? t("Yakınındaki açık işletmeleri gör, hizmetini seç ve beklemeden sıraya katıl.") : t("Normal randevu seçeneklerini keşfetmeye devam edebilirsin.")}</p><div><Link href={available ? "/simdi-musait" : "/kesfet"}>{available ? <><Zap size={16}/> {t("Açık işletmeleri gör")}</> : <>{t("Mağazaları keşfet")}</>} <ArrowRight size={16}/></Link></div></div>}

        <footer><span><i/> {t("Durum işletmeden gelen canlı verilerle güncellenir")}</span><Link href="/siram">{t("Detaylı sıra ekranı")}</Link></footer>
      </div>
    </div>}
  </>;
}
