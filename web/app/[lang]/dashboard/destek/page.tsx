"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Headphones, LoaderCircle, MessageCircleMore, MessagesSquare, Send, ShieldCheck, UserRound } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuthContext } from "@/features/auth/auth-context";
import { useBusiness } from "@/hooks/use-business";
import { EmptyState, HeroChip, Pill, SearchField, Segmented, Sheet, StudioHero, StudioPage, StudioSkeleton, cx, studio } from "../_studio";
import { TicketThread, statusLabel, statusTone, type Ticket } from "./ticket-thread";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import css from "./support.module.css";

type Tab = "customers"|"platform";
const categories=[{value:"technical",label:tk("Teknik sorun")},{value:"billing",label:tk("Faturalama")},{value:"account",label:tk("Hesap ve erişim")},{value:"feature_request",label:tk("Özellik talebi")},{value:"other",label:tk("Diğer")}];

const DESKTOP_QUERY = "(min-width: 1024px)";
function subscribeDesktop(callback: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);
}

export default function DashboardSupportPage(){
  const t = useT(); const intl = useIntlLocale();
  const {user}=useAuthContext(); const {businessId}=useBusiness();
  const [tickets,setTickets]=useState<Ticket[]>([]); const [loading,setLoading]=useState(true); const [tab,setTab]=useState<Tab>("customers");
  const [search,setSearch]=useState(""); const [showForm,setShowForm]=useState(false); const [selected,setSelected]=useState<Ticket|null>(null);
  const [title,setTitle]=useState(""); const [category,setCategory]=useState("technical"); const [message,setMessage]=useState(""); const [submitting,setSubmitting]=useState(false);
  const isDesktop = useIsDesktop();

  useEffect(()=>{
    if(new URLSearchParams(window.location.search).get("mode")!=="billing")return;
    queueMicrotask(()=>{
      setTab("platform");
      setCategory("billing");
      setTitle(t("Abonelik ve faturalama talebi"));
      setMessage(t("İşletmem için abonelik süresini yenilemek ve ödeme seçenekleri hakkında bilgi almak istiyorum."));
      setShowForm(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız ilk açılışta, o anki dille doldurulur
  },[]);

  useEffect(()=>{if(!businessId)return;return onSnapshot(query(collection(getDb(),"supportTickets"),where("businessId","==",businessId),orderBy("createdAt","desc")),snapshot=>{setTickets(snapshot.docs.map(item=>{const d=item.data();const stamp=d.createdAt as Timestamp|undefined;return{id:item.id,title:String(d.title??t("Mesaj")),category:String(d.category??"other"),status:String(d.status??"open"),createdAt:stamp?.toDate?stamp.toDate().toLocaleString(intl):t("Şimdi"),message:String(d.message??""),requesterName:String(d.requesterName??d.userEmail??t("Kullanıcı")),requesterPhone:String(d.requesterPhone??""),requesterEmail:String(d.requesterEmail??d.userEmail??""),source:String(d.source??"dashboard"),target:String(d.target??"platform"),hasAccount:typeof d.userId==="string"&&d.userId.length>0}}));setLoading(false)},error=>{toast.error(t(error.message));setLoading(false)});},[businessId, t, intl]);
  const customerTickets=useMemo(()=>tickets.filter(item=>item.target==="business"||item.source==="storefront"||item.category==="customer_message"),[tickets]);
  const platformTickets=useMemo(()=>tickets.filter(item=>!(item.target==="business"||item.source==="storefront"||item.category==="customer_message")),[tickets]);
  const visible=(tab==="customers"?customerTickets:platformTickets).filter(item=>!search.trim()||`${item.title} ${item.requesterName} ${item.requesterPhone} ${item.message}`.toLocaleLowerCase(intl).includes(search.trim().toLocaleLowerCase(intl)));

  async function submit(){if(!title.trim()||!message.trim()||!businessId||!user)return;setSubmitting(true);try{await httpsCallable(getFunctions(getFirebaseApp(),"europe-west1"),"createBusinessSupportTicket")({businessId,title:title.trim(),category,message:message.trim()});toast.success(t("Talebiniz destek ekibine ulaştı."));setTitle("");setMessage("");setShowForm(false)}catch(error){toast.error(t((error as Error).message))}finally{setSubmitting(false)}}
  async function resolveCustomer(id:string){try{await updateDoc(doc(getDb(),"supportTickets",id),{status:"resolved",updatedAt:serverTimestamp()});toast.success(t("Müşteri mesajı çözüldü olarak işaretlendi."))}catch(error){toast.error(t((error as Error).message))}}

  // Seçili talebin canlı halini (durum değişiklikleri dahil) kullan.
  const active = selected ? tickets.find(item=>item.id===selected.id) ?? selected : null;
  const customers = tab==="customers";
  const openCustomer = customerTickets.filter(x=>x.status!=="resolved").length;
  const openPlatform = platformTickets.filter(x=>x.status!=="resolved").length;

  const closeForm = useCallback(()=>setShowForm(false),[]);
  const closeThread = useCallback(()=>setSelected(null),[]);
  function switchTab(next:Tab){setTab(next);setSelected(null)}
  function openNewTicket(){if(tab!=="platform")switchTab("platform");setShowForm(true)}

  const mobileThreadOpen = !!active && !isDesktop;
  useEffect(()=>{
    if(!mobileThreadOpen)return;
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")closeThread()};
    document.addEventListener("keydown",onKey);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener("keydown",onKey)};
  },[mobileThreadOpen,closeThread]);

  const thread = active ? (
    <TicketThread
      key={active.id}
      ticket={active}
      platform={!customers}
      userId={user?.uid??""}
      onBack={isDesktop ? undefined : closeThread}
      onResolve={customers ? ()=>resolveCustomer(active.id) : undefined}
    />
  ) : null;

  return (
    <StudioPage label={t("İletişim merkezi")}>
      <StudioHero
        eyebrow={t("İletişim merkezi")}
        icon={MessagesSquare}
        title={t("Mesajlar & destek")}
        description={t("Mağaza müşterilerinizden gelen mesajları yanıtlayın veya SeninRandevun ekibiyle güvenli bir destek görüşmesi başlatın.")}
        actions={<button type="button" className={cx(studio.btn, studio.btnBright)} onClick={openNewTicket}><MessageCircleMore size={17} aria-hidden /> {t("Yeni destek talebi")}</button>}
      >
        <HeroChip icon={UserRound} value={openCustomer} label={t("açık müşteri mesajı")} />
        <HeroChip icon={Headphones} value={openPlatform} label={t("aktif destek talebi")} />
      </StudioHero>

      <div className={css.toolbar}>
        <Segmented
          label={t("Mesaj türü")}
          value={tab}
          onChange={switchTab}
          options={[
            { value: "customers", label: t("Müşteri mesajları"), icon: UserRound, count: customerTickets.length },
            { value: "platform", label: t("Platform desteği"), icon: Headphones, count: platformTickets.length },
          ]}
        />
        <SearchField value={search} onChange={setSearch} placeholder={t("Mesajlarda ara…")} />
      </div>

      {loading ? (
        <StudioSkeleton stats={0} rows={4} label={t("Mesajlar yükleniyor")} />
      ) : (
        <div className={css.inbox}>
          <section className={css.listPane} aria-label={customers ? t("Müşteri mesajları") : t("Destek talepleri")}>
            <div className={css.listHead}>
              <span>{customers ? t("Gelen kutusu") : t("Talepleriniz")}</span>
              <span>{visible.length}</span>
            </div>
            {visible.length===0 ? (
              <div className={css.listEmpty}>
                <EmptyState
                  title={search.trim() ? t("Sonuç bulunamadı") : customers ? t("Müşteri mesajı yok") : t("Destek talebi yok")}
                  description={search.trim() ? t("Farklı bir kelimeyle aramayı deneyin.") : customers ? t("Mağazanıza gönderilen mesajlar burada görünür.") : t("İhtiyaç duyduğunuzda destek ekibimiz yanınızda.")}
                  mood={customers ? "wave" : "happy"}
                  size={84}
                  action={!customers && !search.trim() ? <button type="button" className={cx(studio.btn, studio.btnPrimary)} onClick={()=>setShowForm(true)}><MessageCircleMore size={16} aria-hidden /> {t("Yeni talep")}</button> : undefined}
                />
              </div>
            ) : (
              <ul className={css.list}>
                {visible.map(ticket=>{
                  const needsAction = customers ? ticket.status==="open" : ticket.status==="waiting_user";
                  return (
                    <li key={ticket.id}>
                      <button type="button" className={css.item} aria-current={active?.id===ticket.id ? "true" : undefined} onClick={()=>setSelected(ticket)}>
                        <span className={css.itemIcon} aria-hidden>
                          {customers?<UserRound size={20}/>:<Headphones size={20}/>}
                          {needsAction ? <i className={css.unreadDot} /> : null}
                        </span>
                        <span className={css.itemBody}>
                          <span className={css.itemTop}>
                            <span className={css.itemTitle}>{ticket.title}</span>
                            <span className={css.itemTime}>{ticket.createdAt.split(/[ ,]/)[0]}</span>
                          </span>
                          <span className={css.itemSub}>{ticket.requesterName}</span>
                          <span className={css.itemFoot}>
                            <Pill tone={statusTone(ticket.status, customers)} dot>{t(statusLabel(ticket.status, customers))}</Pill>
                            <span className={css.itemPreview}>{ticket.message}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={css.threadPane} aria-label={t("Konuşma")}>
            {isDesktop && thread ? thread : (
              <div className={css.placeholder}>
                <div>
                  <EmptyState
                    title={t("Bir görüşme seçin")}
                    description={customers ? t("Soldaki listeden bir müşteri mesajı seçerek yanıtlayın.") : t("Soldaki listeden bir talep seçin veya yeni bir destek görüşmesi başlatın.")}
                    mood="thinking"
                    size={88}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {mobileThreadOpen && typeof document!=="undefined" ? createPortal(
        <div className={cx(studio.page, css.full)} role="dialog" aria-modal="true" aria-label={active?.title}>
          {thread}
        </div>,
        document.body,
      ) : null}

      <Sheet
        open={showForm}
        onClose={closeForm}
        title={t("Yeni destek görüşmesi")}
        description={t("Bize anlatın, birlikte çözelim.")}
        footer={<>
          <button type="button" className={studio.btn} onClick={closeForm}>{t("Vazgeç")}</button>
          <button type="button" className={cx(studio.btn, studio.btnPrimary)} disabled={submitting||!title.trim()||!message.trim()} onClick={submit}>
            {submitting?<LoaderCircle size={16} className={studio.spin} aria-hidden/>:<Send size={16} aria-hidden/>} {t("Gönder")}
          </button>
        </>}
      >
        <div className={css.form}>
          <div className={studio.field}>
            <label className={studio.label} htmlFor="support-title">{t("Konu")}</label>
            <input id="support-title" className={studio.input} value={title} onChange={e=>setTitle(e.target.value)} placeholder={t("Kısaca konu başlığı")}/>
          </div>
          <div className={studio.field}>
            <label className={studio.label} htmlFor="support-category">{t("Kategori")}</label>
            <select id="support-category" className={studio.select} value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(x=><option key={x.value} value={x.value}>{t(x.label)}</option>)}</select>
          </div>
          <div className={studio.field}>
            <label className={studio.label} htmlFor="support-message">{t("Mesaj")}</label>
            <textarea id="support-message" className={studio.textarea} rows={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder={t("Talebinizi detaylandırın…")}/>
          </div>
          <p className={css.privacy}><ShieldCheck size={15} aria-hidden/> {t("Görüşmeniz yalnızca işletmeniz ve platform ekibi tarafından görülür.")}</p>
        </div>
      </Sheet>
    </StudioPage>
  );
}
