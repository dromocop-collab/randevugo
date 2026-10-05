"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, collectionGroup, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, startAfter, where, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { updateProfile } from "firebase/auth";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, BadgeCheck, BellRing, BriefcaseBusiness, CalendarClock, CalendarDays, CalendarPlus, Check, ChevronRight, CircleUserRound, Clock3, Coins, Compass, Crown, ExternalLink, Fingerprint, Gift, Heart, History, KeyRound, LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, MapPin, MessageCircleMore, PackageCheck, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, Star, Store, TicketCheck, Trash2, UserRound, X } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import { forgotPassword, logout } from "@/features/auth/auth-service";
import { LoadingState } from "@/components/ui/states";
import { ReviewForm } from "@/components/storefront/review-form";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { SupportRequestModal } from "@/components/support/support-request-modal";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listFavoriteBusinesses, removeFavoriteBusiness, type FavoriteBusiness } from "@/features/customers/favorite-repository";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { AvailabilityAlertsPanel } from "@/features/availability/availability-alerts-panel";
import { CustomerMessagesPanel } from "@/features/support/customer-messages-panel";
import { useGuestAppointmentClaim } from "@/features/appointments/use-guest-appointment-claim";
import { RescheduleDialog } from "@/features/appointments/reschedule-dialog";
import { appointmentChangeError, rescheduleCustomerAppointment } from "@/features/appointments/appointment-change";
import type { AvailableAppointmentSlot } from "@/features/appointments/appointment-repository";
import { PushToggleCard } from "@/features/push";

interface CustomerAppointment { id:string; businessId:string; businessName:string; businessSlug:string; businessLogo?:string; businessCity:string; businessPhone:string; serviceId:string; staffId:string; serviceName:string; staffName:string; startAt:string; endAt:string; status:string; publicToken?:string; price?:number; rescheduleCount:number; allowReschedule:boolean; maximumBookingDaysAhead:number; timeZone:string; additionalServices?:Array<{serviceId:string;name:string;price:number;durationMinutes:number}> }
interface SuspendedBusiness { id: string; name: string; adminNote?: string }
interface CustomerBenefitPackage { id:string; businessId:string; businessName:string; businessSlug:string; packageName:string; serviceName:string; totalSessions:number; remainingSessions:number; status:string; expiresAt:string|null }
interface LoyaltyBenefit { id:string; businessId:string; businessName:string; businessSlug:string; points:number; lifetimePoints:number; totalSpent:number }
interface CustomerBenefitsPayload { packages:CustomerBenefitPackage[]; loyalty:LoyaltyBenefit[]; phoneRequired:boolean }
type AccountTab = "overview" | "appointments" | "alerts" | "messages" | "benefits" | "favorites" | "profile";
type AppointmentFilter = "all" | "upcoming" | "history" | "cancelled";

const APPOINTMENT_PAGE_SIZE = 50;
const ACCOUNT_TABS = [
  {key:"overview",label:"Genel bakış",icon:LayoutDashboard},
  {key:"appointments",label:"Randevularım",icon:CalendarDays},
  {key:"alerts",label:"Müsaitlik Bildirimleri",icon:BellRing},
  {key:"messages",label:"Mesajlarım",icon:MessageCircleMore},
  {key:"benefits",label:"Paketlerim & Puanlarım",icon:Gift},
  {key:"favorites",label:"Favorilerim",icon:Heart},
  {key:"profile",label:"Hesap ayarları",icon:CircleUserRound},
] as const;

const statuses: Record<string,{label:string;icon:typeof Clock3}> = {
  pending:{label:"Onay bekliyor",icon:Clock3}, confirmed:{label:"Onaylandı",icon:BadgeCheck}, completed:{label:"Tamamlandı",icon:Check}, cancelled:{label:"İptal edildi",icon:X}, no_show:{label:"Gerçekleşmedi",icon:History},
};

async function hydrateAppointments(items: QueryDocumentSnapshot<DocumentData>[]): Promise<CustomerAppointment[]> {
  const db=getDb();
  const businessIds=[...new Set(items.map(item=>String(item.data().businessId??"")).filter(Boolean))];
  const businessSnaps=await Promise.all(businessIds.map(id=>getDoc(doc(db,"businesses",id)).catch(()=>null)));
  const businessMap=new Map(businessIds.map((id,index)=>[id,businessSnaps[index]?.exists()?businessSnaps[index]!.data():{}]));
  return items.map(item=>{
    const data=item.data(); const businessId=String(data.businessId??""); const business=businessMap.get(businessId)??{};
    const additionalServices=Array.isArray(data.additionalServices)?data.additionalServices.flatMap((service:unknown)=>{
      if(!service||typeof service!=="object")return[];
      const row=service as Record<string,unknown>;
      return [{serviceId:String(row.serviceId??""),name:String(row.name??"Ek hizmet"),price:Number(row.price??0),durationMinutes:Number(row.durationMinutes??0)}];
    }):undefined;
    return {id:item.id,businessId,businessName:String(business.name??"İşletme"),businessSlug:String(business.slug??""),businessLogo:typeof business.logoUrl==="string"?business.logoUrl:undefined,businessCity:[business.district,business.city].filter(Boolean).join(", "),businessPhone:String(business.phone??""),serviceId:String(data.serviceId??""),staffId:String(data.staffId??""),serviceName:String(data.serviceName??"Hizmet"),staffName:String(data.staffName??"Farketmez"),startAt:data.startAt?.toDate?.()?data.startAt.toDate().toISOString():String(data.startAt??""),endAt:data.endAt?.toDate?.()?data.endAt.toDate().toISOString():String(data.endAt??""),status:String(data.status??"pending"),publicToken:data.publicToken?String(data.publicToken):undefined,price:Number.isFinite(Number(data.price??data.totalPrice))?Number(data.price??data.totalPrice):undefined,rescheduleCount:Number(data.rescheduleCount??0)||0,allowReschedule:business.allowReschedule!==false,maximumBookingDaysAhead:Math.max(1,Number(business.maximumBookingDaysAhead??30)||30),timeZone:typeof business.timeZone==="string"?business.timeZone:"Europe/Istanbul",additionalServices} satisfies CustomerAppointment;
  });
}

