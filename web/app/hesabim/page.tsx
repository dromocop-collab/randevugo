"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collectionGroup, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { updateProfile } from "firebase/auth";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarDays, Check, ChevronRight, CircleUserRound, Clock3, Compass, ExternalLink, History, LayoutDashboard, LoaderCircle, LogOut, MapPin, MessageCircleMore, Search, Settings2, Sparkles, Star, Store, TicketCheck, UserRound, X } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import { logout } from "@/features/auth/auth-service";
import { LoadingState } from "@/components/ui/states";
import { ReviewForm } from "@/components/storefront/review-form";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { SupportRequestModal } from "@/components/support/support-request-modal";
import { useBusinessContext } from "@/features/businesses/business-context";

interface CustomerAppointment { id:string; businessId:string; businessName:string; businessSlug:string; businessLogo?:string; businessCity:string; businessPhone:string; serviceName:string; staffName:string; startAt:string; endAt:string; status:string; publicToken?:string; price?:number }
type AccountTab = "overview" | "appointments" | "profile";
type AppointmentFilter = "all" | "upcoming" | "history" | "cancelled";

const statuses: Record<string,{label:string;icon:typeof Clock3}> = {
  pending:{label:"Onay bekliyor",icon:Clock3}, confirmed:{label:"Onaylandı",icon:BadgeCheck}, completed:{label:"Tamamlandı",icon:Check}, cancelled:{label:"İptal edildi",icon:X}, no_show:{label:"Gerçekleşmedi",icon:History},
};

