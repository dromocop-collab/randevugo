"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { ArrowRight, BellRing, Bot, CalendarDays, Download, RefreshCw, Send, ShieldCheck, Sparkles, TrendingUp, UsersRound } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { getDb } from "@/lib/firebase/firestore";

type StoreStats = {
  appointments: number; today: number; upcoming: number; pending: number; completed: number; cancelled: number; noShow: number;
  revenue: number; monthRevenue: number; customers: number; returningCustomers: number; services: number; activeServices: number;
  staff: number; activeStaff: number; waitlist: number; reviews: number; rating: number; healthySources: number; updatedAt: Date;
  topService: string; topStaff: string;
};
type Action = { label: string; href?: string; report?: boolean };
type Message = { id: string; role: "assistant" | "user"; body: string; actions?: Action[]; time: Date };

const prompts = ["Bugün beni ne bekliyor?", "İşletmemi analiz et", "Gelir raporu", "Müşteri kaybı riski", "Ekip performansı", "Büyüme önerisi", "Yönetim raporu hazırla"];
const welcome = (): Message => ({ id: "welcome", role: "assistant", body: "Merhaba! Ben işletme asistanınızım. Seçili mağazanızın randevu, gelir, müşteri, ekip, hizmet ve bekleme listesi verilerini analiz edip size uygulanabilir öneriler sunabilirim.", time: new Date() });