export default function CustomerAccountPage() {
  const { user, status: authStatus } = useAuth();
  const { businesses, businessId, setBusinessId, loading: businessesLoading } = useBusinessContext();
  const router = useRouter();
  const [appointments,setAppointments] = useState<CustomerAppointment[]>([]);
  const [appointmentCursor,setAppointmentCursor] = useState<QueryDocumentSnapshot<DocumentData>|null>(null);
  const [hasMoreAppointments,setHasMoreAppointments] = useState(false);
  const [appointmentsLoadingMore,setAppointmentsLoadingMore] = useState(false);
  const [favorites,setFavorites] = useState<FavoriteBusiness[]>([]);
  const [benefitPackages,setBenefitPackages] = useState<CustomerBenefitPackage[]>([]);
  const [loyaltyBenefits,setLoyaltyBenefits] = useState<LoyaltyBenefit[]>([]);
  const [benefitsPhoneRequired,setBenefitsPhoneRequired] = useState(false);
  const [benefitsError,setBenefitsError] = useState("");
  const [benefitsReloadKey,setBenefitsReloadKey] = useState(0);
  const [suspendedBusinesses,setSuspendedBusinesses] = useState<SuspendedBusiness[]>([]);
  const [loading,setLoading] = useState(true);
  const [reloadKey,setReloadKey] = useState(0);
  const [loadError,setLoadError] = useState("");
  const [tab,setTab] = useState<AccountTab>("overview");
  // Bildirim tıklaması /hesabim?tab=appointments ile gelir; geçerli sekme açılır.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested && ACCOUNT_TABS.some((item) => item.key === requested)) queueMicrotask(() => setTab(requested as AccountTab));
  }, []);
  const [filter,setFilter] = useState<AppointmentFilter>("all");
  const [search,setSearch] = useState("");
  const [reviewing,setReviewing] = useState<CustomerAppointment|null>(null);
  const [cancelling,setCancelling] = useState<CustomerAppointment|null>(null);
  const [cancelBusy,setCancelBusy] = useState(false);
  const [rescheduling,setRescheduling] = useState<CustomerAppointment|null>(null);
  const closeReschedule = useCallback(()=>setRescheduling(null),[]);
  const [profileName,setProfileName] = useState("");
  const [profilePhone,setProfilePhone] = useState("");
  const [profileBusy,setProfileBusy] = useState(false);
  const [passwordBusy,setPasswordBusy] = useState(false);
  const [verifyOpen,setVerifyOpen] = useState(false);
  const [verificationCode,setVerificationCode] = useState("");
  const [verificationBusy,setVerificationBusy] = useState(false);
  const [verificationSent,setVerificationSent] = useState(false);
  const [emailVerified,setEmailVerified] = useState(false);
  const [deleteOpen,setDeleteOpen] = useState(false);
  const [deleteConfirm,setDeleteConfirm] = useState("");
  const [deleteBusy,setDeleteBusy] = useState(false);
  const [now,setNow] = useState(() => Date.now());
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses[0];
  useGuestAppointmentClaim(() => setReloadKey((key) => key + 1));

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setLoadError(""); } });
    const db = getDb();
    (async () => {
      try {
        const [appointmentSnap,userSnap,favoriteRows,ownedBusinessSnap,benefitsResult] = await Promise.all([
          getDocs(query(collectionGroup(db,"appointments"),where("customerId","==",user.uid),orderBy("startAt","desc"),limit(APPOINTMENT_PAGE_SIZE))),
          getDoc(doc(db,"users",user.uid)).catch(()=>null),
          listFavoriteBusinesses(user.uid).catch(()=>[] as FavoriteBusiness[]),
          getDocs(query(collection(db,"businesses"),where("ownerUid","==",user.uid))).catch(()=>null),
          httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"getMyCustomerBenefits")({}).catch(()=>null),
        ]);
        const rows=await hydrateAppointments(appointmentSnap.docs);
        if (!active) return;
        setAppointments(rows);
        setAppointmentCursor(appointmentSnap.docs.at(-1)??null);
        setHasMoreAppointments(appointmentSnap.docs.length===APPOINTMENT_PAGE_SIZE);
        setFavorites(favoriteRows);
        const benefits=(benefitsResult?.data??{packages:[],loyalty:[],phoneRequired:false}) as CustomerBenefitsPayload;
        setBenefitsError(benefitsResult?"":"Paket ve puan bilgileriniz şu anda yüklenemedi.");
        setBenefitPackages(Array.isArray(benefits.packages)?benefits.packages:[]);
        setLoyaltyBenefits(Array.isArray(benefits.loyalty)?benefits.loyalty:[]);
        setBenefitsPhoneRequired(Boolean(benefits.phoneRequired));
        setSuspendedBusinesses(ownedBusinessSnap?.docs.flatMap((item)=>{
          const data=item.data();
          return data.status==="suspended"||data.isSuspended===true?[{id:item.id,name:String(data.name??"İşletme"),adminNote:typeof data.adminNote==="string"?data.adminNote:undefined}]:[];
        })??[]);
        setProfileName(String(userSnap?.data()?.displayName??user.displayName??""));
        setProfilePhone(String(userSnap?.data()?.phone??""));
        setEmailVerified(Boolean(user.emailVerified||userSnap?.data()?.emailVerified));
      } catch (error) { if(active){setAppointments([]);setAppointmentCursor(null);setHasMoreAppointments(false);setLoadError(userFacingError(error,"Randevularınıza şu anda ulaşılamadı. Lütfen yeniden deneyin."));} }
      finally { if(active)setLoading(false); }
    })();
    return()=>{active=false};
  },[authStatus,user,reloadKey]);

  useEffect(()=>{
    const refresh=()=>setNow(Date.now());
    const timer=window.setInterval(refresh,60_000);
    document.addEventListener("visibilitychange",refresh);
    return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",refresh)};
  },[]);

  useEffect(()=>{
    if(tab!=="benefits"||authStatus!=="authenticated"||!user)return;
    let active=true;
    const refreshBenefits=async()=>{
      try{
        const result=await httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"getMyCustomerBenefits")({});
        if(!active)return;
        const benefits=(result.data??{packages:[],loyalty:[],phoneRequired:false}) as CustomerBenefitsPayload;
        setBenefitsError("");
        setBenefitPackages(Array.isArray(benefits.packages)?benefits.packages:[]);
        setLoyaltyBenefits(Array.isArray(benefits.loyalty)?benefits.loyalty:[]);
        setBenefitsPhoneRequired(Boolean(benefits.phoneRequired));
      }catch(error){if(active)setBenefitsError(userFacingError(error,"Paket ve puan bilgileriniz yüklenemedi."));}
    };
    void refreshBenefits();
    const onFocus=()=>void refreshBenefits();
    window.addEventListener("focus",onFocus);
    return()=>{active=false;window.removeEventListener("focus",onFocus)};
  },[authStatus,benefitsReloadKey,tab,user]);

  const modalOpen=Boolean(reviewing||cancelling||verifyOpen||deleteOpen);
  useEffect(()=>{
    if(!modalOpen)return;
    const previousActive=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const overlay=document.querySelector<HTMLElement>(".account-overlay");
    const focusable=()=>Array.from(overlay?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')??[]).filter(item=>item.offsetParent!==null);
    const frame=window.requestAnimationFrame(()=>focusable()[0]?.focus());
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        if(cancelBusy||verificationBusy||deleteBusy)return;
        setReviewing(null);setCancelling(null);setVerifyOpen(false);setDeleteOpen(false);
        return;
      }
      if(event.key!=="Tab")return;
      const items=focusable();
      if(!items.length){event.preventDefault();return}
      const first=items[0];const last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    document.addEventListener("keydown",onKeyDown);
    return()=>{window.cancelAnimationFrame(frame);document.removeEventListener("keydown",onKeyDown);document.body.style.overflow=previousOverflow;previousActive?.focus()};
  },[modalOpen,cancelBusy,verificationBusy,deleteBusy]);

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
    catch(error){toast.error(appointmentChangeError(error,"Randevu iptal edilemedi. Lütfen yeniden deneyin."));} finally{setCancelBusy(false)}
  }

  async function confirmReschedule(slot:AvailableAppointmentSlot) {
    if(!rescheduling)return;
    // Hata RescheduleDialog içinde gösterilir; başarıda liste yeniden yüklenir.
    await rescheduleCustomerAppointment({businessId:rescheduling.businessId,appointmentId:rescheduling.id,startAtMillis:slot.startAtMillis,...(slot.staffId?{staffId:slot.staffId}:{})});
    toast.success("Randevu saatiniz güncellendi ve işletmeye bildirildi.");
    setRescheduling(null);
    setReloadKey(key=>key+1);
  }

  async function loadMoreAppointments() {
    if(!user||!appointmentCursor||appointmentsLoadingMore||!hasMoreAppointments)return;
    setAppointmentsLoadingMore(true);
    try {
      const snapshot=await getDocs(query(collectionGroup(getDb(),"appointments"),where("customerId","==",user.uid),orderBy("startAt","desc"),startAfter(appointmentCursor),limit(APPOINTMENT_PAGE_SIZE)));
      const rows=await hydrateAppointments(snapshot.docs);
      setAppointments(current=>{
        const known=new Set(current.map(item=>item.id));
        return [...current,...rows.filter(item=>!known.has(item.id))];
      });
      setAppointmentCursor(snapshot.docs.at(-1)??null);
      setHasMoreAppointments(snapshot.docs.length===APPOINTMENT_PAGE_SIZE);
    } catch(error) {
      toast.error(userFacingError(error,"Eski randevular yüklenemedi. Lütfen tekrar deneyin."));
    } finally {
      setAppointmentsLoadingMore(false);
    }
  }

  function handleTabKeyDown(event:ReactKeyboardEvent<HTMLButtonElement>,index:number) {
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
    event.preventDefault();
    const nextIndex=event.key==="Home"?0:event.key==="End"?ACCOUNT_TABS.length-1:(index+(event.key==="ArrowRight"?1:-1)+ACCOUNT_TABS.length)%ACCOUNT_TABS.length;
    const nextTab=ACCOUNT_TABS[nextIndex].key;
    setTab(nextTab);
    window.requestAnimationFrame(()=>document.getElementById(`account-tab-${nextTab}`)?.focus());
  }

  async function saveProfile() {
    if(!user||profileName.trim().length<2){toast.error("Lütfen geçerli bir isim yazın.");return} setProfileBusy(true);
    try { await Promise.all([updateProfile(user,{displayName:profileName.trim()}),setDoc(doc(getDb(),"users",user.uid),{displayName:profileName.trim(),phone:profilePhone.trim(),email:user.email,updatedAt:serverTimestamp()},{merge:true})]); toast.success("Hesap bilgileriniz güncellendi."); setReloadKey(value=>value+1); }
    catch(error){toast.error(userFacingError(error,"Hesap bilgileriniz güncellenemedi. Lütfen yeniden deneyin."))} finally{setProfileBusy(false)}
  }

  async function removeFavorite(item: FavoriteBusiness) {
    if (!user) return;
    try {
      await removeFavoriteBusiness(user.uid, item.businessId);
      setFavorites((current) => current.filter((favorite) => favorite.businessId !== item.businessId));
      toast.success(`${item.name} favorilerden çıkarıldı.`);
    } catch {
      toast.error("Favori kaldırılamadı. Lütfen tekrar deneyin.");
    }
  }

  async function sendPasswordLink() {
    if (!user?.email) return;
    setPasswordBusy(true);
    try {
      await forgotPassword(user.email);
      toast.success("Şifre yenileme bağlantısı e-posta adresinize gönderildi.");
    } catch {
      toast.error("Şifre yenileme bağlantısı gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function sendEmailVerification() {
    if(!user?.email)return;
    setVerificationBusy(true);
    try {
      const fn=httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"sendEmailVerificationCode");
      const result=await fn({email:user.email});
      const data=result.data as {verified?:boolean};
      if(data.verified){setEmailVerified(true);toast.success("E-posta adresiniz zaten doğrulanmış.");return}
      setVerificationSent(true);
      setVerifyOpen(true);
      toast.success("6 haneli doğrulama kodu e-posta adresinize gönderildi.");
    } catch(error){toast.error(userFacingError(error,"Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin."))}
    finally{setVerificationBusy(false)}
  }

  async function verifyEmail() {
    if(!user?.email||verificationCode.length!==6){toast.error("Lütfen 6 haneli kodu eksiksiz girin.");return}
    setVerificationBusy(true);
    try {
      const fn=httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"verifyEmailCode");
      await fn({email:user.email,code:verificationCode});
      await user.reload();
      setEmailVerified(true);
      setVerifyOpen(false);
      setVerificationCode("");
      toast.success("E-posta adresiniz doğrulandı.");
    } catch(error){toast.error(userFacingError(error,"Kod doğrulanamadı. Kodu kontrol edip tekrar deneyin."))}
    finally{setVerificationBusy(false)}
  }

  async function deleteAccount() {
    if(!user?.email||deleteConfirm.trim().toLocaleLowerCase("tr-TR")!==user.email.toLocaleLowerCase("tr-TR")){
      toast.error("Devam etmek için e-posta adresinizi eksiksiz yazın.");
      return;
    }
    setDeleteBusy(true);
    try {
      const fn=httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"deleteMyAccount");
      await fn({confirmationEmail:deleteConfirm.trim()});
      toast.success("Hesabınız ve ilişkili verileriniz silindi.");
      router.replace("/");
    } catch(error) {
      toast.error(userFacingError(error,"Hesap silinemedi. Lütfen yeniden giriş yapıp tekrar deneyin."));
      setDeleteBusy(false);
    }
  }

  const profileSignals=[Boolean(profileName.trim()),Boolean(profilePhone.trim()),Boolean(user?.email),emailVerified];
  const profileScore=Math.round((profileSignals.filter(Boolean).length/profileSignals.length)*100);
  const visitedBusinessCount=new Set(appointments.map(item=>item.businessId).filter(Boolean)).size;
  const completedValue=completed.reduce((total,item)=>total+(item.price??0)+(item.additionalServices??[]).reduce((sum,service)=>sum+service.price,0),0);
  const lastCompleted=completed.sort((a,b)=>+new Date(b.startAt)-+new Date(a.startAt))[0];
  const totalLoyaltyPoints=loyaltyBenefits.reduce((total,item)=>total+item.points,0);
  const activePackages=benefitPackages.filter(item=>item.status==="active"&&item.remainingSessions>0);

  if(authStatus==="loading")return <LoadingState title="Hesabınız hazırlanıyor" description="Randevularınız güvenle getiriliyor…"/>;

  return <div className="customer-account"><MarketingHeader/>
    <main>
      <section className="account-hero account-hero--compact">
        <div className="account-hero-grid"/>
        <div className="account-hero-copy">
          <span><Sparkles size={15}/> KİŞİSEL HESABINIZ</span>
          <h1>Merhaba, <em>{profileName?.split(" ")[0]||user?.displayName?.split(" ")[0]||"hoş geldiniz"}.</em></h1>
          <p>Randevularınız, paketleriniz ve sevdiğiniz işletmeler tek yerde. İhtiyacınız olan işleme kolayca ulaşın.</p>
          <div className="account-hero-actions">
            <Link href="/kesfet"><CalendarPlus size={17}/> Yeni randevu al</Link>
            {activeBusiness&&<Link href="/dashboard" className="account-dashboard-hero"><BriefcaseBusiness size={17}/> İşletme paneli</Link>}
            <SupportRequestModal audience="customer" triggerLabel="Yardım" triggerClassName="account-support-trigger"/>
          </div>
        </div>
        <div className={`account-hero-summary ${next?"has-appointment":"is-empty"}`}>
          <div className="account-hero-summary-icon">{next?<CalendarDays size={23}/>:<Compass size={23}/>}</div>
          <div className="account-hero-summary-copy">
            <span>{next?"SIRADAKİ RANDEVUNUZ":"BUGÜNÜN PLANI"}</span>
            <h2>{next?next.businessName:"Yaklaşan randevunuz yok"}</h2>
            <p>{next?`${formatDate(next.startAt)} · ${next.serviceName}`:"Yeni bir randevuyu birkaç adımda planlayabilirsiniz."}</p>
          </div>
          {next?.publicToken?<Link href={`/randevu/${next.publicToken}`}>Detayları aç <ArrowRight size={15}/></Link>:<Link href="/kesfet">Uygun yerleri gör <ArrowRight size={15}/></Link>}
        </div>
      </section>

      {suspendedBusinesses.map((business)=><section key={business.id} className="mx-auto mt-5 flex w-[calc(100%_-_32px)] max-w-[1180px] flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950"><div><small className="font-bold tracking-wider">ASKIYA ALINAN İŞLETME</small><h2 className="text-lg font-extrabold">{business.name}</h2><p className="text-sm">{business.adminNote||"İşletmeniz inceleme nedeniyle geçici olarak panel listesinden kaldırıldı."}</p></div><SupportRequestModal audience="business" businessId={business.id} businessName={business.name} triggerLabel="İnceleme / itiraz talebi gönder" triggerClassName="account-support-trigger"/></section>)}

      <section className="account-shell">
        <aside className="account-sidebar"><div className="account-profile-mini"><div>{(profileName||user?.email||"U").charAt(0).toUpperCase()}</div><span><b>{profileName||user?.displayName||"Hoş geldiniz"}</b><small>{user?.email}</small></span></div><nav role="tablist" aria-label="Hesap bölümleri">{ACCOUNT_TABS.map(({key,label,icon:Icon},index)=><button key={key} id={`account-tab-${key}`} type="button" role="tab" aria-selected={tab===key} aria-controls="account-tab-panel" tabIndex={tab===key?0:-1} className={tab===key?"active":""} onKeyDown={event=>handleTabKeyDown(event,index)} onClick={()=>setTab(key)}><Icon size={18}/><span>{label}</span>{key==="appointments"&&<i>{appointments.length}</i>}{key==="benefits"&&(activePackages.length>0||totalLoyaltyPoints>0)&&<i>{activePackages.length||totalLoyaltyPoints}</i>}{key==="favorites"&&favorites.length>0&&<i>{favorites.length}</i>}</button>)}</nav>{activeBusiness&&<section className="account-business-access"><div><i><BriefcaseBusiness size={18}/></i><span><small>İŞLETME HESABI</small><b>{activeBusiness.name}</b></span></div>{businesses.length>1&&<label><span>Yönetilecek işletme</span><select value={activeBusiness.id} onChange={event=>setBusinessId(event.target.value)}>{businesses.map(business=><option value={business.id} key={business.id}>{business.name}</option>)}</select></label>}<Link href="/dashboard">Yönetim paneline geç <ExternalLink size={14}/></Link></section>}{businessesLoading&&!activeBusiness&&<div className="account-business-loading" aria-label="İşletme hesapları yükleniyor"/>}<div className="account-side-help"><MessageCircleMore size={22}/><b>Bir sorunuz mu var?</b><p>Destek merkezimiz her adımda yanınızda.</p><Link href="/yardim-merkezi">Yardım merkezini aç <ArrowRight size={13}/></Link></div><button className="account-logout" onClick={async()=>{await logout();router.push("/musteri/giris")}}><LogOut size={17}/> Güvenli çıkış</button></aside>

        <div className="account-content" id="account-tab-panel" role="tabpanel" aria-labelledby={`account-tab-${tab}`} tabIndex={0}>
          {tab==="overview"&&<>
            <div className="account-section-head"><div><span>GENEL BAKIŞ</span><h2>Randevularınız bir bakışta.</h2></div><button onClick={()=>setTab("appointments")}>Tümünü gör <ChevronRight size={16}/></button></div>
            <div className="account-metrics"><article><span><CalendarDays/></span><div><b>{upcoming.length}</b><small>Yaklaşan</small></div></article><article><span><Check/></span><div><b>{completed.length}</b><small>Tamamlanan</small></div></article><article><span><Store/></span><div><b>{visitedBusinessCount}</b><small>Deneyim noktası</small></div></article><article><span><Heart/></span><div><b>{favorites.length}</b><small>Favori işletme</small></div></article></div>
            {next?<section className="account-next"><div className="account-next-date"><strong>{new Date(next.startAt).toLocaleDateString("tr-TR",{day:"2-digit"})}</strong><span>{new Date(next.startAt).toLocaleDateString("tr-TR",{month:"short"}).toUpperCase()}</span><small>{new Date(next.startAt).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</small></div><div className="account-next-info"><span>SIRADAKİ RANDEVUNUZ</span><h3>{next.businessName}</h3><p>{next.serviceName} · {next.staffName}</p><small><MapPin size={13}/>{next.businessCity||"Konum bilgisi işletmede"}</small></div><div className="account-next-actions">{next.publicToken&&<Link href={`/randevu/${next.publicToken}`}>Detayları aç <ArrowRight size={14}/></Link>}{next.allowReschedule&&<button onClick={()=>setRescheduling(next)}>Saati değiştir</button>}<button onClick={()=>setCancelling(next)}>Randevuyu iptal et</button></div></section>:<section className="account-empty-premium account-empty-rande"><div><Image src="/mascots/randevu-rehberi.png" alt="Rovi keşif yardımcısı" width={104} height={95}/></div><span>ROVİ ÖNERİYOR</span><h3>Takviminizde yaklaşan randevu yok.</h3><p>Aradığınız hizmeti söyleyin; Rovi size uygun işletmeleri keşfetmeniz için yolu açsın.</p><Link href="/kesfet">Rovi ile keşfet <ArrowRight size={15}/></Link></section>}
            <section className="account-quick-grid"><button type="button" onClick={()=>setTab("alerts")}><i><BellRing/></i><span><small>AKILLI TAKİP</small><b>Müsait saat yakala</b><em>Dolu saat açıldığında haberdar olun.</em></span><ChevronRight/></button><button type="button" onClick={()=>setTab("favorites")}><i><Heart/></i><span><small>HIZLI ERİŞİM</small><b>Favorilerime git</b><em>Sevdiğiniz işletmeler tek ekranda.</em></span><ChevronRight/></button>{lastCompleted?<Link href={lastCompleted.businessSlug?`/isletme/${lastCompleted.businessSlug}/randevu?service=${encodeURIComponent(lastCompleted.serviceId)}`:"/kesfet"}><i><RotateCcw/></i><span><small>TEKRARLA</small><b>{lastCompleted.serviceName}</b><em>{lastCompleted.businessName} için yeniden planlayın.</em></span><ChevronRight/></Link>:<button type="button" onClick={()=>setTab("profile")}><i><Fingerprint/></i><span><small>HESAP GÜVENLİĞİ</small><b>Profilimi tamamla</b><em>İletişim bilgilerinizi güncel tutun.</em></span><ChevronRight/></button>}</section>
            <div className="account-recent-head"><h3>Son hareketler</h3><button onClick={()=>setTab("appointments")}>Geçmişi görüntüle</button></div>{appointments.length?<div className="account-recent-list">{appointments.slice(0,3).map(item=><AppointmentRow key={item.id} item={item} now={now} onCancel={()=>setCancelling(item)} onReschedule={()=>setRescheduling(item)} onReview={()=>setReviewing(item)}/>)}</div>:<div className="account-recent-empty"><Sparkles/><div><b>İlk hareketiniz burada görünecek.</b><span>Bir işletme keşfedin ve size uygun saati ayırın.</span></div><Link href="/kesfet">Keşfet <ArrowRight/></Link></div>}
          </>}

          {tab==="appointments"&&<>
            <div className="account-section-head"><div><span>RANDEVULARIM</span><h2>Tüm planınız, tek akışta.</h2></div><Link href="/kesfet">+ Yeni randevu</Link></div>
            <div className="account-appointment-toolbar"><label><Search size={17}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="İşletme, hizmet veya çalışan ara…"/></label><div>{([['all','Tümü'],['upcoming','Yaklaşan'],['history','Geçmiş'],['cancelled','İptal']] as const).map(([key,label])=><button key={key} className={filter===key?"active":""} onClick={()=>setFilter(key)}>{label}</button>)}</div></div>
            {loading?<div className="account-loading-list">{[1,2,3].map(x=><i key={x}/>)}</div>:loadError?<div className="account-error"><X/><h3>Randevular yüklenemedi.</h3><p>{loadError}</p><button type="button" onClick={()=>setReloadKey(value=>value+1)}>Yeniden dene</button></div>:<>{filtered.length?<div className="account-appointment-list">{filtered.map(item=><AppointmentRow key={item.id} item={item} now={now} onCancel={()=>setCancelling(item)} onReschedule={()=>setRescheduling(item)} onReview={()=>setReviewing(item)}/>)}</div>:<div className="account-empty-premium"><div><Search size={31}/></div><h3>Bu görünümde randevu bulunamadı.</h3><p>{hasMoreAppointments?"Aradığınız kayıt daha eski randevularınızda olabilir.":"Filtreyi temizleyebilir veya yeni bir işletme keşfedebilirsiniz."}</p><button type="button" onClick={()=>{setFilter("all");setSearch("")}}>Filtreleri temizle</button></div>}{hasMoreAppointments&&<button type="button" className="account-load-more" onClick={loadMoreAppointments} disabled={appointmentsLoadingMore}>{appointmentsLoadingMore?<><LoaderCircle className="animate-spin"/> Yükleniyor</>:<>Daha eski randevuları yükle <History/></>}</button>}</>}
          </>}

          {tab==="alerts"&&user&&<AvailabilityAlertsPanel uid={user.uid}/>}
          {tab==="messages"&&user&&<CustomerMessagesPanel uid={user.uid}/>}

          {tab==="benefits"&&<>
            <div className="account-section-head"><div><span>PAKETLER VE AVANTAJLAR</span><h2>Kalan hakkınız, puanınız, tek yerde.</h2></div><Link href="/kesfet">Yeni deneyim keşfet <Compass size={15}/></Link></div>
            <section className="account-benefit-hero"><div><span><Crown/> SENİNRANDEVUN AVANTAJLARI</span><h3>{totalLoyaltyPoints} kullanılabilir puan</h3><p>Her işletmenin puanı kendi mağazasında geçerlidir. Paket seanslarınız kullanıldıkça kalan haklarınız otomatik güncellenir.</p></div><div><strong>{activePackages.length}</strong><span>aktif paket</span></div></section>
            {benefitsError&&<section className="account-benefit-notice"><AlertTriangle/><div><b>Paket bilgileriniz yüklenemedi.</b><span>{benefitsError}</span></div><button type="button" onClick={()=>setBenefitsReloadKey(value=>value+1)}>Yeniden dene</button></section>}
            {benefitsPhoneRequired&&<section className="account-benefit-notice"><AlertTriangle/><div><b>Paketlerinizi eşleştirmek için telefon numaranızı tamamlayın.</b><span>İşletmenin paket satışında kullandığı telefon ile hesabınızdaki telefon aynı olmalıdır.</span></div><button type="button" onClick={()=>setTab("profile")}>Telefonu güncelle</button></section>}
            <div className="account-benefit-title"><div><PackageCheck/><span><small>SEANS TAKİBİ</small><h3>Hizmet paketlerim</h3></span></div><b>{activePackages.length} aktif</b></div>
            {benefitPackages.length?<div className="account-package-grid">{benefitPackages.map(item=>{const progress=item.totalSessions>0?Math.max(0,Math.min(100,(item.remainingSessions/item.totalSessions)*100)):0;const active=item.status==="active"&&item.remainingSessions>0;return <article key={`${item.businessId}-${item.id}`} className={active?"":"inactive"}><header><span><Gift/></span><div><small>{item.businessName}</small><h3>{item.packageName}</h3><p>{item.serviceName}</p></div><em>{packageStatusLabel(item.status)}</em></header><div className="account-package-progress"><div><span>Kalan seans</span><b>{item.remainingSessions} / {item.totalSessions}</b></div><i><span style={{width:`${progress}%`}}/></i></div><footer><span><CalendarDays/> {item.expiresAt?`${formatShortDate(item.expiresAt)} tarihine kadar`:"Süresiz"}</span>{item.businessSlug&&<Link href={`/isletme/${item.businessSlug}/randevu`}>Randevu al <ArrowRight/></Link>}</footer></article>})}</div>:!benefitsPhoneRequired&&<section className="account-empty-premium"><div><Gift size={31}/></div><h3>Henüz hesabınıza tanımlı paket yok.</h3><p>Bir işletme size hizmet paketi tanımladığında kalan seanslarınız burada otomatik görünür.</p><Link href="/kesfet">İşletmeleri keşfet <ArrowRight size={15}/></Link></section>}
            <div className="account-benefit-title"><div><Coins/><span><small>PUAN & ÖDÜL CÜZDANI</small><h3>İşletme puanlarım</h3></span></div><b>{totalLoyaltyPoints} puan</b></div>
            {loyaltyBenefits.length?<div className="account-loyalty-grid">{loyaltyBenefits.map(item=><article key={`${item.businessId}-${item.id}`}><div><span><Coins/></span><div><small>{item.businessName}</small><strong>{item.points}<em>puan</em></strong></div></div><footer><span>Toplam kazanılan <b>{item.lifetimePoints}</b></span>{item.businessSlug&&<Link href={`/isletme/${item.businessSlug}`}>Mağazayı aç <ChevronRight/></Link>}</footer></article>)}</div>:!benefitsPhoneRequired&&<div className="account-benefit-soft-empty"><Coins/><span><b>Henüz puan hareketi yok.</b><small>İşletmelerden yapılan uygun alışverişler sonrası puanınız burada görünür.</small></span></div>}
          </>}

          {tab==="favorites"&&<>
            <div className="account-section-head"><div><span>FAVORİ MAĞAZALAR</span><h2>Sevdikleriniz bir dokunuş uzağınızda.</h2></div><Link href="/kesfet">Yeni yer keşfet <Compass size={15}/></Link></div>
            {favorites.length?<div className="account-favorite-grid">{favorites.map((item)=><article key={item.businessId} className="account-favorite-card"><div className="account-favorite-logo">{item.logoUrl?<Image src={item.logoUrl} alt="" fill sizes="64px"/>:<Store size={25}/>}</div><div><small>{item.category||"İŞLETME"}</small><h3>{item.name}</h3><p><MapPin size={13}/>{[item.district,item.city].filter(Boolean).join(", ")||"Konum bilgisi işletmede"}</p></div><footer><Link href={item.slug?`/isletme/${item.slug}`:"/kesfet"}>Mağazayı aç <ArrowRight size={14}/></Link><Link href={item.slug?`/isletme/${item.slug}/randevu`:"/kesfet"}>Randevu al <CalendarPlus size={14}/></Link><button type="button" onClick={()=>removeFavorite(item)} aria-label={`${item.name} işletmesini favorilerden çıkar`}><Trash2 size={15}/></button></footer></article>)}</div>:<section className="account-empty-premium"><div><Heart size={31}/></div><h3>Henüz favori mağazanız yok.</h3><p>Beğendiğiniz işletmeleri favoriye ekleyin; tekrar randevu almak çok daha hızlı olsun.</p><Link href="/kesfet">Favori işletmeni keşfet <ArrowRight size={15}/></Link></section>}
          </>}

          {tab==="profile"&&<>
            <PushToggleCard audience="customer" />
            <div className="account-section-head"><div><span>HESAP AYARLARI</span><h2>Bilgileriniz hep güncel.</h2></div></div>
            <section className="account-profile-card"><div className="account-profile-art"><Image src="/images/booking-flow-hero.png" alt="" fill sizes="(max-width:800px) 100vw, 34vw"/><span><UserRound size={26}/></span></div><div className="account-profile-form"><label><span>İsim soyisim</span><input value={profileName} onChange={event=>setProfileName(event.target.value)} maxLength={80} placeholder="Adınız ve soyadınız"/></label><label><span>Telefon</span><input value={profilePhone} onChange={event=>setProfilePhone(event.target.value)} maxLength={22} inputMode="tel" placeholder="05xx xxx xx xx"/></label><label><span>E-posta</span><input value={user?.email??""} disabled/></label><p><Settings2 size={15}/> Telefon bilginiz destek taleplerinde ve size ulaşılması gereken durumlarda kullanılır.</p><button onClick={saveProfile} disabled={profileBusy}>{profileBusy?<><LoaderCircle className="animate-spin" size={16}/> Kaydediliyor</>:<>Bilgileri kaydet <Check size={16}/></>}</button></div></section>
            <section className="account-security-center"><header><span><ShieldCheck size={19}/></span><div><small>GÜVENLİK VE GİZLİLİK</small><h3>Hesabınızın kontrolü sizde.</h3></div><button type="button" className={emailVerified?"verified":""} onClick={()=>!emailVerified&&sendEmailVerification()} disabled={verificationBusy||emailVerified}>{verificationBusy?<LoaderCircle className="animate-spin"/>:emailVerified?<BadgeCheck/>:<AlertTriangle/>} {emailVerified?"E-posta doğrulandı":"Doğrulama bekliyor · Kodu gönder"}</button></header><div>{!emailVerified&&<article className="account-verification-entry"><i><BadgeCheck size={18}/></i><span><b>E-postanızı doğrulayın</b><small>Hesap güvenliği ve önemli bildirimler için 6 haneli kodla doğrulayın.</small></span><button type="button" onClick={sendEmailVerification} disabled={verificationBusy}>{verificationBusy?<LoaderCircle className="animate-spin"/>:<ArrowRight/>} Doğrulamayı başlat</button></article>}<article><i><KeyRound size={18}/></i><span><b>Şifrenizi yenileyin</b><small>Güvenli bağlantıyı kayıtlı e-posta adresinize göndeririz.</small></span><button type="button" onClick={sendPasswordLink} disabled={passwordBusy}>{passwordBusy?<LoaderCircle className="animate-spin" size={15}/>:<LockKeyhole size={15}/>} Bağlantı gönder</button></article><article><i><ShieldCheck size={18}/></i><span><b>Veri ve gizlilik merkezi</b><small>Verilerinizin nasıl işlendiğini ve KVKK haklarınızı inceleyin.</small></span><div><Link href="/gizlilik">Gizlilik</Link><Link href="/kvkk">KVKK</Link></div></article><article className="account-security-summary"><i><Fingerprint size={18}/></i><span><b>Güvenlik özeti</b><small>Son giriş: {formatLastSignIn(user?.metadata.lastSignInTime)}</small></span><strong>%{profileScore}</strong></article><article className="account-delete-entry"><i><Trash2 size={18}/></i><span><b>Hesabımı ve verilerimi sil</b><small>Bu işlem randevu geçmişiniz ve sahibi olduğunuz işletmeler dahil kalıcıdır.</small></span><button type="button" onClick={()=>setDeleteOpen(true)}>Silme seçenekleri</button></article></div></section>
            {completedValue>0&&<p className="account-value-note"><TicketCheck size={15}/> Tamamlanan randevularınızdaki kayıtlı hizmet değeri: <b>{formatMoney(completedValue)}</b></p>}
          </>}
        </div>
      </section>
    </main><MarketingFooter/>

    {reviewing&&<div className="account-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setReviewing(null)}}><div className="account-review-wrap" role="dialog" aria-modal="true" aria-labelledby="account-review-title"><button onClick={()=>setReviewing(null)} aria-label="Kapat"><X/></button><div><span>DEĞERLENDİRME</span><h3 id="account-review-title">{reviewing.businessName}</h3><p>{reviewing.serviceName} · {formatDate(reviewing.startAt)}</p></div><ReviewForm businessId={reviewing.businessId} appointmentId={reviewing.id} serviceName={reviewing.serviceName} staffName={reviewing.staffName} onSuccess={()=>setReviewing(null)}/></div></div>}
    {rescheduling&&<RescheduleDialog businessId={rescheduling.businessId} serviceId={rescheduling.serviceId} staffId={rescheduling.staffId||undefined} currentStartAt={rescheduling.startAt} title={rescheduling.businessName} subtitle={`${rescheduling.serviceName} · Şu an: ${formatDate(rescheduling.startAt)}`} timeZone={rescheduling.timeZone} maximumBookingDaysAhead={rescheduling.maximumBookingDaysAhead} onClose={closeReschedule} onConfirm={confirmReschedule}/>}
    {cancelling&&<div className="account-overlay" onMouseDown={event=>{if(event.target===event.currentTarget&&!cancelBusy)setCancelling(null)}}><section className="account-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="account-cancel-title"><button className="account-modal-close" onClick={()=>setCancelling(null)} disabled={cancelBusy} aria-label="Kapat"><X/></button><div><CalendarDays size={27}/></div><span>RANDEVU İPTALİ</span><h2 id="account-cancel-title">Bu randevuyu iptal etmek istediğinize emin misiniz?</h2><p><b>{cancelling.businessName}</b><br/>{cancelling.serviceName} · {formatDate(cancelling.startAt)}</p><small>İptal bilgisi anında işletmeye iletilecek.</small><footer><button onClick={()=>setCancelling(null)} disabled={cancelBusy}>Vazgeç</button><button onClick={cancelAppointment} disabled={cancelBusy}>{cancelBusy?<LoaderCircle className="animate-spin"/>:"Evet, iptal et"}</button></footer></section></div>}
    {verifyOpen&&<div className="account-overlay" onMouseDown={event=>{if(event.target===event.currentTarget&&!verificationBusy)setVerifyOpen(false)}}><section className="account-verify-modal" role="dialog" aria-modal="true" aria-labelledby="verify-email-title"><button className="account-modal-close" onClick={()=>setVerifyOpen(false)} disabled={verificationBusy} aria-label="Kapat"><X/></button><div><BadgeCheck size={29}/></div><span>E-POSTA GÜVENLİĞİ</span><h2 id="verify-email-title">6 haneli kodu girin.</h2><p><b>{user?.email}</b> adresine gönderdiğimiz kod 5 dakika geçerlidir.</p><label><span>Doğrulama kodu</span><input value={verificationCode} onChange={event=>setVerificationCode(event.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="• • • • • •" aria-label="6 haneli doğrulama kodu" autoFocus/></label><button className="account-verify-submit" type="button" onClick={verifyEmail} disabled={verificationBusy||verificationCode.length!==6}>{verificationBusy?<><LoaderCircle className="animate-spin"/> Kontrol ediliyor</>:<>E-postamı doğrula <ArrowRight/></>}</button><footer><span>Kod gelmedi mi?</span><button type="button" onClick={sendEmailVerification} disabled={verificationBusy}>{verificationSent?"Yeni kod gönder":"Kodu gönder"}</button></footer></section></div>}
    {deleteOpen&&<div className="account-overlay" onMouseDown={event=>{if(event.target===event.currentTarget&&!deleteBusy)setDeleteOpen(false)}}><section className="account-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title"><button className="account-modal-close" onClick={()=>setDeleteOpen(false)} disabled={deleteBusy} aria-label="Kapat"><X/></button><div><AlertTriangle size={28}/></div><span>GERİ ALINAMAZ İŞLEM</span><h2 id="delete-account-title">Hesabınızı kalıcı olarak silmek üzeresiniz.</h2><p>Randevu geçmişiniz, favorileriniz, profiliniz ve sahibi olduğunuz işletme hesapları kalıcı olarak silinir.</p><label><span>Onaylamak için e-posta adresinizi yazın</span><input type="email" value={deleteConfirm} onChange={event=>setDeleteConfirm(event.target.value)} placeholder={user?.email??"E-posta adresiniz"} autoComplete="off"/></label><footer><button type="button" onClick={()=>setDeleteOpen(false)} disabled={deleteBusy}>Vazgeç</button><button type="button" onClick={deleteAccount} disabled={deleteBusy||!user?.email||deleteConfirm.trim().toLocaleLowerCase("tr-TR")!==user.email.toLocaleLowerCase("tr-TR")}>{deleteBusy?<><LoaderCircle className="animate-spin"/> Siliniyor</>:"Hesabımı kalıcı olarak sil"}</button></footer></section></div>}
  </div>;
}

function AppointmentRow({item,now,onCancel,onReschedule,onReview}:{item:CustomerAppointment;now:number;onCancel:()=>void;onReschedule:()=>void;onReview:()=>void}) {
  const status=statuses[item.status]??{label:item.status,icon:Clock3}; const StatusIcon=status.icon; const future=new Date(item.startAt).getTime()>now; const active=["pending","confirmed"].includes(item.status)&&future; const repeatParams=new URLSearchParams(); if(item.serviceId)repeatParams.set("service",item.serviceId);if(item.staffId)repeatParams.set("staff",item.staffId); const href=item.businessSlug?(active?`/isletme/${item.businessSlug}`:`/isletme/${item.businessSlug}/randevu${repeatParams.size?`?${repeatParams}`:""}`):"/kesfet";
  return <article className="customer-appointment-card"><div className="appointment-business-logo">{item.businessLogo?<Image src={item.businessLogo} alt="" fill sizes="54px"/>:<Store size={23}/>}</div><div className="appointment-main"><div><span className={`appointment-status status-${item.status}`}><StatusIcon size={13}/>{status.label}</span><small>{formatDate(item.startAt)}</small></div><h3>{item.businessName}</h3><p>{item.serviceName}{(item.additionalServices?.length??0)>0?` + ${item.additionalServices?.map(service=>service.name).join(", ")}`:""}<i/> {item.staffName}</p><span><MapPin size={13}/>{item.businessCity||"İşletme konumu"}</span></div><div className="appointment-card-actions">{item.publicToken&&<Link href={`/randevu/${item.publicToken}`}>Detay <ChevronRight size={14}/></Link>}<Link href={href}>{active?"Mağazayı aç":"Tekrar randevu"}</Link>{active&&<button type="button" onClick={()=>downloadCalendarEvent(item)}><CalendarPlus size={13}/> Takvime ekle</button>}{active&&item.allowReschedule&&<button type="button" onClick={onReschedule}><CalendarClock size={13}/> Saati değiştir</button>}{active&&<button onClick={onCancel}>İptal et</button>}{item.status==="completed"&&<button className="review" onClick={onReview}><Star size={13}/> Yorum yap</button>}</div></article>;
}

function formatDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"Tarih bilgisi yok":date.toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"})+" · "+date.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}
function formatLastSignIn(value?:string|null){if(!value)return"Bilgi yok";const date=new Date(value);return Number.isNaN(date.getTime())?"Bilgi yok":date.toLocaleString("tr-TR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
function formatMoney(value:number){return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(value)}
function formatShortDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"Tarih bilgisi yok":date.toLocaleDateString("tr-TR",{day:"2-digit",month:"short",year:"numeric"})}
function packageStatusLabel(value:string){return value==="active"?"Aktif":value==="used"?"Tamamlandı":value==="expired"?"Süresi doldu":value==="cancelled"?"İptal":"Beklemede"}
function downloadCalendarEvent(item:CustomerAppointment){const stamp=(value:string)=>new Date(value).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");const escape=(value:string)=>value.replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n");const services=[item.serviceName,...(item.additionalServices??[]).map(service=>service.name)].filter(Boolean).join(" + ");const content=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SeninRandevun//TR","BEGIN:VEVENT",`UID:${item.id}@seninrandevun.com`,`DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${stamp(item.startAt)}`,`DTEND:${stamp(item.endAt)}`,`SUMMARY:${escape(`${services} · ${item.businessName}`)}`,`DESCRIPTION:${escape(`Çalışan: ${item.staffName}`)}`,`LOCATION:${escape(item.businessCity)}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");const url=URL.createObjectURL(new Blob([content],{type:"text/calendar;charset=utf-8"}));const anchor=document.createElement("a");anchor.href=url;anchor.download=`randevu-${item.id}.ics`;anchor.click();URL.revokeObjectURL(url)}
