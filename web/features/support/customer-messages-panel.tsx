"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { ArrowLeft, Headphones, LoaderCircle, MessageCircleMore, Send, Sparkles } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { SupportRequestModal } from "@/components/support/support-request-modal";
import styles from "./customer-messages-panel.module.css";

type Ticket = {
  id: string; title: string; message: string; status: string; businessName: string | null;
  createdAt: Date | null; updatedAt: Date | null;
};
type Message = { id: string; body: string; senderRole: string; createdAt: Date | null };

const STATUS: Record<string, string> = {
  open: "Yanıt bekleniyor", in_progress: "İşleniyor", waiting_user: "Yanıt geldi", waiting_admin: "Ekip yanıtı bekleniyor",
  resolved: "Çözüldü", closed: "Kapalı",
};

function toDate(value: unknown): Date | null {
  const stamp = value as Timestamp | undefined;
  return stamp?.toDate ? stamp.toDate() : null;
}
function timeLabel(date: Date | null) {
  if (!date) return "Şimdi";
  const today = new Date().toDateString() === date.toDateString();
  return date.toLocaleString("tr-TR", today ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Müşterinin destek talepleri ve işletmelere gönderdiği mesajlar; işletme/ekip yanıtları canlı görünür. */
export function CustomerMessagesPanel({ uid }: { uid: string }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => onSnapshot(
    query(collection(getDb(), "supportTickets"), where("userId", "==", uid)),
    (snapshot) => {
      setTickets(snapshot.docs.map((item) => {
        const d = item.data();
        return {
          id: item.id, title: String(d.title ?? "Mesaj"), message: String(d.message ?? ""), status: String(d.status ?? "open"),
          businessName: typeof d.businessName === "string" && d.businessName ? d.businessName : null,
          createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt) ?? toDate(d.createdAt),
        };
      }).sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)));
    },
    () => setError(true),
  ), [uid]);

  const open = useMemo(() => tickets?.find((item) => item.id === openId) ?? null, [tickets, openId]);
  if (open) return <Thread uid={uid} ticket={open} onBack={() => setOpenId(null)} />;

  return <section aria-label="Mesajlarım" className={styles.root}>
    <div className={styles.head}><div><span>Mesajlarım</span><h2>Taleplerin ve yanıtlar.</h2></div>
      <SupportRequestModal audience="customer" triggerLabel="Yeni" triggerClassName={styles.newBtn} /></div>
    {tickets === null && !error ? <div className={styles.skeleton} aria-label="Mesajlar yükleniyor"><i /><i /><i /></div>
      : error ? <div className={styles.error} role="alert"><MessageCircleMore size={24} /><b>Mesajlar yüklenemedi.</b><p>Sayfayı yenileyip tekrar deneyin.</p></div>
        : tickets!.length === 0 ? <div className={styles.empty}><RoviMascot size={100} mood="happy" alt="" />
          <span className={styles.tag}><Sparkles size={12} /> MESAJLAR</span>
          <h3>Henüz mesajın yok.</h3>
          <p>İşletme sayfalarındaki “Mesaj gönder” ile ya da destek merkezinden bize yazdığında yazışmaların burada görünür.</p>
          <SupportRequestModal audience="customer" triggerLabel="Destek ekibine yaz" triggerClassName={styles.primary} /></div>
          : <div className={styles.inbox}>{tickets!.map((ticket) => {
            const unread = ticket.status === "waiting_user";
            const resolved = ticket.status === "resolved" || ticket.status === "closed";
            return <button key={ticket.id} type="button" onClick={() => setOpenId(ticket.id)} className={`${styles.item} ${unread ? styles.unread : ""}`}>
              <span className={`${styles.avatar} ${ticket.businessName ? "" : styles.avatarSupport}`} aria-hidden="true">
                {ticket.businessName ? ticket.businessName.charAt(0).toLocaleUpperCase("tr-TR") : <Headphones size={20} />}</span>
              <span className={styles.itemBody}>
                <span className={styles.itemTop}><strong>{ticket.businessName ?? "SeninRandevun destek"}</strong><small>{timeLabel(ticket.updatedAt)}</small></span>
                {ticket.title && ticket.title !== "Mesaj" && <span className={styles.itemTitle}>{ticket.title}</span>}
                <span className={styles.preview}>{ticket.message}</span>
                <span className={`${styles.pill} ${unread ? styles.pillNew : resolved ? styles.pillDone : ""}`}>{unread && <i />}{STATUS[ticket.status] ?? ticket.status}</span>
              </span>
            </button>;
          })}</div>}
  </section>;
}

function Thread({ uid, ticket, onBack }: { uid: string; ticket: Ticket; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => onSnapshot(
    query(collection(getDb(), "supportTickets", ticket.id, "messages"), orderBy("createdAt", "asc")),
    (snapshot) => setMessages(snapshot.docs.map((item) => {
      const d = item.data();
      return { id: item.id, body: String(d.body ?? ""), senderRole: String(d.senderRole ?? "customer"), createdAt: toDate(d.createdAt) };
    })),
    () => setMessages([]),
  ), [ticket.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      // Kural: yalnızca body/senderId/senderRole/createdAt; talepte yalnızca status/updatedAt değişebilir.
      await addDoc(collection(getDb(), "supportTickets", ticket.id, "messages"), { body: text.slice(0, 5000), senderId: uid, senderRole: "customer", createdAt: serverTimestamp() });
      await updateDoc(doc(getDb(), "supportTickets", ticket.id), { status: "open", updatedAt: serverTimestamp() }).catch(() => undefined);
      setBody("");
    } catch { toast.error("Mesaj gönderilemedi. Tekrar deneyin."); }
    finally { setSending(false); }
  }

  const who = (role: string) => role === "business" ? (ticket.businessName ?? "İşletme") : role === "admin" ? "SeninRandevun ekibi" : "Sen";
  return <section aria-label="Yazışma" className={`${styles.root} ${styles.thread}`}>
    <header className={styles.threadHead}>
      <button type="button" onClick={onBack} aria-label="Geri" className={styles.back}><ArrowLeft size={18} /></button>
      <span className={`${styles.avatar} ${ticket.businessName ? "" : styles.avatarSupport}`} aria-hidden="true">
        {ticket.businessName ? ticket.businessName.charAt(0).toLocaleUpperCase("tr-TR") : <Headphones size={19} />}</span>
      <div className={styles.threadTitle}><strong>{ticket.businessName ?? "SeninRandevun destek"}</strong>
        <small>{STATUS[ticket.status] ?? ticket.status}</small></div>
    </header>
    <div className={styles.messages}>
      <Bubble body={ticket.message} mine label="Sen" time={timeLabel(ticket.createdAt)} />
      {messages.map((item) => <Bubble key={item.id} body={item.body} mine={item.senderRole === "customer"} label={who(item.senderRole)} time={timeLabel(item.createdAt)} />)}
      <div ref={endRef} />
    </div>
    <footer className={styles.composer}>
      <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={1} maxLength={5000} placeholder="Mesajını yaz…" aria-label="Mesaj"
        onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void send(); } }} />
      <button type="button" onClick={() => void send()} disabled={sending || !body.trim()} aria-label="Gönder" className={styles.send}>
        {sending ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}</button>
    </footer>
  </section>;
}

function Bubble({ body, mine, label, time }: { body: string; mine: boolean; label: string; time: string }) {
  return <div className={`${styles.bubbleRow} ${mine ? styles.mine : ""}`}>
    <div className={styles.bubble}>
      <p>{body}</p>
      <small>{label} · {time}</small>
    </div>
  </div>;
}
