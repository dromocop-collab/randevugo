"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addDoc, collection, doc, getCountFromServer, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, startAfter, updateDoc, where,
  type FirestoreError, type Query, type QueryConstraint, type QueryDocumentSnapshot, type Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  AlarmClock, ArrowLeft, Building2, CheckCircle2, Headphones, Inbox, LoaderCircle, MessageCircleMore, Phone, RotateCcw, Send, Store, UserRound,
} from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { useAuthContext } from "@/features/auth/auth-context";
import { SUPPORT_ACTIVE_STATUSES, SUPPORT_NEEDS_ADMIN_STATUSES, isStaleSupportTicket } from "@/features/platform/admin-ops";
import {
  AdminPage, Avatar, Btn, EmptyState, HeroStat, IconBtn, PageHeader, Pill, SearchField, Segmented, SkeletonList, StatCard, StatGrid,
  Toolbar, cx, fullDate, relativeTime, ui, useHotkeys, useIsClient, useMediaQuery, useNow, type Tone,
} from "../_pages-ui";
import s from "./support.module.css";

type SupportRow = { id:string; userId:string|null; title:string; category:string; source:string; target:string; requesterName:string; requesterPhone:string; message:string; businessId:string|null; businessName:string|null; status:string; createdAt:string; createdMillis:number|null; sortMillis:number };
type Filter = "needs_admin"|"active"|"business"|"all";
type Counts = { needsAdmin:number; business:number; resolved:number };

const PAGE_SIZE = 100;
const STATUS_META: Record<string,{ label:string; tone:Tone }> = {
  open: { label:"Yeni", tone:"blue" },
  waiting_admin: { label:"Ekip yanıtı bekleniyor", tone:"amber" },
  waiting_user: { label:"İşletme yanıtı bekleniyor", tone:"violet" },
  resolved: { label:"Çözüldü", tone:"green" },
};
const FILTERS: ReadonlyArray<readonly [Filter,string]> = [["needs_admin","Yanıt bekleyen"],["active","Aktif"],["business","Mağaza mesajları"],["all","Tümü"]];
const QUICK_REPLIES = [
  "Merhaba, talebinizi aldık ve inceliyoruz. En kısa sürede dönüş yapacağız.",
  "Sorunu giderdik. Tekrar dener misiniz? Devam ederse bize yazmanız yeterli.",
  "Daha hızlı yardımcı olabilmemiz için ekran görüntüsü veya ek bilgi paylaşabilir misiniz?",
  "Talebiniz ilgili ekibe iletildi, gelişmeleri buradan paylaşacağız.",
  "Teşekkür ederiz, iyi çalışmalar dileriz.",
];

function filterConstraints(filter:Filter): QueryConstraint[] {
  if (filter === "needs_admin") return [where("status","in",SUPPORT_NEEDS_ADMIN_STATUSES)];
  if (filter === "active") return [where("status","in",SUPPORT_ACTIVE_STATUSES)];
  if (filter === "business") return [where("target","==","business")];
  return [];
}

function ticketQuery(filter:Filter, ordered:boolean, after?:QueryDocumentSnapshot): Query {
  const constraints = [...filterConstraints(filter), ...(ordered ? [orderBy("updatedAt","desc")] : []), ...(after ? [startAfter(after)] : []), limit(PAGE_SIZE)];
  return query(collection(getDb(),"supportTickets"), ...constraints);
}

function toRow(item:QueryDocumentSnapshot): SupportRow {
  const data = item.data();
  const created = data.createdAt as Timestamp | undefined;
  const updated = data.updatedAt as Timestamp | undefined;
  return { id:item.id, userId:typeof data.userId==="string"&&data.userId?data.userId:null, title:String(data.title??"Destek mesajı"), category:String(data.category??"other"), source:String(data.source??"dashboard"), target:String(data.target??"platform"), requesterName:String(data.requesterName??data.userEmail??"Kullanıcı"), requesterPhone:String(data.requesterPhone??""), message:String(data.message??""), businessId:typeof data.businessId==="string"?data.businessId:null, businessName:typeof data.businessName==="string"?data.businessName:null, status:String(data.status??"open"), createdAt:created?.toDate ? created.toDate().toLocaleString("tr-TR") : "Şimdi", createdMillis:created?.toMillis?.() ?? null, sortMillis:(updated?.toMillis?.() ?? created?.toMillis?.() ?? Date.now()) };
}

