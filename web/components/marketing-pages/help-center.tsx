"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, BookOpenCheck, CalendarCheck, ChartNoAxesCombined, ChevronDown, CircleHelp, Clock3, CreditCard, Heart, LifeBuoy, Mail, MessageCircleMore, MessagesSquare, Phone, Search, ShieldCheck, Store, UsersRound, WalletCards, X, type LucideIcon } from "lucide-react";
import { SupportRequestModal } from "@/components/support/support-request-modal";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { businessTopics, customerTopics, helpSlug, normalizeQuery, quickStart, type HelpArticle, type HelpIconName, type HelpMode, type HelpTopic } from "./help-content";
import { cx } from "./ui";
import mp from "./mp.module.css";
import s from "./help-center.module.css";

const ICONS: Record<HelpIconName, LucideIcon> = {
  search: Search, calendar: CalendarCheck, clock: Clock3, heart: Heart, wallet: WalletCards, shield: ShieldCheck,
  store: Store, users: UsersRound, messages: MessagesSquare, card: CreditCard, chart: ChartNoAxesCombined,
};

const CHANNELS = [
  { id: "whatsapp", icon: MessageCircleMore, label: "WhatsApp", value: "Hızlı mesaj", href: "https://wa.me/905304788298", external: true },
  { id: "email", icon: Mail, label: "E-posta", value: "info@seninrandevun.com", href: "mailto:info@seninrandevun.com", external: false },
  { id: "phone", icon: Phone, label: "Telefon", value: "0530 478 82 98", href: "tel:+905304788298", external: false },
];

type Entry = { topic: HelpTopic; article: HelpArticle; slug: string; haystack: string };

function buildIndex(topics: HelpTopic[]): Entry[] {
  return topics.flatMap((topic) => topic.articles.map((article) => ({
    topic, article, slug: helpSlug(article.title),
    haystack: normalizeQuery(`${topic.title} ${topic.description} ${article.title} ${article.answer.join(" ")}`),
  })));
}

