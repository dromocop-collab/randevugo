"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarClock, CalendarDays, CheckCircle2, Clock3, Hourglass, Info, MapPin, Navigation, Phone, ShieldCheck, Store, LoaderCircle, UserRound, WalletCards, XCircle } from "lucide-react";
import { getFirebaseApp } from "@/lib/firebase/client";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { useAuth } from "@/hooks/use-auth";
import { addGuestBooking } from "@/features/appointments/guest-booking-store";
import { type CalendarEventInput } from "@/lib/calendar/appointment-calendar";
import { CalendarActions } from "./calendar-actions";
import { RescheduleDialog } from "@/features/appointments/reschedule-dialog";
import { appointmentChangeError, manageAppointmentByToken } from "@/features/appointments/appointment-change";
import type { AvailableAppointmentSlot } from "@/features/appointments/appointment-repository";
import type { Appointment } from "@/types/appointments";
import { formatCustomFieldValue, parseCustomFieldValues } from "@/features/booking-fields/booking-fields-domain";
import type { PublicAppointmentPolicy } from "@/types/appointment-change";
import { BottomSheet } from "@/components/booking/booking-parts";
import bookingStyles from "@/components/booking/booking.module.css";
import styles from "./ticket.module.css";

type BusinessInfo = { name:string; address:string; phone:string; slug:string; logoUrl:string };
type PublicAppointmentResponse = {
  appointment: Appointment;
  business: BusinessInfo;
  policy?: PublicAppointmentPolicy;
  wallet?: { apple?: boolean };
};

const statusMap: Record<string,{label:string;className:string}> = {
  pending:{label:"Onay bekliyor",className:styles.statusPending},
  confirmed:{label:"Onaylandı",className:styles.statusConfirmed},
  completed:{label:"Tamamlandı",className:styles.statusCompleted},
  cancelled:{label:"İptal edildi",className:styles.statusCancelled},
  no_show:{label:"Gerçekleşmedi",className:styles.statusNoShow},
};

const SAVE_TO_ACCOUNT_HREF = `/musteri/giris?next=${encodeURIComponent("/hesabim")}`;

function formatPrice(value:number){return `${value.toLocaleString("tr-TR")} ₺`}