function sourceLabel(row:SupportRow) {
  return row.target==="business" ? "Mağaza mesajı" : row.source==="dashboard" ? "İşletme desteği" : "Müşteri desteği";
}

export default function SuperAdminSupportPage() {
  const { user } = useAuthContext();
  const now = useNow();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [filter, setFilter] = useState<Filter>("needs_admin");
  const [liveRows, setLiveRows] = useState<SupportRow[]>([]);
  const [extraRows, setExtraRows] = useState<SupportRow[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Bileşik index henüz yayınlanmamışsa sıralamasız sorguya düşülür (istemcide sıralanır).
  const [ordered, setOrdered] = useState(true);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [search, setSearch] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);
  const [pinned, setPinned] = useState<SupportRow | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const refreshCounts = useCallback(() => {
    const tickets = collection(getDb(),"supportTickets");
    const count = (target:Query) => getCountFromServer(target).then((snapshot) => snapshot.data().count);
    Promise.all([
      count(query(tickets, where("status","in",SUPPORT_NEEDS_ADMIN_STATUSES))),
      count(query(tickets, where("target","==","business"))),
      count(query(tickets, where("status","==","resolved"))),
    ]).then(([needsAdmin,business,resolved]) => setCounts({ needsAdmin, business, resolved })).catch(() => setCounts(null));
  }, []);

  // İlk sayfa canlı dinlenir; "Daha fazla yükle" ile gelen eski sayfalar tek seferlik okunur.
  useEffect(() => {
    queueMicrotask(() => { setLoading(true); setExtraRows([]); setCursor(null); setHasMore(false); });
    return onSnapshot(ticketQuery(filter, ordered), (snapshot) => {
      const rows = snapshot.docs.map(toRow);
      setLiveRows(ordered ? rows : rows.sort((a,b) => b.sortMillis - a.sortMillis));
      setCursor((current) => current ?? snapshot.docs.at(-1) ?? null);
      setHasMore((current) => current || snapshot.size === PAGE_SIZE);
      setLoading(false);
      refreshCounts();
    }, (error:FirestoreError) => {
      if (ordered && error.code === "failed-precondition") { setOrdered(false); return; }
      toast.error(error.message); setLoading(false);
    });
  }, [filter, ordered, refreshCounts]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(ticketQuery(filter, ordered, cursor));
      setExtraRows((current) => [...current, ...snapshot.docs.map(toRow)]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.size === PAGE_SIZE);
    } catch (error) { toast.error((error as Error).message); }
    finally { setLoadingMore(false); }
  }

  const rows = useMemo(() => {
    const liveIds = new Set(liveRows.map((row) => row.id));
    return [...liveRows, ...extraRows.filter((row) => !liveIds.has(row.id))];
  }, [liveRows, extraRows]);

  const isStale = useCallback((row:SupportRow) => isStaleSupportTicket(row.status, row.sortMillis, now), [now]);
  const staleCount = useMemo(() => rows.filter(isStale).length, [rows, isStale]);

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((row) => (!staleOnly || isStale(row)) && (!needle || `${row.title} ${row.requesterName} ${row.requesterPhone} ${row.message} ${row.businessName??""}`.toLocaleLowerCase("tr-TR").includes(needle)));
  }, [rows, search, staleOnly, isStale]);

  // Seçili talep filtre dışına düşse bile panelde açık kalır (son bilinen haliyle).
  const selected = pinned ? (rows.find((row) => row.id === pinned.id) ?? pinned) : (isDesktop ? visible[0] ?? null : null);

  async function setStatus(id:string,status:string) {
    setStatusBusy(true);
    try {
      await updateDoc(doc(getDb(),"supportTickets",id),{status,updatedAt:serverTimestamp()});
      setExtraRows((current) => current.map((row) => row.id === id ? { ...row, status } : row));
      setPinned((current) => current && current.id === id ? { ...current, status } : current);
      toast.success("Talep durumu güncellendi.");
    } catch (error) { toast.error((error as Error).message); }
    finally { setStatusBusy(false); }
  }

  function move(step:number) {
    if (!visible.length) return;
    const index = selected ? visible.findIndex((row) => row.id === selected.id) : -1;
    const next = visible[Math.min(visible.length - 1, Math.max(0, index + step))];
    if (next) {
      setPinned(next);
      document.getElementById(`ticket-${next.id}`)?.scrollIntoView({ block: "nearest" });
    }
  }
  useHotkeys({ j: () => move(1), k: () => move(-1) }, isDesktop);

  const stat = (value:number|undefined) => value === undefined ? "—" : value.toLocaleString("tr-TR");

  const pane = selected ? (
    <TicketPane
      key={selected.id}
      row={selected}
      userId={user?.uid ?? ""}
      stale={isStale(selected)}
      now={now}
      busy={statusBusy}
      mobile={!isDesktop}
      onBack={() => setPinned(null)}
      onStatus={(status) => void setStatus(selected.id, status)}
    />
  ) : null;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Canlı destek merkezi"
        icon={Headphones}
        title="Destek gelen kutusu"
        description="Müşteri, işletme ve mağaza mesajlarını tek akışta yanıtlayın; 24 saati aşan talepler kırmızıyla öne çıkar."
        meta={<>
          <HeroStat label="yanıt bekliyor" value={stat(counts?.needsAdmin)} />
          <HeroStat label="24 saati aşan" value={staleCount} />
        </>}
      />

      <StatGrid>
        <StatCard label="Yanıt bekleyen" value={stat(counts?.needsAdmin)} hint="Yeni + ekip yanıtı bekleyen" icon={Inbox} tone="amber" onClick={() => { setFilter("needs_admin"); setStaleOnly(false); }} active={filter === "needs_admin" && !staleOnly} />
        <StatCard label="24 saati aşan" value={staleCount} hint="yüklenenler arasında" icon={AlarmClock} tone={staleCount ? "red" : "neutral"} onClick={() => setStaleOnly((value) => !value)} active={staleOnly} />
        <StatCard label="Mağaza mesajı" value={stat(counts?.business)} hint="İşletmelere gelen" icon={Store} tone="blue" onClick={() => { setFilter("business"); setStaleOnly(false); }} active={filter === "business" && !staleOnly} />
        <StatCard label="Çözülen" value={stat(counts?.resolved)} hint="Toplam kapanan" icon={CheckCircle2} tone="green" />
      </StatGrid>

      <Toolbar sticky={false}>
        <SearchField value={search} onChange={setSearch} placeholder="İsim, telefon, mağaza veya mesaj ara…" label="Destek mesajlarında ara" />
        <Segmented label="Destek filtresi" value={filter} onChange={(value) => { setFilter(value); setPinned(null); }}
          options={FILTERS.map(([value,label]) => ({ value, label, count: value === "needs_admin" ? counts?.needsAdmin : value === "business" ? counts?.business : undefined }))} />
      </Toolbar>

      <div className={s.inbox}>
        <div className={s.list} role="listbox" aria-label="Destek talepleri">
          {staleOnly && <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)" }}><Pill tone="red" dot>Yalnızca 24 saati aşanlar</Pill> <button type="button" className={ui.link} style={{ border: 0, background: "none", cursor: "pointer", fontSize: 12.5 }} onClick={() => setStaleOnly(false)}>Temizle</button></div>}
          {loading ? <div style={{ padding: 14 }}><SkeletonList rows={6} height={76} /></div>
            : visible.length === 0 ? <EmptyState icon={Inbox} title="Mesaj bulunamadı" description={staleOnly ? "24 saati aşan bekleyen talep yok. Harika." : filter==="needs_admin"?"Ekip yanıtı bekleyen destek mesajı yok.":"Seçtiğiniz filtrelerle eşleşen destek mesajı yok."} />
            : visible.map((row) => {
              const meta = STATUS_META[row.status];
              const stale = isStale(row);
              const active = selected?.id === row.id;
              return (
                <button key={row.id} id={`ticket-${row.id}`} type="button" role="option" aria-selected={active}
                  className={cx(s.item, active && s.itemActive, stale && s.itemStale, (SUPPORT_NEEDS_ADMIN_STATUSES as string[]).includes(row.status) && s.itemNeeds)}
                  onClick={() => setPinned(row)}>
                  <Avatar name={row.requesterName} seed={row.requesterName + row.requesterPhone} />
                  <span style={{ minWidth: 0 }}>
                    <span className={s.itemTop}><span className={s.itemName}>{row.requesterName}</span><time className={s.itemTime} title={fullDate(row.sortMillis)}>{relativeTime(row.sortMillis, now)}</time></span>
                    <span className={s.itemTitle} style={{ display: "block" }}>{row.title}</span>
                    {row.message && <span className={s.itemPreview}>{row.message}</span>}
                    <span className={s.itemTags}>
                      <Pill tone={meta?.tone ?? "neutral"} dot>{meta?.label ?? row.status}</Pill>
                      {stale && <Pill tone="red">24 saati aştı</Pill>}
                      <Pill>{sourceLabel(row)}</Pill>
                    </span>
                  </span>
                </button>
              );
            })}
          {!loading && hasMore && <div className={ui.loadMore} style={{ paddingTop: 14 }}><Btn size="sm" loading={loadingMore} onClick={() => void loadMore()}>Daha fazla yükle</Btn></div>}
        </div>
        {isDesktop && (pane ?? <div className={s.pane}><div className={s.paneEmpty}><EmptyState icon={MessageCircleMore} title="Bir konuşma seçin" description="Soldaki listeden bir talep seçin. j / k ile talepler arasında gezinebilirsiniz." /></div></div>)}
      </div>
      {!isDesktop && pane}
    </AdminPage>
  );
}

