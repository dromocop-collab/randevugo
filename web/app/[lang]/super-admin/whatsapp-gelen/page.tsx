"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import {
  ArrowLeft, Bot, Check, CheckCheck, Clock3, Download, ExternalLink, FileText, Inbox, Lock, MapPin, MessageCircleReply, MessagesSquare,
  Phone, Plus, RotateCcw, Send, Settings2, Store, Trash2, TriangleAlert, Unlock, Zap,
} from "lucide-react";
import {
  formatInboxPhone, getInboxSettings, inboxMediaUrl, inboxWindow, saveInboxSettings, sendInboxReply, subscribeConversations, subscribeMessages,
  updateConversation, type InboxConversation, type InboxMessage, type InboxSettings,
} from "@/features/whatsapp/whatsapp-inbox-repository";
import {
  AdminPage, Avatar, Btn, Chips, CopyButton, EmptyState, HeroStat, IconBtn, PageHeader, SearchField, Sheet, SkeletonList,
  cx, dayLabel, relativeTime, timeOf, ui, useNow,
} from "../_pages-ui";
import s from "./gelen.module.css";

type Filter = "open" | "unread" | "closed" | "all";

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

function remainingText(ms: number) {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours ? `${hours} sa ${minutes} dk` : `${minutes} dk`;
}

const nameOf = (conversation: InboxConversation) => conversation.profileName || conversation.match?.customerName || formatInboxPhone(conversation.phone);

