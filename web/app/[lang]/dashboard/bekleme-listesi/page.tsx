"use client";

import Link from "@/i18n/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, orderBy, query, Timestamp, updateDoc } from "firebase/firestore";
import { Activity, ArrowRight, BellRing, CalendarCheck2, CalendarDays, Check, LoaderCircle, Mail, Phone, RefreshCw, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { getDb } from "@/lib/firebase/firestore";
import { useBusiness } from "@/hooks/use-business";
import { useBusinessContext } from "@/features/businesses/business-context";
import { useLiveOperationsAvailable } from "@/features/live-queue/use-live-operations-available";
import {
  ConfirmSheet, EmptyState, HeroChip, Pill, SearchField, Segmented, StudioHero, StudioPage, StudioSkeleton, cx, studio,
  type PillTone,
} from "../_studio";
import w from "./waitlist.module.css";
import { tk } from "@/i18n/config";
import { useIntlLocale, useT } from "@/i18n/client";

type WaitlistStatus = "waiting" | "contacted" | "booked" | "closed";
interface WaitlistItem { id:string; customerName:string; customerPhone:string; customerEmail:string; serviceName:string; preferredDate:string; status:WaitlistStatus; createdAt?:string }
const labels:Record<WaitlistStatus,string>={waiting:tk("Bekliyor"),contacted:tk("İletişime geçildi"),booked:tk("Randevuya dönüştü"),closed:tk("Kapatıldı")};
const tones:Record<WaitlistStatus,PillTone>={waiting:"warn",contacted:"info",booked:"ok",closed:"neutral"};
const filterKeys=["waiting","contacted","booked","closed","all"] as const;

function createdLabel(value: string | undefined, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date) : "";
}

