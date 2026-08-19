"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, MapPin, Navigation, Phone, ShieldCheck, Store, UserRound, WalletCards } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import type { Appointment } from "@/types/appointments";

type BusinessInfo = { name:string; address:string; phone:string; slug:string; logoUrl:string };

const statusMap: Record<string,{label:string;className:string}> = {
  pending:{label:"Onay bekliyor",className:"pending"}, confirmed:{label:"Onaylandı",className:"confirmed"}, completed:{label:"Tamamlandı",className:"completed"}, cancelled:{label:"İptal edildi",className:"cancelled"}, no_show:{label:"Gerçekleşmedi",className:"no-show"},
};

export default function AppointmentDetailPage() {
  const params = useParams<{ publicToken: string }>();
  const [appointment,setAppointment] = useState<Appointment|null>(null);
  const [business,setBusiness] = useState<BusinessInfo>({name:"",address:"",phone:"",slug:"",logoUrl:""});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);

  useEffect(()=>{
    const token=params.publicToken; if(!token)return; let cancelled=false;
    (async()=>{try{
      const db=getDb(); const tokenSnap=await getDoc(doc(db,"appointmentTokens",token));
      if(!tokenSnap.exists()) throw new Error("Randevu bulunamadı veya bağlantının süresi dolmuş olabilir.");
      const businessId=String(tokenSnap.data().businessId??""); const appointmentId=String(tokenSnap.data().appointmentId??"");
      if(!businessId||!appointmentId) throw new Error("Randevu bilgilerine ulaşılamadı.");
      const [appointmentSnap,businessSnap]=await Promise.all([getDoc(doc(db,"businesses",businessId,"appointments",appointmentId)),getDoc(doc(db,"businesses",businessId))]);
      if(!appointmentSnap.exists()) throw new Error("Randevu kaydı bulunamadı."); if(cancelled)return;
      const data=appointmentSnap.data();
      setAppointment({id:appointmentSnap.id,...data,startAt:data.startAt?.toDate?.()?.toISOString?.()??String(data.startAt??""),endAt:data.endAt?.toDate?.()?.toISOString?.()??String(data.endAt??""),createdAt:data.createdAt?.toDate?.()?.toISOString?.()??"",updatedAt:data.updatedAt?.toDate?.()?.toISOString?.()??""} as Appointment);
      if(businessSnap.exists()){const item=businessSnap.data();setBusiness({name:String(item.name??"İşletme"),address:[item.address,item.district,item.city].filter(Boolean).join(", "),phone:String(item.phone??""),slug:String(item.slug??""),logoUrl:String(item.logoUrl??"")});}
    }catch(reason){if(!cancelled)setError((reason as Error).message);}finally{if(!cancelled)setLoading(false)}})();
    return()=>{cancelled=true};
  },[params.publicToken]);

  if(loading)return <div className="appointment-detail-loading"><LoadingState title="Randevunuz hazırlanıyor" description="İşletme, hizmet ve zaman bilgileri güvenle getiriliyor…"/></div>;
  if(error||!appointment)return <div className="appointment-detail-error"><ErrorState title="Randevuya ulaşılamadı" description={error??"Randevu kaydı bulunamadı."}/><Link href="/hesabim"><ArrowLeft size={15}/> Randevularıma dön</Link></div>;

  const start=new Date(appointment.startAt); const end=new Date(appointment.endAt); const status=statusMap[appointment.status]??{label:appointment.status,className:"pending"};
  const date=start.toLocaleDateString("tr-TR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const time=`${start.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}${Number.isNaN(end.getTime())?"":` — ${end.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}`}`;

  return <div className="appointment-detail-page"><MarketingHeader/><main className="appointment-detail-shell">
    <Link href="/hesabim" className="appointment-detail-back"><ArrowLeft size={16}/> Randevularıma dön</Link>
    <section className="appointment-detail-hero">
      <div className="appointment-detail-orbit"/><div className="appointment-detail-brand">{business.logoUrl?<Image src={business.logoUrl} alt={`${business.name} logosu`} fill sizes="82px"/>:<Store size={32}/>}</div>
      <div className="appointment-detail-title"><span><BadgeCheck size={14}/> RANDEVU ONAY MERKEZİ</span><h1>{business.name||"Randevunuz"}</h1><p>{appointment.serviceName||"Hizmet"} için tüm detaylar tek ekranda.</p></div>
      <div className={`appointment-detail-status ${status.className}`}><CheckCircle2 size={17}/><span><small>DURUM</small><b>{status.label}</b></span></div>
    </section>
    <section className="appointment-detail-grid">
      <div className="appointment-detail-main">
        <header><span>RANDEVU PLANI</span><h2>Takviminiz hazır.</h2></header>
        <div className="appointment-time-card"><CalendarDays/><div><small>TARİH</small><b>{date}</b></div><Clock3/><div><small>SAAT</small><b>{time}</b></div></div>
        <div className="appointment-detail-facts">
          <Detail icon={<BriefcaseBusiness/>} label="Hizmet" value={appointment.serviceName||"Belirtilmedi"}/>
          <Detail icon={<UserRound/>} label="Uzman" value={appointment.staffName||"İşletme ekibi"}/>
          <Detail icon={<Clock3/>} label="Süre" value={appointment.serviceDurationMinutes?`${appointment.serviceDurationMinutes} dakika`:"İşletme belirleyecek"}/>
          <Detail icon={<WalletCards/>} label="Tutar" value={appointment.servicePrice!=null?`${appointment.servicePrice.toLocaleString("tr-TR")} ₺`:"İşletmede"}/>
        </div>
        {appointment.notes&&<div className="appointment-detail-note"><span>RANDEVU NOTUNUZ</span><p>{appointment.notes}</p></div>}
      </div>
      <aside className="appointment-detail-side"><span>İŞLETME BİLGİLERİ</span><h2>{business.name}</h2><p><MapPin size={17}/>{business.address||"Adres bilgisi işletmeden alınabilir."}</p><div>{business.phone&&<a href={`tel:${business.phone}`}><Phone size={17}/> İşletmeyi ara</a>}<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`} target="_blank" rel="noopener noreferrer"><Navigation size={17}/> Yol tarifi</a>{business.slug&&<Link href={`/isletme/${business.slug}`}><Store size={17}/> Mağazayı görüntüle</Link>}</div><small><ShieldCheck size={14}/> Bilgileriniz güvenli şekilde korunur.</small></aside>
    </section>
  </main><MarketingFooter/></div>;
}

function Detail({icon,label,value}:{icon:ReactNode;label:string;value:string}){return <article><i>{icon}</i><span><small>{label}</small><b>{value}</b></span></article>}
