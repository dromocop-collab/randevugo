"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import Link from "@/i18n/link";
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
import { useIntlLocale, useLocale, useT } from "@/i18n/client";
import { appointmentPriceLabel, localizedAppointmentServiceName, needsFinalPrice } from "@/features/services/service-pricing";
import { extraLinePriceLabel } from "@/features/services/multi-service";
import { useDateFnsLocale } from "@/i18n/date";
import { tk, type TFunction } from "@/i18n/config";
import styles from "./ticket.module.css";

type BusinessInfo = { name:string; address:string; phone:string; slug:string; logoUrl:string };
type PublicAppointmentResponse = {
  appointment: Appointment;
  business: BusinessInfo;
  policy?: PublicAppointmentPolicy;
  wallet?: { apple?: boolean };
};

const statusMap: Record<string,{label:string;className:string}> = {
  pending:{label:tk("Onay bekliyor"),className:styles.statusPending},
  confirmed:{label:tk("Onaylandı"),className:styles.statusConfirmed},
  completed:{label:tk("Tamamlandı"),className:styles.statusCompleted},
  cancelled:{label:tk("İptal edildi"),className:styles.statusCancelled},
  no_show:{label:tk("Gerçekleşmedi"),className:styles.statusNoShow},
};

const SAVE_TO_ACCOUNT_HREF = `/musteri/giris?next=${encodeURIComponent("/hesabim")}`;

function formatPrice(value:number,locale="tr-TR"){return `${value.toLocaleString(locale)} ₺`}