function TicketPane({ row, userId, stale, now, busy, mobile, onBack, onStatus }: {
  row:SupportRow; userId:string; stale:boolean; now:number; busy:boolean; mobile:boolean; onBack:()=>void; onStatus:(status:string)=>void;
}) {
  const mounted = useIsClient();
  const meta = STATUS_META[row.status];
  useEffect(() => {
    if (!mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event:KeyboardEvent) => { if (event.key === "Escape") onBack(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [mobile, onBack]);

  const content = (
    <>
      <header className={s.paneHead}>
        <div className={s.paneTitleRow}>
          <IconBtn label="Listeye dön" icon={ArrowLeft} className={s.backBtn} onClick={onBack} />
          <Avatar name={row.requesterName} seed={row.requesterName + row.requesterPhone} />
          <div className={s.paneTitle}><h2 title={row.title}>{row.title}</h2><p>{row.requesterName} · {sourceLabel(row)}</p></div>
          {row.status==="resolved"
            ? <Btn size="sm" icon={RotateCcw} loading={busy} onClick={()=>onStatus("waiting_admin")}>Yeniden aç</Btn>
            : <Btn size="sm" variant="primary" icon={CheckCircle2} loading={busy} onClick={()=>onStatus("resolved")}>Çözüldü</Btn>}
        </div>
        <div className={s.contactRow}>
          <Pill tone={meta?.tone ?? "neutral"} dot>{meta?.label ?? row.status}</Pill>
          {stale && <Pill tone="red">24 saati aştı · {relativeTime(row.sortMillis, now)}</Pill>}
          <span className={s.contact}><UserRound size={13}/>{row.requesterName}</span>
          {row.requesterPhone && <a className={s.contact} href={`tel:${row.requesterPhone}`}><Phone size={13}/>{row.requesterPhone}</a>}
          {row.businessName && <a className={s.contact} href={row.businessId ? `/super-admin/isletmeler?q=${encodeURIComponent(row.businessId)}` : undefined}><Building2 size={13}/>{row.businessName}</a>}
        </div>
      </header>
      <AdminThread ticketId={row.id} userId={userId} row={row} />
    </>
  );

  if (mobile) {
    if (!mounted) return null;
    return createPortal(<div className={cx(ui.page, s.paneMobile)} role="dialog" aria-modal="true" aria-label={row.title}>{content}</div>, document.body);
  }
  return <section className={s.pane} aria-label="Konuşma">{content}</section>;
}

function AdminThread({ticketId,userId,row}:{ticketId:string;userId:string;row:SupportRow}){
  const [messages,setMessages]=useState<Array<{id:string;body:string;role:string;time:string}>>([]);
  const [body,setBody]=useState("");
  const [sending,setSending]=useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(()=>onSnapshot(query(collection(getDb(),"supportTickets",ticketId,"messages"),orderBy("createdAt","asc")),snapshot=>setMessages(snapshot.docs.map(item=>{const d=item.data();const stamp=d.createdAt as Timestamp|undefined;return{id:item.id,body:String(d.body??""),role:String(d.senderRole??"business"),time:stamp?.toDate?stamp.toDate().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}):"Şimdi"}}))),[ticketId]);
  useEffect(() => {
    const viewport = threadRef.current;
    if (!viewport) return;
    const frame = window.requestAnimationFrame(() => viewport.scrollTo({ top: viewport.scrollHeight }));
    return () => window.cancelAnimationFrame(frame);
  }, [messages.length]);
  const store = row.target==="business";
  const digits = row.requesterPhone.replace(/\D/g,"");
  const whatsapp = digits.length>=10 ? `https://wa.me/${digits.startsWith("90")?digits:`90${digits.replace(/^0/,"")}`}` : "";
  function senderLabel(role:string){ return role==="admin" ? "SeninRandevun Ekibi" : role==="business" ? (store ? row.businessName ?? "İşletme" : row.requesterName) : role==="customer" ? row.requesterName : row.requesterName; }
  async function send(){if(!body.trim()||!userId)return;setSending(true);try{await addDoc(collection(getDb(),"supportTickets",ticketId,"messages"),{body:body.trim(),senderId:userId,senderRole:"admin",createdAt:serverTimestamp()});await updateDoc(doc(getDb(),"supportTickets",ticketId),{status:"waiting_user",updatedAt:serverTimestamp()});setBody("");toast.success("Yanıt gönderildi.")}catch(error){toast.error((error as Error).message)}finally{setSending(false)}}
  function insertQuick(text:string){ setBody((current) => current.trim() ? `${current.trimEnd()}\n${text}` : text); inputRef.current?.focus(); }
  return <>
    <div ref={threadRef} className={s.thread} aria-live="polite">
      <span className={s.threadNote}>{row.createdAt}</span>
      <div className={s.bubbleRow}><div className={cx(s.bubble, s.bubbleFirst)}>{row.message || "Mesaj içeriği yok."}<span className={s.bubbleMeta}>{row.requesterName} · ilk mesaj</span></div></div>
      {messages.length===0 && <span className={s.threadNote}>Henüz karşılıklı yanıt yok</span>}
      {messages.map(item=><div key={item.id} className={cx(s.bubbleRow, item.role==="admin" && s.bubbleRowAdmin)}><div className={cx(s.bubble, item.role==="admin" && s.bubbleAdmin)}>{item.body}<span className={s.bubbleMeta}>{senderLabel(item.role)} · {item.time}</span></div></div>)}
      {store && <p className={s.readonlyNote}>{row.userId
        ? <>Mağaza mesajı: işletme de yanıtlayabilir. Yazdığın yanıt müşterinin <b>Hesabım → Mesajlar</b> bölümünde “SeninRandevun Ekibi” olarak görünür.</>
        : <>Müşterinin hesabı yok; yanıtı yalnızca işletme görür. Müşteriye ulaşmak için {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}{whatsapp && row.requesterPhone ? " veya " : ""}{row.requesterPhone ? <a href={`tel:${row.requesterPhone}`}>telefon</a> : null} kullan.</>}</p>}
    </div>
    <div className={s.composer}>
      <div className={s.quick} aria-label="Hazır yanıtlar">{QUICK_REPLIES.map((text)=><button key={text} type="button" onClick={()=>insertQuick(text)} title={text}>{text.split(/[,.]/)[0]}</button>)}</div>
      <div className={s.composeRow}>
        <textarea ref={inputRef} rows={1} value={body} onChange={event=>setBody(event.target.value)} placeholder={store ? (row.userId ? "Müşteriye ekip olarak yanıt yazın…" : "İşletmeye not / yanıt yazın…") : "Yanıt yazın…"} aria-label="Yanıt"
          onKeyDown={(event)=>{ if (event.key==="Enter" && (event.metaKey||event.ctrlKey)) { event.preventDefault(); void send(); } }}/>
        <button type="button" className={s.sendBtn} onClick={()=>void send()} disabled={sending||!body.trim()} aria-label="Yanıtı gönder">{sending?<LoaderCircle size={18} className={ui.spin}/>:<Send size={18}/>}</button>
      </div>
      <span className={s.composeHint}>⌘/Ctrl + Enter ile gönder · yanıt sonrası durum “{store ? "Müşteri yanıtı bekleniyor" : "İşletme yanıtı bekleniyor"}” olur</span>
    </div>
  </>;
}