export default function WaitlistPage(){
  const t=useT(); const intlLocale=useIntlLocale();
  const {businessId}=useBusiness(); const [items,setItems]=useState<WaitlistItem[]>([]); const [loading,setLoading]=useState(true); const [search,setSearch]=useState(""); const [filter,setFilter]=useState<"all"|WaitlistStatus>("waiting"); const [busy,setBusy]=useState("");
  const [closing,setClosing]=useState<WaitlistItem|null>(null);
  const { access } = useBusinessContext();
  const showLiveQueue = useLiveOperationsAvailable() && access?.role !== "staff";
  const load=useCallback(async()=>{if(!businessId)return;setLoading(true);try{const snap=await getDocs(query(collection(getDb(),"businesses",businessId,"waitlist"),orderBy("createdAt","desc")));setItems(snap.docs.map(row=>{const data=row.data();return{id:row.id,customerName:String(data.customerName??t("Müşteri")),customerPhone:String(data.customerPhone??""),customerEmail:String(data.customerEmail??""),serviceName:String(data.serviceName??t("Hizmet")),preferredDate:String(data.preferredDate??""),status:String(data.status??"waiting") as WaitlistStatus,createdAt:data.createdAt?.toDate?.()?.toISOString()} }));}catch{toast.error(t("Bekleme listesi yüklenemedi."))}finally{setLoading(false)}},[businessId,t]);
  useEffect(()=>{queueMicrotask(()=>{void load()})},[load]);
  const visible=useMemo(()=>items.filter(item=>(filter==="all"||item.status===filter)&&`${item.customerName} ${item.serviceName} ${item.customerPhone}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))),[items,filter,search]);
  const counts=useMemo(()=>{const result:Record<"all"|WaitlistStatus,number>={all:items.length,waiting:0,contacted:0,booked:0,closed:0};items.forEach(item=>{if(item.status in result)result[item.status]+=1;});return result;},[items]);
  async function status(item:WaitlistItem,next:WaitlistStatus){if(!businessId)return;setBusy(item.id);try{await updateDoc(doc(getDb(),"businesses",businessId,"waitlist",item.id),{status:next,updatedAt:Timestamp.now()});setItems(rows=>rows.map(row=>row.id===item.id?{...row,status:next}:row));toast.success(t("Talep güncellendi."))}catch{toast.error(t("Talep güncellenemedi."))}finally{setBusy("")}}
  async function confirmClose(){if(!closing)return;await status(closing,"closed");setClosing(null);}

  const filterOptions=filterKeys.map(key=>({value:key,label:key==="all"?t("Tümü"):t(labels[key]),count:counts[key]}));

  return <StudioPage label={t("Bekleme listesi")}>
    <StudioHero eyebrow={t("Akıllı doluluk yönetimi")} icon={BellRing} mascot="wave"
      title={<>{t("Boşalan saatler,\nkaybolan müşteri olmasın.").split("\n").map((line,index)=><span key={index}>{index>0&&<br/>}{line}</span>)}</>}
      description={t("Dolu günlerde gelen talepleri sırada tutun, müşteriye ulaşın ve boşluğu hızla randevuya dönüştürün.")}
      actions={<button type="button" className={cx(studio.btn,studio.btnGlass,studio.iconBtn)} onClick={()=>void load()} disabled={loading} aria-label={t("Listeyi yenile")}><RefreshCw size={17} className={loading?studio.spin:undefined} aria-hidden/></button>}>
      <HeroChip icon={BellRing} value={counts.waiting} label={t("aktif talep")}/>
      <HeroChip icon={CalendarCheck2} value={counts.booked} label={t("randevuya dönüştü")}/>
    </StudioHero>

    {showLiveQueue && <Link href="/dashboard/canli-operasyon" className={w.liveLink}>
      <span className={w.liveIcon}><Activity size={20} aria-hidden/></span>
      <span className={w.liveText}><b>{t("Canlı sıradaki müşteriler")}</b><small>{t("Şimdi katılan ve yola çıkan müşterileri Canlı Sıra ekranından yönet.")}</small></span>
      <span className={w.liveGo}>{t("Canlı Sıraya git")} <ArrowRight size={16} aria-hidden/></span>
    </Link>}

    <div className={w.toolbar}>
      <SearchField value={search} onChange={setSearch} placeholder={t("Müşteri, hizmet veya telefon ara…")} label={t("Bekleme listesinde ara")}/>
      <Segmented options={filterOptions} value={filter} onChange={setFilter} label={t("Talep durumu filtresi")}/>
    </div>

    {loading ? <StudioSkeleton stats={0} rows={4} label={t("Bekleme listesi yükleniyor")}/> :
      visible.length===0 ? <EmptyState mood={items.length?"thinking":"wave"} title={t("Bu görünümde talep yok.")}
        description={search?t("Aramanızla eşleşen talep bulunamadı. Farklı bir kelime deneyin."):t("Dolu bir tarih için müşteri bekleme listesine katıldığında burada görünecek.")}
        action={search?<button type="button" className={cx(studio.btn,studio.btnSoft)} onClick={()=>setSearch("")}>{t("Aramayı temizle")}</button>:filter!=="all"&&items.length?<button type="button" className={cx(studio.btn,studio.btnSoft)} onClick={()=>setFilter("all")}>{t("Tümünü göster")}</button>:undefined}/> :
      <div className={w.grid}>{visible.map(item=>{const isBusy=busy===item.id;const created=createdLabel(item.createdAt,intlLocale);return <article key={item.id} className={cx(w.card,item.status==="closed"&&w.cardClosed,studio.fadeIn)}>
        <header className={w.cardHead}>
          <Pill tone={tones[item.status]??"neutral"} dot>{labels[item.status]?t(labels[item.status]):item.status}</Pill>
          {created&&<small className={w.created}>{created}</small>}
        </header>
        <div className={w.person}>
          <span className={w.avatar}><UserRound size={22} aria-hidden/></span>
          <span className={w.personText}><b>{item.customerName}</b><small>{item.serviceName}</small></span>
        </div>
        {item.preferredDate&&<div className={w.date}><CalendarDays size={15} aria-hidden/><span>{t("Tercih edilen tarih")}</span><b>{item.preferredDate}</b></div>}
        {(item.customerPhone||item.customerEmail)&&<div className={w.contact}>
          {item.customerPhone&&<a href={`tel:${item.customerPhone}`} className={w.contactLink} aria-label={t("Ara: {phone}",{phone:item.customerPhone})}><span className={w.contactIcon}><Phone size={17} aria-hidden/></span><span className={w.contactValue}>{item.customerPhone}</span></a>}
          {item.customerEmail&&<a href={`mailto:${item.customerEmail}`} className={w.contactLink} aria-label={t("E-posta gönder: {email}",{email:item.customerEmail})}><span className={w.contactIcon}><Mail size={17} aria-hidden/></span><span className={w.contactValue}>{item.customerEmail}</span></a>}
        </div>}
        <footer className={w.actions}>
          {item.status==="waiting"&&<button type="button" className={cx(studio.btn,studio.btnSoft)} onClick={()=>void status(item,"contacted")} disabled={isBusy}>{isBusy?<LoaderCircle size={16} className={studio.spin} aria-hidden/>:<Phone size={16} aria-hidden/>} {t("Ulaşıldı")}</button>}
          {["waiting","contacted"].includes(item.status)&&<button type="button" className={cx(studio.btn,studio.btnPrimary)} onClick={()=>void status(item,"booked")} disabled={isBusy}><CalendarCheck2 size={16} aria-hidden/> {t("Randevu oldu")}</button>}
          {item.status!=="closed"&&<button type="button" className={cx(studio.btn,studio.btnGhost,w.closeBtn)} onClick={()=>setClosing(item)} disabled={isBusy}><X size={16} aria-hidden/> {t("Kapat")}</button>}
          {item.status==="closed"&&<span className={w.done}><Check size={16} aria-hidden/> {t("Tamamlandı")}</span>}
        </footer>
      </article>;})}</div>}

    <ConfirmSheet open={!!closing} busy={!!closing&&busy===closing.id} title={t("Talep kapatılsın mı?")}
      description={t("Kapatılan talep aktif listeden çıkar ve “Kapatıldı” filtresinde görünür.")}
      confirmLabel={t("Talebi kapat")} onConfirm={()=>void confirmClose()} onClose={()=>setClosing(null)}>
      {closing?<div className={w.confirmItem}><b>{closing.customerName}</b><small>{closing.serviceName}{closing.preferredDate?` · ${closing.preferredDate}`:""}</small></div>:null}
    </ConfirmSheet>
  </StudioPage>;
}
