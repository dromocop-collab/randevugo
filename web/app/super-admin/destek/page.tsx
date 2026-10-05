"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, doc, getCountFromServer, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, startAfter, updateDoc, where,
  type FirestoreError, type Query, type QueryConstraint, type QueryDocumentSnapshot, type Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { Building2, CheckCircle2, Headphones, LoaderCircle, MessageCircleMore, Phone, RotateCcw, Search, Send, UserRound } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/features/auth/auth-context";
import { SUPPORT_ACTIVE_STATUSES, SUPPORT_NEEDS_ADMIN_STATUSES } from "@/features/platform/admin-ops";

type SupportRow = { id:string; title:string; category:string; source:string; target:string; requesterName:string; requesterPhone:string; message:string; businessId:string|null; businessName:string|null; status:string; createdAt:string; sortMillis:number };
type Filter = "needs_admin"|"active"|"business"|"all";
type Counts = { needsAdmin:number; business:number; resolved:number };

const PAGE_SIZE = 100;
const statusLabel: Record<string,string> = { open:"Yeni", waiting_user:"İşletme yanıtı bekleniyor", waiting_admin:"Ekip yanıtı bekleniyor", resolved:"Çözüldü" };
const FILTERS: ReadonlyArray<readonly [Filter,string]> = [["needs_admin","Yanıt bekleyen"],["active","Aktif"],["business","Mağaza mesajları"],["all","Tümü"]];

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
  return { id:item.id, title:String(data.title??"Destek mesajı"), category:String(data.category??"other"), source:String(data.source??"dashboard"), target:String(data.target??"platform"), requesterName:String(data.requesterName??data.userEmail??"Kullanıcı"), requesterPhone:String(data.requesterPhone??""), message:String(data.message??""), businessId:typeof data.businessId==="string"?data.businessId:null, businessName:typeof data.businessName==="string"?data.businessName:null, status:String(data.status??"open"), createdAt:created?.toDate ? created.toDate().toLocaleString("tr-TR") : "Şimdi", sortMillis:(updated?.toMillis?.() ?? created?.toMillis?.() ?? Date.now()) };
}

export default function SuperAdminSupportPage() {
  const { user } = useAuthContext();
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

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((row) => !needle || `${row.title} ${row.requesterName} ${row.requesterPhone} ${row.message} ${row.businessName??""}`.toLocaleLowerCase("tr-TR").includes(needle));
  }, [rows, search]);

  async function setStatus(id:string,status:string) {
    try {
      await updateDoc(doc(getDb(),"supportTickets",id),{status,updatedAt:serverTimestamp()});
      setExtraRows((current) => current.map((row) => row.id === id ? { ...row, status } : row));
      toast.success("Talep durumu güncellendi.");
    } catch (error) { toast.error((error as Error).message); }
  }

  const stat = (value:number|undefined) => value === undefined ? "—" : value.toLocaleString("tr-TR");

  return <div className="admin-support-page">
    <section className="admin-support-hero"><div><span><Headphones size={16}/> CANLI DESTEK MERKEZİ</span><h1>Tüm mesajlar,<br/>tek güvenli akışta.</h1><p>Müşteri, işletme ve mağaza profili mesajlarını takip edin; durumu kaybetmeden sonuçlandırın.</p></div><div className="admin-support-stats"><span><b>{stat(counts?.needsAdmin)}</b><small>yeni mesaj</small></span><span><b>{stat(counts?.business)}</b><small>mağaza mesajı</small></span><span><b>{stat(counts?.resolved)}</b><small>çözülen</small></span></div></section>
    <section className="admin-support-toolbar"><label><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Yüklenen mesajlarda isim, telefon, mağaza veya mesaj ara…"/></label><div>{FILTERS.map(([key,label])=><button className={filter===key?"active":""} key={key} onClick={()=>setFilter(key)}>{label}</button>)}</div></section>
    <section className="admin-support-list">{loading ? [1,2,3].map(x=><div key={x} className="admin-support-skeleton"/>) : visible.length===0 ? <EmptyState title="Mesaj bulunamadı" description={filter==="needs_admin"?"Ekip yanıtı bekleyen destek mesajı yok.":"Seçtiğiniz filtrelerle eşleşen destek mesajı yok."}/> : visible.map(row=><details key={row.id} className={`admin-support-ticket status-${row.status}`}><summary><div className="admin-support-ticket-icon">{row.target==="business"?<Building2/>:<MessageCircleMore/>}</div><div><span>{row.target==="business"?"MAĞAZA MESAJI":row.source==="dashboard"?"İŞLETME DESTEĞİ":"MÜŞTERİ DESTEĞİ"}</span><b>{row.title}</b><small>{row.requesterName} · {row.createdAt}</small></div><i>{statusLabel[row.status]??row.status}</i></summary><div className="admin-support-detail"><div className="admin-support-contact"><span><UserRound size={15}/>{row.requesterName}</span>{row.requesterPhone&&<a href={`tel:${row.requesterPhone}`}><Phone size={15}/>{row.requesterPhone}</a>}{row.businessName&&<span><Building2 size={15}/>{row.businessName}</span>}</div><p>{row.message}</p>{row.target!=="business"&&<AdminThread ticketId={row.id} userId={user?.uid??""}/>}<div className="admin-support-actions">{row.status==="resolved"?<button onClick={()=>setStatus(row.id,"waiting_admin")}><RotateCcw size={14}/> Yeniden aç</button>:<button onClick={()=>setStatus(row.id,"resolved")}><CheckCircle2 size={14}/> Çözüldü</button>}</div></div></details>)}</section>
    {!loading && hasMore && <div className="mt-4 flex justify-center"><Button variant="secondary" loading={loadingMore} disabled={loadingMore} onClick={()=>void loadMore()}>Daha fazla yükle</Button></div>}
  </div>;
}

