"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "@/i18n/link";
import { useRouter } from "@/i18n/navigation";
import { collection, collectionGroup, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, startAfter, where, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { updateProfile } from "firebase/auth";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, BadgeCheck, BellRing, BriefcaseBusiness, CalendarClock, CalendarDays, CalendarPlus, Check, ChevronRight, CircleUserRound, Clock3, Coins, Compass, Crown, ExternalLink, Fingerprint, Gift, Heart, History, KeyRound, LayoutDashboard, LifeBuoy, LoaderCircle, LockKeyhole, LogOut, MapPin, MessageCircleMore, Navigation, PackageCheck, RotateCcw, Search, ShieldCheck, Star, Store, TicketCheck, Trash2, UserRound, X } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import { forgotPassword, logout } from "@/features/auth/auth-service";
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
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { LinkedSignInMethods } from "@/features/auth/linked-sign-in-methods";
import { addToDeviceCalendar, googleCalendarUrl, type CalendarEventInput } from "@/lib/calendar/appointment-calendar";
import s from "./account.module.css";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk, type TFunction } from "@/i18n/config";
import { browserLocale } from "@/i18n/browser";
import { localizedAppointmentServiceName } from "@/features/services/service-pricing";

interface CustomerAppointment { id:string; businessId:string; businessName:string; businessSlug:string; businessLogo?:string; businessCity:string; businessAddress?:string; businessPhone:string; serviceId:string; serviceVariantId?:string; staffId:string; serviceName:string; staffName:string; startAt:string; endAt:string; status:string; publicToken?:string; price?:number; rescheduleCount:number; allowReschedule:boolean; maximumBookingDaysAhead:number; timeZone:string; additionalServices?:Array<{serviceId:string;name:string;price:number;durationMinutes:number}> }
interface SuspendedBusiness { id: string; name: string; adminNote?: string }
interface CustomerBenefitPackage { id:string; businessId:string; businessName:string; businessSlug:string; packageName:string; serviceName:string; totalSessions:number; remainingSessions:number; status:string; expiresAt:string|null }
interface LoyaltyBenefit { id:string; businessId:string; businessName:string; businessSlug:string; points:number; lifetimePoints:number; totalSpent:number }
interface CustomerBenefitsPayload { packages:CustomerBenefitPackage[]; loyalty:LoyaltyBenefit[]; phoneRequired:boolean }
type AccountTab = "overview" | "appointments" | "alerts" | "messages" | "benefits" | "favorites" | "profile";
type AppointmentFilter = "all" | "upcoming" | "history" | "cancelled";

const APPOINTMENT_PAGE_SIZE = 50;
const ACCOUNT_TABS = [
  {key:"overview",label:tk("Genel bakış"),short:tk("Genel"),icon:LayoutDashboard},
  {key:"appointments",label:tk("Randevularım"),short:tk("Randevular"),icon:CalendarDays},
  {key:"alerts",label:tk("Müsaitlik Bildirimleri"),short:tk("Müsaitlik"),icon:BellRing},
  {key:"messages",label:tk("Mesajlarım"),short:tk("Mesajlar"),icon:MessageCircleMore},
  {key:"benefits",label:tk("Paketlerim & Puanlarım"),short:tk("Avantajlar"),icon:Gift},
  {key:"favorites",label:tk("Favorilerim"),short:tk("Favoriler"),icon:Heart},
  {key:"profile",label:tk("Hesap ayarları"),short:tk("Hesap"),icon:CircleUserRound},
] as const;

const statuses: Record<string,{label:string;icon:typeof Clock3}> = {
  pending:{label:tk("Onay bekliyor"),icon:Clock3}, confirmed:{label:tk("Onaylandı"),icon:BadgeCheck}, completed:{label:tk("Tamamlandı"),icon:Check}, cancelled:{label:tk("İptal edildi"),icon:X}, no_show:{label:tk("Gerçekleşmedi"),icon:History},
};
const STATUS_CLASS: Record<string,string> = { pending:s.st_pending, confirmed:s.st_confirmed, completed:s.st_completed, cancelled:s.st_cancelled, no_show:s.st_no_show };

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
      return [{serviceId:String(row.serviceId??""),name:String(row.name??"Ek hizmet") /* i18n-ignore veri yedeği */,price:Number(row.price??0),durationMinutes:Number(row.durationMinutes??0)}];
    }):undefined;
    return {id:item.id,businessId,businessName:String(business.name??"İşletme") /* i18n-ignore veri yedeği */,businessSlug:String(business.slug??""),businessLogo:typeof business.logoUrl==="string"?business.logoUrl:undefined,businessCity:[business.district,business.city].filter(Boolean).join(", "),businessAddress:typeof business.address==="string"?business.address.trim():undefined,businessPhone:String(business.phone??""),serviceId:String(data.serviceId??""),staffId:String(data.staffId??""),serviceVariantId:typeof data.serviceVariantId==="string"?data.serviceVariantId:undefined,serviceName:localizedAppointmentServiceName({serviceName:String(data.serviceName??"Hizmet") /* i18n-ignore veri yedeği */,serviceNameTranslations:data.serviceNameTranslations},browserLocale()),staffName:String(data.staffName??tk("Farketmez")),startAt:data.startAt?.toDate?.()?data.startAt.toDate().toISOString():String(data.startAt??""),endAt:data.endAt?.toDate?.()?data.endAt.toDate().toISOString():String(data.endAt??""),status:String(data.status??"pending"),publicToken:data.publicToken?String(data.publicToken):undefined,price:Number.isFinite(Number(data.price??data.totalPrice))?Number(data.price??data.totalPrice):undefined,rescheduleCount:Number(data.rescheduleCount??0)||0,allowReschedule:business.allowReschedule!==false,maximumBookingDaysAhead:Math.max(1,Number(business.maximumBookingDaysAhead??30)||30),timeZone:typeof business.timeZone==="string"?business.timeZone:"Europe/Istanbul",additionalServices} satisfies CustomerAppointment;
  });
}

/** Çevrilmiş metindeki {slot} yer tutucusunu bir React öğesiyle değiştirir (ör. kalın tarih). */
function withSlot(text:string,slot:string,node:ReactNode):ReactNode{
  const [before,after]=text.split(`{${slot}}`);
  return after===undefined?text:<>{before}{node}{after}</>;
}