export default function CustomerAccountPage() {
  const { user, status: authStatus } = useAuth();
  const { businesses, businessId, setBusinessId, loading: businessesLoading } = useBusinessContext();
  const router = useRouter();
  const [appointments,setAppointments] = useState<CustomerAppointment[]>([]);
  const [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState("");
  const [tab,setTab] = useState<AccountTab>("overview");
  const [filter,setFilter] = useState<AppointmentFilter>("all");
  const [search,setSearch] = useState("");
  const [reviewing,setReviewing] = useState<CustomerAppointment|null>(null);
  const [cancelling,setCancelling] = useState<CustomerAppointment|null>(null);
  const [cancelBusy,setCancelBusy] = useState(false);
  const [profileName,setProfileName] = useState("");
  const [profilePhone,setProfilePhone] = useState("");
  const [profileBusy,setProfileBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses[0];

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    let active = true;
    const db = getDb();
    (async () => {
      try {
        const [appointmentSnap,userSnap] = await Promise.all([
          getDocs(query(collectionGroup(db,"appointments"),where("customerId","==",user.uid),orderBy("startAt","desc"),limit(50))),
          getDoc(doc(db,"users",user.uid)).catch(()=>null),
        ]);
        const businessIds = [...new Set(appointmentSnap.docs.map(item=>String(item.data().businessId??"")).filter(Boolean))];
        const businessSnaps = await Promise.all(businessIds.map(id=>getDoc(doc(db,"businesses",id)).catch(()=>null)));
        const businessMap = new Map(businessIds.map((id,index)=>[id,businessSnaps[index]?.exists()?businessSnaps[index]!.data():{}]));
        const rows = appointmentSnap.docs.map(item=>{
          const data=item.data(); const businessId=String(data.businessId??""); const business=businessMap.get(businessId)??{};
          return { id:item.id,businessId,businessName:String(business.name??"İşletme"),businessSlug:String(business.slug??""),businessLogo:typeof business.logoUrl==="string"?business.logoUrl:undefined,businessCity:[business.district,business.city].filter(Boolean).join(", "),businessPhone:String(business.phone??""),serviceName:String(data.serviceName??"Hizmet"),staffName:String(data.staffName??"Farketmez"),startAt:data.startAt?.toDate?.()?data.startAt.toDate().toISOString():String(data.startAt??""),endAt:data.endAt?.toDate?.()?data.endAt.toDate().toISOString():String(data.endAt??""),status:String(data.status??"pending"),publicToken:data.publicToken?String(data.publicToken):undefined,price:Number.isFinite(Number(data.price??data.totalPrice))?Number(data.price??data.totalPrice):undefined } satisfies CustomerAppointment;
        });
        if (!active) return;
        setAppointments(rows);
        setProfileName(String(userSnap?.data()?.displayName??user.displayName??""));
        setProfilePhone(String(userSnap?.data()?.phone??""));
      } catch (error) { if(active){setAppointments([]);setLoadError((error as Error).message||"Randevular yüklenemedi.");} }
      finally { if(active)setLoading(false); }
    })();
    return()=>{active=false};
  },[authStatus,user]);

  const upcoming = appointments.filter(item=>["pending","confirmed"].includes(item.status)&&new Date(item.startAt).getTime()>now).sort((a,b)=>+new Date(a.startAt)-+new Date(b.startAt));
  const completed = appointments.filter(item=>item.status==="completed"||(["pending","confirmed"].includes(item.status)&&new Date(item.startAt).getTime()<=now));
  const next = upcoming[0];
  const filtered = useMemo(()=>appointments.filter(item=>{
    const future=new Date(item.startAt).getTime()>now;
    if(filter==="upcoming"&&!(["pending","confirmed"].includes(item.status)&&future))return false;
    if(filter==="history"&&!(item.status==="completed"||(!future&&item.status!=="cancelled")))return false;
    if(filter==="cancelled"&&item.status!=="cancelled")return false;
    const needle=search.trim().toLocaleLowerCase("tr-TR");
    return !needle||`${item.businessName} ${item.serviceName} ${item.staffName}`.toLocaleLowerCase("tr-TR").includes(needle);
  }),[appointments,filter,search,now]);

  async function cancelAppointment() {
    if(!cancelling)return; setCancelBusy(true);
    try { const fn=httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"cancelCustomerAppointment"); await fn({businessId:cancelling.businessId,appointmentId:cancelling.id}); setAppointments(rows=>rows.map(row=>row.id===cancelling.id?{...row,status:"cancelled"}:row)); toast.success("Randevunuz iptal edildi ve işletmeye bildirildi."); setCancelling(null); }
    catch(error){toast.error((error as {message?:string}).message??"Randevu iptal edilemedi.");} finally{setCancelBusy(false)}
  }

  async function saveProfile() {
    if(!user||profileName.trim().length<2){toast.error("Lütfen geçerli bir isim yazın.");return} setProfileBusy(true);
    try { await Promise.all([updateProfile(user,{displayName:profileName.trim()}),setDoc(doc(getDb(),"users",user.uid),{displayName:profileName.trim(),phone:profilePhone.trim(),email:user.email,updatedAt:serverTimestamp()},{merge:true})]); toast.success("Hesap bilgileriniz güncellendi."); }
    catch(error){toast.error((error as Error).message)} finally{setProfileBusy(false)}
  }

  if(authStatus==="loading")return <LoadingState title="Hesabınız hazırlanıyor" description="Randevularınız güvenle getiriliyor…"/>;

  return <div className="customer-account"><MarketingHeader/>
    <main>
      <section className="account-hero"><div className="account-hero-grid"/><div className="account-hero-copy"><span><Sparkles size={15}/> KİŞİSEL RANDEVU MERKEZİNİZ</span><h1>Planınız net,<br/><em>gününüz size kalsın.</em></h1><p>Yaklaşan randevularınızı yönetin, geçmiş deneyimlerinizi değerlendirin ve sevdiğiniz işletmelere hızla geri dönün.</p><div className="account-hero-actions"><Link href="/kesfet"><Compass size={17}/> Yeni randevu keşfet</Link>{activeBusiness&&<Link href="/dashboard" className="account-dashboard-hero"><BriefcaseBusiness size={17}/> İşletme paneline geç</Link>}<SupportRequestModal audience="customer" triggerLabel="Yardım iste" triggerClassName="account-support-trigger"/></div></div><div className="account-hero-visual"><Image src="/images/help-customer.png" alt="Randevu ve müşteri hesabı görseli" fill priority sizes="(max-width:900px) 100vw, 42vw"/><div className="account-floating-card"><TicketCheck size={20}/><span><b>{upcoming.length} yaklaşan randevu</b><small>Her şey tek yerde</small></span></div></div></section>

      <section className="account-shell">
        <aside className="account-sidebar"><div className="account-profile-mini"><div>{(profileName||user?.email||"U").charAt(0).toUpperCase()}</div><span><b>{profileName||user?.displayName||"Hoş geldiniz"}</b><small>{user?.email}</small></span></div><nav>{([{key:"overview",label:"Genel bakış",icon:LayoutDashboard},{key:"appointments",label:"Randevularım",icon:CalendarDays},{key:"profile",label:"Hesap ayarları",icon:CircleUserRound}] as const).map(({key,label,icon:Icon})=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}><Icon size={18}/><span>{label}</span>{key==="appointments"&&<i>{appointments.length}</i>}</button>)}</nav>{activeBusiness&&<section className="account-business-access"><div><i><BriefcaseBusiness size={18}/></i><span><small>İŞLETME HESABI</small><b>{activeBusiness.name}</b></span></div>{businesses.length>1&&<label><span>Yönetilecek işletme</span><select value={activeBusiness.id} onChange={event=>setBusinessId(event.target.value)}>{businesses.map(business=><option value={business.id} key={business.id}>{business.name}</option>)}</select></label>}<Link href="/dashboard">Yönetim paneline geç <ExternalLink size={14}/></Link></section>}{businessesLoading&&!activeBusiness&&<div className="account-business-loading" aria-label="İşletme hesapları yükleniyor"/>}<div className="account-side-help"><MessageCircleMore size={22}/><b>Bir sorunuz mu var?</b><p>Destek merkezimiz her adımda yanınızda.</p><Link href="/yardim-merkezi">Yardım merkezini aç <ArrowRight size={13}/></Link></div><button className="account-logout" onClick={async()=>{await logout();router.push("/musteri/giris")}}><LogOut size={17}/> Güvenli çıkış</button></aside>

        <div className="account-content">
          {tab==="overview"&&<>
            <div className="account-section-head"><div><span>GENEL BAKIŞ</span><h2>Bugünün randevu özeti.</h2></div><button onClick={()=>setTab("appointments")}>Tüm randevular <ChevronRight size={16}/></button></div>
            <div className="account-metrics"><article><span><CalendarDays/></span><div><b>{upcoming.length}</b><small>Yaklaşan</small></div></article><article><span><Check/></span><div><b>{completed.length}</b><small>Tamamlanan</small></div></article><article><span><Star/></span><div><b>{appointments.filter(x=>x.status==="completed").length}</b><small>Değerlendirilebilir</small></div></article></div>
            {next?<section className="account-next"><div className="account-next-date"><strong>{new Date(next.startAt).toLocaleDateString("tr-TR",{day:"2-digit"})}</strong><span>{new Date(next.startAt).toLocaleDateString("tr-TR",{month:"short"}).toUpperCase()}</span><small>{new Date(next.startAt).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</small></div><div className="account-next-info"><span>SIRADAKİ RANDEVUNUZ</span><h3>{next.businessName}</h3><p>{next.serviceName} · {next.staffName}</p><small><MapPin size={13}/>{next.businessCity||"Konum bilgisi işletmede"}</small></div><div className="account-next-actions">{next.publicToken&&<Link href={`/randevu/${next.publicToken}`}>Detayları aç <ArrowRight size={14}/></Link>}<button onClick={()=>setCancelling(next)}>Randevuyu iptal et</button></div></section>:<section className="account-empty-premium"><div><CalendarDays size={31}/></div><h3>Takviminizde yaklaşan randevu yok.</h3><p>Size iyi gelecek hizmeti keşfedin; uygun saati birkaç adımda ayırın.</p><Link href="/kesfet">İşletmeleri keşfet <ArrowRight size={15}/></Link></section>}
            <div className="account-recent-head"><h3>Son hareketler</h3><button onClick={()=>setTab("appointments")}>Geçmişi görüntüle</button></div><div className="account-recent-list">{appointments.slice(0,3).map(item=><AppointmentRow key={item.id} item={item} now={now} onCancel={()=>setCancelling(item)} onReview={()=>setReviewing(item)}/>)}</div>
          </>}

          {tab==="appointments"&&<>
            <div className="account-section-head"><div><span>RANDEVULARIM</span><h2>Tüm planınız, tek akışta.</h2></div><Link href="/kesfet">+ Yeni randevu</Link></div>
            <div className="account-appointment-toolbar"><label><Search size={17}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="İşletme, hizmet veya çalışan ara…"/></label><div>{([['all','Tümü'],['upcoming','Yaklaşan'],['history','Geçmiş'],['cancelled','İptal']] as const).map(([key,label])=><button key={key} className={filter===key?"active":""} onClick={()=>setFilter(key)}>{label}</button>)}</div></div>
            {loading?<div className="account-loading-list">{[1,2,3].map(x=><i key={x}/>)}</div>:loadError?<div className="account-error"><X/><h3>Randevular yüklenemedi.</h3><p>{loadError}</p></div>:filtered.length?<div className="account-appointment-list">{filtered.map(item=><AppointmentRow key={item.id} item={item} now={now} onCancel={()=>setCancelling(item)} onReview={()=>setReviewing(item)}/>)}</div>:<div className="account-empty-premium"><div><Search size={31}/></div><h3>Bu görünümde randevu bulunamadı.</h3><p>Filtreyi temizleyebilir veya yeni bir işletme keşfedebilirsiniz.</p><button onClick={()=>{setFilter("all");setSearch("")}}>Filtreleri temizle</button></div>}
          </>}

          {tab==="profile"&&<>
            <div className="account-section-head"><div><span>HESAP AYARLARI</span><h2>Bilgileriniz hep güncel.</h2></div></div>
            <section className="account-profile-card"><div className="account-profile-art"><Image src="/images/booking-flow-hero.png" alt="" fill sizes="(max-width:800px) 100vw, 34vw"/><span><UserRound size={26}/></span></div><div className="account-profile-form"><label><span>İsim soyisim</span><input value={profileName} onChange={event=>setProfileName(event.target.value)} maxLength={80} placeholder="Adınız ve soyadınız"/></label><label><span>Telefon</span><input value={profilePhone} onChange={event=>setProfilePhone(event.target.value)} maxLength={22} inputMode="tel" placeholder="05xx xxx xx xx"/></label><label><span>E-posta</span><input value={user?.email??""} disabled/></label><p><Settings2 size={15}/> Telefon bilginiz destek taleplerinde ve size ulaşılması gereken durumlarda kullanılır.</p><button onClick={saveProfile} disabled={profileBusy}>{profileBusy?<><LoaderCircle className="animate-spin" size={16}/> Kaydediliyor</>:<>Bilgileri kaydet <Check size={16}/></>}</button></div></section>
          </>}
        </div>
      </section>
    </main><MarketingFooter/>

    {reviewing&&<div className="account-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setReviewing(null)}}><div className="account-review-wrap"><button onClick={()=>setReviewing(null)} aria-label="Kapat"><X/></button><div><span>DEĞERLENDİRME</span><h3>{reviewing.businessName}</h3><p>{reviewing.serviceName} · {formatDate(reviewing.startAt)}</p></div><ReviewForm businessId={reviewing.businessId} appointmentId={reviewing.id} serviceName={reviewing.serviceName} staffName={reviewing.staffName} onSuccess={()=>setReviewing(null)}/></div></div>}
    {cancelling&&<div className="account-overlay" onMouseDown={event=>{if(event.target===event.currentTarget&&!cancelBusy)setCancelling(null)}}><section className="account-cancel-modal"><button className="account-modal-close" onClick={()=>setCancelling(null)} disabled={cancelBusy}><X/></button><div><CalendarDays size={27}/></div><span>RANDEVU İPTALİ</span><h2>Bu randevuyu iptal etmek istediğinize emin misiniz?</h2><p><b>{cancelling.businessName}</b><br/>{cancelling.serviceName} · {formatDate(cancelling.startAt)}</p><small>İptal bilgisi anında işletmeye iletilecek.</small><footer><button onClick={()=>setCancelling(null)} disabled={cancelBusy}>Vazgeç</button><button onClick={cancelAppointment} disabled={cancelBusy}>{cancelBusy?<LoaderCircle className="animate-spin"/>:"Evet, iptal et"}</button></footer></section></div>}
  </div>;
}

function AppointmentRow({item,now,onCancel,onReview}:{item:CustomerAppointment;now:number;onCancel:()=>void;onReview:()=>void}) {
  const status=statuses[item.status]??{label:item.status,icon:Clock3}; const StatusIcon=status.icon; const future=new Date(item.startAt).getTime()>now; const active=["pending","confirmed"].includes(item.status)&&future; const href=item.businessSlug?`/isletme/${item.businessSlug}`:"/kesfet";
  return <article className="customer-appointment-card"><div className="appointment-business-logo">{item.businessLogo?<Image src={item.businessLogo} alt="" fill sizes="54px"/>:<Store size={23}/>}</div><div className="appointment-main"><div><span className={`appointment-status status-${item.status}`}><StatusIcon size={13}/>{status.label}</span><small>{formatDate(item.startAt)}</small></div><h3>{item.businessName}</h3><p>{item.serviceName}<i/> {item.staffName}</p><span><MapPin size={13}/>{item.businessCity||"İşletme konumu"}</span></div><div className="appointment-card-actions">{item.publicToken&&<Link href={`/randevu/${item.publicToken}`}>Detay <ChevronRight size={14}/></Link>}<Link href={href}>{active?"Mağazayı aç":"Tekrar randevu"}</Link>{active&&<button onClick={onCancel}>İptal et</button>}{item.status==="completed"&&<button className="review" onClick={onReview}><Star size={13}/> Yorum yap</button>}</div></article>;
}

function formatDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"Tarih bilgisi yok":date.toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"})+" · "+date.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}