function AdminThread({ticketId,userId}:{ticketId:string;userId:string}){
  const [messages,setMessages]=useState<Array<{id:string;body:string;role:string;time:string}>>([]); const [body,setBody]=useState(""); const [sending,setSending]=useState(false);
  useEffect(()=>onSnapshot(query(collection(getDb(),"supportTickets",ticketId,"messages"),orderBy("createdAt","asc")),snapshot=>setMessages(snapshot.docs.map(item=>{const d=item.data();const stamp=d.createdAt as Timestamp|undefined;return{id:item.id,body:String(d.body??""),role:String(d.senderRole??"business"),time:stamp?.toDate?stamp.toDate().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}):"Şimdi"}}))),[ticketId]);
  async function send(){if(!body.trim()||!userId)return;setSending(true);try{await addDoc(collection(getDb(),"supportTickets",ticketId,"messages"),{body:body.trim(),senderId:userId,senderRole:"admin",createdAt:serverTimestamp()});await updateDoc(doc(getDb(),"supportTickets",ticketId),{status:"waiting_user",updatedAt:serverTimestamp()});setBody("");toast.success("Yanıt işletmeye gönderildi.")}catch(error){toast.error((error as Error).message)}finally{setSending(false)}}
  return <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="max-h-72 space-y-2 overflow-y-auto p-1">{messages.length===0?<p className="text-xs text-[var(--text-3)]">Henüz karşılıklı yanıt yok.</p>:messages.map(item=><div key={item.id} className={`flex ${item.role==="admin"?"justify-end":"justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-5 ${item.role==="admin"?"bg-[#0b6b45] text-white":"bg-[var(--surface-1)] text-[var(--text-1)]"}`}>{item.body}<small className="mt-1 block opacity-50">{item.time}</small></div></div>)}</div><div className="mt-3 flex items-end gap-2 rounded-2xl bg-[var(--surface-1)] p-2"><textarea value={body} onChange={event=>setBody(event.target.value)} placeholder="İşletmeye yanıt yazın…" className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-xs outline-none"/><button onClick={send} disabled={sending||!body.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b6b45] text-white disabled:opacity-40">{sending?<LoaderCircle size={16} className="animate-spin"/>:<Send size={16}/>}</button></div></div>
}
