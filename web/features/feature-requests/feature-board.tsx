"use client";

// İstek & öneri panosu: herkese açık /istekler ve işletme paneli /dashboard/istekler aynı bileşeni kullanır.
// Fikirler (oy + arama + sıralama), Yol haritası (Planlandı → Yapılıyor → Yayında), Benim isteklerim ve gönderim penceresi.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ArrowUp, Check, ChevronDown, Flame, Inbox, Lightbulb, LoaderCircle, Lock, Map as MapIcon, MessageSquareReply, Plus, Rocket, Search, Send, Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "@/i18n/navigation";
import { useIntlLocale, useT } from "@/i18n/client";
import { userFacingError } from "@/lib/errors/user-facing-error";
import {
  DETAILS_MAX, KINDS, KIND_META, ROADMAP, STATUS_META, TITLE_MAX, searchRequests, similarRequests, sortRequests,
  type FeatureKind, type FeatureRequest, type SortMode,
} from "./feature-request-domain";
import { submitFeatureRequest, useMyFeatureRequests, useMyVotes, usePublicFeatureRequests, voteFeatureRequest } from "./feature-request-repository";
import s from "./feature-board.module.css";

type Tab = "ideas" | "roadmap" | "mine";

function useRelativeTime() {
  const intl = useIntlLocale();
  return useCallback((ms: number | null, now: number) => {
    if (!ms) return "";
    const format = new Intl.RelativeTimeFormat(intl, { numeric: "auto" });
    const diff = (ms - now) / 1000;
    const steps: Array<[number, Intl.RelativeTimeFormatUnit]> = [[60, "second"], [3600, "minute"], [86400, "hour"], [604800, "day"], [2629800, "week"], [31557600, "month"]];
    const units: Record<string, number> = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 };
    const unit = steps.find(([limit]) => Math.abs(diff) < limit)?.[1] ?? "year";
    return format.format(Math.round(diff / units[unit]), unit);
  }, [intl]);
}

