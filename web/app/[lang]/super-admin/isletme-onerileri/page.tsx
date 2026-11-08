"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { CheckCircle2, Clock3, Lightbulb, MapPin, MessageCircle, Phone, RotateCcw, Store, ThumbsUp, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDb } from "@/lib/firebase/firestore";
import { CATEGORY_CATALOG } from "@/components/marketing/category-catalog";
import { AdminPage, Btn, Chips, EmptyState, ErrorBox, HeroStat, PageHeader, Pill, SkeletonList, fullDate, relativeTime, useNow, type Tone } from "../_pages-ui";
import s from "../yarim-kayitlar/yarim.module.css";

// Boş şehir sayfası ve sonuçsuz keşif ekranından müşterilerin önerdiği işletmeler. Aynı işletme tek satırda sayılır.

type Status = "new" | "contacted" | "closed";
type Suggestion = { id: string; businessName: string; city: string; district: string; category: string; phone: string | null; status: Status; votes: number; createdAt: number | null };
type Filter = Status | "all";

const STATUS: Record<Status, { label: string; tone: Tone }> = {
  new: { label: "Yeni", tone: "amber" }, contacted: { label: "Ulaşıldı", tone: "blue" }, closed: { label: "Kapatıldı", tone: "neutral" },
};

const categoryLabel = (slug: string) => CATEGORY_CATALOG.find((item) => item.slug === slug)?.label ?? null;
const localPhone = (phone: string) => `0${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8, 10)} ${phone.slice(10)}`;
const whatsappLink = (row: Suggestion) => `https://wa.me/${row.phone}?text=${encodeURIComponent(`Merhaba, Senin Randevun'dan yazıyorum 🙂 Bir müşteriniz ${row.businessName} işletmesinden online randevu alabilmek istediğini iletti. Müşterileriniz sizden 7/24 online randevu alabilsin, ilk ay ücretsiz kurulumu birlikte yapalım mı?`)}`;

export default function BusinessSuggestionsPage() {
  const { user } = useAuth();
  const now = useNow(60_000);
  const [rows, setRows] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("new");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => onSnapshot(query(collection(getDb(), "businessSuggestions"), orderBy("createdAt", "desc"), limit(300)), (snapshot) => {
    setError(null);
    setRows(snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id, businessName: String(data.businessName ?? ""), city: String(data.city ?? ""), district: String(data.district ?? ""), category: String(data.category ?? ""),
        phone: typeof data.phone === "string" ? data.phone : null, status: data.status === "contacted" || data.status === "closed" ? data.status : "new",
        votes: Number(data.votes ?? 1), createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null,
      };
    }));
  }, (err) => setError(err.message)), []);

  const counts = useMemo(() => {
    const list = rows ?? [];
    return { new: list.filter((row) => row.status === "new").length, contacted: list.filter((row) => row.status === "contacted").length, closed: list.filter((row) => row.status === "closed").length, all: list.length };
  }, [rows]);
  const shown = useMemo(() => (rows ?? []).filter((row) => filter === "all" || row.status === filter).sort((a, b) => b.votes - a.votes || (b.createdAt ?? 0) - (a.createdAt ?? 0)), [rows, filter]);

  async function setStatus(row: Suggestion, status: Status) {
    if (!user) return;
    setBusy(row.id);
    try {
      await updateDoc(doc(getDb(), "businessSuggestions", row.id), { status, handledBy: user.uid, handledAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast.success(status === "contacted" ? "Ulaşıldı olarak işaretlendi." : status === "closed" ? "Kapatıldı." : "Yeniden açıldı.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminPage>
      <PageHeader eyebrow="Müşteriden gelen" icon={Lightbulb} title="İşletme önerileri" description="Müşterilerin “burada olsun” dediği işletmeler. Çok önerilen en üstte; arayıp “müşteriniz sizi önerdi” diyebilirsin."
        meta={<><HeroStat label="yeni" value={rows ? counts.new : "…"} /><HeroStat label="toplam" value={rows ? counts.all : "…"} /></>} />
      <Chips label="Duruma göre süz" value={filter} onChange={setFilter} options={[
        { value: "new", label: "Yeni", count: counts.new }, { value: "contacted", label: "Ulaşıldı", count: counts.contacted },
        { value: "closed", label: "Kapatıldı", count: counts.closed }, { value: "all", label: "Tümü", count: counts.all },
      ]} />
      {error ? <ErrorBox message={error} /> : rows === null ? <SkeletonList rows={4} height={110} /> : shown.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Bu durumda öneri yok" description="Müşteri boş şehir sayfasından ya da sonuçsuz aramadan işletme önerince burada belirir." />
      ) : (
        <ul className={s.list}>
          {shown.map((row) => (
            <li key={row.id} className={s.row} data-status={row.status === "new" ? "open" : "closed"}>
              <div className={s.main}>
                <div className={s.title}><b>{row.businessName}</b><Pill tone={STATUS[row.status].tone} dot>{STATUS[row.status].label}</Pill>{row.votes > 1 ? <Pill tone="green"><ThumbsUp size={11} aria-hidden /> {row.votes} kişi önerdi</Pill> : null}</div>
                <div className={s.meta}>
                  <span><MapPin size={13} aria-hidden /> {row.district ? `${row.district}, ` : ""}{row.city}</span>
                  {categoryLabel(row.category) ? <span><Store size={13} aria-hidden /> {categoryLabel(row.category)}</span> : null}
                  <span title={fullDate(row.createdAt)}><Clock3 size={13} aria-hidden /> {relativeTime(row.createdAt, now)}</span>
                </div>
              </div>
              <div className={s.actions}>
                {row.phone ? <>
                  <a className={s.wa} href={whatsappLink(row)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} aria-hidden /> WhatsApp&apos;tan yaz</a>
                  <a className={s.call} href={`tel:+${row.phone}`}><Phone size={14} aria-hidden /> {localPhone(row.phone)}</a>
                </> : null}
                {row.status === "new" ? <>
                  <Btn size="sm" icon={CheckCircle2} loading={busy === row.id} onClick={() => void setStatus(row, "contacted")}>Ulaşıldı</Btn>
                  <Btn size="sm" variant="ghost" icon={X} disabled={busy === row.id} onClick={() => void setStatus(row, "closed")}>Kapat</Btn>
                </> : <Btn size="sm" variant="ghost" icon={RotateCcw} loading={busy === row.id} onClick={() => void setStatus(row, "new")}>Yeniden aç</Btn>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