export default function CustomerAccountPage() {
  const t = useT();
  const locale = useIntlLocale();
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
  const [reviewedIds,setReviewedIds] = useState<Set<string>>(() => new Set());
  // Daha önce değerlendirilen randevularda "Değerlendir" yerine "Değerlendirildi" görünür.
  useEffect(()=>{
    if(!user)return;
    let active=true;
    getDocs(query(collectionGroup(getDb(),"reviews"),where("customerId","==",user.uid),limit(200)))
      .then(snapshot=>{if(active)setReviewedIds(current=>{const next=new Set(current);snapshot.docs.forEach(item=>{const id=item.data().appointmentId;if(typeof id==="string")next.add(id)});return next})})
      .catch(()=>{});
    return()=>{active=false};
  },[user]);
  const [cancelling,setCancelling] = useState<CustomerAppointment|null>(null);
  const [cancelBusy,setCancelBusy] = useState(false);
  const [rescheduling,setRescheduling] = useState<CustomerAppointment|null>(null);
  const [calendarFor,setCalendarFor] = useState<CustomerAppointment|null>(null);
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
  const tabsRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLElement>(null);
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
        setBenefitsError(benefitsResult?"":tk("Paket ve puan bilgileriniz şu anda yüklenemedi."));
        setBenefitPackages(Array.isArray(benefits.packages)?benefits.packages:[]);
        setLoyaltyBenefits(Array.isArray(benefits.loyalty)?benefits.loyalty:[]);
        setBenefitsPhoneRequired(Boolean(benefits.phoneRequired));
        setSuspendedBusinesses(ownedBusinessSnap?.docs.flatMap((item)=>{
          const data=item.data();
          return data.status==="suspended"||data.isSuspended===true?[{id:item.id,name:String(data.name??"İşletme") /* i18n-ignore veri yedeği */,adminNote:typeof data.adminNote==="string"?data.adminNote:undefined}]:[];
        })??[]);
        setProfileName(String(userSnap?.data()?.displayName??user.displayName??""));
        setProfilePhone(String(userSnap?.data()?.phone??""));
        setEmailVerified(Boolean(user.emailVerified||userSnap?.data()?.emailVerified));
      } catch (error) { if(active){setAppointments([]);setAppointmentCursor(null);setHasMoreAppointments(false);setLoadError(userFacingError(error,tk("Randevularınıza şu anda ulaşılamadı. Lütfen yeniden deneyin.")));} }
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
      }catch(error){if(active)setBenefitsError(userFacingError(error,tk("Paket ve puan bilgileriniz yüklenemedi.")));}
    };
    void refreshBenefits();
    const onFocus=()=>void refreshBenefits();
    window.addEventListener("focus",onFocus);
    return()=>{active=false;window.removeEventListener("focus",onFocus)};
  },[authStatus,benefitsReloadKey,tab,user]);

  const modalOpen=Boolean(reviewing||cancelling||verifyOpen||deleteOpen||calendarFor);
  useEffect(()=>{
    if(!modalOpen)return;
    const previousActive=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const overlay=document.querySelector<HTMLElement>("[data-account-overlay]");
    const focusable=()=>Array.from(overlay?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')??[]).filter(item=>item.offsetParent!==null);
    const frame=window.requestAnimationFrame(()=>focusable()[0]?.focus());
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        if(cancelBusy||verificationBusy||deleteBusy)return;
        setReviewing(null);setCancelling(null);setVerifyOpen(false);setDeleteOpen(false);setCalendarFor(null);
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

  // Mobil sekme şeridinde aktif sekmeyi görünür alana kaydır (yalnız yatay).
  useEffect(()=>{
    const nav=tabsRef.current; const button=document.getElementById(`account-tab-${tab}`);
    if(!nav||!button||nav.scrollWidth<=nav.clientWidth)return;
    const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollTo({left:button.offsetLeft-(nav.clientWidth-button.offsetWidth)/2,behavior:reduce?"auto":"smooth"});
  },[tab]);

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
  const filterCounts = useMemo(()=>({
    all:appointments.length,
    upcoming:appointments.filter(item=>["pending","confirmed"].includes(item.status)&&new Date(item.startAt).getTime()>now).length,
    history:appointments.filter(item=>item.status==="completed"||(new Date(item.startAt).getTime()<=now&&item.status!=="cancelled")).length,
    cancelled:appointments.filter(item=>item.status==="cancelled").length,
  }),[appointments,now]);

  async function cancelAppointment() {
    if(!cancelling)return; setCancelBusy(true);
    try { const fn=httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"cancelCustomerAppointment"); await fn({businessId:cancelling.businessId,appointmentId:cancelling.id}); setAppointments(rows=>rows.map(row=>row.id===cancelling.id?{...row,status:"cancelled"}:row)); toast.success(t("Randevunuz iptal edildi ve işletmeye bildirildi.")); setCancelling(null); }
    catch(error){toast.error(t(appointmentChangeError(error,tk("Randevu iptal edilemedi. Lütfen yeniden deneyin."))));} finally{setCancelBusy(false)}
  }

  async function confirmReschedule(slot:AvailableAppointmentSlot) {
    if(!rescheduling)return;
    // Hata RescheduleDialog içinde gösterilir; başarıda liste yeniden yüklenir.
    await rescheduleCustomerAppointment({businessId:rescheduling.businessId,appointmentId:rescheduling.id,startAtMillis:slot.startAtMillis,...(slot.staffId?{staffId:slot.staffId}:{})});
    toast.success(t("Randevu saatiniz güncellendi ve işletmeye bildirildi."));
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
      toast.error(t(userFacingError(error,tk("Eski randevular yüklenemedi. Lütfen tekrar deneyin."))));
    } finally {
      setAppointmentsLoadingMore(false);
    }
  }

  function selectTab(nextTab:AccountTab) {
    setTab(nextTab);
    // Sekme değişince içerik başına dön (yalnız kullanıcı aşağıdaysa).
    const shell=shellRef.current;
    if(!shell)return;
    const offset=window.matchMedia("(min-width: 781px)").matches?77:67;
    const top=shell.getBoundingClientRect().top+window.scrollY-offset-8;
    if(window.scrollY>top+4)window.scrollTo({top,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  }

  function handleTabKeyDown(event:ReactKeyboardEvent<HTMLButtonElement>,index:number) {
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(event.key))return;
    event.preventDefault();
    const forward=event.key==="ArrowRight"||event.key==="ArrowDown";
    const nextIndex=event.key==="Home"?0:event.key==="End"?ACCOUNT_TABS.length-1:(index+(forward?1:-1)+ACCOUNT_TABS.length)%ACCOUNT_TABS.length;
    const nextTab=ACCOUNT_TABS[nextIndex].key;
    setTab(nextTab);
    window.requestAnimationFrame(()=>document.getElementById(`account-tab-${nextTab}`)?.focus());
  }

  async function saveProfile() {
    if(!user||profileName.trim().length<2){toast.error(t("Lütfen geçerli bir isim yazın."));return} setProfileBusy(true);
    try { await Promise.all([updateProfile(user,{displayName:profileName.trim()}),setDoc(doc(getDb(),"users",user.uid),{displayName:profileName.trim(),phone:profilePhone.trim(),email:user.email,updatedAt:serverTimestamp()},{merge:true})]); toast.success(t("Hesap bilgileriniz güncellendi.")); setReloadKey(value=>value+1); }
    catch(error){toast.error(t(userFacingError(error,tk("Hesap bilgileriniz güncellenemedi. Lütfen yeniden deneyin."))))} finally{setProfileBusy(false)}
  }

  async function removeFavorite(item: FavoriteBusiness) {
    if (!user) return;
    try {
      await removeFavoriteBusiness(user.uid, item.businessId);
      setFavorites((current) => current.filter((favorite) => favorite.businessId !== item.businessId));
      toast.success(t("{name} favorilerden çıkarıldı.", { name: item.name }));
    } catch {
      toast.error(t("Favori kaldırılamadı. Lütfen tekrar deneyin."));
    }
  }

  async function sendPasswordLink() {
    if (!user?.email) return;
    setPasswordBusy(true);
    try {
      await forgotPassword(user.email);
      toast.success(t("Şifre yenileme bağlantısı e-posta adresinize gönderildi."));
    } catch {
      toast.error(t("Şifre yenileme bağlantısı gönderilemedi. Lütfen tekrar deneyin."));
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
      if(data.verified){setEmailVerified(true);toast.success(t("E-posta adresiniz zaten doğrulanmış."));return}
      setVerificationSent(true);
      setVerifyOpen(true);
      toast.success(t("6 haneli doğrulama kodu e-posta adresinize gönderildi."));
    } catch(error){toast.error(t(userFacingError(error,tk("Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin."))))}
    finally{setVerificationBusy(false)}
  }

  async function verifyEmail() {
    if(!user?.email||verificationCode.length!==6){toast.error(t("Lütfen 6 haneli kodu eksiksiz girin."));return}
    setVerificationBusy(true);
    try {
      const fn=httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"verifyEmailCode");
      await fn({email:user.email,code:verificationCode});
      await user.reload();
      setEmailVerified(true);
      setVerifyOpen(false);
      setVerificationCode("");
      toast.success(t("E-posta adresiniz doğrulandı."));
    } catch(error){toast.error(t(userFacingError(error,tk("Kod doğrulanamadı. Kodu kontrol edip tekrar deneyin."))))}
    finally{setVerificationBusy(false)}
  }

  async function deleteAccount() {
    if(!user?.email||deleteConfirm.trim().toLocaleLowerCase("tr-TR")!==user.email.toLocaleLowerCase("tr-TR")){
      toast.error(t("Devam etmek için e-posta adresinizi eksiksiz yazın."));
      return;
    }
    setDeleteBusy(true);
    try {
      const fn=httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"deleteMyAccount");
      await fn({confirmationEmail:deleteConfirm.trim()});
      toast.success(t("Hesabınız ve ilişkili verileriniz silindi."));
      router.replace("/");
    } catch(error) {
      toast.error(t(userFacingError(error,tk("Hesap silinemedi. Lütfen yeniden giriş yapıp tekrar deneyin."))));
      setDeleteBusy(false);
    }
  }

  const profileSignals=[Boolean(profileName.trim()),Boolean(profilePhone.trim()),Boolean(user?.email),emailVerified];
  const profileScore=Math.round((profileSignals.filter(Boolean).length/profileSignals.length)*100);
  const completedValue=completed.reduce((total,item)=>total+(item.price??0)+(item.additionalServices??[]).reduce((sum,service)=>sum+service.price,0),0);
  const lastCompleted=[...completed].sort((a,b)=>+new Date(b.startAt)-+new Date(a.startAt))[0];
  const totalLoyaltyPoints=loyaltyBenefits.reduce((total,item)=>total+item.points,0);
  const activePackages=benefitPackages.filter(item=>item.status==="active"&&item.remainingSessions>0);
  const displayName=profileName||user?.displayName||"";
  const firstName=displayName.trim().split(/\s+/)[0]||t("hoş geldiniz");
  const initials=initialsOf(displayName||user?.email||"S");
  const rowHandlers=(item:CustomerAppointment)=>({onCancel:()=>setCancelling(item),onReschedule:()=>setRescheduling(item),onReview:()=>setReviewing(item),onCalendar:()=>setCalendarFor(item)});

  if(authStatus==="loading")return <PageSkeleton/>;

  const tabBadge=(key:AccountTab)=>key==="appointments"?(upcoming.length||null):key==="benefits"?(activePackages.length||totalLoyaltyPoints||null):key==="favorites"?(favorites.length||null):null;

  return <div className={`marketing-page ${s.page}`}><MarketingHeader/>
    <main className={s.main}>
      {/* ── Karşılama ── */}
      <section className={s.hero}>
        <div className={s.heroGrid} aria-hidden="true"/>
        <div className={s.heroInner}>
          <div className={s.heroTop}>
            <span className={s.avatar} aria-hidden="true">{initials}</span>
            <div>
              <span className={s.heroDate} suppressHydrationWarning>{greetingOf(now,t)} · {new Date(now).toLocaleDateString(locale,{weekday:"long",day:"numeric",month:"long"})}</span>
              <h1 className={s.heroTitle}>{withSlot(t("Merhaba, {name}"),"name",<em>{firstName}</em>)}</h1>
            </div>
          </div>
          <p className={s.heroText}>{loading?t("Randevularınız güvenle getiriliyor…"):next?withSlot(t("Sıradaki randevunuz {when}, {business}. {countdown}.",{business:next.businessName,countdown:countdownOf(next.startAt,now,t)}),"when",<b>{dayLabel(next.startAt,now,t,locale)} {timeOf(next.startAt,locale)}</b>):t("Takviminiz boş görünüyor. Size uygun işletmeyi keşfedip birkaç dokunuşla randevu alabilirsiniz.")}</p>
          <div className={s.heroActions}>
            <Link href="/kesfet" className={s.heroBtn}><CalendarPlus size={17}/> {t("Yeni randevu al")}</Link>
            {activeBusiness&&<Link href="/dashboard" className={s.heroBtnGhost}><BriefcaseBusiness size={17}/> {t("İşletme paneli")}</Link>}
            <SupportRequestModal audience="customer" triggerLabel={t("Yardım")} triggerClassName={s.helpBtn}/>
          </div>
          <div className={s.stats}>
            <button type="button" className={s.stat} onClick={()=>{setFilter("upcoming");selectTab("appointments")}}><b>{loading?"–":upcoming.length}</b><small>{t("Yaklaşan")}</small></button>
            <button type="button" className={s.stat} onClick={()=>{setFilter("history");selectTab("appointments")}}><b>{loading?"–":completed.length}</b><small>{t("Geçmiş")}</small></button>
            <button type="button" className={s.stat} onClick={()=>selectTab("favorites")}><b>{loading?"–":favorites.length}</b><small>{t("Favori")}</small></button>
            <button type="button" className={s.stat} onClick={()=>selectTab("benefits")}><b>{loading?"–":totalLoyaltyPoints}</b><small>{t("Puan", { ctx: "puan-sayac" })}</small></button>
          </div>
        </div>
        <div className={s.heroMascot} aria-hidden="true"><RoviMascot size={132} mood={next?"happy":"wave"} alt=""/></div>
      </section>

      {suspendedBusinesses.map((business)=><section key={business.id} className={s.notice}><div><small>{t("ASKIYA ALINAN İŞLETME")}</small><h2>{business.name}</h2><p>{business.adminNote||t("İşletmeniz inceleme nedeniyle geçici olarak panel listesinden kaldırıldı.")}</p></div><SupportRequestModal audience="business" businessId={business.id} businessName={business.name} triggerLabel={t("İnceleme / itiraz talebi gönder")} triggerClassName={s.noticeBtn}/></section>)}

      <section className={s.shell} ref={shellRef}>
        <aside className={s.aside}>
          <div className={s.asideProfile}><span aria-hidden="true">{initials}</span><span><b>{displayName||t("Hoş geldiniz")}</b><small>{user?.email}</small></span></div>
          <nav ref={tabsRef} className={s.tabs} role="tablist" aria-label={t("Hesap bölümleri")}>
            {ACCOUNT_TABS.map(({key,label,short,icon:Icon},index)=>{const badge=tabBadge(key);return <button key={key} id={`account-tab-${key}`} type="button" role="tab" aria-selected={tab===key} aria-controls="account-tab-panel" tabIndex={tab===key?0:-1} className={`${s.tab} ${tab===key?s.tabActive:""}`} onKeyDown={event=>handleTabKeyDown(event,index)} onClick={()=>selectTab(key)}><Icon size={17} aria-hidden="true"/><span className={s.tabShort}>{t(short)}</span><span className={s.tabLong}>{t(label)}</span>{badge!==null&&<i className={s.tabBadge}>{badge}</i>}</button>})}
          </nav>
          <div className={s.asideExtras}>
            {activeBusiness&&<BusinessAccess businesses={businesses} activeBusiness={activeBusiness} onSelect={setBusinessId}/>}
            {businessesLoading&&!activeBusiness&&<div className={`${s.skelBlock} ${s.bizLoading}`} aria-label={t("İşletme hesapları yükleniyor")}/>}
            <Link href="/yardim-merkezi" className={s.sideLink}><LifeBuoy size={17}/> {t("Yardım merkezi")}</Link>
            <button type="button" className={s.sideLink} onClick={async()=>{await logout();router.push("/musteri/giris")}}><LogOut size={17}/> {t("Güvenli çıkış")}</button>
          </div>
        </aside>

        <div className={s.content} id="account-tab-panel" role="tabpanel" aria-labelledby={`account-tab-${tab}`} tabIndex={0}>
          {tab==="overview"&&<div className={s.panel} key="overview">
            <div className={s.head}><div><span className={s.eyebrow}>{t("Sıradaki randevunuz")}</span><h2>{next?t("Hazırlıklar tamam."):t("Takviminiz sizi bekliyor.")}</h2></div>{upcoming.length>1&&<button type="button" className={s.headLink} onClick={()=>{setFilter("upcoming");selectTab("appointments")}}>{t("{count} yaklaşan",{count:upcoming.length})} <ChevronRight size={15}/></button>}</div>
            {loading?<i className={`${s.skelBlock} ${s.skelTicket}`}/>:loadError?<ErrorBox message={t(loadError)} onRetry={()=>setReloadKey(value=>value+1)}/>:next?<NextTicket item={next} now={now} {...rowHandlers(next)}/>:<RoviEmpty tag={t("ROVİ ÖNERİYOR")} title={t("Yaklaşan randevunuz yok.")} text={t("Aradığınız hizmeti söyleyin; Rovi size uygun işletmeleri keşfetmeniz için yolu açsın.")} mood="wave"><Link href="/kesfet" className={`${s.pill} ${s.pillPrimary}`}>{t("Rovi ile keşfet")} <ArrowRight size={15}/></Link>{lastCompleted?.businessSlug&&<Link href={rebookHref(lastCompleted)} className={s.pill}><RotateCcw size={15}/> {t("Son randevuyu tekrarla")}</Link>}</RoviEmpty>}
            {!loading&&upcoming.length>1&&<><div className={s.sub}><h3>{t("Sonraki randevular")}</h3><button type="button" onClick={()=>{setFilter("upcoming");selectTab("appointments")}}>{t("Tümü")}</button></div><div className={s.miniList}>{upcoming.slice(1,4).map(item=>{const body=<><DateTile value={item.startAt} active/><div><b>{item.businessName}</b><span>{dayLabel(item.startAt,now,t,locale)} {timeOf(item.startAt,locale)} · {item.serviceName}</span></div><em>{shortCountdown(item.startAt,now,t)}</em></>;return item.publicToken?<Link key={item.id} href={`/randevu/${item.publicToken}`} className={s.mini}>{body}</Link>:<button key={item.id} type="button" className={s.mini} onClick={()=>{setFilter("upcoming");selectTab("appointments")}}>{body}</button>})}</div></>}
            <div className={s.quickGrid}>
              <button type="button" className={s.quick} onClick={()=>selectTab("alerts")}><i className={s.quickIcon}><BellRing size={20}/></i><span><small>{t("AKILLI TAKİP")}</small><b>{t("Müsait saat yakala")}</b><em>{t("Dolu saat açılınca haber verelim.")}</em></span><ChevronRight size={18}/></button>
              <button type="button" className={s.quick} onClick={()=>selectTab("favorites")}><i className={s.quickIcon}><Heart size={20}/></i><span><small>{t("HIZLI ERİŞİM")}</small><b>{t("Favorilerim")}</b><em>{favorites.length?t("{count} kayıtlı işletme",{count:favorites.length}):t("Sevdiğiniz yerler tek ekranda.")}</em></span><ChevronRight size={18}/></button>
              {lastCompleted?<Link href={rebookHref(lastCompleted)} className={s.quick}><i className={s.quickIcon}><RotateCcw size={20}/></i><span><small>{t("TEKRARLA")}</small><b>{lastCompleted.serviceName}</b><em>{lastCompleted.businessName}</em></span><ChevronRight size={18}/></Link>:<button type="button" className={s.quick} onClick={()=>selectTab("profile")}><i className={s.quickIcon}><Fingerprint size={20}/></i><span><small>{t("HESAP")}</small><b>{t("Profilimi tamamla")}</b><em>{t("%{score} tamamlandı",{score:profileScore})}</em></span><ChevronRight size={18}/></button>}
            </div>
            <div className={s.sub}><h3>{t("Son hareketler")}</h3>{appointments.length>0&&<button type="button" onClick={()=>{setFilter("all");selectTab("appointments")}}>{t("Geçmişi görüntüle")}</button>}</div>
            {loading?<div className={s.skel}>{[1,2].map(x=><i key={x}/>)}</div>:appointments.length?<div className={s.list}>{appointments.slice(0,3).map((item,index)=><AppointmentRow key={item.id} index={index} item={item} now={now} reviewed={reviewedIds.has(item.id)} {...rowHandlers(item)}/>)}</div>:!loadError&&<div className={s.softEmpty}><CalendarDays size={22}/><span><b>{t("İlk hareketiniz burada görünecek.")}</b>{t("Bir işletme keşfedin ve size uygun saati ayırın.")}</span></div>}
          </div>}

          {tab==="appointments"&&<div className={s.panel} key="appointments">
            <div className={s.head}><div><span className={s.eyebrow}>{t("Randevularım")}</span><h2>{t("Tüm planınız tek akışta.")}</h2></div><Link href="/kesfet" className={s.headLink}><CalendarPlus size={15}/> {t("Yeni")}</Link></div>
            <div className={s.toolbar}>
              <label className={s.search}><Search size={18} aria-hidden="true"/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder={t("İşletme, hizmet veya çalışan ara…")} aria-label={t("Randevularda ara")} enterKeyHint="search"/>{search&&<button type="button" className={s.iconBtn} onClick={()=>setSearch("")} aria-label={t("Aramayı temizle")}><X size={16}/></button>}</label>
              <div className={s.segment} role="group" aria-label={t("Randevu filtresi")}>{([["all",tk("Tümü")],["upcoming",tk("Yaklaşan")],["history",tk("Geçmiş")],["cancelled",tk("İptal")]] as const).map(([key,label])=><button key={key} type="button" aria-pressed={filter===key} className={`${s.seg} ${filter===key?s.segOn:""}`} onClick={()=>setFilter(key)}>{t(label)}{!loading&&<small>{filterCounts[key]}</small>}</button>)}</div>
            </div>
            {loading?<div className={s.skel}>{[1,2,3].map(x=><i key={x}/>)}</div>:loadError?<ErrorBox message={t(loadError)} onRetry={()=>setReloadKey(value=>value+1)}/>:<>
              {filtered.length?<div className={s.list}>{filtered.map((item,index)=><AppointmentRow key={item.id} index={Math.min(index,10)} item={item} now={now} reviewed={reviewedIds.has(item.id)} {...rowHandlers(item)}/>)}</div>
                :appointments.length?<RoviEmpty tag={t("SONUÇ YOK")} title={t("Bu görünümde randevu bulunamadı.")} text={hasMoreAppointments?t("Aradığınız kayıt daha eski randevularınızda olabilir."):t("Filtreyi temizleyebilir veya yeni bir işletme keşfedebilirsiniz.")} mood="thinking"><button type="button" className={s.pill} onClick={()=>{setFilter("all");setSearch("")}}>{t("Filtreleri temizle")}</button></RoviEmpty>
                :<RoviEmpty tag={t("İLK RANDEVU")} title={t("Henüz randevunuz yok.")} text={t("Berberden spaya, güvenilir işletmeleri keşfedin; uygun saati saniyeler içinde ayırın.")} mood="wave"><Link href="/kesfet" className={`${s.pill} ${s.pillPrimary}`}>{t("İşletmeleri keşfet")} <ArrowRight size={15}/></Link></RoviEmpty>}
              {hasMoreAppointments&&<div className={s.more}><button type="button" className={s.pill} onClick={loadMoreAppointments} disabled={appointmentsLoadingMore}>{appointmentsLoadingMore?<><LoaderCircle className="animate-spin" size={16}/> {t("Yükleniyor")}</>:<>{t("Daha eski randevuları yükle")} <History size={16}/></>}</button></div>}
            </>}
          </div>}

          {tab==="alerts"&&user&&<div className={s.panel} key="alerts"><AvailabilityAlertsPanel uid={user.uid}/></div>}
          {tab==="messages"&&user&&<div className={s.panel} key="messages"><CustomerMessagesPanel uid={user.uid}/></div>}

          {tab==="benefits"&&<div className={s.panel} key="benefits">
            <div className={s.head}><div><span className={s.eyebrow}>{t("Paketler ve avantajlar")}</span><h2>{t("Kalan hakkınız, puanınız.")}</h2></div><Link href="/kesfet" className={s.headLink}><Compass size={15}/> {t("Keşfet")}</Link></div>
            <section className={s.points}><div><small><Crown size={13}/> {t("SENİNRANDEVUN CÜZDANI")}</small><strong>{totalLoyaltyPoints}<em>{t("puan")}</em></strong><p>{t("Her işletmenin puanı kendi mağazasında geçerlidir. Paket seanslarınız kullanıldıkça kalan haklarınız otomatik güncellenir.")}</p></div><div className={s.pointsSide}><div><b>{activePackages.length}</b><br/><span>{t("aktif paket")}</span></div></div></section>
            {benefitsError&&<section className={s.alert}><AlertTriangle size={20}/><div><b>{t("Paket bilgileriniz yüklenemedi.")}</b><span>{t(benefitsError)}</span></div><button type="button" className={s.chipBtn} onClick={()=>setBenefitsReloadKey(value=>value+1)}><RotateCcw size={14}/> {t("Yeniden dene")}</button></section>}
            {benefitsPhoneRequired&&<section className={s.alert}><AlertTriangle size={20}/><div><b>{t("Paketlerinizi eşleştirmek için telefon numaranızı tamamlayın.")}</b><span>{t("İşletmenin paket satışında kullandığı telefon ile hesabınızdaki telefon aynı olmalıdır.")}</span></div><button type="button" className={`${s.chipBtn} ${s.chipPrimary}`} onClick={()=>selectTab("profile")}>{t("Telefonu güncelle")}</button></section>}
            <div className={s.sub}><h3><PackageCheck size={17} style={{display:"inline",verticalAlign:"-3px",marginRight:6}}/>{t("Hizmet paketlerim")}</h3><span className={s.eyebrow}>{t("{count} aktif",{count:activePackages.length})}</span></div>
            {loading?<div className={s.skel}><i/></div>:benefitPackages.length?<div className={s.pkgGrid}>{benefitPackages.map(item=>{const progress=item.totalSessions>0?Math.max(0,Math.min(100,(item.remainingSessions/item.totalSessions)*100)):0;const active=item.status==="active"&&item.remainingSessions>0;return <article key={`${item.businessId}-${item.id}`} className={`${s.pkg} ${active?"":s.pkgOff}`}><div className={s.pkgHead}><Ring percent={progress} label={`${item.remainingSessions}`}/><div><small>{item.businessName}</small><h3>{item.packageName}</h3><p>{t("{service} · {remaining}/{total} seans kaldı",{service:item.serviceName,remaining:item.remainingSessions,total:item.totalSessions})}</p></div><span className={`${s.status} ${active?s.st_confirmed:s.st_other}`}>{packageStatusLabel(item.status,t)}</span></div><div className={s.pkgFoot}><span><CalendarDays size={14}/> {item.expiresAt?t("{date} tarihine kadar",{date:formatShortDate(item.expiresAt,t,locale)}):t("Süresiz")}</span>{item.businessSlug&&active&&<Link href={`/isletme/${item.businessSlug}/randevu`} className={`${s.chipBtn} ${s.chipPrimary}`}>{t("Randevu al")} <ArrowRight size={14}/></Link>}</div></article>})}</div>:!benefitsPhoneRequired&&<RoviEmpty tag={t("PAKETLER")} title={t("Henüz tanımlı paketiniz yok.")} text={t("Bir işletme size hizmet paketi tanımladığında kalan seanslarınız burada otomatik görünür.")} mood="idle"><Link href="/kesfet" className={s.pill}>{t("İşletmeleri keşfet")} <ArrowRight size={15}/></Link></RoviEmpty>}
            <div className={s.sub}><h3><Coins size={17} style={{display:"inline",verticalAlign:"-3px",marginRight:6}}/>{t("İşletme puanlarım")}</h3><span className={s.eyebrow}>{t("{count} puan",{count:totalLoyaltyPoints})}</span></div>
            {loyaltyBenefits.length?<div className={s.walletGrid}>{loyaltyBenefits.map(item=><article key={`${item.businessId}-${item.id}`} className={s.wallet}><span className={s.walletIcon}><Coins size={21}/></span><div><small>{item.businessName}</small><strong>{item.points}<em>{t("puan")}</em></strong><small>{t("Toplam kazanılan {count}",{count:item.lifetimePoints})}</small></div>{item.businessSlug&&<Link href={`/isletme/${item.businessSlug}`} className={s.chipBtn}>{t("Mağaza")} <ChevronRight size={14}/></Link>}</article>)}</div>:!benefitsPhoneRequired&&!loading&&<div className={s.softEmpty}><Coins size={22}/><span><b>{t("Henüz puan hareketi yok.")}</b>{t("İşletmelerden yapılan uygun alışverişler sonrası puanınız burada görünür.")}</span></div>}
          </div>}

          {tab==="favorites"&&<div className={s.panel} key="favorites">
            <div className={s.head}><div><span className={s.eyebrow}>{t("Favori işletmeler")}</span><h2>{t("Sevdikleriniz bir dokunuş uzakta.")}</h2></div><Link href="/kesfet" className={s.headLink}><Compass size={15}/> {t("Keşfet")}</Link></div>
            {loading?<div className={s.skel}>{[1,2].map(x=><i key={x}/>)}</div>:favorites.length?<div className={s.favGrid}>{favorites.map((item,index)=><article key={item.businessId} className={s.fav} style={{"--i":Math.min(index,8)} as CSSProperties}><div className={s.favCover}><button type="button" className={s.favHeart} onClick={()=>removeFavorite(item)} aria-label={t("{name} işletmesini favorilerden çıkar",{name:item.name})} title={t("Favorilerden çıkar")}><Heart size={18}/></button></div><div className={s.favBody}><div className={s.favLogo}>{item.logoUrl?<Image src={item.logoUrl} alt="" fill sizes="58px"/>:initialsOf(item.name)}</div><div><small>{item.category||t("İşletme")}</small><h3>{item.name}</h3><p><MapPin size={13}/>{[item.district,item.city].filter(Boolean).join(", ")||t("Konum bilgisi işletmede")}</p></div></div><div className={s.favActions}><Link href={item.slug?`/isletme/${item.slug}/randevu`:"/kesfet"} className={`${s.action} ${s.actionPrimary}`}><CalendarPlus size={16}/> {t("Randevu al")}</Link><Link href={item.slug?`/isletme/${item.slug}`:"/kesfet"} className={s.action} aria-label={t("{name} mağazasını aç",{name:item.name})} title={t("Mağazayı aç")}><Store size={17}/></Link></div></article>)}</div>:<RoviEmpty tag={t("FAVORİLER")} title={t("Henüz favori işletmeniz yok.")} text={t("Beğendiğiniz işletmelerde kalbe dokunun; tekrar randevu almak çok daha hızlı olsun.")} mood="happy"><Link href="/kesfet" className={`${s.pill} ${s.pillPrimary}`}>{t("Favori işletmeni keşfet")} <ArrowRight size={15}/></Link></RoviEmpty>}
          </div>}

          {tab==="profile"&&<div className={s.panel} key="profile">
            <div className={s.head}><div><span className={s.eyebrow}>{t("Hesap ayarları")}</span><h2>{t("Bilgileriniz hep güncel.")}</h2></div></div>
            <section className={s.idCard}><span className={s.idAvatar} aria-hidden="true">{initials}</span><div><h3>{displayName||t("İsimsiz kullanıcı")}</h3><p>{user?.email}</p><span className={`${s.verified} ${emailVerified?"":s.unverified}`}>{emailVerified?<><BadgeCheck size={13}/> {t("E-posta doğrulandı")}</>:<><AlertTriangle size={13}/> {t("Doğrulama bekliyor")}</>}</span></div><div className={s.score} aria-label={t("Profil %{score} tamamlandı",{score:profileScore})}><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="25"/><circle cx="30" cy="30" r="25" strokeDasharray={157.08} strokeDashoffset={157.08*(1-profileScore/100)}/></svg><b>{t("%{value}",{value:profileScore})}</b><small>{t("profil")}</small></div></section>

            <div className={s.group}><span className={s.groupTitle}>{t("Kişisel bilgiler")}</span>
              <div className={s.settings}>
                <label className={s.field}><span>{t("İsim soyisim")}</span><input value={profileName} onChange={event=>setProfileName(event.target.value)} maxLength={80} placeholder={t("Adınız ve soyadınız")} autoComplete="name"/></label>
                <label className={s.field}><span>{t("Telefon")}</span><input value={profilePhone} onChange={event=>setProfilePhone(event.target.value)} maxLength={22} inputMode="tel" placeholder="05xx xxx xx xx" autoComplete="tel"/></label>
                <label className={s.field}><span>{t("E-posta")}</span><input value={user?.email??""} disabled/></label>
              </div>
              <p className={s.groupNote}>{t("Telefon bilginiz destek taleplerinde, paket eşleştirmede ve size ulaşılması gereken durumlarda kullanılır.")}</p>
              <button type="button" className={s.saveBtn} onClick={saveProfile} disabled={profileBusy}>{profileBusy?<><LoaderCircle className="animate-spin" size={17}/> {t("Kaydediliyor")}</>:<><Check size={17}/> {t("Bilgileri kaydet")}</>}</button>
            </div>

            <div className={s.group}><span className={s.groupTitle}>{t("Bildirimler")}</span><PushToggleCard audience="customer" appearance="account"/></div>

            <div className={s.group}><span className={s.groupTitle}>{t("Giriş yöntemleri")}</span><LinkedSignInMethods/></div>

            <div className={s.group}><span className={s.groupTitle}>{t("Güvenlik")}</span>
              <div className={s.settings}>
                <button type="button" className={s.row} onClick={()=>!emailVerified&&sendEmailVerification()} disabled={verificationBusy||emailVerified}><i className={`${s.rowIcon} ${emailVerified?"":s.ic_amber}`}><BadgeCheck size={18}/></i><span className={s.rowText}><b>{t("E-posta doğrulaması")}</b><small>{emailVerified?t("Adresiniz doğrulandı."):t("6 haneli kodla doğrulayın; önemli bildirimler kaçmasın.")}</small></span><span className={`${s.rowEnd} ${emailVerified?s.rowEndOk:""}`}>{verificationBusy?<LoaderCircle className="animate-spin" size={16}/>:emailVerified?<Check size={17}/>:<>{t("Kodu gönder")} <ChevronRight size={16}/></>}</span></button>
                <button type="button" className={s.row} onClick={sendPasswordLink} disabled={passwordBusy}><i className={`${s.rowIcon} ${s.ic_blue}`}><KeyRound size={18}/></i><span className={s.rowText}><b>{t("Şifreyi yenile")}</b><small>{t("Güvenli bağlantıyı e-posta adresinize gönderelim.")}</small></span><span className={s.rowEnd}>{passwordBusy?<LoaderCircle className="animate-spin" size={16}/>:<><LockKeyhole size={15}/><ChevronRight size={16}/></>}</span></button>
                <div className={s.row}><i className={`${s.rowIcon} ${s.ic_gray}`}><Fingerprint size={18}/></i><span className={s.rowText}><b>{t("Son giriş")}</b><small>{formatLastSignIn(user?.metadata.lastSignInTime,t,locale)}</small></span></div>
              </div>
            </div>

            {(activeBusiness||businessesLoading)&&<div className={s.group}><span className={s.groupTitle}>{t("İşletme hesabı")}</span>
              {activeBusiness?<div className={s.settings}>
                {businesses.length>1&&<label className={s.field}><span>{t("Yönetilecek işletme")}</span><select value={activeBusiness.id} onChange={event=>setBusinessId(event.target.value)}>{businesses.map(business=><option value={business.id} key={business.id}>{business.name}</option>)}</select></label>}
                <Link href="/dashboard" className={s.row}><i className={`${s.rowIcon} ${s.ic_lime}`}><BriefcaseBusiness size={18}/></i><span className={s.rowText}><b>{activeBusiness.name}</b><small>{t("Yönetim paneline geçin")}</small></span><span className={s.rowEnd}><ExternalLink size={15}/></span></Link>
              </div>:<div className={`${s.skelBlock} ${s.bizLoading}`} aria-label={t("İşletme hesapları yükleniyor")}/>}
            </div>}

            <div className={s.group}><span className={s.groupTitle}>{t("Destek ve gizlilik")}</span>
              <div className={s.settings}>
                <Link href="/yardim-merkezi" className={s.row}><i className={`${s.rowIcon} ${s.ic_violet}`}><LifeBuoy size={18}/></i><span className={s.rowText}><b>{t("Yardım merkezi")}</b><small>{t("Sık sorulan sorular ve rehberler")}</small></span><ChevronRight size={17} className={s.rowEnd}/></Link>
                <Link href="/gizlilik" className={s.row}><i className={`${s.rowIcon} ${s.ic_gray}`}><ShieldCheck size={18}/></i><span className={s.rowText}><b>{t("Gizlilik politikası")}</b></span><ChevronRight size={17} className={s.rowEnd}/></Link>
                <Link href="/kvkk" className={s.row}><i className={`${s.rowIcon} ${s.ic_gray}`}><UserRound size={18}/></i><span className={s.rowText}><b>{t("KVKK ve veri haklarım")}</b></span><ChevronRight size={17} className={s.rowEnd}/></Link>
                <button type="button" className={s.row} onClick={async()=>{await logout();router.push("/musteri/giris")}}><i className={`${s.rowIcon} ${s.ic_gray}`}><LogOut size={18}/></i><span className={s.rowText}><b>{t("Güvenli çıkış")}</b></span><ChevronRight size={17} className={s.rowEnd}/></button>
              </div>
            </div>

            <div className={`${s.group} ${s.dangerZone}`}><span className={s.groupTitle}>{t("Tehlikeli bölge")}</span>
              <div className={s.settings}><button type="button" className={`${s.row} ${s.rowDanger}`} onClick={()=>setDeleteOpen(true)}><i className={`${s.rowIcon} ${s.ic_red}`}><Trash2 size={18}/></i><span className={s.rowText}><b>{t("Hesabımı ve verilerimi sil")}</b><small>{t("Randevu geçmişiniz ve sahibi olduğunuz işletmeler dahil kalıcıdır.")}</small></span><ChevronRight size={17} className={s.rowEnd}/></button></div>
            </div>
            {completedValue>0&&<p className={s.valueNote}><TicketCheck size={15}/> {t("Tamamlanan randevularınızdaki kayıtlı hizmet değeri:")} <b>{formatMoney(completedValue,locale)}</b></p>}
          </div>}
        </div>
      </section>
    </main><MarketingFooter/>

    {reviewing&&<Sheet onDismiss={()=>setReviewing(null)} labelledBy="account-review-title">
      <button type="button" className={s.sheetClose} onClick={()=>setReviewing(null)} aria-label={t("Kapat")}><X size={18}/></button>
      <div className={s.reviewHead}><span>{t("DEĞERLENDİRME")}</span><h3 id="account-review-title">{reviewing.businessName}</h3><p>{reviewing.serviceName} · {formatDate(reviewing.startAt,t,locale)}</p></div>
      <ReviewForm businessId={reviewing.businessId} appointmentId={reviewing.id} serviceName={reviewing.serviceName} staffName={reviewing.staffName} onSuccess={()=>{const id=reviewing.id;setReviewedIds(current=>new Set(current).add(id));setReviewing(null)}}/>
    </Sheet>}
    {rescheduling&&<RescheduleDialog businessId={rescheduling.businessId} serviceId={rescheduling.serviceId} variantId={rescheduling.serviceVariantId} staffId={rescheduling.staffId||undefined} currentStartAt={rescheduling.startAt} durationMinutes={(new Date(rescheduling.endAt).getTime()-new Date(rescheduling.startAt).getTime())/60000||undefined} title={rescheduling.businessName} subtitle={t("{service} · Şu an: {date}",{service:rescheduling.serviceName,date:formatDate(rescheduling.startAt,t,locale)})} timeZone={rescheduling.timeZone} maximumBookingDaysAhead={rescheduling.maximumBookingDaysAhead} onClose={closeReschedule} onConfirm={confirmReschedule}/>}
    {cancelling&&<Sheet onDismiss={()=>{if(!cancelBusy)setCancelling(null)}} labelledBy="account-cancel-title">
      <button type="button" className={s.sheetClose} onClick={()=>setCancelling(null)} disabled={cancelBusy} aria-label={t("Kapat")}><X size={18}/></button>
      <div className={`${s.sheetIcon} ${s.sheetIconDanger}`}><CalendarDays size={27}/></div>
      <span className={s.sheetEyebrow}>{t("RANDEVU İPTALİ")}</span>
      <h2 id="account-cancel-title">{t("Bu randevuyu iptal etmek istediğinize emin misiniz?")}</h2>
      <div className={s.sheetCard}><b>{cancelling.businessName}</b><span>{cancelling.serviceName} · {formatDate(cancelling.startAt,t,locale)}</span></div>
      <p className={s.sheetHint}>{t("İptal bilgisi anında işletmeye iletilecek. İşletmenin iptal kuralı buna izin vermiyorsa nedenini size hemen gösteririz.")}</p>
      <div className={s.sheetFoot}><button type="button" className={s.btn} onClick={()=>setCancelling(null)} disabled={cancelBusy}>{t("Vazgeç")}</button><button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={cancelAppointment} disabled={cancelBusy}>{cancelBusy?<LoaderCircle className="animate-spin" size={18}/>:t("Evet, iptal et")}</button></div>
    </Sheet>}
    {calendarFor&&<Sheet onDismiss={()=>setCalendarFor(null)} labelledBy="account-calendar-title">
      <button type="button" className={s.sheetClose} onClick={()=>setCalendarFor(null)} aria-label={t("Kapat")}><X size={18}/></button>
      <div className={s.sheetIcon}><CalendarPlus size={27}/></div>
      <span className={s.sheetEyebrow}>{t("TAKVİME EKLE")}</span>
      <h2 id="account-calendar-title">{calendarFor.businessName}</h2>
      <p>{t("{service} · {date}. Randevudan 1 saat önce hatırlatma eklenir.",{service:calendarFor.serviceName,date:formatDate(calendarFor.startAt,t,locale)})}</p>
      <div className={s.sheetList}>
        <a className={s.row} href={googleCalendarUrl(calendarEventOf(calendarFor,t))} target="_blank" rel="noopener noreferrer" onClick={()=>setCalendarFor(null)}><i className={`${s.rowIcon} ${s.ic_blue}`}><CalendarDays size={18}/></i><span className={s.rowText}><b>{t("Google Takvim")}</b><small>{t("Yeni sekmede açılır")}</small></span><ExternalLink size={16} className={s.rowEnd}/></a>
        <button type="button" className={s.row} onClick={()=>{addToDeviceCalendar(calendarEventOf(calendarFor,t),{publicToken:calendarFor.publicToken,fileName:`randevu-${calendarFor.id}.ics`});setCalendarFor(null)}}><i className={`${s.rowIcon} ${s.ic_gray}`}><CalendarClock size={18}/></i><span className={s.rowText}><b>{t("Telefon takvimine ekle")}</b><small>{t("iPhone: Apple Takvim · Android: telefon takvimi")}</small></span><ChevronRight size={17} className={s.rowEnd}/></button>
      </div>
    </Sheet>}
    {verifyOpen&&<Sheet onDismiss={()=>{if(!verificationBusy)setVerifyOpen(false)}} labelledBy="verify-email-title">
      <button type="button" className={s.sheetClose} onClick={()=>setVerifyOpen(false)} disabled={verificationBusy} aria-label={t("Kapat")}><X size={18}/></button>
      <div className={s.sheetIcon}><BadgeCheck size={29}/></div>
      <span className={s.sheetEyebrow}>{t("E-POSTA GÜVENLİĞİ")}</span>
      <h2 id="verify-email-title">{t("6 haneli kodu girin.")}</h2>
      <p>{withSlot(t("{email} adresine gönderdiğimiz kod 5 dakika geçerlidir."),"email",<b>{user?.email}</b>)}</p>
      <label className={s.sheetField}><span>{t("Doğrulama kodu")}</span><input className={s.codeInput} value={verificationCode} onChange={event=>setVerificationCode(event.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" aria-label={t("6 haneli doğrulama kodu")} autoFocus/></label>
      <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnWide}`} onClick={verifyEmail} disabled={verificationBusy||verificationCode.length!==6}>{verificationBusy?<><LoaderCircle className="animate-spin" size={18}/> {t("Kontrol ediliyor")}</>:<>{t("E-postamı doğrula")} <ArrowRight size={17}/></>}</button>
      <div className={s.sheetLinks}><span>{t("Kod gelmedi mi?")}</span><button type="button" onClick={sendEmailVerification} disabled={verificationBusy}>{verificationSent?t("Yeni kod gönder"):t("Kodu gönder")}</button></div>
    </Sheet>}
    {deleteOpen&&<Sheet onDismiss={()=>{if(!deleteBusy)setDeleteOpen(false)}} labelledBy="delete-account-title">
      <button type="button" className={s.sheetClose} onClick={()=>setDeleteOpen(false)} disabled={deleteBusy} aria-label={t("Kapat")}><X size={18}/></button>
      <div className={`${s.sheetIcon} ${s.sheetIconDanger}`}><AlertTriangle size={28}/></div>
      <span className={s.sheetEyebrow}>{t("GERİ ALINAMAZ İŞLEM")}</span>
      <h2 id="delete-account-title">{t("Hesabınızı kalıcı olarak silmek üzeresiniz.")}</h2>
      <p>{t("Randevu geçmişiniz, favorileriniz, profiliniz ve sahibi olduğunuz işletme hesapları kalıcı olarak silinir.")}</p>
      <label className={s.sheetField}><span>{t("Onaylamak için e-posta adresinizi yazın")}</span><input type="email" value={deleteConfirm} onChange={event=>setDeleteConfirm(event.target.value)} placeholder={user?.email??t("E-posta adresiniz")} autoComplete="off"/></label>
      <div className={s.sheetFoot}><button type="button" className={s.btn} onClick={()=>setDeleteOpen(false)} disabled={deleteBusy}>{t("Vazgeç")}</button><button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={deleteAccount} disabled={deleteBusy||!user?.email||deleteConfirm.trim().toLocaleLowerCase("tr-TR")!==user.email.toLocaleLowerCase("tr-TR")}>{deleteBusy?<><LoaderCircle className="animate-spin" size={18}/> {t("Siliniyor")}</>:t("Kalıcı olarak sil")}</button></div>
    </Sheet>}
  </div>;
}

/* ── Alt bileşenler ── */

function Sheet({children,onDismiss,labelledBy}:{children:ReactNode;onDismiss:()=>void;labelledBy:string}) {
  return <div className={s.backdrop} data-account-overlay="" onMouseDown={event=>{if(event.target===event.currentTarget)onDismiss()}}>
    <section className={s.sheet} role="dialog" aria-modal="true" aria-labelledby={labelledBy}><div className={s.grabber} aria-hidden="true"/>{children}</section>
  </div>;
}

function RoviEmpty({tag,title,text,mood,children}:{tag:string;title:string;text:string;mood:"idle"|"happy"|"thinking"|"wave";children?:ReactNode}) {
  return <section className={s.empty}><RoviMascot size={104} mood={mood} alt=""/><span className={s.emptyTag}>{tag}</span><h3>{title}</h3><p>{text}</p>{children&&<div className={s.emptyActions}>{children}</div>}</section>;
}

function ErrorBox({message,onRetry}:{message:string;onRetry:()=>void}) {
  const t=useT();
  return <div className={s.error} role="alert"><AlertTriangle size={26}/><h3>{t("Randevular yüklenemedi.")}</h3><p>{message}</p><button type="button" className={s.pill} onClick={onRetry}><RotateCcw size={15}/> {t("Yeniden dene")}</button></div>;
}

function BusinessAccess({businesses,activeBusiness,onSelect}:{businesses:Array<{id:string;name:string}>;activeBusiness:{id:string;name:string};onSelect:(id:string)=>void}) {
  const t=useT();
  return <section className={s.biz}><div><i className={`${s.rowIcon} ${s.ic_lime}`}><BriefcaseBusiness size={17}/></i><span><small>{t("İŞLETME HESABI")}</small><b>{activeBusiness.name}</b></span></div>{businesses.length>1&&<select aria-label={t("Yönetilecek işletme")} value={activeBusiness.id} onChange={event=>onSelect(event.target.value)}>{businesses.map(business=><option value={business.id} key={business.id}>{business.name}</option>)}</select>}<Link href="/dashboard">{t("Yönetim paneline geç")} <ExternalLink size={13}/></Link></section>;
}

function Ring({percent,label}:{percent:number;label:string}) {
  const c=2*Math.PI*24;
  return <span className={s.ring} aria-hidden="true"><svg viewBox="0 0 58 58"><circle cx="29" cy="29" r="24"/><circle cx="29" cy="29" r="24" strokeDasharray={c} strokeDashoffset={c*(1-percent/100)}/></svg><b>{label}</b></span>;
}

function DateTile({value,active}:{value:string;active?:boolean}) {
  const locale=useIntlLocale();
  const date=new Date(value); const valid=!Number.isNaN(date.getTime());
  return <span className={`${s.dateTile} ${active?s.dateTileActive:""}`} aria-hidden="true"><b>{valid?date.toLocaleDateString(locale,{day:"2-digit"}):"–"}</b><small>{valid?date.toLocaleDateString(locale,{month:"short"}).toLocaleUpperCase(locale):""}</small></span>;
}

type RowHandlers = {onCancel:()=>void;onReschedule:()=>void;onReview:()=>void;onCalendar:()=>void};

function NextTicket({item,now,onCancel,onReschedule,onCalendar}:{item:CustomerAppointment;now:number}&RowHandlers) {
  const t=useT(); const locale=useIntlLocale();
  const status=statuses[item.status]??{label:item.status,icon:Clock3};
  const services=[item.serviceName,...(item.additionalServices??[]).map(service=>service.name)].filter(Boolean).join(" + ");
  const total=item.price!==undefined?item.price+(item.additionalServices??[]).reduce((sum,service)=>sum+service.price,0):undefined;
  const maps=mapsUrl(item);
  return <article className={s.ticket} aria-label={t("Sıradaki randevu: {name}",{name:item.businessName})}>
    <div className={s.ticketTop}>
      <div className={s.ticketMeta}><span className={s.ticketLabel}>{t(status.label).toLocaleUpperCase(locale)}</span><span className={s.countdown}><i aria-hidden="true"/>{countdownOf(item.startAt,now,t)}</span></div>
      <div className={s.ticketBiz}><span className={s.ticketLogo}>{item.businessLogo?<Image src={item.businessLogo} alt="" fill sizes="54px"/>:initialsOf(item.businessName)}</span><div><h3>{item.businessName}</h3><p>{services}</p></div></div>
    </div>
    <div className={s.perf} aria-hidden="true"/>
    <div className={s.ticketInfo}>
      <div className={s.info}><small>{t("Tarih")}</small><b>{dayLabel(item.startAt,now,t,locale)}</b><span>{formatShortDate(item.startAt,t,locale)}</span></div>
      <div className={s.info}><small>{t("Saat")}</small><b>{timeOf(item.startAt,locale)}</b><span>{item.endAt?t("Bitiş {time}",{time:timeOf(item.endAt,locale)}):" "}</span></div>
      <div className={s.info}><small>{t("Uzman")}</small><b>{t(item.staffName)}</b><span>{item.businessCity||" "}</span></div>
      <div className={s.info}><small>{t("Tutar")}</small><b>{total!==undefined&&total>0?formatMoney(total,locale):t("İşletmede")}</b><span>{t("Hizmet bedeli")}</span></div>
    </div>
    <div className={s.ticketActions}>
      {item.publicToken&&<Link href={`/randevu/${item.publicToken}`} className={`${s.action} ${s.actionPrimary}`}>{t("Detay")} <ArrowRight size={16}/></Link>}
      {item.allowReschedule&&<button type="button" className={s.action} onClick={onReschedule}><CalendarClock size={16}/> {t("Saati değiştir")}</button>}
      <button type="button" className={s.action} onClick={onCalendar}><CalendarPlus size={16}/> {t("Takvime ekle")}</button>
      {maps&&<a href={maps} target="_blank" rel="noopener noreferrer" className={s.action}><Navigation size={16}/> {t("Yol tarifi")}</a>}
      <button type="button" className={`${s.action} ${s.actionDanger}`} onClick={onCancel}><X size={16}/> {t("İptal et")}</button>
    </div>
  </article>;
}

function AppointmentRow({item,now,index,reviewed,onCancel,onReschedule,onReview,onCalendar}:{item:CustomerAppointment;now:number;index:number;reviewed:boolean}&RowHandlers) {
  const t=useT(); const locale=useIntlLocale();
  const status=statuses[item.status]??{label:item.status,icon:Clock3}; const StatusIcon=status.icon; const future=new Date(item.startAt).getTime()>now; const active=["pending","confirmed"].includes(item.status)&&future;
  const extras=(item.additionalServices?.length??0)>0?` + ${item.additionalServices?.map(service=>service.name).join(", ")}`:"";
  return <article className={`${s.appt} ${active?"":s.apptMuted}`} style={{"--i":index} as CSSProperties}>
    <div className={s.apptRow}>
      <DateTile value={item.startAt} active={active}/>
      <div className={s.apptMain}>
        <div className={s.apptTop}><span className={`${s.status} ${STATUS_CLASS[item.status]??s.st_other}`}><StatusIcon size={12}/>{t(status.label)}</span><small>{timeOf(item.startAt,locale)}{active?"":` · ${new Date(item.startAt).getFullYear()}`}</small>{active&&<span className={s.apptLeft}>{shortCountdown(item.startAt,now,t)}</span>}</div>
        <h3>{item.businessSlug?<Link href={`/isletme/${item.businessSlug}`}>{item.businessName}</Link>:item.businessName}</h3>
        <p>{item.serviceName}{extras} · {t(item.staffName)}</p>
      </div>
    </div>
    <div className={s.chips}>
      {item.publicToken&&<Link href={`/randevu/${item.publicToken}`} className={`${s.chipBtn} ${active?s.chipPrimary:""}`}>{t("Detay")} <ChevronRight size={14}/></Link>}
      {active&&item.allowReschedule&&<button type="button" className={s.chipBtn} onClick={onReschedule}><CalendarClock size={14}/> {t("Saati değiştir")}</button>}
      {active&&<button type="button" className={s.chipBtn} onClick={onCalendar}><CalendarPlus size={14}/> {t("Takvime ekle")}</button>}
      {active&&<button type="button" className={`${s.chipBtn} ${s.chipDanger}`} onClick={onCancel}>{t("İptal et")}</button>}
      {!active&&item.status==="completed"&&!reviewed&&<button type="button" className={`${s.chipBtn} ${s.chipLime}`} onClick={onReview}><Star size={14}/> {t("Değerlendir")}</button>}
      {!active&&<Link href={rebookHref(item)} className={s.chipBtn}><RotateCcw size={14}/> {t("Tekrar randevu al")}</Link>}
    </div>
  </article>;
}

function PageSkeleton() {
  const t=useT();
  return <div className={`marketing-page ${s.page}`}><MarketingHeader/><main className={s.main} aria-busy="true" aria-label={t("Hesabınız hazırlanıyor")}><i className={`${s.skelBlock} ${s.skelHero}`}/><div className={`${s.skel} ${s.skelTabs}`}>{[1,2,3,4].map(x=><i key={x}/>)}</div><div style={{marginTop:18}}><i className={`${s.skelBlock} ${s.skelTicket}`}/></div></main></div>;
}

/* ── Yardımcılar ── */

function rebookHref(item:CustomerAppointment){
  if(!item.businessSlug)return "/kesfet";
  const params=new URLSearchParams(); if(item.serviceId)params.set("service",item.serviceId); if(item.staffId)params.set("staff",item.staffId);
  return `/isletme/${item.businessSlug}/randevu${params.size?`?${params}`:""}`;
}
function mapsUrl(item:CustomerAppointment){
  if(!item.businessAddress&&!item.businessCity)return null;
  const destination=[item.businessName,item.businessAddress,item.businessCity].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
function calendarEventOf(item:CustomerAppointment,t:TFunction):CalendarEventInput{
  const start=new Date(item.startAt); const parsedEnd=new Date(item.endAt);
  const end=Number.isNaN(parsedEnd.getTime())||parsedEnd<=start?new Date(start.getTime()+30*60_000):parsedEnd;
  const services=[item.serviceName,...(item.additionalServices??[]).map(service=>service.name)].filter(Boolean).join(" + ");
  return {uid:item.id,title:`${services} · ${item.businessName}`,start,end,description:t("Çalışan: {name}",{name:t(item.staffName)}),location:[item.businessAddress,item.businessCity].filter(Boolean).join(", ")||undefined,url:item.publicToken?`${window.location.origin}/randevu/${item.publicToken}`:undefined};
}
function initialsOf(value:string){
  const source=value.includes("@")?value.split("@")[0]:value;
  const parts=source.trim().split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.charAt(0)??"S")+(parts.length>1?parts[parts.length-1].charAt(0):"")).toLocaleUpperCase("tr-TR");
}
function greetingOf(now:number,t:TFunction){const hour=new Date(now).getHours();return hour<5?t("İyi geceler"):hour<12?t("Günaydın"):hour<18?t("İyi günler"):hour<23?t("İyi akşamlar"):t("İyi geceler")}
function timeOf(value:string,locale:string){const date=new Date(value);return Number.isNaN(date.getTime())?"--:--":date.toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"})}
function dayLabel(value:string,now:number,t:TFunction,locale:string){
  const date=new Date(value); if(Number.isNaN(date.getTime()))return t("Tarih yok");
  const startOf=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
  const days=Math.round((startOf(date)-startOf(new Date(now)))/86_400_000);
  if(days===0)return t("Bugün"); if(days===1)return t("Yarın");
  return date.toLocaleDateString(locale,{weekday:"long"}).replace(/^./,char=>char.toLocaleUpperCase(locale));
}
function countdownOf(value:string,now:number,t:TFunction){
  const ms=new Date(value).getTime()-now; if(!Number.isFinite(ms))return "";
  if(ms<=0)return t("Başlamak üzere");
  const minutes=Math.floor(ms/60_000); const days=Math.floor(minutes/1440); const hours=Math.floor((minutes%1440)/60); const mins=minutes%60;
  if(days>0)return hours?t("{days} gün {hours} saat kaldı",{days,hours}):t("{count} gün kaldı",{count:days});
  if(hours>0)return mins?t("{hours} saat {minutes} dk kaldı",{hours,minutes:mins}):t("{count} saat kaldı",{count:hours});
  return t("{minutes} dk kaldı",{minutes:Math.max(1,mins)});
}
function shortCountdown(value:string,now:number,t:TFunction){
  const ms=new Date(value).getTime()-now; if(!Number.isFinite(ms)||ms<=0)return t("Şimdi");
  const minutes=Math.floor(ms/60_000); const days=Math.floor(minutes/1440); const hours=Math.floor(minutes/60);
  return days>0?t("{count} gün",{count:days}):hours>0?t("{hours} sa",{hours}):t("{minutes} dk",{minutes:Math.max(1,minutes)});
}
function formatDate(value:string,t:TFunction,locale:string){const date=new Date(value);return Number.isNaN(date.getTime())?t("Tarih bilgisi yok"):date.toLocaleDateString(locale,{day:"2-digit",month:"long",year:"numeric"})+" · "+date.toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"})}
function formatLastSignIn(value:string|null|undefined,t:TFunction,locale:string){if(!value)return t("Bilgi yok");const date=new Date(value);return Number.isNaN(date.getTime())?t("Bilgi yok"):date.toLocaleString(locale,{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
function formatMoney(value:number,locale:string){return new Intl.NumberFormat(locale,{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(value)}
function formatShortDate(value:string,t:TFunction,locale:string){const date=new Date(value);return Number.isNaN(date.getTime())?t("Tarih bilgisi yok"):date.toLocaleDateString(locale,{day:"2-digit",month:"short",year:"numeric"})}
function packageStatusLabel(value:string,t:TFunction){return value==="active"?t("Aktif"):value==="used"?t("Tamamlandı"):value==="expired"?t("Süresi doldu"):value==="cancelled"?t("İptal"):t("Beklemede")}
