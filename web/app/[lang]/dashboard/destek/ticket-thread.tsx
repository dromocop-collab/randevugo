"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, LoaderCircle, Mail, Phone, Send } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { cx, studio } from "../_studio";
import css from "./support.module.css";

export type Ticket = { id:string; title:string; category:string; status:string; createdAt:string; message:string; requesterName:string; requesterPhone:string; requesterEmail:string; source:string; target:string; hasAccount:boolean };
type Message = { id:string; body:string; senderRole:string; createdAt:string };

export const statusText:Record<string,string>={open:"Açık",in_progress:"İşleniyor",waiting_user:"Yanıtınız bekleniyor",waiting_admin:"Ekip yanıtı bekleniyor",resolved:"Çözüldü",closed:"Kapalı"};

/** Müşteri mesajlarında "waiting_user" müşterinin dönüşünü ifade eder. */
export function statusLabel(status: string, customers: boolean) {
  if (customers && status === "waiting_user") return "Müşteri yanıtı bekleniyor";
  if (customers && status === "open") return "Yeni";
  return statusText[status] ?? status;
}

export type StatusTone = "neutral" | "accent" | "ok" | "warn" | "bad" | "info";
export function statusTone(status: string, customers: boolean): StatusTone {
  if (status === "resolved") return "ok";
  if (status === "closed") return "neutral";
  if (customers) return status === "open" ? "warn" : "info";
  if (status === "waiting_user") return "warn";
  if (status === "waiting_admin") return "accent";
  return "info";
}

export function TicketThread({ ticket, platform, userId, onBack, onResolve }: {
  ticket: Ticket;
  platform: boolean;
  userId: string;
  /** Verilirse başlıkta geri butonu gösterilir (mobil tam ekran). */
  onBack?: () => void;
  onResolve?: () => void;
}) {
  const [messages,setMessages]=useState<Message[]>([]);const [body,setBody]=useState("");const [sending,setSending]=useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{return onSnapshot(query(collection(getDb(),"supportTickets",ticket.id,"messages"),orderBy("createdAt","asc")),snapshot=>setMessages(snapshot.docs.map(item=>{const d=item.data();const stamp=d.createdAt as Timestamp|undefined;return{id:item.id,body:String(d.body??""),senderRole:String(d.senderRole??"business"),createdAt:stamp?.toDate?stamp.toDate().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}):"Şimdi"}})),()=>setMessages([]));},[ticket.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, ticket.id]);

  async function send(){if(!body.trim()||!userId)return;setSending(true);try{await addDoc(collection(getDb(),"supportTickets",ticket.id,"messages"),{body:body.trim(),senderId:userId,senderRole:"business",createdAt:serverTimestamp()});await updateDoc(doc(getDb(),"supportTickets",ticket.id),{status:platform?"waiting_admin":"waiting_user",updatedAt:serverTimestamp()});setBody("")}catch(error){toast.error((error as Error).message)}finally{setSending(false)}}

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (!sending) void send();
    }
  }

  const customers = !platform;
  const hasContact = customers && (ticket.requesterPhone || ticket.requesterEmail || onResolve);

  return (
    <div className={css.thread}>
      <header className={cx(css.threadHead, !onBack && css.threadHeadNoBack)}>
        {onBack ? <button type="button" className={css.backBtn} onClick={onBack} aria-label="Mesajlara dön"><ArrowLeft size={20} /></button> : null}
        <div className={css.threadTitleWrap}>
          <span className={css.threadKicker}>{platform?"Platform görüşmesi":"Müşteri mesajı"}<span className={css.threadStatus}>{statusLabel(ticket.status, customers)}</span></span>
          <h2 className={css.threadTitle}>{ticket.title}</h2>
          <p className={css.threadMeta}>{ticket.requesterName} · {ticket.createdAt}</p>
        </div>
      </header>

      {hasContact ? (
        <div className={css.contactBar}>
          {ticket.requesterPhone ? <a className={cx(studio.btn, studio.btnPrimary, studio.btnSm)} href={`tel:${ticket.requesterPhone}`}><Phone size={15} aria-hidden /> Telefon et</a> : null}
          {ticket.requesterEmail ? <a className={cx(studio.btn, studio.btnSoft, studio.btnSm)} href={`mailto:${ticket.requesterEmail}`}><Mail size={15} aria-hidden /> E-posta</a> : null}
          {onResolve ? <button type="button" className={cx(studio.btn, studio.btnSm, css.resolveBtn)} disabled={ticket.status==="resolved"} onClick={onResolve}><CheckCircle2 size={15} aria-hidden /> {ticket.status==="resolved"?"Çözüldü":"Çözüldü işaretle"}</button> : null}
        </div>
      ) : null}

      <div ref={scrollRef} className={css.messages} aria-live="polite">
        <span className={css.dayMark}>{ticket.createdAt}</span>
        <Bubble body={ticket.message} role={platform?"business":"customer"} time={ticket.createdAt}/>
        {messages.map(item=><Bubble key={item.id} body={item.body} role={item.senderRole} time={item.createdAt}/>)}
      </div>

      <footer className={css.composer}>
        <div className={css.composerBox}>
          <label className={studio.srOnly} htmlFor={`reply-${ticket.id}`}>Mesajınız</label>
          <textarea id={`reply-${ticket.id}`} rows={1} value={body} onChange={e=>setBody(e.target.value)} onKeyDown={onKeyDown} placeholder="Mesajınızı yazın…" className={css.composerInput}/>
          <button type="button" onClick={send} disabled={sending||!body.trim()} className={css.sendBtn} aria-label="Gönder">{sending?<LoaderCircle className={studio.spin} size={18}/>:<Send size={18}/>}</button>
        </div>
        {!platform&&!ticket.hasAccount?<p className={css.guestNote}><AlertTriangle size={14} aria-hidden />Müşteri giriş yapmadan yazdı; yazılı yanıtınızı göremeyebilir. En hızlısı telefonla dönmek.</p>:null}
      </footer>
    </div>
  );
}

function Bubble({body,role,time}:{body:string;role:string;time:string}){
  const mine=role==="business";
  return (
    <div className={cx(css.bubbleRow, mine && css.bubbleRowMine)}>
      <div className={cx(css.bubble, mine && css.bubbleMine, role==="admin" && css.bubbleAdmin)}>
        <p>{body}</p>
        <small>{role==="admin"?"SeninRandevun ekibi":role==="customer"?"Müşteri":"Siz"} · {time}</small>
      </div>
    </div>
  );
}