export function FeatureBoard({ variant, businessId }: { variant: "public" | "dashboard"; businessId?: string | null }) {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { rows: publicRows, error } = usePublicFeatureRequests();
  const mine = useMyFeatureRequests(uid);
  const votedIds = useMyVotes(uid);
  const [optimistic, setOptimistic] = useState<Record<string, { voted: boolean; votes: number }>>({});
  const [busyVote, setBusyVote] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("ideas");
  const [sort, setSort] = useState<SortMode>("trending");
  const [kind, setKind] = useState<FeatureKind | "all">("all");
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const relative = useRelativeTime();

  // ?benim=1 → Benim isteklerim, ?yeni=1 → gönderim penceresi (bildirimden / bağlantıdan gelince).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      if (params.get("benim") === "1") setTab("mine");
      if (params.get("yeni") === "1") setComposerOpen(true);
    });
  }, []);

  const voteState = useCallback((item: FeatureRequest) => optimistic[item.id] ?? { voted: votedIds.has(item.id), votes: item.votes }, [optimistic, votedIds]);

  const ideas = useMemo(() => {
    const open = (publicRows ?? []).filter((item) => item.status !== "done" && item.status !== "declined");
    const byKind = kind === "all" ? open : open.filter((item) => item.kind === kind);
    return sortRequests(searchRequests(byKind, search), sort, now);
  }, [publicRows, kind, search, sort, now]);

  const roadmap = useMemo(() => Object.fromEntries(ROADMAP.map((status) => [status, sortRequests((publicRows ?? []).filter((item) => item.status === status), status === "done" ? "new" : "top", now)])) as Record<string, FeatureRequest[]>, [publicRows, now]);
  const stats = useMemo(() => {
    const list = publicRows ?? [];
    const monthAgo = now - 30 * 86_400_000;
    return {
      open: list.filter((item) => !["done", "declined"].includes(item.status)).length,
      planned: list.filter((item) => item.status === "planned" || item.status === "in_progress").length,
      shipped: list.filter((item) => item.status === "done" && (item.statusChangedAt ?? 0) >= monthAgo).length,
    };
  }, [publicRows, now]);
  const myRows = useMemo(() => [...(mine ?? [])].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), [mine]);

  const loginPath = variant === "dashboard" ? "/dashboard/istekler" : "/istekler";
  const askLogin = useCallback(() => {
    toast(t("Oy vermek için giriş yap"), { description: t("Hesabın yoksa 30 saniyede açabilirsin."), action: { label: t("Giriş yap"), onClick: () => router.push(`/giris?next=${encodeURIComponent(loginPath)}`) } });
  }, [loginPath, router, t]);

  const vote = useCallback(async (item: FeatureRequest) => {
    if (!uid) { askLogin(); return; }
    if (busyVote) return;
    const current = voteState(item);
    const next = { voted: !current.voted, votes: Math.max(0, current.votes + (current.voted ? -1 : 1)) };
    setOptimistic((prev) => ({ ...prev, [item.id]: next }));
    setBusyVote(item.id);
    try {
      const result = await voteFeatureRequest(item.id);
      setOptimistic((prev) => ({ ...prev, [item.id]: result }));
    } catch (err) {
      setOptimistic((prev) => { const copy = { ...prev }; delete copy[item.id]; return copy; });
      const message = String((err as { message?: string })?.message ?? "");
      toast.error(/kapandı|closed/i.test(message) ? t("Bu istek kapandı, oy alınmıyor.") : userFacingError(err, t("Oy kaydedilemedi. Tekrar dene.")));
    } finally {
      setBusyVote(null);
    }
  }, [askLogin, busyVote, t, uid, voteState]);

  const tabs: Array<{ value: Tab; label: string; icon: typeof Lightbulb; count?: number }> = [
    { value: "ideas", label: t("Fikirler"), icon: Lightbulb, count: publicRows ? stats.open : undefined },
    { value: "roadmap", label: t("Yol haritası"), icon: MapIcon },
    ...(uid ? [{ value: "mine" as Tab, label: t("Benim isteklerim"), icon: Inbox, count: mine?.length }] : []),
  ];

  return (
    <div className={s.board} data-variant={variant}>
      <section className={s.hero}>
        <div className={s.heroGlow} aria-hidden />
        <div className={s.heroText}>
          <span className={s.eyebrow}><Sparkles size={14} aria-hidden /> {t("İstek & öneri panosu")}</span>
          <h1 className={s.title}>{variant === "dashboard" ? t("Paneli birlikte şekillendirelim") : t("Senin Randevun'u birlikte büyütüyoruz")}</h1>
          <p className={s.lead}>{t("Olmasını istediğin bir özelliği yaz, başkalarının fikirlerine oy ver. En çok istenenler yol haritasına girer; durum değişince sana haber veririz.")}</p>
          <div className={s.heroActions}>
            <button type="button" className={s.primary} onClick={() => setComposerOpen(true)}><Plus size={18} aria-hidden /> {t("İstek gönder")}</button>
            <button type="button" className={s.ghost} onClick={() => setTab("roadmap")}><MapIcon size={16} aria-hidden /> {t("Yol haritasına bak")}</button>
          </div>
        </div>
        <dl className={s.heroStats}>
          <div><dt>{t("açık fikir")}</dt><dd>{publicRows ? stats.open : "…"}</dd></div>
          <div><dt>{t("planlanan")}</dt><dd>{publicRows ? stats.planned : "…"}</dd></div>
          <div><dt>{t("son 30 günde yayında")}</dt><dd>{publicRows ? stats.shipped : "…"}</dd></div>
        </dl>
      </section>

      <div className={s.tabs} role="tablist" aria-label={t("Pano bölümleri")}>
        {tabs.map((item) => (
          <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={s.tab} data-active={tab === item.value} onClick={() => setTab(item.value)}>
            <item.icon size={16} aria-hidden /> {item.label}{typeof item.count === "number" ? <span className={s.tabCount}>{item.count}</span> : null}
          </button>
        ))}
      </div>

      {error ? <p className={s.error}>{t("Pano yüklenemedi. Sayfayı yenileyip tekrar dene.")}</p> : null}

      {tab === "ideas" ? (
        <section aria-label={t("Fikirler")}>
          <div className={s.toolbar}>
            <label className={s.search}>
              <Search size={16} aria-hidden />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Fikirlerde ara…")} aria-label={t("Fikirlerde ara")} />
            </label>
            <div className={s.segmented} role="group" aria-label={t("Sıralama")}>
              {([["trending", t("Trend"), Flame], ["top", t("En çok oy"), ArrowUp], ["new", t("En yeni"), Sparkles]] as const).map(([value, label, Icon]) => (
                <button key={value} type="button" aria-pressed={sort === value} data-active={sort === value} onClick={() => setSort(value)}><Icon size={14} aria-hidden /> {label}</button>
              ))}
            </div>
          </div>
          <div className={s.chips} role="group" aria-label={t("Türe göre süz")}>
            <button type="button" className={s.chip} data-active={kind === "all"} aria-pressed={kind === "all"} onClick={() => setKind("all")}>{t("Hepsi")}</button>
            {KINDS.map((value) => (
              <button key={value} type="button" className={s.chip} data-active={kind === value} aria-pressed={kind === value} onClick={() => setKind(value)}>
                <span aria-hidden>{KIND_META[value].emoji}</span> {t(KIND_META[value].label)}
              </button>
            ))}
          </div>
          {publicRows === null ? <SkeletonCards /> : ideas.length === 0 ? (
            <Empty
              title={search || kind !== "all" ? t("Bu aramaya uyan fikir yok") : t("İlk fikri sen yaz")}
              text={search || kind !== "all" ? t("Aradığını bulamadıysan yeni bir istek olarak gönder, ekip görsün.") : t("Pano henüz boş. Aklındaki ilk özelliği yaz, ekibimiz okusun.")}
              action={<button type="button" className={s.primary} onClick={() => setComposerOpen(true)}><Plus size={16} aria-hidden /> {t("İstek gönder")}</button>}
            />
          ) : (
            <ul className={s.list}>
              {ideas.map((item) => <RequestCard key={item.id} item={item} state={voteState(item)} busy={busyVote === item.id} onVote={() => void vote(item)} when={relative(item.createdAt, now)} />)}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "roadmap" ? (
        <section className={s.roadmap} aria-label={t("Yol haritası")}>
          {ROADMAP.map((status) => (
            <div key={status} className={s.column} data-status={status}>
              <header className={s.columnHead}>
                <span className={s.columnDot} aria-hidden />
                <b>{t(STATUS_META[status].label)}</b>
                <span className={s.columnCount}>{publicRows ? roadmap[status].length : "…"}</span>
                <small>{t(STATUS_META[status].hint)}</small>
              </header>
              {publicRows === null ? <div className={s.skeleton} style={{ height: 90 }} /> : roadmap[status].length === 0 ? (
                <p className={s.columnEmpty}>{status === "done" ? t("Yayına çıkanlar burada görünecek.") : t("Şimdilik boş.")}</p>
              ) : (
                <ul className={s.columnList}>
                  {roadmap[status].slice(0, 30).map((item) => {
                    const state = voteState(item);
                    return (
                      <li key={item.id} className={s.mini}>
                        <span className={s.miniKind} aria-hidden>{KIND_META[item.kind].emoji}</span>
                        <div>
                          <b>{item.title}</b>
                          {item.adminReply ? <p>{item.adminReply.text}</p> : null}
                        </div>
                        {status === "done" ? <span className={s.miniDone}><Rocket size={13} aria-hidden /> {relative(item.statusChangedAt, now)}</span> : (
                          <button type="button" className={s.miniVote} data-voted={state.voted} aria-pressed={state.voted} aria-label={state.voted ? t("Oyunu geri al") : t("Oy ver")} onClick={() => void vote(item)}>
                            <ArrowUp size={13} aria-hidden /> {state.votes}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </section>
      ) : null}

      {tab === "mine" && uid ? (
        <section aria-label={t("Benim isteklerim")}>
          {mine === null ? <SkeletonCards /> : myRows.length === 0 ? (
            <Empty title={t("Henüz istek göndermedin")} text={t("Gönderdiğin istekler ve durumları burada görünür; değişince bildirim alırsın.")}
              action={<button type="button" className={s.primary} onClick={() => setComposerOpen(true)}><Plus size={16} aria-hidden /> {t("İlk isteğini gönder")}</button>} />
          ) : (
            <ul className={s.list}>
              {myRows.map((item) => <RequestCard key={item.id} item={item} mine state={voteState(item)} busy={busyVote === item.id} onVote={() => void vote(item)} when={relative(item.createdAt, now)} />)}
            </ul>
          )}
        </section>
      ) : null}

      <button type="button" className={s.fab} onClick={() => setComposerOpen(true)} aria-label={t("İstek gönder")}><Plus size={22} aria-hidden /></button>

      {composerOpen ? (
        <Composer
          signedIn={Boolean(uid)}
          defaultName={user?.displayName ?? ""}
          businessId={variant === "dashboard" ? businessId ?? null : null}
          candidates={publicRows ?? []}
          voteState={voteState}
          onVote={vote}
          onClose={() => setComposerOpen(false)}
          onSent={() => { if (uid) setTab("mine"); }}
        />
      ) : null}
    </div>
  );
}

function RequestCard({ item, state, busy, onVote, when, mine }: { item: FeatureRequest; state: { voted: boolean; votes: number }; busy: boolean; onVote: () => void; when: string; mine?: boolean }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const closed = item.status === "done" || item.status === "declined";
  const long = item.details.length > 220;
  const status = STATUS_META[item.status];
  return (
    <li className={s.card} data-status={item.status}>
      <button type="button" className={s.vote} data-voted={state.voted} aria-pressed={state.voted} disabled={closed}
        aria-label={closed ? t("Oylama kapandı") : state.voted ? t("Oyunu geri al") : t("Oy ver")} onClick={onVote}>
        {busy ? <LoaderCircle size={18} className={s.spin} aria-hidden /> : state.voted ? <Check size={18} aria-hidden /> : <ArrowUp size={18} aria-hidden />}
        <span key={state.votes} className={s.voteCount}>{state.votes}</span>
      </button>
      <div className={s.cardBody}>
        <div className={s.cardTop}>
          <span className={s.kind}><span aria-hidden>{KIND_META[item.kind].emoji}</span> {t(KIND_META[item.kind].label)}</span>
          <span className={s.status} data-tone={status.tone}>{t(status.label)}</span>
          {mine && !item.public ? <span className={s.private}><Lock size={12} aria-hidden /> {t("Yalnız sen görüyorsun")}</span> : null}
        </div>
        <h3 className={s.cardTitle}>{item.title}</h3>
        {item.details ? (
          <p className={s.details} data-expanded={expanded || !long}>{item.details}</p>
        ) : null}
        {long ? <button type="button" className={s.more} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? t("Daha az") : t("Devamını oku")} <ChevronDown size={14} aria-hidden data-open={expanded} /></button> : null}
        {item.adminReply ? (
          <div className={s.reply}>
            <span className={s.replyBadge}><MessageSquareReply size={13} aria-hidden /> {t("Ekipten yanıt")}</span>
            <p>{item.adminReply.text}</p>
          </div>
        ) : null}
        <div className={s.meta}>
          <span>{item.authorLabel || t("Bir kullanıcı")}</span>
          {item.audience === "business" ? <span className={s.badge}>{t("İşletme")}</span> : null}
          {when ? <span>· {when}</span> : null}
        </div>
      </div>
    </li>
  );
}

function Composer({ signedIn, defaultName, businessId, candidates, voteState, onVote, onClose, onSent }: {
  signedIn: boolean; defaultName: string; businessId: string | null; candidates: FeatureRequest[];
  voteState: (item: FeatureRequest) => { voted: boolean; votes: number }; onVote: (item: FeatureRequest) => Promise<void>;
  onClose: () => void; onSent: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const [kind, setKind] = useState<FeatureKind>("feature");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState(defaultName);
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);
  useEffect(() => {
    if (!mounted) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    window.setTimeout(() => firstRef.current?.focus(), 60);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); };
  }, [mounted, onClose]);

  const similar = useMemo(() => (title.trim().length >= 4 ? similarRequests(candidates.filter((item) => item.status !== "done" && item.status !== "declined"), title) : []), [candidates, title]);
  const titleOk = (title.match(/\p{L}/gu) ?? []).length >= 5;
  const guestOk = signedIn || name.trim().length >= 2 || contact.trim().length >= 5;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!titleOk) { toast.error(t("Başlık en az 5 harf olmalı.")); return; }
    if (!guestOk) { toast.error(t("Sana dönebilmemiz için adını ya da iletişim bilgini yaz.")); return; }
    setSending(true);
    try {
      await submitFeatureRequest({
        title: title.trim(), details: details.trim(), kind, name: name.trim(), contact: contact.trim(), website,
        businessId, page: `${window.location.pathname}`.slice(0, 160),
      });
      setSent(true);
      onSent();
    } catch (err) {
      const message = String((err as { message?: string })?.message ?? "");
      toast.error(/harf|giriş yap|iletişim/i.test(message) ? t(message) : userFacingError(err, t("İstek gönderilemedi. Tekrar dene.")));
    } finally {
      setSending(false);
    }
  }

  if (!mounted) return null;
  return createPortal(
    <div className={s.layer} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} className={s.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={s.dialogHead}>
          <div>
            <h2 id={titleId}>{sent ? t("Teşekkürler!") : t("İstek gönder")}</h2>
            <p>{sent ? t("İsteğin ekibimize ulaştı.") : t("Ne olsun istiyorsun? Kısa bir başlık yeter, ayrıntı isteğe bağlı.")}</p>
          </div>
          <button type="button" className={s.close} onClick={onClose} aria-label={t("Kapat")}><X size={18} aria-hidden /></button>
        </header>

        {sent ? (
          <div className={s.success}>
            <div className={s.successIcon}><Check size={30} aria-hidden /></div>
            <p>{signedIn ? t("Ekibimiz inceleyip panoya ekleyecek. Durum değişince ya da yanıt yazınca sana bildirim gelir; “Benim isteklerim” sekmesinden de takip edebilirsin.") : t("Ekibimiz inceleyip panoya ekleyecek. Giriş yaparsan isteklerini takip edebilir ve oy verebilirsin.")}</p>
            <div className={s.successActions}>
              <button type="button" className={s.ghost} onClick={() => { setSent(false); setTitle(""); setDetails(""); }}><Plus size={16} aria-hidden /> {t("Bir tane daha")}</button>
              <button type="button" className={s.primary} onClick={onClose}>{t("Tamam")}</button>
            </div>
          </div>
        ) : (
          <form className={s.form} onSubmit={submit} noValidate>
            <fieldset className={s.kinds}>
              <legend>{t("Ne tür bir istek?")}</legend>
              {KINDS.map((value) => (
                <label key={value} className={s.kindCard} data-active={kind === value}>
                  <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
                  <span className={s.kindEmoji} aria-hidden>{KIND_META[value].emoji}</span>
                  <b>{t(KIND_META[value].label)}</b>
                  <small>{t(KIND_META[value].hint)}</small>
                </label>
              ))}
            </fieldset>

            <label className={s.field}>
              <span>{kind === "bug" ? t("Ne çalışmıyor?") : t("Kısaca ne olsun?")}</span>
              <input ref={firstRef} value={title} maxLength={TITLE_MAX} onChange={(event) => setTitle(event.target.value)}
                placeholder={kind === "bug" ? t("Örn. Takvimde randevu sürüklenmiyor") : t("Örn. Müşterilere doğum günü mesajı gitsin")} required />
              <small className={s.counter}>{title.length}/{TITLE_MAX}</small>
            </label>

            {similar.length ? (
              <div className={s.similar} aria-live="polite">
                <b><Sparkles size={14} aria-hidden /> {t("Benzer istekler var, oy vermek daha hızlı:")}</b>
                <ul>
                  {similar.map((item) => {
                    const state = voteState(item);
                    return (
                      <li key={item.id}>
                        <span>{item.title}</span>
                        <button type="button" className={s.miniVote} data-voted={state.voted} aria-pressed={state.voted} onClick={() => void onVote(item)}>
                          {state.voted ? <Check size={13} aria-hidden /> : <ArrowUp size={13} aria-hidden />} {state.votes}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <label className={s.field}>
              <span>{t("Ayrıntı")} <em>{t("isteğe bağlı")}</em></span>
              <textarea value={details} maxLength={DETAILS_MAX} rows={4} onChange={(event) => setDetails(event.target.value)}
                placeholder={kind === "bug" ? t("Hangi sayfada, ne yaptığında oldu? Telefon mu bilgisayar mı?") : t("Neden önemli, nasıl kullanırdın? Ne kadar ayrıntı, o kadar iyi.")} />
              <small className={s.counter}>{details.length}/{DETAILS_MAX}</small>
            </label>

            {!signedIn ? (
              <div className={s.row}>
                <label className={s.field}>
                  <span>{t("Adın")}</span>
                  <input value={name} maxLength={60} autoComplete="given-name" onChange={(event) => setName(event.target.value)} placeholder={t("Örn. Ayşe")} />
                </label>
                <label className={s.field}>
                  <span>{t("Telefon veya e-posta")} <em>{t("isteğe bağlı")}</em></span>
                  <input value={contact} maxLength={120} autoComplete="email" onChange={(event) => setContact(event.target.value)} placeholder={t("Sana dönmemiz için")} />
                </label>
              </div>
            ) : null}
            <input className={s.honeypot} tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(event) => setWebsite(event.target.value)} name="website" />

            <p className={s.privacy}><Lock size={13} aria-hidden /> {t("Panoda yalnız adının ilk hali görünür (ör. Ayşe Y.). İletişim bilgin yalnız ekibimizde kalır.")}</p>

            <footer className={s.dialogFoot}>
              <button type="button" className={s.ghost} onClick={onClose}>{t("Vazgeç")}</button>
              <button type="submit" className={s.primary} disabled={sending || !titleOk}>
                {sending ? <LoaderCircle size={17} className={s.spin} aria-hidden /> : <Send size={16} aria-hidden />} {t("Gönder")}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}><Lightbulb size={26} aria-hidden /></div>
      <b>{title}</b>
      <p>{text}</p>
      {action}
    </div>
  );
}

function SkeletonCards() {
  return <div className={s.list}>{[0, 1, 2].map((index) => <div key={index} className={s.skeleton} style={{ height: 112 }} />)}</div>;
}