export default function WhatsAppInboxPage() {
  const now = useNow(30_000);
  const [conversations, setConversations] = useState<InboxConversation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<InboxSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => subscribeConversations((rows) => { setConversations(rows); setLoadError(null); }, (error) => setLoadError(errorMessage(error))), []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("c");
    if (id && /^[a-f0-9]{24}$/.test(id)) queueMicrotask(() => setSelectedId(id));
    getInboxSettings().then(setSettings).catch(() => undefined);
  }, []);

  const unreadTotal = useMemo(() => (conversations ?? []).reduce((sum, row) => sum + (row.status === "open" ? row.unreadCount : 0), 0), [conversations]);
  useEffect(() => {
    const base = "WhatsApp Gelen Kutusu";
    document.title = unreadTotal ? `(${unreadTotal}) ${base}` : base;
  }, [unreadTotal]);

  const counts = useMemo(() => {
    const rows = conversations ?? [];
    return {
      open: rows.filter((row) => row.status === "open").length,
      unread: rows.filter((row) => row.unreadCount > 0 && row.status === "open").length,
      closed: rows.filter((row) => row.status === "closed").length,
      all: rows.length,
      windowOpen: rows.filter((row) => inboxWindow(row.lastInboundAt, now).open).length,
    };
  }, [conversations, now]);

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    const digits = needle.replace(/\D/g, "");
    return (conversations ?? []).filter((row) => {
      if (filter === "open" && row.status !== "open") return false;
      if (filter === "closed" && row.status !== "closed") return false;
      if (filter === "unread" && !(row.unreadCount > 0 && row.status === "open")) return false;
      if (!needle) return true;
      const haystack = [row.profileName, row.match?.customerName, row.match?.businessName, row.lastMessageText].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
      return haystack.includes(needle) || (digits.length >= 3 && row.phone.includes(digits));
    });
  }, [conversations, filter, search]);

  const selected = useMemo(() => conversations?.find((row) => row.id === selectedId) ?? null, [conversations, selectedId]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("c", id); else url.searchParams.delete("c");
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <AdminPage>
      <div className={cx(s.hero, selected && s.heroHidden)}>
      <PageHeader eyebrow="Meta Cloud API" icon={Inbox} title="WhatsApp gelen kutusu"
        description="Bildirim numarasına yazan müşteri ve işletmelerin mesajları. Son mesajdan sonraki 24 saat içinde buradan ücretsiz cevap verebilirsiniz."
        meta={<>
          <HeroStat label="okunmamış" value={unreadTotal.toLocaleString("tr-TR")} />
          <HeroStat label="açık konuşma" value={counts.open.toLocaleString("tr-TR")} />
          <HeroStat label="cevap verilebilir" value={counts.windowOpen.toLocaleString("tr-TR")} />
        </>}
        actions={<>
          <Btn variant="lime" icon={Settings2} onClick={() => setSettingsOpen(true)}>Otomatik cevap</Btn>
          <Link href="/super-admin/whatsapp" className={cx(ui.btn, ui.btnOnDark)}><MessagesSquare size={15} aria-hidden /> Kanal</Link>
        </>}
      />
      </div>

      {settings && !settings.autoReplyEnabled ? (
        <p className={s.notice}><Bot size={15} aria-hidden /> Otomatik cevap kapalı. Yazan kişilere hiçbir cevap gitmiyor; mesajları buradan takip edin.</p>
      ) : null}

      {loadError ? (
        <EmptyState icon={TriangleAlert} title="Gelen kutusu okunamadı" description={`${loadError} — Firestore kurallarının gönderildiğinden emin olun.`} />
      ) : conversations === null ? <SkeletonList rows={5} height={72} /> : (
        <div className={cx(s.layout, selected && s.hasSelection)}>
          <section className={s.listPane} aria-label="Konuşmalar">
            <div className={s.listTools}>
              <SearchField value={search} onChange={setSearch} placeholder="Ad, numara, işletme, mesaj…" shortcut={false} label="Konuşma ara" />
              <Chips label="Konuşma filtresi" value={filter} onChange={setFilter} options={[
                { value: "open", label: "Açık", count: counts.open }, { value: "unread", label: "Okunmamış", count: counts.unread },
                { value: "closed", label: "Kapalı", count: counts.closed }, { value: "all", label: "Tümü", count: counts.all },
              ]} />
            </div>
            {visible.length === 0 ? (
              <EmptyState icon={Inbox} title={conversations.length ? "Bu filtrede konuşma yok" : "Henüz mesaj yok"}
                description={conversations.length ? undefined : "Bildirim numarasına biri yazınca burada canlı olarak görünür."} />
            ) : (
              <ul className={s.list}>
                {visible.map((row) => {
                  const rowWindow = inboxWindow(row.lastInboundAt, now);
                  return (
                    <li key={row.id}>
                      <button type="button" className={cx(s.item, row.id === selectedId && s.itemOn, row.unreadCount > 0 && s.itemUnread)} onClick={() => select(row.id)}>
                        <Avatar name={nameOf(row)} seed={row.phone} size={42} />
                        <span className={s.itemBody}>
                          <span className={s.itemTop}><b>{nameOf(row)}</b><small>{relativeTime(row.lastMessageAt, now)}</small></span>
                          <span className={s.itemText}>{row.lastDirection === "out" ? <CheckCheck size={13} aria-hidden /> : null}{row.lastMessageText || "—"}</span>
                          <span className={s.itemMeta}>
                            {row.match?.businessName ? <span className={s.tag}><Store size={11} aria-hidden /> {row.match.businessName}</span> : null}
                            {rowWindow.open ? <span className={cx(s.tag, s.tagGreen)}><Clock3 size={11} aria-hidden /> {remainingText(rowWindow.remainingMs)}</span> : null}
                            {row.status === "closed" ? <span className={s.tag}><Lock size={11} aria-hidden /> Kapalı</span> : null}
                          </span>
                        </span>
                        {row.unreadCount > 0 ? <span className={s.badge}>{row.unreadCount > 99 ? "99+" : row.unreadCount}</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={s.threadPane} aria-label="Mesajlar">
            {selected ? (
              <Thread key={selected.id} conversation={selected} now={now} quickReplies={settings?.quickReplies ?? []} onBack={() => select(null)} />
            ) : (
              <div className={s.placeholder}>
                <MessagesSquare size={34} aria-hidden />
                <b>Bir konuşma seçin</b>
                <p>Müşteri yazdıktan sonraki 24 saat içinde cevap ücretsizdir. Pencere kapandıysa müşteri yeniden yazana kadar serbest mesaj gönderilemez.</p>
              </div>
            )}
          </section>
        </div>
      )}

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSaved={setSettings} />
    </AdminPage>
  );
}

function Thread({ conversation, now, quickReplies, onBack }: {
  conversation: InboxConversation; now: number; quickReplies: InboxSettings["quickReplies"]; onBack: () => void;
}) {
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const window24 = inboxWindow(conversation.lastInboundAt, now);
  const { id, unreadCount } = conversation;

  useEffect(() => subscribeMessages(id, setMessages, (error) => toast.error(errorMessage(error))), [id]);
  // Açık konuşmada yeni mesaj geldikçe okundu say (müşteriye mavi tik gider).
  useEffect(() => { if (unreadCount > 0) void updateConversation(id, "read").catch(() => undefined); }, [id, unreadCount]);
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages?.length]);
  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }, [text]);

  const reactions = useMemo(() => {
    const map = new Map<string, string>();
    (messages ?? []).forEach((message) => { if (message.type === "reaction" && message.reaction) map.set(message.reaction.messageId, message.reaction.emoji); });
    return map;
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try { await sendInboxReply(id, body); setText(""); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setSending(false); textRef.current?.focus(); }
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
  }

  async function setStatus(action: "close" | "reopen") {
    setBusy(true);
    try { await updateConversation(id, action); toast.success(action === "close" ? "Konuşma kapatıldı." : "Konuşma yeniden açıldı."); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }

  const match = conversation.match;
  let lastDay = "";
  return (
    <div className={s.thread}>
      <header className={s.threadHead}>
        <IconBtn label="Konuşmalara dön" icon={ArrowLeft} className={s.back} onClick={onBack} />
        <Avatar name={nameOf(conversation)} seed={conversation.phone} size={40} />
        <div className={s.threadTitle}>
          <b>{nameOf(conversation)}</b>
          <span className={s.inline}><code>{formatInboxPhone(conversation.phone)}</code><CopyButton value={`+${conversation.phone}`} compact /></span>
        </div>
        <div className={s.threadActions}>
          <a className={cx(ui.btn, ui.btnSm)} href={`tel:+${conversation.phone}`} aria-label="Ara"><Phone size={14} aria-hidden /> <span className={s.btnLabel}>Ara</span></a>
          {conversation.status === "open"
            ? <Btn size="sm" icon={Lock} loading={busy} onClick={() => void setStatus("close")} aria-label="Konuşmayı kapat"><span className={s.btnLabel}>Kapat</span></Btn>
            : <Btn size="sm" icon={Unlock} loading={busy} onClick={() => void setStatus("reopen")} aria-label="Yeniden aç"><span className={s.btnLabel}>Yeniden aç</span></Btn>}
        </div>
      </header>

      {match?.businessId ? (
        <div className={s.match}>
          <Store size={15} aria-hidden />
          <span>
            <b>{match.businessName}</b> müşterisi{match.customerName ? ` · kayıtlı ad: ${match.customerName}` : ""}
            <small>
              Son randevu: {match.serviceName || "—"}{match.appointmentStartAt ? ` · ${new Date(match.appointmentStartAt).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}` : ""}
              {match.appointmentStatus ? ` · ${STATUS_TR[match.appointmentStatus] ?? match.appointmentStatus}` : ""}
              {match.appointmentCount && match.appointmentCount > 1 ? ` · toplam ${match.appointmentCount} randevu${match.businessCount && match.businessCount > 1 ? `, ${match.businessCount} işletme` : ""}` : ""}
            </small>
          </span>
          <span className={s.matchLinks}>
            {match.businessSlug ? <a href={`/isletme/${match.businessSlug}`} target="_blank" rel="noreferrer" className={cx(ui.btn, ui.btnSm)}><ExternalLink size={13} aria-hidden /> Mağaza</a> : null}
            {match.businessPhone ? <a href={`tel:${match.businessPhone}`} className={cx(ui.btn, ui.btnSm)}><Phone size={13} aria-hidden /> İşletme</a> : null}
          </span>
        </div>
      ) : null}

      <div ref={scrollRef} className={s.messages} aria-live="polite">
        {messages === null ? <SkeletonList rows={3} height={48} /> : messages.filter((message) => message.type !== "reaction").map((message) => {
          const day = message.createdAt ? dayLabel(message.createdAt, now) : "";
          const separator = day && day !== lastDay ? <div className={s.day} key={`d-${message.id}`}><span>{day}</span></div> : null;
          if (day) lastDay = day;
          return [separator, <Bubble key={message.id} message={message} reaction={reactions.get(message.id) ?? null} />];
        })}
      </div>

      <footer className={s.composer}>
        {window24.open ? (
          <>
            {quickReplies.length ? (
              <div className={s.quick} role="group" aria-label="Hazır cevaplar">
                <Zap size={13} aria-hidden />
                {quickReplies.map((reply) => (
                  <button key={reply.title} type="button" className={s.quickBtn} title={reply.text}
                    onClick={() => { setText((current) => current ? `${current}\n${reply.text}` : reply.text); textRef.current?.focus(); }}>{reply.title}</button>
                ))}
              </div>
            ) : null}
            <div className={s.inputRow}>
              <textarea ref={textRef} className={s.input} rows={1} value={text} maxLength={4000} placeholder="Mesaj yazın…" title="Enter gönderir, Shift+Enter yeni satır"
                onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} aria-label="Cevap" />
              <Btn variant="primary" icon={Send} loading={sending} disabled={!text.trim()} onClick={() => void send()} aria-label="Gönder"><span className={s.btnLabel}>Gönder</span></Btn>
            </div>
            <small className={s.windowNote}><Clock3 size={12} aria-hidden /> Ücretsiz cevap penceresi: {remainingText(window24.remainingMs)} kaldı<span className={s.btnLabel}> · Enter gönderir, Shift+Enter yeni satır</span></small>
          </>
        ) : (
          <div className={s.closedWindow}>
            <Lock size={16} aria-hidden />
            <span><b>24 saatlik pencere kapalı</b>Müşteri yeniden yazınca cevap verebilirsiniz. Acilse kendi telefonunuzdan yazın.</span>
            <a className={cx(ui.btn, ui.btnSm)} href={`https://wa.me/${conversation.phone}`} target="_blank" rel="noreferrer"><MessageCircleReply size={14} aria-hidden /> WhatsApp’ta aç</a>
          </div>
        )}
      </footer>
    </div>
  );
}

const STATUS_TR: Record<string, string> = { pending: "onay bekliyor", confirmed: "onaylı", completed: "tamamlandı", cancelled: "iptal", no_show: "gelmedi" };

function Bubble({ message, reaction }: { message: InboxMessage; reaction: string | null }) {
  const out = message.direction === "out";
  return (
    <div className={cx(s.row, out ? s.rowOut : s.rowIn)}>
      <div className={cx(s.bubble, out ? s.bubbleOut : s.bubbleIn, message.auto && s.bubbleAuto)}>
        {message.auto ? <span className={s.autoLabel}><Bot size={11} aria-hidden /> Otomatik cevap</span> : out && message.sentByName ? <span className={s.autoLabel}>{message.sentByName}</span> : null}
        {message.media ? <Media media={message.media} /> : null}
        {message.location ? (
          <a className={s.location} href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`} target="_blank" rel="noreferrer">
            <MapPin size={15} aria-hidden /> {message.location.name ?? "Konum"}{message.location.address ? <small>{message.location.address}</small> : null}
          </a>
        ) : null}
        {message.text ? <p className={s.text}>{message.type === "button" || message.type === "interactive" ? `🔘 ${message.text}` : message.text}</p> : null}
        {!message.text && !message.media && !message.location ? <p className={cx(s.text, s.muted)}>{message.type === "unsupported" ? "Desteklenmeyen mesaj türü (WhatsApp'ta görüntüleyin)" : message.type}</p> : null}
        <span className={s.meta}>
          {timeOf(message.createdAt)}
          {out ? <StatusTick status={message.status} title={message.errorTitle ?? undefined} /> : null}
        </span>
        {reaction ? <span className={s.reaction}>{reaction}</span> : null}
      </div>
      {out && message.status === "failed" ? <small className={s.failed}>İletilemedi{message.errorCode ? ` (${message.errorCode})` : ""}{message.errorTitle ? `: ${message.errorTitle}` : ""}</small> : null}
    </div>
  );
}

function StatusTick({ status, title }: { status: string | null; title?: string }) {
  if (status === "read") return <CheckCheck size={14} className={s.tickRead} aria-label="Okundu" />;
  if (status === "delivered") return <CheckCheck size={14} aria-label="İletildi" />;
  if (status === "failed") return <TriangleAlert size={13} className={s.tickFailed} aria-label={title ? `İletilemedi: ${title}` : "İletilemedi"} />;
  return <Check size={14} aria-label="Gönderildi" />;
}

function Media({ media }: { media: NonNullable<InboxMessage["media"]> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (media.status !== "ready" || !media.storagePath) return;
    let alive = true;
    inboxMediaUrl(media.storagePath).then((value) => { if (alive) setUrl(value); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [media.status, media.storagePath]);

  if (media.status === "pending") return <span className={s.mediaNote}><Clock3 size={14} aria-hidden /> Medya indiriliyor…</span>;
  if (media.status === "too_large") return <span className={s.mediaNote}><TriangleAlert size={14} aria-hidden /> Dosya 16 MB’tan büyük; WhatsApp’ta görüntüleyin.</span>;
  if (media.status === "failed" || failed) return <span className={s.mediaNote}><TriangleAlert size={14} aria-hidden /> Medya alınamadı.</span>;
  if (!url) return <span className={s.mediaNote}><Clock3 size={14} aria-hidden /> Yükleniyor…</span>;
  if (media.kind === "image" || media.kind === "sticker") {
    // eslint-disable-next-line @next/next/no-img-element
    return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className={cx(s.image, media.kind === "sticker" && s.sticker)} loading="lazy" /></a>;
  }
  if (media.kind === "audio") return <audio className={s.audio} controls preload="metadata" src={url} />;
  if (media.kind === "video") return <video className={s.video} controls preload="metadata" src={url} />;
  return (
    <a className={s.file} href={url} target="_blank" rel="noreferrer">
      <FileText size={18} aria-hidden />
      <span><b>{media.fileName ?? "Belge"}</b><small>{media.size ? `${Math.max(1, Math.round(media.size / 1024)).toLocaleString("tr-TR")} KB` : media.mimeType}</small></span>
      <Download size={15} aria-hidden />
    </a>
  );
}

function SettingsSheet({ open, onClose, settings, onSaved }: { open: boolean; onClose: () => void; settings: InboxSettings | null; onSaved: (value: InboxSettings) => void }) {
  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState("");
  const [replies, setReplies] = useState<Array<{ title: string; text: string }>>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open || !settings) return;
    queueMicrotask(() => { setEnabled(settings.autoReplyEnabled); setText(settings.autoReplyText); setReplies(settings.quickReplies.length ? settings.quickReplies : []); });
  }, [open, settings]);
  const preview = (text.trim() || settings?.defaultAutoReply || "").replace(/\{\{\s*ad\s*\}\}/gi, ", Ayşe");

  async function save() {
    setBusy(true);
    try {
      const result = await saveInboxSettings({ autoReplyEnabled: enabled, autoReplyText: text, quickReplies: replies.filter((row) => row.title.trim() && row.text.trim()) });
      onSaved(result);
      toast.success("Gelen kutusu ayarları kaydedildi.");
      onClose();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={onClose} busy={busy} width={560} title="Otomatik cevap ve hazır cevaplar"
      description="Otomatik cevap bir kişiye 24 saatte en fazla bir kez gider; son 24 saatte siz cevap yazdıysanız gönderilmez. Pencere içinde olduğu için ücretsizdir."
      footer={<><Btn onClick={onClose} disabled={busy}>Vazgeç</Btn><Btn variant="primary" loading={busy} disabled={!settings} onClick={() => void save()}>Kaydet</Btn></>}>
      {!settings ? <SkeletonList rows={3} height={56} /> : (
        <div className={s.settings}>
          <label className={s.switchRow}>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            <span><b>Otomatik cevap açık</b><small>Kapalıysa yazan kişiye hiçbir şey gönderilmez.</small></span>
          </label>
          <label className={ui.field}><span className={ui.fieldLabel}>Otomatik cevap metni · {"{{ad}}"} yerine kişinin adı gelir</span>
            <textarea className={ui.input} rows={5} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} disabled={!enabled} />
          </label>
          <div className={s.previewBox}><small>Önizleme</small><p>{preview}</p></div>
          <Btn size="sm" variant="ghost" icon={RotateCcw} onClick={() => setText(settings.defaultAutoReply)} disabled={!enabled}>Varsayılan metne dön</Btn>

          <div className={s.repliesHead}><b>Hazır cevaplar</b><small>Cevap kutusunun üstünde tek dokunuşla eklenir (en fazla 12).</small></div>
          {replies.map((reply, index) => (
            <div key={index} className={s.replyRow}>
              <input className={ui.input} placeholder="Başlık (ör. Fiyatlar)" maxLength={40} value={reply.title}
                onChange={(event) => setReplies((rows) => rows.map((row, i) => i === index ? { ...row, title: event.target.value } : row))} />
              <textarea className={ui.input} rows={2} placeholder="Metin" maxLength={1000} value={reply.text}
                onChange={(event) => setReplies((rows) => rows.map((row, i) => i === index ? { ...row, text: event.target.value } : row))} />
              <IconBtn label="Sil" icon={Trash2} onClick={() => setReplies((rows) => rows.filter((_, i) => i !== index))} />
            </div>
          ))}
          {replies.length < 12 ? (
            <Btn size="sm" icon={Plus} onClick={() => setReplies((rows) => [...rows, { title: "", text: "" }])}>Hazır cevap ekle</Btn>
          ) : null}
          {!replies.length ? (
            <Btn size="sm" variant="ghost" icon={Zap} onClick={() => setReplies(SUGGESTED_REPLIES)}>Örnek hazır cevapları ekle</Btn>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}

const SUGGESTED_REPLIES = [
  { title: "Randevu değişikliği", text: "Randevunu değiştirmek veya iptal etmek için randevu mesajındaki bağlantıya dokunman yeterli. Bağlantıyı bulamazsan işletmenin adını ve randevu tarihini yazar mısın, hemen yardımcı olalım." },
  { title: "İşletmeye yönlendir", text: "Bu konuda en doğru bilgiyi işletme verebilir. İşletmenin mağaza sayfasından telefonla ulaşabilirsin. Başka bir konuda yardımcı olabileceğimiz bir şey olursa yazman yeterli." },
  { title: "İşletme kaydı", text: "Senin Randevun’u işletmen için 30 gün ücretsiz deneyebilirsin, kredi kartı gerekmez: https://seninrandevun.com/isletmeler/kayit" },
  { title: "Teşekkürler", text: "Rica ederiz, iyi günler dileriz 😊" },
];