export default function AppointmentDetailPage() {
  const params = useParams<{ publicToken: string }>();
  const t = useT();
  const locale = useLocale();
  const intlLocale = useIntlLocale();
  const dateLocale = useDateFnsLocale();
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
      // WhatsApp "Randevu Değiştir" düğmesi (/randevu-degistir/<token> → ?degistir=1): uygunsa saat değiştirme penceresi açılır.
      const url=new URL(window.location.href);
      if(url.searchParams.has("degistir")){
        url.searchParams.delete("degistir"); window.history.replaceState(null,"",url.pathname+url.search+url.hash);
        const startMs=new Date(result.data.appointment.startAt).getTime();
        if(result.data.policy?.canReschedule&&["pending","confirmed"].includes(result.data.appointment.status)&&startMs>Date.now())setRescheduleOpen(true);
      }
    }catch(reason){
      if(!cancelled){
        const message=(reason as {message?:string}).message??tk("Randevu bilgilerine ulaşılamadı.");
        setError(message.includes("not-found")?tk("Randevu bulunamadı veya bağlantının süresi dolmuş olabilir."):message);
      }
    }finally{if(!cancelled)setLoading(false)}})();
    return()=>{cancelled=true};
  },[params.publicToken,reloadKey]);


  async function confirmReschedule(slot:AvailableAppointmentSlot){
    // Hata RescheduleDialog içinde gösterilir.
    await manageAppointmentByToken({publicToken:params.publicToken,action:"reschedule",startAtMillis:slot.startAtMillis,...(slot.staffId?{staffId:slot.staffId}:{})});
    toast.success(t("Randevu saatiniz güncellendi ve işletmeye bildirildi."));
    setRescheduleOpen(false);
    setReloadKey(key=>key+1);
  }

  async function confirmCancel(){
    if(cancelBusy)return;
    setCancelBusy(true);
    try{
      const reason=cancelReason.trim();
      await manageAppointmentByToken({publicToken:params.publicToken,action:"cancel",...(reason?{reason}:{})});
      toast.success(t("Randevunuz iptal edildi ve işletmeye bildirildi."));
      setCancelOpen(false);
      setCancelReason("");
      setReloadKey(key=>key+1);
    }catch(reason){toast.error(t(appointmentChangeError(reason,tk("Randevu iptal edilemedi. Lütfen yeniden deneyin."))))}
    finally{setCancelBusy(false)}
  }

  const signedIn = authStatus === "authenticated";
  const back = signedIn ? {href:"/hesabim",label:t("Randevularıma dön")} : {href:"/",label:t("Ana sayfaya dön")};

  if(loading)return <div className={styles.page}><div className={styles.stateWrap}><LoadingState title={t("Randevunuz hazırlanıyor")} description={t("İşletme, hizmet ve zaman bilgileri güvenle getiriliyor…")}/></div></div>;
  if(error||!appointment)return <div className={styles.page}><div className={styles.stateWrap}><ErrorState title={t("Randevuya ulaşılamadı")} description={error?t(error):t("Randevu kaydı bulunamadı.")}/><Link href={back.href} className={styles.back}><ArrowLeft size={15}/> {back.label}</Link></div></div>;

  const start=new Date(appointment.startAt); const end=new Date(appointment.endAt); const status=statusMap[appointment.status]??statusMap.pending;
  const date=start.toLocaleDateString(intlLocale,{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const time=`${start.toLocaleTimeString(intlLocale,{hour:"2-digit",minute:"2-digit"})}${Number.isNaN(end.getTime())?"":` — ${end.toLocaleTimeString(intlLocale,{hour:"2-digit",minute:"2-digit"})}`}`;
  const additional=appointment.additionalServices??[];
  const customFieldRows=parseCustomFieldValues(appointment.customFields);
  const primaryName=localizedAppointmentServiceName(appointment,locale);
  const serviceSummary=[primaryName,...additional.map(service=>service.name)].filter(Boolean).join(" + ")||t("Belirtilmedi");
  // Backend servicePrice / serviceDurationMinutes ek hizmetler dahil TOPLAM değerleri tutar
  // (updateAppointmentServices: servicePrice = ana hizmet + ek hizmetler). Ana hizmet payı farktan bulunur.
  const additionalPrice=additional.reduce((sum,item)=>sum+(Number(item.price)||0),0);
  const additionalDuration=additional.reduce((sum,item)=>sum+(Number(item.durationMinutes)||0),0);
  const totalPrice=appointment.servicePrice!=null?Math.max(appointment.servicePrice,additionalPrice):null;
  const spanMinutes=Number.isNaN(end.getTime())||Number.isNaN(start.getTime())?0:Math.round((end.getTime()-start.getTime())/60000);
  const totalDuration=Math.max(appointment.serviceDurationMinutes??0,additionalDuration,spanMinutes);
  const primaryPrice=totalPrice!=null?Math.max(0,totalPrice-additionalPrice):null;
  const primaryDuration=Math.max(0,totalDuration-additionalDuration);
  // Başlangıç/aralık/görüşmede fiyatlı randevu: kesin tutar işletmede girilene kadar etiket gösterilir.
  const money=(value:number)=>formatPrice(value,intlLocale);
  const priceOpen=needsFinalPrice(appointment);
  // primaryServicePriceType varsa servicePriceType/Max zaten toplamın görüntüsüdür; eski randevularda
  // servicePriceMax yalnız ana hizmetin üst sınırıdır, toplamda ek hizmetler eklenir.
  const combinedPricing=appointment.primaryServicePriceType!=null;
  const totalPriceLabel=priceOpen?appointmentPriceLabel(combinedPricing?{...appointment,servicePrice:totalPrice??0}:{...appointment,servicePrice:totalPrice??0,servicePriceMax:appointment.servicePriceMax!=null?appointment.servicePriceMax+additionalPrice:undefined},t,money):totalPrice!=null?formatPrice(totalPrice,intlLocale):null;
  const primaryPriceLabel=priceOpen?appointmentPriceLabel(combinedPricing?{...appointment,servicePrice:primaryPrice??0,servicePriceType:appointment.primaryServicePriceType,servicePriceMax:appointment.primaryServicePriceMax}:{...appointment,servicePrice:primaryPrice??0},t,money):primaryPrice!=null?formatPrice(primaryPrice,intlLocale):null;
  const upcomingActive=["pending","confirmed"].includes(appointment.status)&&!Number.isNaN(start.getTime())&&start.getTime()>now;
  const calendarEvent:CalendarEventInput|null=upcomingActive?{
    uid:appointment.id||params.publicToken,
    title:`${business.name||t("Randevu")} — ${serviceSummary}`,
    start,
    end:Number.isNaN(end.getTime())?new Date(start.getTime()+Math.max(totalDuration,30)*60000):end,
    description:[t("Hizmet: {service}",{service:serviceSummary}),appointment.staffName?t("Uzman: {name}",{name:appointment.staffName}):"",business.phone?t("İşletme telefonu: {phone}",{phone:business.phone}):""].filter(Boolean).join("\n"),
    reminder:t("Randevu hatırlatması"),
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
        <article className={`${styles.ticket} ${cancelled?styles.ticketCancelled:""}`} aria-label={t("Randevu bileti")}>
          <header className={styles.ticketTop}>
            <div className={styles.grid} aria-hidden="true"/>
            <div className={styles.brandRow}>
              <div className={styles.logo}>{business.logoUrl?<Image src={business.logoUrl} alt={t("{name} logosu",{name:business.name})} fill sizes="52px"/>:<Store size={24}/>}</div>
              <div className={styles.brandText}><span className={styles.eyebrow}><BadgeCheck size={12}/> {t("RANDEVU BİLETİ")}</span><h1>{business.name||t("Randevunuz")}</h1></div>
            </div>
            <span className={`${styles.status} ${status.className}`} role="status"><i aria-hidden="true"/>{t(status.label)}</span>
            {startValid&&<div className={styles.when}>
              <div className={styles.calTile} aria-hidden="true"><small>{format(start,"MMM",{locale:dateLocale})}</small><b>{format(start,"d")}</b></div>
              <div className={styles.whenText}>
                <strong>{date}</strong>
                <span>{time}</span>
                {upcomingActive&&<em className={styles.countdown}><Hourglass size={12}/>{relativeTime(start.getTime(),now,t)}</em>}
              </div>
            </div>}
          </header>
          <dl className={styles.facts}>
            <Fact icon={<BriefcaseBusiness size={13}/>} label={t("Hizmet")} value={serviceSummary} wide/>
            <Fact icon={<UserRound size={13}/>} label={t("Uzman")} value={appointment.staffName||t("İşletme ekibi")} wide/>
            <Fact icon={<Clock3 size={13}/>} label={t("Süre")} value={totalDuration?t("{count} dk",{count:totalDuration}):t("İşletme belirler")}/>
            <Fact icon={<WalletCards size={13}/>} label={t("Tutar")} value={totalPriceLabel??t("İşletmede")}/>
          </dl>
          {additional.length>0&&<div className={styles.block}>
            <span className={styles.blockTitle}>{t("Hizmet dökümü")}</span>
            <ul className={styles.lines}>
              <ServiceLine name={primaryName||t("Ana hizmet")} duration={primaryDuration} price={primaryPriceLabel}/>
              {additional.map((item,index)=><ServiceLine key={`${item.serviceId}-${index}`} name={`+ ${item.name}`} duration={Number(item.durationMinutes)||0} price={extraLinePriceLabel(item,t,(value)=>formatPrice(value,intlLocale))}/>)}
              <li className={styles.linesTotal}><span>{t("Toplam")}</span><span>{totalDuration?t("{count} dk",{count:totalDuration}):""}{totalDuration&&totalPriceLabel!=null?" · ":""}{totalPriceLabel??""}</span></li>
            </ul>
          </div>}
          {appointment.notes&&<div className={styles.block}><span className={styles.blockTitle}>{t("Randevu notunuz")}</span><p className={styles.note}>{appointment.notes}</p></div>}
          {customFieldRows.length>0&&<div className={styles.block}><span className={styles.blockTitle}>{t("Ek bilgiler")}</span><dl className={styles.extraList}>{customFieldRows.map((row,index)=><div key={`${row.id}-${index}`} className={styles.extraRow}><dt>{row.label}</dt><dd>{formatCustomFieldValue(row.value,row.type,t,intlLocale)}</dd></div>)}</dl></div>}
          <div className={styles.perforation} aria-hidden="true"/>
          <div className={styles.stub}>
            <Barcode seed={params.publicToken||appointment.id||"randevu"}/>
            {shortCode&&<div className={styles.code}><small>{t("RANDEVU KODU")}</small><b>{shortCode}</b></div>}
          </div>
        </article>

        {showSaveToAccount&&<Link href={SAVE_TO_ACCOUNT_HREF} onClick={()=>addGuestBooking({publicToken:params.publicToken,businessId:appointment.businessId??"",appointmentId:appointment.id??""})} className={styles.saveCard}>
          <i><UserRound size={20}/></i><span><small>{t("HESABIMA KAYDET")}</small>{t("Giriş yapın, bu randevu Randevularım listenize eklensin.")}</span><ArrowRight size={18}/>
        </Link>}
      </div>

      <aside className={`${styles.column} ${styles.side}`}>
        {(calendarEvent||(upcomingActive&&policy))&&<section className={styles.card} style={{"--i":1} as CSSProperties}>
          <div className={styles.cardHead}><i><CalendarClock size={20}/></i><div><small>{t("RANDEVUYU YÖNET")}</small><h2>{upcomingActive?t("Planınız hazır"):t("Randevu işlemleri")}</h2></div></div>
          <div className={styles.actions}>
            {upcomingActive&&policy?.canReschedule&&<button type="button" onClick={()=>setRescheduleOpen(true)} className={`${styles.btn} ${styles.btnPrimary}`}><CalendarClock size={18}/> {t("Saati değiştir")}</button>}
            {calendarEvent&&<CalendarActions event={calendarEvent} publicToken={params.publicToken} appleWalletEnabled={walletApple}/>}
            {upcomingActive&&policy?.canCancel&&<button type="button" onClick={()=>setCancelOpen(true)} className={`${styles.btn} ${styles.btnDanger}`}><XCircle size={18}/> {t("Randevuyu iptal et")}</button>}
          </div>
          {upcomingActive&&policy&&<ul className={styles.policy}>
            {!policy.canReschedule&&policy.rescheduleBlockedReason&&<li><Info size={15}/>{t(policy.rescheduleBlockedReason)}</li>}
            {!policy.canCancel&&policy.cancelBlockedReason&&policy.cancelBlockedReason!==policy.rescheduleBlockedReason&&<li><Info size={15}/>{t(policy.cancelBlockedReason)}</li>}
            {(policy.canReschedule||policy.canCancel)&&policy.deadlineMinutes>0&&<li><Clock3 size={15}/>{t("Değişiklik ve iptal, randevudan en geç {count} dakika önceye kadar yapılabilir.",{count:policy.deadlineMinutes})}</li>}
            {policy.canReschedule&&<li><CalendarDays size={15}/><span>{t("Saat değişikliği hakkı:")} <b>{remainingReschedules}/{policy.maxReschedules}</b> <span className={styles.quota} aria-hidden="true">{Array.from({length:Math.min(policy.maxReschedules,6)}).map((_,index)=><i key={index} className={index<remainingReschedules?styles.quotaOn:""}/>)}</span></span></li>}
          </ul>}
        </section>}

        <section className={styles.card} style={{"--i":2} as CSSProperties}>
          <div className={styles.cardHead}><i><Store size={20}/></i><div><small>{t("İŞLETME BİLGİLERİ")}</small><h2>{business.name}</h2></div></div>
          <p className={styles.address}><MapPin size={16}/>{business.address||t("Adres bilgisi işletmeden alınabilir.")}</p>
          <div className={styles.actions}>
            <div className={styles.actionsRow}>
              {business.phone&&<a href={`tel:${business.phone}`} className={styles.btn}><Phone size={17}/> {t("Ara")}</a>}
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`} target="_blank" rel="noopener noreferrer" className={styles.btn}><Navigation size={17}/> {t("Yol tarifi")}</a>
            </div>
            {business.slug&&<Link href={`/isletme/${business.slug}`} className={styles.btn}><Store size={17}/> {t("İşletme sayfası")}</Link>}
          </div>
          <small className={styles.secure}><ShieldCheck size={14}/> {t("Bu bağlantı size özeldir; bilgileriniz güvenle korunur.")}</small>
        </section>
      </aside>
    </div>
  </main><MarketingFooter/>
    {rescheduleOpen&&upcomingActive&&<RescheduleDialog businessId={appointment.businessId} serviceId={appointment.serviceId} variantId={appointment.serviceVariantId} staffId={appointment.staffId||undefined} currentStartAt={appointment.startAt} durationMinutes={totalDuration||undefined} title={business.name||t("Randevunuz")} subtitle={t("{service} · Şu an: {date} {time}",{service:serviceSummary,date,time})} timeZone={policy?.timeZone} maximumBookingDaysAhead={policy?.maximumBookingDaysAhead} onClose={closeReschedule} onConfirm={confirmReschedule}/>}
    {cancelOpen&&<BottomSheet
      eyebrow={t("RANDEVU İPTALİ")}
      title={t("Randevuyu iptal et")}
      description={t("Bu işlem geri alınamaz; iptal bilgisi anında işletmeye iletilir.")}
      busy={cancelBusy}
      onClose={()=>setCancelOpen(false)}
      footer={<div className={styles.sheetBtns}>
        <button type="button" className={bookingStyles.ghost} onClick={()=>setCancelOpen(false)} disabled={cancelBusy}>{t("Vazgeç", { ctx: "iptal-onay" })}</button>
        <button type="button" className={`${bookingStyles.primary} ${styles.cancelConfirm}`} onClick={()=>void confirmCancel()} disabled={cancelBusy}>{cancelBusy?<LoaderCircle size={18} className={styles.spin}/>:<><XCircle size={18}/> {t("Evet, iptal et")}</>}</button>
      </div>}
    >
      <div className={styles.cancelSummary}><b>{business.name}</b><br/>{serviceSummary}<br/>{date} · {time}</div>
      <label className={styles.cancelLabel}>{t("İptal nedeni (isteğe bağlı)")}<textarea value={cancelReason} onChange={event=>setCancelReason(event.target.value)} maxLength={300} rows={3} placeholder={t("İşletmeye iletilecek kısa bir not")}/></label>
      <p className={styles.cancelHint}><CheckCircle2 size={13} style={{verticalAlign:-2,marginRight:4}}/>{t("İptal bilgisi anında işletmeye iletilecek.")}</p>
    </BottomSheet>}
  </div>;
}

function relativeTime(target:number,now:number,t:TFunction){
  const diff=target-now;
  const minutes=Math.round(diff/60000);
  if(minutes<60)return t("{count} dakika sonra",{count:Math.max(1,minutes)});
  const hours=Math.round(minutes/60);
  const sameDay=new Date(target).toDateString()===new Date(now).toDateString();
  if(sameDay)return t("Bugün · {count} saat sonra",{count:hours});
  const days=Math.ceil((new Date(target).setHours(0,0,0,0)-new Date(now).setHours(0,0,0,0))/86400000);
  if(days===1)return t("Yarın");
  return t("{count} gün sonra",{count:days});
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

function ServiceLine({name,duration,price}:{name:string;duration:number;price:string|null}){
  const t=useT();
  return <li><span>{name}</span><span>{duration?t("{count} dk",{count:duration}):""}{duration&&price!=null?" · ":""}{price??""}</span></li>;
}