export function HelpCenter({ mode }: { mode: HelpMode }) {
  const business = mode === "business";
  const topics = business ? businessTopics : customerTopics;
  const index = useMemo(() => buildIndex(topics), [topics]);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [category, setCategory] = useState<string | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const searchId = useId();

  const tokens = normalizeQuery(deferred).split(/\s+/).filter(Boolean);
  const results = index.filter((entry) => (!category || entry.topic.id === category) && tokens.every((token) => entry.haystack.includes(token)));
  const searching = tokens.length > 0;

  // #makale-baglantisi ile gelindiğinde ilgili cevabı aç ve göster.
  useEffect(() => {
    const open = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash || !index.some((entry) => entry.slug === hash)) return;
      setQuery(""); setCategory(null); setOpenSlug(hash);
      window.requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "center" }));
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [index]);

  const popular = business ? ["Mağazayı yayına", "Çalışan", "Abonelik", "Hatırlatma"] : ["İptal", "Randevu", "Şifre", "Ödeme"];
  const activeTopic = topics.find((topic) => topic.id === category);

  return (
    <main className={cx(mp.page, s.page)}>
      <section className={mp.hero}>
        <div className={mp.heroGrid} aria-hidden="true" />
        <div className={cx(mp.shell, s.heroInner)}>
          <div className={s.heroCopy}>
            <span className={cx(mp.eyebrow, mp.rise)}><LifeBuoy size={13} aria-hidden="true" /> {business ? "İşletme yardım merkezi" : "Müşteri yardım merkezi"}</span>
            <h1 className={cx(mp.title, mp.rise)} style={{ "--i": 1 } as CSSProperties}>{business ? <>İşletmeniz için<br /><em>net cevaplar.</em></> : <>Randevunuz için<br /><em>yanınızdayız.</em></>}</h1>
            <p className={cx(mp.lead, mp.rise)} style={{ "--i": 2 } as CSSProperties}>{business ? "Kurulumdan günlük operasyona kadar ekibinizin ihtiyaç duyduğu cevaplar tek yerde." : "Keşiften randevu yönetimine kadar tüm sorularınızın sade ve güvenilir cevapları."}</p>
            <form role="search" className={cx(s.search, mp.rise)} style={{ "--i": 3 } as CSSProperties} onSubmit={(event) => { event.preventDefault(); document.getElementById("yardim-sonuclar")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <label htmlFor={searchId} className={mp.srOnly}>Yardım konularında ara</label>
              <Search size={20} aria-hidden="true" />
              <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={business ? "Takvim, çalışan, abonelik…" : "İptal, randevu, şifre…"} autoComplete="off" enterKeyHint="search" />
              {query && <button type="button" className={s.clear} onClick={() => setQuery("")} aria-label="Aramayı temizle"><X size={16} /></button>}
            </form>
            <div className={s.popular}>
              <span>Popüler:</span>
              {popular.map((item) => <button type="button" key={item} onClick={() => { setQuery(item); setCategory(null); }}>{item}</button>)}
            </div>
          </div>
          <div className={s.heroMascot} aria-hidden="true">
            <RoviMascot size={170} mood={searching ? "thinking" : "wave"} alt="" priority />
            <div className={s.bubble}><b>Rovi</b><span>{searching ? `${results.length} cevap buldum` : business ? "Önce mağaza kurulumuna bak!" : "Ne arıyorsun? Yaz, bulalım."}</span></div>
          </div>
        </div>
      </section>

      <div className={mp.shell}>
        <section className={s.cats} aria-label="Konular">
          <ul>
            {topics.map((topic, i) => {
              const Icon = ICONS[topic.icon];
              const active = category === topic.id;
              return (
                <li key={topic.id} className={mp.rise} style={{ "--i": i } as CSSProperties}>
                  <button type="button" className={s.cat} aria-pressed={active} onClick={() => { setCategory(active ? null : topic.id); setOpenSlug(null); }}>
                    <span className={s.catIcon}><Icon size={20} aria-hidden="true" /></span>
                    <b>{topic.title}</b>
                    <small>{topic.description}</small>
                    <i>{topic.articles.length} makale</i>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="yardim-sonuclar" className={cx(mp.section, s.results)} aria-labelledby="sonuc-baslik">
          <div className={s.resultsHead}>
            <div>
              <span className={mp.kicker}><BookOpenCheck size={13} aria-hidden="true" /> {activeTopic ? activeTopic.title : "Sık sorulanlar"}</span>
              <h2 className={mp.h2} id="sonuc-baslik">{searching ? `“${deferred.trim()}” için ${results.length} sonuç` : activeTopic ? activeTopic.description : "En çok sorulan sorular"}</h2>
            </div>
            {(searching || category) && <button type="button" className={cx(mp.btn, mp.btnOutline, s.reset)} onClick={() => { setQuery(""); setCategory(null); }}>Tümünü göster</button>}
          </div>
          <p className={mp.srOnly} aria-live="polite">{searching ? `${results.length} sonuç bulundu` : ""}</p>

          {results.length ? (
            <ul className={s.faq}>
              {results.map(({ topic, article, slug }) => {
                const open = openSlug === slug;
                const panelId = `${slug}-cevap`;
                return (
                  <li key={slug} id={slug} className={cx(s.item, open && s.itemOpen)}>
                    <h3>
                      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpenSlug(open ? null : slug)}>
                        <span className={s.qTopic}>{topic.title}<span className={mp.srOnly}>: </span></span>
                        <span className={s.qTitle}>{article.title}</span>
                        <ChevronDown size={18} aria-hidden="true" className={s.chev} />
                      </button>
                    </h3>
                    <div id={panelId} className={s.panel} role="region" aria-label={article.title} hidden={!open}>
                      {article.answer.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      {article.links && <div className={s.links}>{article.links.map((link) => <Link key={link.href} href={link.href}>{link.label} <ArrowRight size={13} aria-hidden="true" /></Link>)}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={s.empty}>
              <CircleHelp size={34} aria-hidden="true" />
              <h3>Bu aramayla eşleşen bir cevap bulamadık.</h3>
              <p>Daha kısa bir ifade deneyin ya da aşağıdan bize doğrudan yazın.</p>
              <button type="button" className={cx(mp.btn, mp.btnOutline)} onClick={() => { setQuery(""); setCategory(null); }}>Tüm konuları göster</button>
            </div>
          )}
        </section>

        <section className={cx(mp.section, s.steps)} aria-labelledby="baslangic-baslik">
          <div className={cx(s.stepsCard, mp.reveal)}>
            <div>
              <span className={mp.kicker}>Hızlı başlangıç</span>
              <h2 className={mp.h2} id="baslangic-baslik">{business ? "Çalışma alanınızı üç adımda hazırlayın." : "İlk randevunuzu üç adımda oluşturun."}</h2>
            </div>
            <ol>
              {quickStart[mode].map(([no, text]) => <li key={no}><b>{no}</b><span>{text}</span></li>)}
            </ol>
            <Link href={business ? "/isletmeler/kayit" : "/kesfet"} className={cx(mp.btn, mp.btnGreen)}>{business ? "İlk ay ücretsiz başla" : "İşletme keşfet"} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>

        <section className={cx(mp.section, s.contact)} aria-labelledby="destek-baslik">
          <div className={cx(s.contactCard, mp.reveal)}>
            <div className={s.contactCopy}>
              <span className={s.contactKicker}>Destek ekibi</span>
              <h2 id="destek-baslik">Aradığınız cevabı bulamadınız mı?</h2>
              <p>{business ? "Giriş yapmadan mesaj bırakın; ekibimiz verdiğiniz telefon üzerinden size dönsün. Panel kullanıcıları Destek bölümünden de talep açabilir." : "Randevu ve hesap sorularınız için mesaj bırakın; ekibimiz verdiğiniz telefon üzerinden size dönsün."}</p>
              <SupportRequestModal audience={business ? "business" : "customer"} triggerLabel={business ? "Destek talebi oluştur" : "Bize mesaj gönder"} triggerClassName={s.supportBtn} />
            </div>
            <ul className={s.channels}>
              {CHANNELS.map(({ id, icon: Icon, label, value, href, external }) => (
                <li key={id}>
                  <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    <span><Icon size={18} aria-hidden="true" /></span>
                    <div><small>{label}</small><b>{value}</b></div>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className={s.switch}>
            {business ? <>Randevu alan bir müşteri misiniz? <Link href="/yardim-merkezi">Müşteri yardım merkezi</Link></> : <>İşletme sahibi misiniz? <Link href="/isletmeler/yardim">İşletme yardım merkezi</Link></>}
            {" · "}<Link href="/iletisim">Tüm iletişim kanalları</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
