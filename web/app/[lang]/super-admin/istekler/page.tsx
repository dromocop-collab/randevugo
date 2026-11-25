"use client";

// Süper admin › İstek & Öneri: kullanıcıların /istekler ve /dashboard/istekler'den gönderdiği istekler.
// Yeni gelenler panoda görünmez; burada "Panoya koy" ile yayınlanır, durum ve ekip yanıtı buradan verilir.
// Durum değişince ya da yanıt yazılınca gönderene push gider (functions › featureRequestUpdated).
import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { ArrowUp, Building2, Clock3, Eye, EyeOff, Lightbulb, Mail, MessageCircle, MessageSquareReply, Phone, Save, Trash2, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDb } from "@/lib/firebase/firestore";
import { KIND_META, STATUSES, STATUS_META, searchRequests, toFeatureRequest, type FeatureRequest, type FeatureStatus } from "@/features/feature-requests/feature-request-domain";
import { AdminPage, Btn, ConfirmSheet, DetailList, EmptyState, ErrorBox, HeroStat, PageHeader, Pill, SearchField, Segmented, Sheet, SkeletonList, Toolbar, ToolbarRow, fullDate, relativeTime, ui, useNow, type Tone } from "../_pages-ui";
import s from "../yarim-kayitlar/yarim.module.css";

type Filter = "new" | "active" | "done" | "declined" | "all";
type Contact = { name: string | null; contact: string | null; email: string | null; businessId: string | null; businessName: string | null; page: string | null };

const TONE: Record<string, Tone> = { neutral: "neutral", blue: "blue", violet: "violet", amber: "amber", green: "green", red: "red" };
const AUDIENCE: Record<FeatureRequest["audience"], string> = { business: "İşletme", customer: "Müşteri", guest: "Ziyaretçi" };
const ACTIVE: FeatureStatus[] = ["reviewing", "planned", "in_progress"];

function matchesFilter(item: FeatureRequest, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "active") return ACTIVE.includes(item.status);
  return item.status === filter;
}

function phoneDigits(value: string | null): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (/^0?5\d{9}$/.test(digits)) return `90${digits.slice(-10)}`;
  if (/^905\d{9}$/.test(digits)) return digits;
  return null;
}