export function BusinessAssistant() {
  const { businessId, businesses, access } = useBusiness();
  const business = businesses.find((item) => item.id === businessId) ?? businesses[0];
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcome()]);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!businessId || access?.role === "staff") return;
    setLoading(true);
    const results = await Promise.allSettled([
      listAppointments(businessId), listCustomers(businessId), listServices(businessId), listStaff(businessId),
      getDocs(query(collection(getDb(), "businesses", businessId, "waitlist"))),
      getDocs(query(collection(getDb(), "businesses", businessId, "reviews"))),
    ]);
    const appointments = results[0].status === "fulfilled" ? results[0].value : [];
    const customers = results[1].status === "fulfilled" ? results[1].value : [];
    const services = results[2].status === "fulfilled" ? results[2].value : [];
    const staff = results[3].status === "fulfilled" ? results[3].value : [];
    const waitlist = results[4].status === "fulfilled" ? results[4].value.docs : [];
    const reviews = results[5].status === "fulfilled" ? results[5].value.docs : [];
    const now = new Date(), dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()), dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed = appointments.filter((item) => item.status === "completed");
    const frequency = (key: "serviceName" | "staffName") => {
      const counts = new Map<string, number>();
      completed.forEach((item) => { const name = item[key] || "Belirtilmemiş"; counts.set(name, (counts.get(name) ?? 0) + 1); });
      return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Henüz veri yok";
    };
    setStats({
      appointments: appointments.length,
      today: appointments.filter((item) => { const date = new Date(item.startAt); return date >= dayStart && date < dayEnd && !["cancelled", "no_show"].includes(item.status); }).length,
      upcoming: appointments.filter((item) => new Date(item.startAt) >= now && ["pending", "confirmed"].includes(item.status)).length,
      pending: appointments.filter((item) => item.status === "pending").length,
      completed: completed.length, cancelled: appointments.filter((item) => item.status === "cancelled").length, noShow: appointments.filter((item) => item.status === "no_show").length,
      revenue: completed.reduce((sum, item) => sum + (item.servicePrice ?? 0), 0),
      monthRevenue: completed.filter((item) => new Date(item.startAt) >= monthStart).reduce((sum, item) => sum + (item.servicePrice ?? 0), 0),
      customers: customers.length, returningCustomers: customers.filter((item) => item.completedAppointments > 1).length,
      services: services.length, activeServices: services.filter((item) => item.isActive).length,
      staff: staff.length, activeStaff: staff.filter((item) => item.isActive && !item.archivedAt).length,
      waitlist: waitlist.filter((item) => ["waiting", "contacted"].includes(String(item.data().status ?? "waiting"))).length,
      reviews: reviews.length,
      rating: reviews.length ? reviews.reduce((sum, item) => sum + Number(item.data().rating ?? 0), 0) / reviews.length : 0,
      healthySources: results.filter((item) => item.status === "fulfilled").length, updatedAt: new Date(), topService: frequency("serviceName"), topStaff: frequency("staffName"),
    });
    setLoading(false);
  }, [access?.role, businessId]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);
  useEffect(() => { queueMicrotask(() => { setMessages([welcome()]); }); }, [businessId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  const score = useMemo(() => {
    if (!stats) return 0;
    const outcomes = stats.completed + stats.cancelled + stats.noShow;
    const quality = outcomes ? stats.completed / outcomes : 1;
    const setup = [stats.activeServices > 0, stats.activeStaff > 0, stats.customers > 0, stats.reviews > 0].filter(Boolean).length / 4;
    return Math.round(quality * 55 + setup * 30 + stats.healthySources / 6 * 15);
  }, [stats]);

  function answer(raw: string): Omit<Message, "id" | "role" | "time"> {
    if (!stats) return { body: "Mağaza verileri hazırlanıyor. Birkaç saniye sonra tekrar sorun." };
    const text = raw.toLocaleLowerCase("tr-TR"), outcomes = stats.completed + stats.cancelled + stats.noShow;
    const lossRate = outcomes ? (stats.cancelled + stats.noShow) / outcomes * 100 : 0;
    const returnRate = stats.customers ? stats.returningCustomers / stats.customers * 100 : 0;
    if (/bugün|bekliyor|günlük|öncelik/.test(text)) return { body: `Bugün ${stats.today} randevunuz var. ${stats.pending} randevu onay, ${stats.waitlist} bekleme listesi talebi aksiyon bekliyor. ${stats.pending ? "Önce bekleyen randevuları doğrulamanızı" : stats.waitlist ? "Bekleme listesindeki müşterilere ulaşmanızı" : "takvim boşluklarını büyüme kampanyasıyla değerlendirmenizi"} öneririm.`, actions: [{ label: "Randevuları aç", href: "/dashboard/randevular" }, { label: "Bekleme listesi", href: "/dashboard/bekleme-listesi" }] };
    if (/gelir|kazanç|ciro|para/.test(text)) return { body: `Tamamlanan randevulardan kaydedilen toplam gelir ${stats.revenue.toLocaleString("tr-TR")} ₺, bu ay ${stats.monthRevenue.toLocaleString("tr-TR")} ₺. En çok işlem gören hizmetiniz “${stats.topService}”. Fiyat ve hizmet kırılımını büyüme analitiğinde karşılaştırabilirsiniz.`, actions: [{ label: "Büyüme analitiği", href: "/dashboard/analitik" }] };
    if (/müşteri|kayıp|sadakat|geri/.test(text)) return { body: `${stats.customers} müşterinin ${stats.returningCustomers} tanesi tekrar gelmiş; geri dönüş oranı %${returnRate.toFixed(1)}. Randevu sorun oranı %${lossRate.toFixed(1)}. ${returnRate < 30 ? "Uzun süredir gelmeyen müşteriler için geri kazanım akışı başlatın." : "Sadakat tabanınız iyi; en değerli müşterilere özel teklif düşünebilirsiniz."}`, actions: [{ label: "Müşterileri aç", href: "/dashboard/musteriler" }, { label: "Büyüme merkezi", href: "/dashboard/buyume" }] };
    if (/ekip|çalışan|personel|performans/.test(text)) return { body: `${stats.activeStaff}/${stats.staff} çalışan aktif. Tamamlanan randevu adedine göre öne çıkan ekip üyesi “${stats.topStaff}”. Branş, hizmet ataması ve çalışma saatlerini kontrol ederek boş kapasiteyi azaltabilirsiniz.`, actions: [{ label: "Çalışanları yönet", href: "/dashboard/calisanlar" }, { label: "Çalışma saatleri", href: "/dashboard/calisma-saatleri" }] };
    if (/hizmet|fiyat|kategori/.test(text)) return { body: `${stats.activeServices}/${stats.services} hizmetiniz aktif. En çok tercih edilen hizmet “${stats.topService}”. Pasif, fiyatı eksik veya personele atanmamış hizmetleri hizmet yönetiminden tamamlayın.`, actions: [{ label: "Hizmetleri yönet", href: "/dashboard/hizmetler" }] };
    if (/büyü|öner|geliştir|kampanya/.test(text)) return { body: `En güçlü büyüme fırsatınız: ${stats.waitlist ? `${stats.waitlist} sıcak bekleme listesi talebini randevuya çevirmek` : returnRate < 30 ? "eski müşterileri geri kazanmak" : "en popüler hizmetiniz için boş saat kampanyası oluşturmak"}. İkinci adım olarak %${lossRate.toFixed(1)} olan iptal/no-show oranını takip edin.`, actions: [{ label: "Büyüme merkezini aç", href: "/dashboard/buyume" }, { label: "Bekleme listesi", href: "/dashboard/bekleme-listesi" }] };
    if (/yorum|puan|itibar/.test(text)) return { body: `${stats.reviews} değerlendirmede ortalama puanınız ${stats.rating ? stats.rating.toFixed(1) : "henüz oluşmadı"}. Tamamlanan randevulardan sonra yorum istemek mağaza görünürlüğünü güçlendirir.`, actions: [{ label: "Yorumları aç", href: "/dashboard/yorumlar" }] };
    if (/rapor|indir|özet|analiz/.test(text)) return { body: `${business?.name ?? "İşletmeniz"} için ${stats.updatedAt.toLocaleString("tr-TR")} anlık yönetim raporu hazır. Operasyon puanı ${score}/100; raporda randevu, gelir, müşteri, ekip, hizmet ve itibar göstergeleri bulunuyor.`, actions: [{ label: "Raporu indir", report: true }, { label: "Analitiği aç", href: "/dashboard/analitik" }] };
    return { body: `İşletme operasyon puanınız ${score}/100. Bana bugün, randevular, gelir, müşteriler, ekip, hizmetler, yorumlar, büyüme veya yönetim raporu hakkında soru sorabilirsiniz.`, actions: [{ label: "Genel bakış", href: "/dashboard" }] };
  }

  function send(raw = input) {
    const clean = raw.trim(); if (!clean || thinking) return;
    setInput(""); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", body: clean, time: new Date() }]); setThinking(true);
    window.setTimeout(() => { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", time: new Date(), ...answer(clean) }]); setThinking(false); }, 420);
  }

  function exportReport() {
    if (!stats) return;
    const body = `# ${business?.name ?? "İşletme"} Yönetim Raporu\n\nTarih: ${stats.updatedAt.toLocaleString("tr-TR")}\nOperasyon puanı: ${score}/100\n\n## Randevu\n- Bugün: ${stats.today}\n- Yaklaşan: ${stats.upcoming}\n- Tamamlanan: ${stats.completed}\n- İptal: ${stats.cancelled}\n- Gelmedi: ${stats.noShow}\n- Bekleme listesi: ${stats.waitlist}\n\n## Finans ve müşteri\n- Bu ay gelir: ${stats.monthRevenue} ₺\n- Toplam kayıtlı gelir: ${stats.revenue} ₺\n- Müşteri: ${stats.customers}\n- Tekrar gelen: ${stats.returningCustomers}\n\n## Operasyon\n- Aktif hizmet: ${stats.activeServices}/${stats.services}\n- Aktif çalışan: ${stats.activeStaff}/${stats.staff}\n- En popüler hizmet: ${stats.topService}\n- Öne çıkan çalışan: ${stats.topStaff}\n- Ortalama puan: ${stats.rating.toFixed(1)}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" })); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${(business?.slug || "isletme")}-yonetim-raporu-${new Date().toISOString().slice(0, 10)}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  if (access?.role === "staff") return <section className="business-assistant-denied"><ShieldCheck size={30}/><h1>İşletme asistanı yönetici hesabına özeldir.</h1><p>Çalışan hesabınız kendi takvim ve randevularıyla sınırlandırılmıştır.</p><Link href="/dashboard/takvim">Takvimime dön</Link></section>;

  return <main className="admin-assistant-page business-assistant-page">
    <section className="admin-assistant-hero"><div><span><Sparkles size={15}/> İŞLETME ZEKÂ MERKEZİ</span><h2>İşletmeni sorarak<br/>yönet.</h2><p>{business?.name ?? "Mağazanız"} için randevudan gelire, ekipten müşteri sadakatine canlı operasyon asistanı.</p></div><aside><i className={loading ? "is-loading" : ""}><Bot size={30}/></i><div><small>MAĞAZA ASİSTANI</small><b>{loading ? "Analiz hazırlanıyor" : "Canlı ve hazır"}</b><span>{stats ? `${stats.healthySources}/6 veri kaynağı bağlı` : "Güvenli bağlantı kuruluyor"}</span></div><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button></aside></section>
    <section className="admin-assistant-layout"><div className="admin-assistant-chat"><header><div><Bot size={20}/><span><b>{business?.name ?? "İşletme"} Asistanı</b><small>Size özel operasyon yardımcısı</small></span></div><i><span/> ÇEVRİMİÇİ</i></header><div className="admin-assistant-messages" aria-live="polite">{messages.map((message) => <article key={message.id} className={message.role}>{message.role === "assistant" && <span className="message-avatar"><Bot size={16}/></span>}<div><p>{message.body}</p>{message.actions && <nav>{message.actions.map((action) => action.href ? <Link key={action.label} href={action.href}>{action.label}<ArrowRight size={13}/></Link> : <button key={action.label} onClick={exportReport}><Download size={13}/>{action.label}</button>)}</nav>}<time>{message.time.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</time></div></article>)}{thinking && <article className="assistant"><span className="message-avatar"><Bot size={16}/></span><div className="assistant-thinking"><i/><i/><i/></div></article>}<div ref={endRef}/></div><div className="admin-assistant-prompts">{prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)} disabled={loading || thinking}>{prompt}</button>)}</div><form onSubmit={(event: FormEvent) => { event.preventDefault(); send(); }}><label><Sparkles size={17}/><textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="İşletmeniz hakkında sorun veya komut verin…" disabled={loading}/></label><button disabled={loading || thinking || !input.trim()}><Send size={19}/></button></form><footer><ShieldCheck size={13}/> Veriler yalnız seçili mağazanızdan okunur; kritik değişiklikler yönetim ekranında onaylanır.</footer></div>
    <aside className="admin-assistant-context"><header><span>CANLI MAĞAZA</span><b>{business?.name ?? "İşletme özeti"}</b><small>{stats?.updatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) ?? "—"} itibarıyla</small></header><div className="assistant-health"><span style={{ "--score": `${score}%` } as React.CSSProperties}><b>{score}</b><small>/100</small></span><div><b>Operasyon puanı</b><small>{score >= 85 ? "İşletmeniz güçlü durumda" : score >= 65 ? "Büyüme fırsatları var" : "Kurulum ve kalite geliştirilmeli"}</small></div></div><div className="assistant-context-grid"><Metric icon={CalendarDays} label="Bugün" value={stats?.today}/><Metric icon={TrendingUp} label="Bu ay gelir" value={stats ? `${stats.monthRevenue.toLocaleString("tr-TR")} ₺` : undefined}/><Metric icon={UsersRound} label="Müşteri" value={stats?.customers}/><Metric icon={BellRing} label="Bekleme" value={stats?.waitlist}/></div><div className="assistant-attention"><b><Sparkles size={15}/> Akıllı özet</b><p>Popüler hizmet <strong>{stats?.topService ?? "—"}</strong></p><p>Öne çıkan ekip <strong>{stats?.topStaff ?? "—"}</strong></p><p>Yaklaşan randevu <strong>{stats?.upcoming ?? 0}</strong></p><p>Ortalama puan <strong>{stats?.rating ? stats.rating.toFixed(1) : "—"}</strong></p></div><button className="assistant-report-button" onClick={exportReport} disabled={!stats}><Download size={16}/> Yönetim raporunu indir</button></aside></section>
  </main>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value?: string | number }) { return <div><span><Icon size={16}/></span><b>{value ?? "—"}</b><small>{label}</small></div>; }