export default function AppointmentDetailPage() {
  const params = useParams<{ publicToken: string }>();
  const { status: authStatus } = useAuth();
  const [appointment,setAppointment] = useState<Appointment|null>(null);
  const [business,setBusiness] = useState<BusinessInfo>({name:"",address:"",phone:"",slug:"",logoUrl:""});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [now,setNow] = useState(() => Date.now());
  const [policy,setPolicy] = useState<PublicAppointmentPolicy|null>(null);
  const [reloadKey,setReloadKey] = useState(0);
  const [walletApple,setWalletApple] = useState(false);
  const [rescheduleOpen,setRescheduleOpen] = useState(false);
  const [cancelOpen,setCancelOpen] = useState(false);
  const [cancelReason,setCancelReason] = useState("");
  const [cancelBusy,setCancelBusy] = useState(false);
  const closeReschedule = useCallback(()=>setRescheduleOpen(false),[]);

  useEffect(()=>{
    const token=params.publicToken; if(!token)return; let cancelled=false;
    (async()=>{try{
      const getPublicAppointment = httpsCallable<{ publicToken:string }, PublicAppointmentResponse>(getFunctions(getFirebaseApp(), "europe-west1"), "getAppointmentByPublicToken");
      const result = await getPublicAppointment({ publicToken: token });
      if(cancelled)return;
      setAppointment(result.data.appointment);
      setBusiness(result.data.business);
      setPolicy(result.data.policy??null);
      setWalletApple(result.data.wallet?.apple===true);
      setNow(Date.now());
    }catch(reason){
      if(!cancelled){
        const message=(reason as {message?:string}).message??"Randevu bilgilerine ulaşılamadı.";
        setError(message.includes("not-found")?"Randevu bulunamadı veya bağlantının süresi dolmuş olabilir.":message);
      }
    }finally{if(!cancelled)setLoading(false)}})();
    return()=>{cancelled=true};
  },[params.publicToken,reloadKey]);


  async function confirmReschedule(slot:AvailableAppointmentSlot){
    // Hata RescheduleDialog içinde gösterilir.
    await manageAppointmentByToken({publicToken:params.publicToken,action:"reschedule",startAtMillis:slot.startAtMillis,...(slot.staffId?{staffId:slot.staffId}:{})});
    toast.success("Randevu saatiniz güncellendi ve işletmeye bildirildi.");
    setRescheduleOpen(false);
    setReloadKey(key=>key+1);
  }

  async function confirmCancel(){
    if(cancelBusy)return;
    setCancelBusy(true);
    try{
      const reason=cancelReason.trim();
      await manageAppointmentByToken({publicToken:params.publicToken,action:"cancel",...(reason?{reason}:{})});
      toast.success("Randevunuz iptal edildi ve işletmeye bildirildi.");
      setCancelOpen(false);
      setCancelReason("");
      setReloadKey(key=>key+1);
    }catch(reason){toast.error(appointmentChangeError(reason,"Randevu iptal edilemedi. Lütfen yeniden deneyin."))}
    finally{setCancelBusy(false)}
  }

  const signedIn = authStatus === "authenticated";
  const back = signedIn ? {href:"/hesabim",label:"Randevularıma dön"} : {href:"/",label:"Ana sayfaya dön"};

  if(loading)return <div className={styles.page}><div className={styles.stateWrap}><LoadingState title="Randevunuz hazırlanıyor" description="İşletme, hizmet ve zaman bilgileri güvenle getiriliyor…"/></div></div>;
  if(error||!appointment)return <div className={styles.page}><div className={styles.stateWrap}><ErrorState title="Randevuya ulaşılamadı" description={error??"Randevu kaydı bulunamadı."}/><Link href={back.href} className={styles.back}><ArrowLeft size={15}/> {back.label}</Link></div></div>;

  const start=new Date(appointment.startAt); const end=new Date(appointment.endAt); const status=statusMap[appointment.status]??statusMap.pending;
  const date=start.toLocaleDateString("tr-TR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const time=`${start.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}${Number.isNaN(end.getTime())?"":` — ${end.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}`}`;
  const additional=appointment.additionalServices??[];
  const customFieldRows=parseCustomFieldValues(appointment.customFields);
  const serviceSummary=[appointment.serviceName,...additional.map(service=>service.name)].filter(Boolean).join(" + ")||"Belirtilmedi";
  // Backend servicePrice / serviceDurationMinutes ek hizmetler dahil TOPLAM değerleri tutar
  // (updateAppointmentServices: servicePrice = ana hizmet + ek hizmetler). Ana hizmet payı farktan bulunur.
  const additionalPrice=additional.reduce((sum,item)=>sum+(Number(item.price)||0),0);
  const additionalDuration=additional.reduce((sum,item)=>sum+(Number(item.durationMinutes)||0),0);
  const totalPrice=appointment.servicePrice!=null?Math.max(appointment.servicePrice,additionalPrice):null;
  const spanMinutes=Number.isNaN(end.getTime())||Number.isNaN(start.getTime())?0:Math.round((end.getTime()-start.getTime())/60000);
  const totalDuration=Math.max(appointment.serviceDurationMinutes??0,additionalDuration,spanMinutes);
  const primaryPrice=totalPrice!=null?Math.max(0,totalPrice-additionalPrice):null;
  const primaryDuration=Math.max(0,totalDuration-additionalDuration);
  const upcomingActive=["pending","confirmed"].includes(appointment.status)&&!Number.isNaN(start.getTime())&&start.getTime()>now;
  const calendarEvent:CalendarEventInput|null=upcomingActive?{
    uid:appointment.id||params.publicToken,
    title:`${business.name||"Randevu"} — ${serviceSummary}`,
    start,
    end:Number.isNaN(end.getTime())?new Date(start.getTime()+Math.max(totalDuration,30)*60000):end,
    description:[`Hizmet: ${serviceSummary}`,appointment.staffName?`Uzman: ${appointment.staffName}`:"",business.phone?`İşletme telefonu: ${business.phone}`:""].filter(Boolean).join("\n"),
    location:business.address||business.name,
    url:typeof window!=="undefined"?window.location.href:undefined,
  }:null;
  const showSaveToAccount=authStatus==="unauthenticated";
  const startValid=!Number.isNaN(start.getTime());
  const cancelled=appointment.status==="cancelled"||appointment.status==="no_show";
  const shortCode=(params.publicToken||appointment.id||"").replace(/[^a-z0-9]/gi,"").slice(-6).toUpperCase();
  const remainingReschedules=policy?Math.max(0,policy.maxReschedules-(appointment.rescheduleCount??0)):0;

  return <div className={styles.page}><MarketingHeader/><main className={styles.shell}>
    <Link href={back.href} className={styles.back}><ArrowLeft size={16}/> {back.label}</Link>
    <div className={styles.layout}>
      <div className={styles.column}>
        <article className={`${styles.ticket} ${cancelled?styles.ticketCancelled:""}`} aria-label="Randevu bileti">
          <header className={styles.ticketTop}>
            <div className={styles.grid} aria-hidden="true"/>
            <div className={styles.brandRow}>
              <div className={styles.logo}>{business.logoUrl?<Image src={business.logoUrl} alt={`${business.name} logosu`} fill sizes="52px"/>:<Store size={24}/>}</div>
              <div className={styles.brandText}><span className={styles.eyebrow}><BadgeCheck size={12}/> RANDEVU BİLETİ</span><h1>{business.name||"Randevunuz"}</h1></div>
            </div>
            <span className={`${styles.status} ${status.className}`} role="status"><i aria-hidden="true"/>{status.label}</span>
            {startValid&&<div className={styles.when}>
              <div className={styles.calTile} aria-hidden="true"><small>{format(start,"MMM",{locale:tr})}</small><b>{format(start,"d")}</b></div>
              <div className={styles.whenText}>
                <strong>{date}</strong>
                <span>{time}</span>
                {upcomingActive&&<em className={styles.countdown}><Hourglass size={12}/>{relativeTime(start.getTime(),now)}</em>}
              </div>
            </div>}
          </header>
          <dl className={styles.facts}>
            <Fact icon={<BriefcaseBusiness size={13}/>} label="Hizmet" value={serviceSummary} wide/>
            <Fact icon={<UserRound size={13}/>} label="Uzman" value={appointment.staffName||"İşletme ekibi"} wide/>
            <Fact icon={<Clock3 size={13}/>} label="Süre" value={totalDuration?`${totalDuration} dk`:"İşletme belirler"}/>
            <Fact icon={<WalletCards size={13}/>} label="Tutar" value={totalPrice!=null?formatPrice(totalPrice):"İşletmede"}/>
          </dl>
          {additional.length>0&&<div className={styles.block}>
            <span className={styles.blockTitle}>Hizmet dökümü</span>
            <ul className={styles.lines}>
              <ServiceLine name={appointment.serviceName||"Ana hizmet"} duration={primaryDuration} price={primaryPrice}/>
              {additional.map((item,index)=><ServiceLine key={`${item.serviceId}-${index}`} name={`+ ${item.name}`} duration={Number(item.durationMinutes)||0} price={Number(item.price)||0}/>)}
              <li className={styles.linesTotal}><span>Toplam</span><span>{totalDuration?`${totalDuration} dk`:""}{totalDuration&&totalPrice!=null?" · ":""}{totalPrice!=null?formatPrice(totalPrice):""}</span></li>
            </ul>
          </div>}
          {appointment.notes&&<div className={styles.block}><span className={styles.blockTitle}>Randevu notunuz</span><p className={styles.note}>{appointment.notes}</p></div>}
          {customFieldRows.length>0&&<div className={styles.block}><span className={styles.blockTitle}>Ek bilgiler</span><dl className={styles.extraList}>{customFieldRows.map((row,index)=><div key={`${row.id}-${index}`} className={styles.extraRow}><dt>{row.label}</dt><dd>{formatCustomFieldValue(row.value,row.type)}</dd></div>)}</dl></div>}
          <div className={styles.perforation} aria-hidden="true"/>
          <div className={styles.stub}>
            <Barcode seed={params.publicToken||appointment.id||"randevu"}/>
            {shortCode&&<div className={styles.code}><small>RANDEVU KODU</small><b>{shortCode}</b></div>}
          </div>
        </article>

        {showSaveToAccount&&<Link href={SAVE_TO_ACCOUNT_HREF} onClick={()=>addGuestBooking({publicToken:params.publicToken,businessId:appointment.businessId??"",appointmentId:appointment.id??""})} className={styles.saveCard}>
          <i><UserRound size={20}/></i><span><small>HESABIMA KAYDET</small>Giriş yapın, bu randevu Randevularım listenize eklensin.</span><ArrowRight size={18}/>
        </Link>}
      </div>

      <aside className={`${styles.column} ${styles.side}`}>
        {(calendarEvent||(upcomingActive&&policy))&&<section className={styles.card} style={{"--i":1} as CSSProperties}>
          <div className={styles.cardHead}><i><CalendarClock size={20}/></i><div><small>RANDEVUYU YÖNET</small><h2>{upcomingActive?"Planınız hazır":"Randevu işlemleri"}</h2></div></div>
          <div className={styles.actions}>
            {upcomingActive&&policy?.canReschedule&&<button type="button" onClick={()=>setRescheduleOpen(true)} className={`${styles.btn} ${styles.btnPrimary}`}><CalendarClock size={18}/> Saati değiştir</button>}
            {calendarEvent&&<CalendarActions event={calendarEvent} publicToken={params.publicToken} appleWalletEnabled={walletApple}/>}
            {upcomingActive&&policy?.canCancel&&<button type="button" onClick={()=>setCancelOpen(true)} className={`${styles.btn} ${styles.btnDanger}`}><XCircle size={18}/> Randevuyu iptal et</button>}
          </div>
          {upcomingActive&&policy&&<ul className={styles.policy}>
            {!policy.canReschedule&&policy.rescheduleBlockedReason&&<li><Info size={15}/>{policy.rescheduleBlockedReason}</li>}
            {!policy.canCancel&&policy.cancelBlockedReason&&policy.cancelBlockedReason!==policy.rescheduleBlockedReason&&<li><Info size={15}/>{policy.cancelBlockedReason}</li>}
            {(policy.canReschedule||policy.canCancel)&&policy.deadlineMinutes>0&&<li><Clock3 size={15}/>Değişiklik ve iptal, randevudan en geç {policy.deadlineMinutes} dakika önceye kadar yapılabilir.</li>}
            {policy.canReschedule&&<li><CalendarDays size={15}/><span>Saat değişikliği hakkı: <b>{remainingReschedules}/{policy.maxReschedules}</b> <span className={styles.quota} aria-hidden="true">{Array.from({length:Math.min(policy.maxReschedules,6)}).map((_,index)=><i key={index} className={index<remainingReschedules?styles.quotaOn:""}/>)}</span></span></li>}
          </ul>}
        </section>}

        <section className={styles.card} style={{"--i":2} as CSSProperties}>
          <div className={styles.cardHead}><i><Store size={20}/></i><div><small>İŞLETME BİLGİLERİ</small><h2>{business.name}</h2></div></div>
          <p className={styles.address}><MapPin size={16}/>{business.address||"Adres bilgisi işletmeden alınabilir."}</p>
          <div className={styles.actions}>
            <div className={styles.actionsRow}>
              {business.phone&&<a href={`tel:${business.phone}`} className={styles.btn}><Phone size={17}/> Ara</a>}
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`} target="_blank" rel="noopener noreferrer" className={styles.btn}><Navigation size={17}/> Yol tarifi</a>
            </div>
            {business.slug&&<Link href={`/isletme/${business.slug}`} className={styles.btn}><Store size={17}/> İşletme sayfası</Link>}
          </div>
          <small className={styles.secure}><ShieldCheck size={14}/> Bu bağlantı size özeldir; bilgileriniz güvenle korunur.</small>
        </section>
      </aside>
    </div>
  </main><MarketingFooter/>
    {rescheduleOpen&&upcomingActive&&<RescheduleDialog businessId={appointment.businessId} serviceId={appointment.serviceId} staffId={appointment.staffId||undefined} currentStartAt={appointment.startAt} title={business.name||"Randevunuz"} subtitle={`${serviceSummary} · Şu an: ${date} ${time}`} timeZone={policy?.timeZone} maximumBookingDaysAhead={policy?.maximumBookingDaysAhead} onClose={closeReschedule} onConfirm={confirmReschedule}/>}
    {cancelOpen&&<BottomSheet
      eyebrow="RANDEVU İPTALİ"
      title="Randevuyu iptal et"
      description="Bu işlem geri alınamaz; iptal bilgisi anında işletmeye iletilir."
      busy={cancelBusy}
      onClose={()=>setCancelOpen(false)}
      footer={<div className={styles.sheetBtns}>
        <button type="button" className={bookingStyles.ghost} onClick={()=>setCancelOpen(false)} disabled={cancelBusy}>Vazgeç</button>
        <button type="button" className={`${bookingStyles.primary} ${styles.cancelConfirm}`} onClick={()=>void confirmCancel()} disabled={cancelBusy}>{cancelBusy?<LoaderCircle size={18} className={styles.spin}/>:<><XCircle size={18}/> Evet, iptal et</>}</button>
      </div>}
    >
      <div className={styles.cancelSummary}><b>{business.name}</b><br/>{serviceSummary}<br/>{date} · {time}</div>
      <label className={styles.cancelLabel}>İptal nedeni (isteğe bağlı)<textarea value={cancelReason} onChange={event=>setCancelReason(event.target.value)} maxLength={300} rows={3} placeholder="İşletmeye iletilecek kısa bir not"/></label>
      <p className={styles.cancelHint}><CheckCircle2 size={13} style={{verticalAlign:-2,marginRight:4}}/>İptal bilgisi anında işletmeye iletilecek.</p>
    </BottomSheet>}
  </div>;
}

function relativeTime(target:number,now:number){
  const diff=target-now;
  const minutes=Math.round(diff/60000);
  if(minutes<60)return `${Math.max(1,minutes)} dakika sonra`;
  const hours=Math.round(minutes/60);
  const sameDay=new Date(target).toDateString()===new Date(now).toDateString();
  if(sameDay)return `Bugün · ${hours} saat sonra`;
  const days=Math.ceil((new Date(target).setHours(0,0,0,0)-new Date(now).setHours(0,0,0,0))/86400000);
  if(days===1)return "Yarın";
  return `${days} gün sonra`;
}

function Barcode({seed}:{seed:string}){
  const bars:number[]=[];
  for(let index=0;index<seed.length*2&&bars.length<64;index+=1){
    const code=seed.charCodeAt(index%seed.length)+index*7;
    bars.push((code%3)+1,(Math.floor(code/3)%2)+1);
  }
  return <div className={styles.barcode} aria-hidden="true">{bars.map((width,index)=>index%2===0?<i key={index} style={{width}}/>:<span key={index} style={{width,flex:"none"}}/>)}</div>;
}

function Fact({icon,label,value,wide}:{icon:ReactNode;label:string;value:string;wide?:boolean}){return <div className={`${styles.fact} ${wide?styles.factWide:""}`}><dt>{icon}{label}</dt><dd>{value}</dd></div>}

function ServiceLine({name,duration,price}:{name:string;duration:number;price:number|null}){
  return <li><span>{name}</span><span>{duration?`${duration} dk`:""}{duration&&price!=null?" · ":""}{price!=null?formatPrice(price):""}</span></li>;
}
