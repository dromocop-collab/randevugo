"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarDays, CalendarPlus, CheckCircle2, Clock3, Download, History, MapPin, Navigation, Phone, ShieldCheck, Store, UserRound, WalletCards, XCircle, type LucideIcon } from "lucide-react";
import { getFirebaseApp } from "@/lib/firebase/client";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { useAuth } from "@/hooks/use-auth";
import { addGuestBooking } from "@/features/appointments/guest-booking-store";
import { downloadIcs, googleCalendarUrl, type CalendarEventInput } from "@/lib/calendar/appointment-calendar";
import type { Appointment } from "@/types/appointments";

type BusinessInfo = { name:string; address:string; phone:string; slug:string; logoUrl:string };
type PublicAppointmentResponse = {
  appointment: Appointment;
  business: BusinessInfo;
};

const statusMap: Record<string,{label:string;className:string;icon:LucideIcon;style:CSSProperties;iconColor:string}> = {
  pending:{label:"Onay bekliyor",className:"pending",icon:Clock3,style:{background:"rgb(245 158 11/.22)",borderColor:"rgb(251 191 36/.35)"},iconColor:"#fcd34d"},
  confirmed:{label:"Onaylandı",className:"confirmed",icon:CheckCircle2,style:{},iconColor:"#c9f45b"},
  completed:{label:"Tamamlandı",className:"completed",icon:BadgeCheck,style:{background:"rgb(59 130 246/.2)",borderColor:"rgb(147 197 253/.3)"},iconColor:"#93c5fd"},
  cancelled:{label:"İptal edildi",className:"cancelled",icon:XCircle,style:{},iconColor:"#fca5a5"},
  no_show:{label:"Gerçekleşmedi",className:"no-show",icon:History,style:{},iconColor:"#fca5a5"},
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
  const [now] = useState(() => Date.now());

  useEffect(()=>{
    const token=params.publicToken; if(!token)return; let cancelled=false;
    (async()=>{try{
      const getPublicAppointment = httpsCallable<{ publicToken:string }, PublicAppointmentResponse>(getFunctions(getFirebaseApp(), "europe-west1"), "getAppointmentByPublicToken");
      const result = await getPublicAppointment({ publicToken: token });
      if(cancelled)return;
      setAppointment(result.data.appointment);
      setBusiness(result.data.business);
    }catch(reason){
      if(!cancelled){
        const message=(reason as {message?:string}).message??"Randevu bilgilerine ulaşılamadı.";
        setError(message.includes("not-found")?"Randevu bulunamadı veya bağlantının süresi dolmuş olabilir.":message);
      }
    }finally{if(!cancelled)setLoading(false)}})();
    return()=>{cancelled=true};
  },[params.publicToken]);

  const signedIn = authStatus === "authenticated";
  const back = signedIn ? {href:"/hesabim",label:"Randevularıma dön"} : {href:"/",label:"Ana sayfaya dön"};

  if(loading)return <div className="appointment-detail-loading"><LoadingState title="Randevunuz hazırlanıyor" description="İşletme, hizmet ve zaman bilgileri güvenle getiriliyor…"/></div>;
  if(error||!appointment)return <div className="appointment-detail-error"><ErrorState title="Randevuya ulaşılamadı" description={error??"Randevu kaydı bulunamadı."}/><Link href={back.href}><ArrowLeft size={15}/> {back.label}</Link></div>;

  const start=new Date(appointment.startAt); const end=new Date(appointment.endAt); const status=statusMap[appointment.status]??statusMap.pending;
  const StatusIcon=status.icon;
  const date=start.toLocaleDateString("tr-TR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const time=`${start.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}${Number.isNaN(end.getTime())?"":` — ${end.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}`}`;
  const additional=appointment.additionalServices??[];
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

  return <div className="appointment-detail-page"><MarketingHeader/><main className="appointment-detail-shell">
    <Link href={back.href} className="appointment-detail-back"><ArrowLeft size={16}/> {back.label}</Link>
    <section className="appointment-detail-hero">
      <div className="appointment-detail-orbit"/><div className="appointment-detail-brand">{business.logoUrl?<Image src={business.logoUrl} alt={`${business.name} logosu`} fill sizes="82px"/>:<Store size={32}/>}</div>
      <div className="appointment-detail-title"><span><BadgeCheck size={14}/> RANDEVU ONAY MERKEZİ</span><h1>{business.name||"Randevunuz"}</h1><p>{serviceSummary} için tüm detaylar tek ekranda.</p></div>
      <div className={`appointment-detail-status ${status.className}`} style={status.style}><StatusIcon size={17} style={{color:status.iconColor}}/><span><small>DURUM</small><b>{status.label}</b></span></div>
    </section>
    <section className="appointment-detail-grid">
      <div className="appointment-detail-main">
        <header><span>RANDEVU PLANI</span><h2>{upcomingActive?"Takviminiz hazır.":appointment.status==="cancelled"?"Bu randevu iptal edildi.":"Randevu özeti."}</h2></header>
        <div className="appointment-time-card"><CalendarDays/><div><small>TARİH</small><b>{date}</b></div><Clock3/><div><small>SAAT</small><b>{time}</b></div></div>
        <div className="appointment-detail-facts">
          <Detail icon={<BriefcaseBusiness/>} label="Hizmetler" value={serviceSummary}/>
          <Detail icon={<UserRound/>} label="Uzman" value={appointment.staffName||"İşletme ekibi"}/>
          <Detail icon={<Clock3/>} label="Toplam süre" value={totalDuration?`${totalDuration} dakika`:"İşletme belirleyecek"}/>
          <Detail icon={<WalletCards/>} label="Toplam tutar" value={totalPrice!=null?formatPrice(totalPrice):"İşletmede"}/>
        </div>
        {additional.length>0&&<div className="mt-3 rounded-2xl border border-[#e3e8dc] bg-[#fbfbf6] p-4 text-[11px] text-[#334a3f]">
          <span className="text-[8px] font-black tracking-[.14em] text-[#0b6b45]">HİZMET DÖKÜMÜ</span>
          <ul className="mt-2 grid gap-1.5">
            <ServiceLine name={appointment.serviceName||"Ana hizmet"} duration={primaryDuration} price={primaryPrice}/>
            {additional.map((item,index)=><ServiceLine key={`${item.serviceId}-${index}`} name={`+ ${item.name}`} duration={Number(item.durationMinutes)||0} price={Number(item.price)||0}/>)}
            <li className="mt-1 flex items-center justify-between gap-3 border-t border-[#e3e8dc] pt-2 font-bold text-[#0f2a1f]"><span>Toplam</span><span>{totalDuration?`${totalDuration} dk`:""}{totalDuration&&totalPrice!=null?" · ":""}{totalPrice!=null?formatPrice(totalPrice):""}</span></li>
          </ul>
        </div>}
        {appointment.notes&&<div className="appointment-detail-note"><span>RANDEVU NOTUNUZ</span><p>{appointment.notes}</p></div>}
        {calendarEvent&&<div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={()=>downloadIcs(calendarEvent,`randevu-${start.toISOString().slice(0,10)}.ics`)} className="inline-flex items-center gap-2 rounded-xl border border-[#d8e4d4] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0b6b45] transition hover:border-[#0b6b45]"><Download size={15}/> Takvime ekle (.ics)</button>
          <a href={googleCalendarUrl(calendarEvent)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#d8e4d4] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0b6b45] transition hover:border-[#0b6b45]"><CalendarPlus size={15}/> Google Takvim</a>
        </div>}
        {showSaveToAccount&&<Link href={SAVE_TO_ACCOUNT_HREF} onClick={()=>addGuestBooking({publicToken:params.publicToken,businessId:appointment.businessId??"",appointmentId:appointment.id??""})} className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#cfe6d5] bg-[#effaf2] px-4 py-3 text-xs font-bold text-[#0b6b45] transition hover:border-[#0b6b45]">
          <span><small className="block text-[8px] font-black tracking-[.14em] text-[#3d8a62]">HESABIMA KAYDET</small>Giriş yapın, bu randevu Randevularım listenize eklensin.</span><ArrowRight size={17}/>
        </Link>}
      </div>
      <aside className="appointment-detail-side"><span>İŞLETME BİLGİLERİ</span><h2>{business.name}</h2><p><MapPin size={17}/>{business.address||"Adres bilgisi işletmeden alınabilir."}</p><div>{business.phone&&<a href={`tel:${business.phone}`}><Phone size={17}/> İşletmeyi ara</a>}<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`} target="_blank" rel="noopener noreferrer"><Navigation size={17}/> Yol tarifi</a>{business.slug&&<Link href={`/isletme/${business.slug}`}><Store size={17}/> Mağazayı görüntüle</Link>}</div><small><ShieldCheck size={14}/> Bilgileriniz güvenli şekilde korunur.</small></aside>
    </section>
  </main><MarketingFooter/></div>;
}

function Detail({icon,label,value}:{icon:ReactNode;label:string;value:string}){return <article><i>{icon}</i><span><small>{label}</small><b>{value}</b></span></article>}

function ServiceLine({name,duration,price}:{name:string;duration:number;price:number|null}){
  return <li className="flex items-center justify-between gap-3"><span className="min-w-0 truncate">{name}</span><span className="shrink-0 text-[#586c61]">{duration?`${duration} dk`:""}{duration&&price!=null?" · ":""}{price!=null?formatPrice(price):""}</span></li>;
}
