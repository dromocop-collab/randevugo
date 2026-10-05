"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { ArrowLeft, LoaderCircle, MessageCircleMore, Send } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";

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

  return <section aria-label="Mesajlarım">
    <div className="account-section-head"><div><span>MESAJLARIM</span><h2>Taleplerin ve yanıtlar.</h2></div></div>
    {tickets === null && !error ? <p className="p-5 text-sm text-[var(--text-3)]"><LoaderCircle className="inline animate-spin" size={17} /> Mesajlar yükleniyor…</p>
      : error ? <p className="p-5 text-sm text-[var(--text-3)]">Mesajlar yüklenemedi. Sayfayı yenileyip tekrar deneyin.</p>
        : tickets!.length === 0 ? <div className="account-empty-premium"><MessageCircleMore size={28} /><h3>Henüz mesajın yok.</h3>
          <p>İşletme sayfalarındaki “Mesaj gönder” ile ya da destek merkezinden bize yazdığında yazışmaların burada görünür.</p></div>
          : <div className="space-y-3">{tickets!.map((ticket) => <button key={ticket.id} type="button" onClick={() => setOpenId(ticket.id)}
            className="flex w-full items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-base font-black text-white">
              {(ticket.businessName ?? "S").charAt(0).toLocaleUpperCase("tr-TR")}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3"><strong className="truncate text-[var(--text-1)]">{ticket.businessName ?? "SeninRandevun destek"}</strong>
                <small className="shrink-0 text-[var(--text-3)]">{timeLabel(ticket.updatedAt)}</small></span>
              <span className="mt-1 line-clamp-2 block text-sm text-[var(--text-3)]">{ticket.message}</span>
              <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${ticket.status === "waiting_user" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--text-2)]"}`}>
                {STATUS[ticket.status] ?? ticket.status}</span>
            </span>
          </button>)}</div>}
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
  return <section aria-label="Yazışma" className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)]">
    <header className="flex items-center gap-3 border-b border-[var(--border)] p-4">
      <button type="button" onClick={onBack} aria-label="Geri" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)]"><ArrowLeft size={18} /></button>
      <div className="min-w-0"><strong className="block truncate text-[var(--text-1)]">{ticket.businessName ?? "SeninRandevun destek"}</strong>
        <small className="text-[var(--text-3)]">{STATUS[ticket.status] ?? ticket.status}</small></div>
    </header>
    <div className="max-h-[52vh] space-y-3 overflow-y-auto p-4">
      <Bubble body={ticket.message} mine label="Sen" time={timeLabel(ticket.createdAt)} />
      {messages.map((item) => <Bubble key={item.id} body={item.body} mine={item.senderRole === "customer"} label={who(item.senderRole)} time={timeLabel(item.createdAt)} />)}
      <div ref={endRef} />
    </div>
    <footer className="flex items-end gap-2 border-t border-[var(--border)] p-3">
      <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} maxLength={5000} placeholder="Mesajını yaz…"
        className="min-h-[48px] flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--accent)]" />
      <button type="button" onClick={() => void send()} disabled={sending || !body.trim()} aria-label="Gönder"
        className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-white disabled:opacity-50">
        {sending ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}</button>
    </footer>
  </section>;
}

function Bubble({ body, mine, label, time }: { body: string; mine: boolean; label: string; time: string }) {
  return <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[84%] rounded-[20px] px-4 py-3 ${mine ? "rounded-br-md bg-[var(--accent)] text-white" : "rounded-bl-md bg-[var(--surface-2)] text-[var(--text-1)]"}`}>
      <p className="whitespace-pre-wrap text-sm leading-6">{body}</p>
      <small className={`mt-1 block text-[10px] ${mine ? "text-white/60" : "text-[var(--text-3)]"}`}>{label} · {time}</small>
    </div>
  </div>;
}
