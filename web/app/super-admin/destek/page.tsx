"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Building2, CheckCircle2, Clock3, Headphones, LoaderCircle, MessageCircleMore, Phone, Search, Send, UserRound } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { EmptyState } from "@/components/ui/states";
import { useAuthContext } from "@/features/auth/auth-context";

type SupportRow = { id:string; title:string; category:string; source:string; target:string; requesterName:string; requesterPhone:string; message:string; businessId:string|null; businessName:string|null; status:string; createdAt:string };

const statusLabel: Record<string,string> = { open:"Yeni", in_progress:"İşleniyor", waiting_user:"İşletme yanıtı bekleniyor", waiting_admin:"Ekip yanıtı bekleniyor", resolved:"Çözüldü", closed:"Kapalı" };

export default function SuperAdminSupportPage() {
  const { user } = useAuthContext();
  const [rows, setRows] = useState<SupportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all"|"open"|"business">("all");
  const [search, setSearch] = useState("");

  useEffect(() => onSnapshot(query(collection(getDb(), "supportTickets"), orderBy("createdAt", "desc")), (snapshot) => {
    setRows(snapshot.docs.map((item) => {
      const data = item.data();
      const stamp = data.createdAt as Timestamp | undefined;
      return { id:item.id, title:String(data.title??"Destek mesajı"), category:String(data.category??"other"), source:String(data.source??"dashboard"), target:String(data.target??"platform"), requesterName:String(data.requesterName??data.userEmail??"Kullanıcı"), requesterPhone:String(data.requesterPhone??""), message:String(data.message??""), businessId:typeof data.businessId==="string"?data.businessId:null, businessName:typeof data.businessName==="string"?data.businessName:null, status:String(data.status??"open"), createdAt:stamp?.toDate ? stamp.toDate().toLocaleString("tr-TR") : "Şimdi" };
    })); setLoading(false);
  }, (error) => { toast.error(error.message); setLoading(false); }), []);

  const visible = useMemo(() => rows.filter((row) => {
    if (filter === "open" && !["open","in_progress","waiting_user","waiting_admin"].includes(row.status)) return false;
    if (filter === "business" && row.target !== "business") return false;
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    return !needle || `${row.title} ${row.requesterName} ${row.requesterPhone} ${row.message} ${row.businessName??""}`.toLocaleLowerCase("tr-TR").includes(needle);
  }), [rows, filter, search]);

  async function setStatus(id:string,status:string) { try { await updateDoc(doc(getDb(),"supportTickets",id),{status,updatedAt:serverTimestamp()}); toast.success("Talep durumu güncellendi."); } catch (error) { toast.error((error as Error).message); } }

  return <div className="admin-support-page">
    <section className="admin-support-hero"><div><span><Headphones size={16}/> CANLI DESTEK MERKEZİ</span><h1>Tüm mesajlar,<br/>tek güvenli akışta.</h1><p>Müşteri, işletme ve mağaza profili mesajlarını takip edin; durumu kaybetmeden sonuçlandırın.</p></div><div className="admin-support-stats"><span><b>{rows.filter(x=>x.status==="open").length}</b><small>yeni mesaj</small></span><span><b>{rows.filter(x=>x.target==="business").length}</b><small>mağaza mesajı</small></span><span><b>{rows.filter(x=>x.status==="resolved").length}</b><small>çözülen</small></span></div></section>
    <section className="admin-support-toolbar"><label><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="İsim, telefon, mağaza veya mesaj ara…"/></label><div>{([['all','Tümü'],['open','Aktif'],['business','Mağaza mesajları']] as const).map(([key,label])=><button className={filter===key?"active":""} key={key} onClick={()=>setFilter(key)}>{label}</button>)}</div></section>
    <section className="admin-support-list">{loading ? [1,2,3].map(x=><div key={x} className="admin-support-skeleton"/>) : visible.length===0 ? <EmptyState title="Mesaj bulunamadı" description="Seçtiğiniz filtrelerle eşleşen destek mesajı yok."/> : visible.map(row=><details key={row.id} className={`admin-support-ticket status-${row.status}`}><summary><div className="admin-support-ticket-icon">{row.target==="business"?<Building2/>:<MessageCircleMore/>}</div><div><span>{row.target==="business"?"MAĞAZA MESAJI":row.source==="dashboard"?"İŞLETME DESTEĞİ":"MÜŞTERİ DESTEĞİ"}</span><b>{row.title}</b><small>{row.requesterName} · {row.createdAt}</small></div><i>{statusLabel[row.status]??row.status}</i></summary><div className="admin-support-detail"><div className="admin-support-contact"><span><UserRound size={15}/>{row.requesterName}</span>{row.requesterPhone&&<a href={`tel:${row.requesterPhone}`}><Phone size={15}/>{row.requesterPhone}</a>}{row.businessName&&<span><Building2 size={15}/>{row.businessName}</span>}</div><p>{row.message}</p>{row.target!=="business"&&<AdminThread ticketId={row.id} userId={user?.uid??""}/>}<div className="admin-support-actions"><button onClick={()=>setStatus(row.id,"in_progress")} disabled={row.status==="in_progress"}><Clock3 size={14}/> İşleme al</button><button onClick={()=>setStatus(row.id,"resolved")} disabled={row.status==="resolved"}><CheckCircle2 size={14}/> Çözüldü</button></div></div></details>)}</section>
  </div>;
}

function AdminThread({ticketId,userId}:{ticketId:string;userId:string}){
  const [messages,setMessages]=useState<Array<{id:string;body:string;role:string;time:string}>>([]); const [body,setBody]=useState(""); const [sending,setSending]=useState(false);
  useEffect(()=>onSnapshot(query(collection(getDb(),"supportTickets",ticketId,"messages"),orderBy("createdAt","asc")),snapshot=>setMessages(snapshot.docs.map(item=>{const d=item.data();const stamp=d.createdAt as Timestamp|undefined;return{id:item.id,body:String(d.body??""),role:String(d.senderRole??"business"),time:stamp?.toDate?stamp.toDate().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}):"Şimdi"}}))),[ticketId]);
  async function send(){if(!body.trim()||!userId)return;setSending(true);try{await addDoc(collection(getDb(),"supportTickets",ticketId,"messages"),{body:body.trim(),senderId:userId,senderRole:"admin",createdAt:serverTimestamp()});await updateDoc(doc(getDb(),"supportTickets",ticketId),{status:"waiting_user",updatedAt:serverTimestamp()});setBody("");toast.success("Yanıt işletmeye gönderildi.")}catch(error){toast.error((error as Error).message)}finally{setSending(false)}}
  return <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="max-h-72 space-y-2 overflow-y-auto p-1">{messages.length===0?<p className="text-xs text-[var(--text-3)]">Henüz karşılıklı yanıt yok.</p>:messages.map(item=><div key={item.id} className={`flex ${item.role==="admin"?"justify-end":"justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-5 ${item.role==="admin"?"bg-[#0b6b45] text-white":"bg-[var(--surface-1)] text-[var(--text-1)]"}`}>{item.body}<small className="mt-1 block opacity-50">{item.time}</small></div></div>)}</div><div className="mt-3 flex items-end gap-2 rounded-2xl bg-[var(--surface-1)] p-2"><textarea value={body} onChange={event=>setBody(event.target.value)} placeholder="İşletmeye yanıt yazın…" className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-xs outline-none"/><button onClick={send} disabled={sending||!body.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b6b45] text-white disabled:opacity-40">{sending?<LoaderCircle size={16} className="animate-spin"/>:<Send size={16}/>}</button></div></div>
}