export default function FeatureRequestsAdminPage() {
  const { user } = useAuth();
  const now = useNow(60_000);
  const [rows, setRows] = useState<FeatureRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("new");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => onSnapshot(query(collection(getDb(), "featureRequests"), orderBy("createdAt", "desc"), limit(500)), (snapshot) => {
    setError(null);
    setRows(snapshot.docs.map((item) => toFeatureRequest(item.id, item.data())));
  }, (err) => setError(err.message)), []);

  const counts = useMemo(() => {
    const list = rows ?? [];
    const count = (f: Filter) => list.filter((item) => matchesFilter(item, f)).length;
    return { new: count("new"), active: count("active"), done: count("done"), declined: count("declined"), all: list.length, public: list.filter((item) => item.public).length };
  }, [rows]);
  const shown = useMemo(() => {
    const list = searchRequests((rows ?? []).filter((item) => matchesFilter(item, filter)), search);
    return filter === "new" ? list : [...list].sort((a, b) => b.votes - a.votes || (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [rows, filter, search]);
  const open = rows?.find((item) => item.id === openId) ?? null;

  return (
    <AdminPage>
      <PageHeader eyebrow="Kullanıcıdan gelen" icon={Lightbulb} title="İstek & Öneri"
        description="İşletmelerin ve müşterilerin özellik istekleri, iyileştirmeler ve hata bildirimleri. Yeni gelenler panoda görünmez; “Panoya koy” deyince herkes görür ve oy verir. Durum ya da yanıt değişince gönderene bildirim gider."
        meta={<><HeroStat label="yeni" value={rows ? counts.new : "…"} /><HeroStat label="panoda" value={rows ? counts.public : "…"} /><HeroStat label="toplam" value={rows ? counts.all : "…"} /></>} />
      <Toolbar>
        <ToolbarRow>
          <Segmented label="Duruma göre süz" value={filter} onChange={setFilter} options={[
            { value: "new", label: "Yeni gelen", count: counts.new, alert: counts.new > 0 }, { value: "active", label: "Süreçte", count: counts.active },
            { value: "done", label: "Yayında", count: counts.done }, { value: "declined", label: "Şimdilik değil", count: counts.declined }, { value: "all", label: "Tümü", count: counts.all },
          ]} />
          <SearchField value={search} onChange={setSearch} placeholder="Başlık, ayrıntı veya yanıtta ara…" />
        </ToolbarRow>
      </Toolbar>
      {error ? <ErrorBox message={error} /> : rows === null ? <SkeletonList rows={4} height={96} /> : shown.length === 0 ? (
        <EmptyState icon={Lightbulb} title={filter === "new" ? "Yeni istek yok" : "Bu süzgeçte istek yok"} description="Kullanıcılar /istekler sayfasından ya da işletme panelindeki “İstek & Öneri”den gönderince burada belirir." />
      ) : (
        <ul className={s.list}>
          {shown.map((item) => (
            <li key={item.id} className={s.row} data-status={item.status === "new" ? "open" : "closed"} style={{ cursor: "pointer" }} onClick={() => setOpenId(item.id)}>
              <div className={s.main}>
                <div className={s.title}>
                  <b>{KIND_META[item.kind].emoji} {item.title}</b>
                  <Pill tone={TONE[STATUS_META[item.status].tone]} dot>{STATUS_META[item.status].label}</Pill>
                  {item.public ? <Pill tone="green"><Eye size={11} aria-hidden /> Panoda</Pill> : <Pill tone="neutral"><EyeOff size={11} aria-hidden /> Gizli</Pill>}
                  {item.votes > 0 ? <Pill tone="lime"><ArrowUp size={11} aria-hidden /> {item.votes}</Pill> : null}
                </div>
                {item.details ? <p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.details}</p> : null}
                <div className={s.meta}>
                  <span><User size={13} aria-hidden /> {item.authorLabel} · {AUDIENCE[item.audience]}</span>
                  <span title={fullDate(item.createdAt)}><Clock3 size={13} aria-hidden /> {relativeTime(item.createdAt, now)}</span>
                  {item.adminReply ? <span><MessageSquareReply size={13} aria-hidden /> Yanıtlandı</span> : null}
                </div>
              </div>
              <div className={s.actions} onClick={(event) => event.stopPropagation()}>
                {item.status === "new" ? <QuickPublish item={item} uid={user?.uid ?? ""} /> : null}
                <Btn size="sm" variant="ghost" onClick={() => setOpenId(item.id)}>Aç</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open ? <RequestSheet key={open.id} item={open} uid={user?.uid ?? ""} onClose={() => setOpenId(null)} /> : null}
    </AdminPage>
  );
}

/** Tek dokunuş: panoya koy + İnceleniyor. */
function QuickPublish({ item, uid }: { item: FeatureRequest; uid: string }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await updateDoc(doc(getDb(), "featureRequests", item.id), { public: true, status: "reviewing", statusChangedAt: serverTimestamp(), updatedAt: serverTimestamp(), handledBy: uid });
      toast.success("Panoya kondu, durum: İnceleniyor.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }
  return <Btn size="sm" variant="primary" icon={Eye} loading={busy} onClick={() => void run()}>Panoya koy</Btn>;
}

function RequestSheet({ item, uid, onClose }: { item: FeatureRequest; uid: string; onClose: () => void }) {
  const [status, setStatus] = useState<FeatureStatus>(item.status);
  const [isPublic, setPublic] = useState(item.public);
  const [title, setTitle] = useState(item.title);
  const [details, setDetails] = useState(item.details);
  const [reply, setReply] = useState(item.adminReply?.text ?? "");
  const [note, setNote] = useState(item.adminNote ?? "");
  const [contact, setContact] = useState<Contact | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let alive = true;
    getDoc(doc(getDb(), "featureRequestContacts", item.id)).then((snapshot) => {
      if (!alive) return;
      const data = snapshot.data();
      setContact(data ? {
        name: data.name ?? null, contact: data.contact ?? null, email: data.email ?? null,
        businessId: data.businessId ?? null, businessName: data.businessName ?? null, page: data.page ?? null,
      } : null);
    }).catch(() => alive && setContact(null));
    return () => { alive = false; };
  }, [item.id]);

  const dirty = status !== item.status || isPublic !== item.public || title.trim() !== item.title || details.trim() !== item.details
    || reply.trim() !== (item.adminReply?.text ?? "") || note.trim() !== (item.adminNote ?? "");
  const willNotify = Boolean(item.authorUid) && ((status !== item.status && status !== "new") || (reply.trim() && reply.trim() !== (item.adminReply?.text ?? "")));

  async function save() {
    if (title.trim().length < 3) { toast.error("Başlık çok kısa."); return; }
    setSaving(true);
    try {
      const replyText = reply.trim();
      await updateDoc(doc(getDb(), "featureRequests", item.id), {
        status, public: isPublic, title: title.trim().slice(0, 120), details: details.trim().slice(0, 2000), adminNote: note.trim().slice(0, 2000),
        adminReply: replyText ? { text: replyText.slice(0, 1000), at: replyText === (item.adminReply?.text ?? "") && item.adminReply?.at ? new Date(item.adminReply.at) : serverTimestamp() } : null,
        ...(status !== item.status ? { statusChangedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(), handledBy: uid,
      });
      toast.success(willNotify ? "Kaydedildi, gönderene bildirim gidiyor." : "Kaydedildi.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await Promise.all([deleteDoc(doc(getDb(), "featureRequests", item.id)), deleteDoc(doc(getDb(), "featureRequestContacts", item.id)).catch(() => undefined)]);
      toast.success("İstek silindi.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  const wa = phoneDigits(contact?.contact ?? null);
  const mail = contact?.email ?? (contact?.contact && /@/.test(contact.contact) ? contact.contact : null);

  return (
    <>
      <Sheet open onClose={onClose} busy={saving} width={620} title={`${KIND_META[item.kind].emoji} ${KIND_META[item.kind].label}`}
        description={`${item.authorLabel} · ${AUDIENCE[item.audience]} · ${fullDate(item.createdAt)} · ${item.votes} oy`}
        footer={<>
          <Btn variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Sil</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>Vazgeç</Btn>
          <Btn variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={() => void save()}>Kaydet</Btn>
        </>}>
        <div style={{ display: "grid", gap: 16 }}>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Başlık <small>panoda görünür</small></span>
            <input className={ui.input} value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Ayrıntı</span>
            <textarea className={ui.textarea} value={details} maxLength={2000} rows={4} onChange={(event) => setDetails(event.target.value)} />
          </label>

          <div className={ui.field}>
            <span className={ui.fieldLabel}>Durum</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUSES.map((value) => (
                <Btn key={value} size="sm" variant={status === value ? "primary" : "ghost"} onClick={() => setStatus(value)}>{STATUS_META[value].label}</Btn>
              ))}
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            <input type="checkbox" checked={isPublic} onChange={(event) => setPublic(event.target.checked)} style={{ width: 18, height: 18 }} />
            Panoda göster <span style={{ color: "var(--muted)", fontWeight: 500 }}>(herkes görür ve oy verir)</span>
          </label>

          <label className={ui.field}>
            <span className={ui.fieldLabel}>Ekipten yanıt <small>panoda ve gönderene görünür</small></span>
            <textarea className={ui.textarea} value={reply} maxLength={1000} rows={3} placeholder="Örn. Aralık güncellemesinde geliyor, teşekkürler!" onChange={(event) => setReply(event.target.value)} />
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>İç not <small>yalnız yöneticiler</small></span>
            <textarea className={ui.textarea} value={note} maxLength={2000} rows={2} onChange={(event) => setNote(event.target.value)} />
          </label>

          {willNotify ? <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>💬 Kaydedince gönderene bildirim gidecek.</p> : null}

          <div className={ui.field}>
            <span className={ui.fieldLabel}>Gönderen <small>yalnız yöneticiler görür</small></span>
            {contact === undefined ? <SkeletonList rows={1} height={60} /> : contact === null ? <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>İletişim kaydı yok.</p> : (
              <>
                <DetailList rows={[
                  { label: "Ad", value: contact.name || "—" },
                  contact.contact ? { label: "İletişim", value: contact.contact } : null,
                  contact.email ? { label: "E-posta", value: contact.email } : null,
                  contact.businessName ? { label: "İşletme", value: <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Building2 size={13} aria-hidden /> {contact.businessName}</span> } : null,
                  item.businessCategory ? { label: "Kategori", value: item.businessCategory } : null,
                  contact.page ? { label: "Gönderdiği sayfa", value: contact.page } : null,
                  { label: "Hesap", value: item.authorUid ? "Giriş yapmış (bildirim alır)" : "Ziyaretçi (bildirim gitmez)" },
                ]} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {wa ? <a className={s.wa} href={`https://wa.me/${wa}?text=${encodeURIComponent(`Merhaba${contact.name ? ` ${contact.name.split(" ")[0]}` : ""}, Senin Randevun'dan yazıyorum 🙂 “${item.title}” isteğin için teşekkürler!`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} aria-hidden /> WhatsApp</a> : null}
                  {wa ? <a className={s.call} href={`tel:+${wa}`}><Phone size={14} aria-hidden /> Ara</a> : null}
                  {mail ? <a className={s.call} href={`mailto:${mail}?subject=${encodeURIComponent(`İsteğin hakkında: ${item.title}`)}`}><Mail size={14} aria-hidden /> E-posta</a> : null}
                </div>
              </>
            )}
          </div>
        </div>
      </Sheet>
      <ConfirmSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} tone="danger"
        title="İstek silinsin mi?" description="İstek, oyları ve iletişim kaydı kalıcı olarak silinir; geri alınamaz. Panodan kaldırmak için “Panoda göster”i kapatman yeterli." confirmLabel="Kalıcı olarak sil" />
    </>
  );
}
