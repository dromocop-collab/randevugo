"use client";

import { getFirebaseApp } from "@/lib/firebase/client";
import { getAuth } from "firebase/auth";
import Link from "@/i18n/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { Activity, ArrowRight, BellRing, CalendarDays, CheckCircle2, Copy, Download, RefreshCw, Send, ShieldCheck, Sparkles, Star, Trash2, TrendingUp, UserRoundSearch, UsersRound, Zap } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { listAppointments, updateAppointmentStatus } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import { listServices, updateService } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { updateStaff } from "@/features/staff/staff-repository";
import { askSmartAssistant, clearSmartAssistantHistory, getSmartAssistantHistory } from "@/features/assistant/assistant-repository";
import { getDb } from "@/lib/firebase/firestore";
import type { Staff } from "@/types/staff";
import type { Service } from "@/types/service";
import type { Appointment, AppointmentStatus } from "@/types/appointments";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk, type TFunction } from "@/i18n/config";

/** Denetim kaydını yazan kullanıcı (kural actorUid == auth.uid şartı arar). */
function currentActorUid(): string {
  return getAuth(getFirebaseApp()).currentUser?.uid ?? "";
}


type StoreStats = {
  appointments: number; today: number; upcoming: number; pending: number; completed: number; cancelled: number; noShow: number;
  revenue: number; monthRevenue: number; customers: number; returningCustomers: number; services: number; activeServices: number;
  staff: number; activeStaff: number; waitlist: number; reviews: number; rating: number; healthySources: number; updatedAt: Date;
  topService: string; topStaff: string;
};
type StaffPatch = Partial<Pick<Staff, "position" | "phone" | "email" | "commissionRate" | "expertiseLevel">>;
type ServicePatch = Partial<Pick<Service, "price" | "durationMinutes" | "isActive" | "isBookableOnline">>;
type WaitlistRow = { id: string; customerName: string; status: string };
type Action = { label: string; href?: string; report?: boolean; staffUpdate?: { staffId: string; staffName: string; patch: StaffPatch; summary: string }; serviceUpdate?: { serviceId: string; serviceName: string; patch: ServicePatch; summary: string }; appointmentUpdate?: { appointmentId: string; customerName: string; status: AppointmentStatus; summary: string }; waitlistUpdate?: { itemId: string; customerName: string; status: string; summary: string } };
type Message = { id: string; role: "assistant" | "user"; body: string; actions?: Action[]; time: Date };
type AssistantConnection = "ready" | "thinking" | "fallback";

const prompts = [
  { label: tk("Bugünü planla"), prompt: tk("Bugün beni ne bekliyor?"), icon: CalendarDays },
  { label: tk("İşletmeyi analiz et"), prompt: tk("İşletmemi analiz et"), icon: Sparkles },
  { label: tk("Geliri incele"), prompt: tk("Gelir raporu"), icon: TrendingUp },
  { label: tk("Riskli müşteriler"), prompt: tk("Müşteri kaybı riski"), icon: UserRoundSearch },
  { label: tk("Ekibi değerlendir"), prompt: tk("Ekip performansı"), icon: UsersRound },
  { label: tk("Büyüme fırsatı"), prompt: tk("Büyüme önerisi"), icon: Zap },
  { label: tk("Rapor hazırla"), prompt: tk("Yönetim raporu hazırla"), icon: Download },
];
const welcome = (t: TFunction, businessName?: string): Message => ({ id: "welcome", role: "assistant", body: businessName
  ? t("Merhaba, ben Rovi! {business} için randevu, gelir, müşteri, ekip, hizmet ve bekleme listesi verilerini birlikte okuyup uygulanabilir kararlar alabiliriz. Bugünün önceliğini çıkarmamı ister misiniz?", { business: businessName })
  : t("Merhaba, ben Rovi! Randevu, gelir, müşteri, ekip, hizmet ve bekleme listesi verilerini birlikte okuyup uygulanabilir kararlar alabiliriz. Bugünün önceliğini çıkarmamı ister misiniz?"), time: new Date() });

export function BusinessAssistant() {
  const t = useT();
  const locale = useIntlLocale();
  const { businessId, businesses, access } = useBusiness();
  const business = businesses.find((item) => item.id === businessId) ?? businesses[0];
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => [welcome(t)]);
  const [copiedId, setCopiedId] = useState("");
  const [staffRows, setStaffRows] = useState<Staff[]>([]);
  const [serviceRows, setServiceRows] = useState<Service[]>([]);
  const [appointmentRows, setAppointmentRows] = useState<Appointment[]>([]);
  const [waitlistRows, setWaitlistRows] = useState<WaitlistRow[]>([]);
  const [runningAction, setRunningAction] = useState("");
  const [connection, setConnection] = useState<AssistantConnection>("ready");
  const messagesRef = useRef<HTMLDivElement>(null);
  const lastStaffId = useRef("");
  const lastServiceId = useRef("");
  const lastAppointmentId = useRef("");
  const lastWaitlistId = useRef("");

  const load = useCallback(async () => {
    if (!businessId || access?.role === "staff") return;
    setLoading(true);
    const results = await Promise.allSettled([
      listAppointments(businessId), listCustomers(businessId), listServices(businessId), listStaff(businessId),
      getDocs(query(collection(getDb(), "businesses", businessId, "waitlist"))),
      getDocs(query(collection(getDb(), "businesses", businessId, "reviews"))),
    ]);
    const appointments = results[0].status === "fulfilled" ? results[0].value : [];
    setAppointmentRows(appointments);
    const customers = results[1].status === "fulfilled" ? results[1].value : [];
    const services = results[2].status === "fulfilled" ? results[2].value : [];
    const staff = results[3].status === "fulfilled" ? results[3].value : [];
    setStaffRows(staff);
    setServiceRows(services);
    const waitlist = results[4].status === "fulfilled" ? results[4].value.docs : [];
    setWaitlistRows(waitlist.map((item) => ({ id: item.id, customerName: String(item.data().customerName ?? t("Müşteri")), status: String(item.data().status ?? "waiting") })));
    const reviews = results[5].status === "fulfilled" ? results[5].value.docs : [];
    const now = new Date(), dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()), dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed = appointments.filter((item) => item.status === "completed");
    const frequency = (key: "serviceName" | "staffName") => {
      const counts = new Map<string, number>();
      completed.forEach((item) => { const name = item[key] || t("Belirtilmemiş"); counts.set(name, (counts.get(name) ?? 0) + 1); });
      return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? t("Henüz veri yok");
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
  }, [access?.role, businessId, t]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setMessages([welcome(t, business?.name)]); });
    if (!businessId || access?.role === "staff") return () => { cancelled = true; };
    void getSmartAssistantHistory("business", businessId).then((history) => {
      if (cancelled || history.length === 0) return;
      setMessages(history.map((item) => {
        const parsed = new Date(item.createdAt);
        return { id: item.id, role: item.role, body: item.body, time: Number.isNaN(parsed.getTime()) ? new Date() : parsed };
      }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [access?.role, business?.name, businessId, t]);
  useEffect(() => {
    const viewport = messagesRef.current;
    if (!viewport) return;
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: messages.length > 1 ? "smooth" : "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, thinking]);

  const score = useMemo(() => {
    if (!stats) return 0;
    const outcomes = stats.completed + stats.cancelled + stats.noShow;
    const quality = outcomes ? stats.completed / outcomes : 1;
    const setup = [stats.activeServices > 0, stats.activeStaff > 0, stats.customers > 0, stats.reviews > 0].filter(Boolean).length / 4;
    return Math.round(quality * 55 + setup * 30 + stats.healthySources / 6 * 15);
  }, [stats]);

  function answer(raw: string): Omit<Message, "id" | "role" | "time"> {
    if (!stats) return { body: t("Mağaza verileri hazırlanıyor. Birkaç saniye sonra tekrar sorun.") };
    const text = raw.toLocaleLowerCase("tr-TR"), outcomes = stats.completed + stats.cancelled + stats.noShow;
    const lossRate = outcomes ? (stats.cancelled + stats.noShow) / outcomes * 100 : 0;
    const returnRate = stats.customers ? stats.returningCustomers / stats.customers * 100 : 0;
    if (/^(selam|merhaba|hey|sa|günaydın|iyi akşamlar)[!. ]*$/.test(text)) return { body: t("Merhaba! Ben iyiyim ve {business} için hazırım 🙂 Bugün {today} randevu, {pending} onay ve {waitlist} bekleme listesi talebi görünüyor. Siz nasılsınız, neyi birlikte halledelim?", { business: business?.name ?? t("işletmeniz"), today: stats.today, pending: stats.pending, waitlist: stats.waitlist }) };
    if (/nasılsın|ne haber|naber/.test(text)) return { body: t("Gayet iyiyim, teşekkür ederim 🙂 {business} verilerini de kontrol ettim; operasyon puanı {score}/100. Bugün sizin için randevuları mı, ekibi mi yoksa büyüme fırsatlarını mı ele alalım?", { business: business?.name ?? t("işletmenizin"), score }) };
    if (/teşekkür|sağ ol|eyvallah/.test(text)) return { body: t("Rica ederim, her zaman buradayım 🙂 İsterseniz sıradaki en önemli işi de birlikte belirleyelim.") };

    const directStaff = staffRows.find((item) => text.includes(item.fullName.toLocaleLowerCase("tr-TR")) || text.includes(item.fullName.split(" ")[0]!.toLocaleLowerCase("tr-TR")));
    if (directStaff) lastStaffId.current = directStaff.id;
    const mentionedStaff = directStaff ?? (/onun|bu çalışan|aynı çalışan|az önceki/.test(text) ? staffRows.find((item) => item.id === lastStaffId.current) : undefined);
    if (mentionedStaff && /(güncelle|değiştir|yap|ayarla)/.test(text)) {
      let patch: StaffPatch | null = null; let summary = "";
      if (/pozisyon|ünvan|unvan|görev/.test(text)) {
        const value = raw.match(/(?:pozisyon(?:unu)?|[üu]nvan(?:ını|ini)?|görev(?:ini)?)\s+(.+?)(?:\s+(?:yap|olarak güncelle|olarak değiştir|güncelle|değiştir))?[.!]?$/i)?.[1]?.trim();
        if (value && value.length <= 80) { patch = { position: value }; summary = t("pozisyonu “{value}”", { value }); }
      } else if (/telefon/.test(text)) {
        const value = raw.match(/(?:\+?\d[\d\s()-]{8,}\d)/)?.[0]?.replace(/\s+/g, " ");
        if (value) { patch = { phone: value }; summary = t("telefonu “{value}”", { value }); }
      } else if (/e-?posta|mail/.test(text)) {
        const value = raw.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
        if (value) { patch = { email: value }; summary = t("e-postası “{value}”", { value }); }
      } else if (/komisyon/.test(text)) {
        const value = Number(raw.match(/(?:%\s*)?(\d{1,3})(?:\s*%)/)?.[1] ?? raw.match(/komisyon\D+(\d{1,3})/i)?.[1]);
        if (Number.isFinite(value) && value >= 0 && value <= 100) { patch = { commissionRate: value }; summary = t("komisyon oranı %{value}", { value }); }
      } else if (/uzmanlık|seviye|kıdem/.test(text)) {
        const levels = [{ keys: /junior|başlangıç/, value: "junior" }, { keys: /specialist|uzman/, value: "specialist" }, { keys: /senior|kıdemli/, value: "senior" }, { keys: /trainer|eğitmen/, value: "trainer" }] as const;
        const level = levels.find((item) => item.keys.test(text));
        if (level) { patch = { expertiseLevel: level.value }; summary = t("uzmanlık seviyesi “{value}”", { value: level.value }); }
      }
      if (patch) return { body: t("{name} için değişikliği anladım: {summary} olarak güncellenecek. Yanlış işlem olmaması için uygulamadan önce onayınızı bekliyorum.", { name: mentionedStaff.fullName, summary }), actions: [{ label: t("Değişikliği onayla"), staffUpdate: { staffId: mentionedStaff.id, staffName: mentionedStaff.fullName, patch, summary } }, { label: t("Çalışan profilini aç"), href: "/dashboard/calisanlar" }] };
      return { body: t("{name} adlı çalışanı buldum; fakat hangi alanı hangi değerle değiştireceğinizi net anlayamadım. “{name} pozisyonunu Saç Uzmanı yap”, “komisyonunu %20 yap”, “telefonunu 05… olarak güncelle” veya “uzmanlık seviyesini senior yap” şeklinde yazabilirsiniz.", { name: mentionedStaff.fullName }), actions: [{ label: t("Çalışanları aç"), href: "/dashboard/calisanlar" }] };
    }
    if (/(çalışan|personel).*(güncelle|değiştir)/.test(text) && !mentionedStaff) return { body: t("Güncellenecek çalışanı bulamadım. Adı panelde kayıtlı haliyle yazın; örneğin “Cihat pozisyonunu Yönetici yap”. Değişikliği uygulamadan önce size mutlaka onay göstereceğim."), actions: [{ label: t("Çalışan listesini aç"), href: "/dashboard/calisanlar" }] };
    const directService = serviceRows.find((item) => text.includes(item.name.toLocaleLowerCase("tr-TR")));
    if (directService) lastServiceId.current = directService.id;
    const mentionedService = directService ?? (/onun|bu hizmet|aynı hizmet|az önceki/.test(text) ? serviceRows.find((item) => item.id === lastServiceId.current) : undefined);
    if (mentionedService && /(güncelle|değiştir|yap|ayarla|aç|kapat)/.test(text)) {
      let patch: ServicePatch | null = null; let summary = "";
      if (/fiyat|ücret/.test(text)) {
        const value = Number(raw.match(/(?:fiyat(?:ını|i)?|ücret(?:ini|i)?)\D{0,12}(\d+(?:[.,]\d{1,2})?)/i)?.[1]?.replace(",", "."));
        if (Number.isFinite(value) && value >= 0 && value <= 1_000_000) { patch = { price: value }; summary = t("fiyatı {price} ₺", { price: value.toLocaleString(locale) }); }
      } else if (/süre|dakika/.test(text)) {
        const value = Number(raw.match(/(\d{1,3})\s*(?:dakika|dk)/i)?.[1]);
        if (Number.isFinite(value) && value >= 5 && value <= 720) { patch = { durationMinutes: value }; summary = t("süresi {minutes} dakika", { minutes: value }); }
      } else if (/online/.test(text)) {
        const enabled = !/(kapat|pasif|kaldır)/.test(text); patch = { isBookableOnline: enabled }; summary = enabled ? t("online randevu açık") : t("online randevu kapalı");
      } else if (/aktif|pasif|kapat|aç/.test(text)) {
        const enabled = !/(pasif|kapat)/.test(text); patch = { isActive: enabled }; summary = enabled ? t("aktif") : t("pasif");
      }
      if (patch) return { body: t("{name} hizmeti için değişikliği anladım: {summary} olacak. Kaydetmeden önce onayınızı bekliyorum.", { name: mentionedService.name, summary }), actions: [{ label: t("Hizmet değişikliğini onayla"), serviceUpdate: { serviceId: mentionedService.id, serviceName: mentionedService.name, patch, summary } }, { label: t("Hizmeti incele"), href: "/dashboard/hizmetler" }] };
      return { body: t("{name} hizmetini buldum ancak değişiklik net değil. “Fiyatını 750 TL yap”, “süresini 60 dakika yap” veya “online randevuya kapat” şeklinde yazabilirsiniz.", { name: mentionedService.name }) };
    }
    const appointmentCandidates = appointmentRows.filter((item) => text.includes(item.customerName.toLocaleLowerCase("tr-TR"))).sort((a, b) => Math.abs(new Date(a.startAt).getTime() - Date.now()) - Math.abs(new Date(b.startAt).getTime() - Date.now()));
    const directAppointment = appointmentCandidates[0];
    if (directAppointment) lastAppointmentId.current = directAppointment.id;
    const mentionedAppointment = directAppointment ?? (/onun|bu randevu|aynı randevu|az önceki/.test(text) ? appointmentRows.find((item) => item.id === lastAppointmentId.current) : undefined);
    if (mentionedAppointment && /(onayla|tamamla|tamamlandı|iptal|gelmedi|no.?show)/.test(text)) {
      const status: AppointmentStatus = /iptal/.test(text) ? "cancelled" : /gelmedi|no.?show/.test(text) ? "no_show" : /tamamla|tamamlandı/.test(text) ? "completed" : "confirmed";
      const label = { confirmed: t("onaylandı"), completed: t("tamamlandı"), cancelled: t("iptal edildi"), no_show: t("gelmedi olarak işaretlendi"), pending: t("bekliyor") }[status];
      const date = new Date(mentionedAppointment.startAt).toLocaleString(locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
      return { body: t("{customer} adlı müşterinin {date} tarihli “{service}” kaydı {status} olarak güncellenecek. Onaylıyor musunuz?", { customer: mentionedAppointment.customerName, date, service: mentionedAppointment.serviceName || t("randevu"), status: label }), actions: [{ label: t("Randevu değişikliğini onayla"), appointmentUpdate: { appointmentId: mentionedAppointment.id, customerName: mentionedAppointment.customerName, status, summary: label } }, { label: t("Randevuyu incele"), href: `/dashboard/randevular?appointment=${encodeURIComponent(mentionedAppointment.id)}` }] };
    }
    const directWaitlist = waitlistRows.find((item) => text.includes(item.customerName.toLocaleLowerCase("tr-TR")));
    if (directWaitlist) lastWaitlistId.current = directWaitlist.id;
    const mentionedWaitlist = directWaitlist ?? (/onun|bu talep|aynı talep|az önceki/.test(text) ? waitlistRows.find((item) => item.id === lastWaitlistId.current) : undefined);
    if (mentionedWaitlist && /(ulaşıldı|iletişim|randevuya dönüştü|kapat|tamamla)/.test(text)) {
      const status = /randevuya dönüştü/.test(text) ? "booked" : /kapat|tamamla/.test(text) ? "closed" : "contacted";
      const summary = status === "booked" ? t("randevuya dönüştü") : status === "closed" ? t("kapatıldı") : t("iletişime geçildi");
      return { body: t("{customer} adlı müşterinin bekleme listesi talebi “{status}” yapılacak. Uygulamamı onaylıyor musunuz?", { customer: mentionedWaitlist.customerName, status: summary }), actions: [{ label: t("Talep değişikliğini onayla"), waitlistUpdate: { itemId: mentionedWaitlist.id, customerName: mentionedWaitlist.customerName, status, summary } }, { label: t("Bekleme listesini aç"), href: "/dashboard/bekleme-listesi" }] };
    }
    if (/bugün|bekliyor|günlük|öncelik/.test(text)) return { body: `${t("Bugün {today} randevunuz var. {pending} randevu onay, {waitlist} bekleme listesi talebi aksiyon bekliyor.", { today: stats.today, pending: stats.pending, waitlist: stats.waitlist })} ${stats.pending ? t("Önce bekleyen randevuları doğrulamanızı öneririm.") : stats.waitlist ? t("Bekleme listesindeki müşterilere ulaşmanızı öneririm.") : t("Takvim boşluklarını büyüme kampanyasıyla değerlendirmenizi öneririm.")}`, actions: [{ label: t("Randevuları aç"), href: "/dashboard/randevular" }, { label: t("Bekleme listesi"), href: "/dashboard/bekleme-listesi" }] };
    if (/gelir|kazanç|ciro|para/.test(text)) return { body: t("Tamamlanan randevulardan kaydedilen toplam gelir {total} ₺, bu ay {month} ₺. En çok işlem gören hizmetiniz “{service}”. Fiyat ve hizmet kırılımını büyüme analitiğinde karşılaştırabilirsiniz.", { total: stats.revenue.toLocaleString(locale), month: stats.monthRevenue.toLocaleString(locale), service: stats.topService }), actions: [{ label: t("Büyüme analitiği"), href: "/dashboard/analitik" }] };
    if (/müşteri|kayıp|sadakat|geri/.test(text)) return { body: `${t("{customers} müşterinin {returning} tanesi tekrar gelmiş; geri dönüş oranı %{returnRate}. İptal ve gelmeme oranı %{lossRate}.", { customers: stats.customers, returning: stats.returningCustomers, returnRate: returnRate.toFixed(1), lossRate: lossRate.toFixed(1) })} ${returnRate < 30 ? t("Uzun süredir gelmeyen müşteriler için geri kazanım akışı başlatın.") : t("Sadakat tabanınız iyi; en değerli müşterilere özel teklif düşünebilirsiniz.")}`, actions: [{ label: t("Müşterileri aç"), href: "/dashboard/musteriler" }, { label: t("Analiz & Büyüme"), href: "/dashboard/analitik#growth-actions" }] };
    if (/ekip|çalışan|personel|performans/.test(text)) return { body: t("{active}/{total} çalışan aktif. Tamamlanan randevu adedine göre öne çıkan ekip üyesi “{staff}”. Branş, hizmet ataması ve çalışma saatlerini kontrol ederek boş kapasiteyi azaltabilirsiniz.", { active: stats.activeStaff, total: stats.staff, staff: stats.topStaff }), actions: [{ label: t("Çalışanları yönet"), href: "/dashboard/calisanlar" }, { label: t("Çalışma saatleri"), href: "/dashboard/calisma-saatleri" }] };
    if (/hizmet|fiyat|kategori/.test(text)) return { body: t("{active}/{total} hizmetiniz aktif. En çok tercih edilen hizmet “{service}”. Pasif, fiyatı eksik veya personele atanmamış hizmetleri hizmet yönetiminden tamamlayın.", { active: stats.activeServices, total: stats.services, service: stats.topService }), actions: [{ label: t("Hizmetleri yönet"), href: "/dashboard/hizmetler" }] };
    if (/büyü|öner|geliştir|kampanya/.test(text)) return { body: t("En güçlü büyüme fırsatınız: {opportunity}. İkinci adım olarak %{lossRate} olan iptal/no-show oranını takip edin.", { opportunity: stats.waitlist ? t("{count} sıcak bekleme listesi talebini randevuya çevirmek", { count: stats.waitlist }) : returnRate < 30 ? t("eski müşterileri geri kazanmak") : t("en popüler hizmetiniz için boş saat kampanyası oluşturmak"), lossRate: lossRate.toFixed(1) }), actions: [{ label: t("Analiz & Büyüme'yi aç"), href: "/dashboard/analitik#growth-actions" }, { label: t("Bekleme listesi"), href: "/dashboard/bekleme-listesi" }] };
    if (/yorum|puan|itibar/.test(text)) return { body: `${stats.rating ? t("{count} değerlendirmede ortalama puanınız {rating}.", { count: stats.reviews, rating: stats.rating.toFixed(1) }) : t("{count} değerlendirmede ortalama puanınız henüz oluşmadı.", { count: stats.reviews })} ${t("Tamamlanan randevulardan sonra yorum istemek mağaza görünürlüğünü güçlendirir.")}`, actions: [{ label: t("Yorumları aç"), href: "/dashboard/yorumlar" }] };
    if (/rapor|indir|özet|analiz/.test(text)) return { body: t("{business} için {date} anlık yönetim raporu hazır. Operasyon puanı {score}/100; raporda randevu, gelir, müşteri, ekip, hizmet ve itibar göstergeleri bulunuyor.", { business: business?.name ?? t("İşletmeniz"), date: stats.updatedAt.toLocaleString(locale), score }), actions: [{ label: t("Raporu indir"), report: true }, { label: t("Analitiği aç"), href: "/dashboard/analitik" }] };
    return { body: t("İşletme operasyon puanınız {score}/100. Bana bugün, randevular, gelir, müşteriler, ekip, hizmetler, yorumlar, büyüme veya yönetim raporu hakkında soru sorabilirsiniz.", { score }), actions: [{ label: t("Genel bakış"), href: "/dashboard" }] };
  }

  /** raw: Türkçe niyet/kural eşleşmesi için; display: kullanıcıya ve asistana giden (etkin dildeki) metin. */
  async function send(raw = input, display?: string) {
    const clean = raw.trim(); if (!clean || thinking) return;
    const shown = (display ?? clean).trim();
    const history = messages.slice(-10).map((item) => ({ role: item.role, body: item.body }));
    const normalized = clean.toLocaleLowerCase("tr-TR");
    const requestedIntent = /gelir|kazanç|ciro|para|tahsilat/.test(normalized) ? "revenue"
      : /müşteri|sadakat|geri|kayıp/.test(normalized) ? "customers"
        : /ekip|çalışan|personel|performans/.test(normalized) ? "staff"
          : /hizmet|fiyat|kategori/.test(normalized) ? "services"
            : /randevu|bugün|takvim|onay/.test(normalized) ? "appointments"
              : /bekleme|boş saat/.test(normalized) ? "waitlist"
                : /yorum|puan|itibar/.test(normalized) ? "reputation"
                  : /büyü|öner|geliştir|kampanya/.test(normalized) ? "growth"
                    : /rapor|özet|analiz/.test(normalized) ? "report"
                      : "conversation";
    const deterministic = answer(clean);
    setInput(""); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", body: shown, time: new Date() }]); setThinking(true);
    setConnection("thinking");
    try {
      const response = await askSmartAssistant({
        scope: "business",
        businessId: businessId ?? undefined,
        message: shown,
        history,
        context: {
          businessName: business?.name ?? "İşletme", // i18n-ignore (sunucu bağlamı)
          requestedIntent,
          operationScore: score,
          metrics: stats ? {
            todayAppointments: stats.today,
            upcomingAppointments: stats.upcoming,
            pendingAppointments: stats.pending,
            completedAppointments: stats.completed,
            cancelledAppointments: stats.cancelled,
            noShowAppointments: stats.noShow,
            totalRevenue: stats.revenue,
            monthRevenue: stats.monthRevenue,
            customerCount: stats.customers,
            returningCustomerCount: stats.returningCustomers,
            activeServices: stats.activeServices,
            totalServices: stats.services,
            activeStaff: stats.activeStaff,
            totalStaff: stats.staff,
            waitlistCount: stats.waitlist,
            reviewCount: stats.reviews,
            averageRating: Number(stats.rating.toFixed(2)),
            topService: stats.topService,
          } : null,
        },
      });
      const body = response.body?.trim();
      if (!body) throw new Error("Asistan boş yanıt döndürdü."); // i18n-ignore
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body, actions: deterministic.actions, time: new Date() }]);
      setConnection("ready");
    } catch {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", time: new Date(), ...deterministic }]);
      setConnection("fallback");
    } finally {
      setThinking(false);
    }
  }

  async function clearConversation() {
    setMessages([welcome(t, business?.name)]);
    if (businessId) await clearSmartAssistantHistory("business", businessId).catch(() => undefined);
  }

  function exportReport() {
    if (!stats) return;
    const body = [
      `# ${t("{business} Yönetim Raporu", { business: business?.name ?? t("İşletme") })}`,
      "",
      t("Tarih: {date}", { date: stats.updatedAt.toLocaleString(locale) }),
      t("Operasyon puanı: {score}/100", { score }),
      "",
      `## ${t("Randevu akışı")}`,
      `- ${t("Bugün")}: ${stats.today}`,
      `- ${t("Yaklaşan")}: ${stats.upcoming}`,
      `- ${t("Tamamlanan")}: ${stats.completed}`,
      `- ${t("İptal")}: ${stats.cancelled}`,
      `- ${t("Gelmedi")}: ${stats.noShow}`,
      `- ${t("Bekleme listesi")}: ${stats.waitlist}`,
      "",
      `## ${t("Finans ve müşteri")}`,
      `- ${t("Bu ay gelir")}: ${stats.monthRevenue} ₺`,
      `- ${t("Toplam kayıtlı gelir")}: ${stats.revenue} ₺`,
      `- ${t("Müşteri")}: ${stats.customers}`,
      `- ${t("Tekrar gelen")}: ${stats.returningCustomers}`,
      "",
      `## ${t("Operasyon")}`,
      `- ${t("Aktif hizmet")}: ${stats.activeServices}/${stats.services}`,
      `- ${t("Aktif çalışan")}: ${stats.activeStaff}/${stats.staff}`,
      `- ${t("En popüler hizmet")}: ${stats.topService}`,
      `- ${t("Öne çıkan çalışan")}: ${stats.topStaff}`,
      `- ${t("Ortalama puan")}: ${stats.rating.toFixed(1)}`,
      "",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" })); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${(business?.slug || "isletme")}-yonetim-raporu-${new Date().toISOString().slice(0, 10)}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  async function copyMessage(message: Message) {
    await navigator.clipboard.writeText(message.body);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(""), 1400);
  }

  async function runStaffUpdate(action: NonNullable<Action["staffUpdate"]>) {
    if (!businessId || runningAction) return;
    setRunningAction(action.staffId);
    try {
      await updateStaff(businessId, action.staffId, action.patch);
      addDoc(collection(getDb(), "businesses", businessId, "auditLogs"), { action: "assistant.staff_updated", entityId: action.staffId, summary: action.summary, source: "business_assistant", actorUid: currentActorUid(), createdAt: serverTimestamp() }).catch(() => undefined);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: t("Tamamdır ✅ {name} için {summary} başarıyla güncellendi.", { name: action.staffName, summary: action.summary }), time: new Date(), actions: [{ label: t("Çalışanları kontrol et"), href: "/dashboard/calisanlar" }] }]);
      await load();
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: t("Değişiklik uygulanamadı: {error}", { error: t((error as Error).message || tk("Yetki veya bağlantı hatası oluştu.")) }), time: new Date() }]);
    } finally { setRunningAction(""); }
  }

  async function runServiceUpdate(action: NonNullable<Action["serviceUpdate"]>) {
    if (!businessId || runningAction) return;
    setRunningAction(action.serviceId);
    try {
      await updateService(businessId, action.serviceId, action.patch);
      addDoc(collection(getDb(), "businesses", businessId, "auditLogs"), { action: "assistant.service_updated", entityId: action.serviceId, summary: action.summary, source: "business_assistant", actorUid: currentActorUid(), createdAt: serverTimestamp() }).catch(() => undefined);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: t("Tamamdır ✅ {name} hizmetinin {summary} olarak güncellendi.", { name: action.serviceName, summary: action.summary }), time: new Date(), actions: [{ label: t("Hizmetleri kontrol et"), href: "/dashboard/hizmetler" }] }]);
      await load();
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: t("Hizmet güncellenemedi: {error}", { error: t((error as Error).message || tk("Yetki veya bağlantı hatası oluştu.")) }), time: new Date() }]);
    } finally { setRunningAction(""); }
  }

  async function runAppointmentUpdate(action: NonNullable<Action["appointmentUpdate"]>) {
    if (!businessId || runningAction) return;
    setRunningAction(action.appointmentId);
    try {
      await updateAppointmentStatus(businessId, action.appointmentId, action.status);
      addDoc(collection(getDb(), "businesses", businessId, "auditLogs"), { action: "assistant.appointment_updated", entityId: action.appointmentId, status: action.status, source: "business_assistant", actorUid: currentActorUid(), createdAt: serverTimestamp() }).catch(() => undefined);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: t("İşlem tamamlandı ✅ {customer} randevusu {status}.", { customer: action.customerName, status: action.summary }), time: new Date(), actions: [{ label: t("Randevuyu kontrol et"), href: `/dashboard/randevular?appointment=${encodeURIComponent(action.appointmentId)}` }] }]);
      await load();
    } catch (error) { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: t("Randevu güncellenemedi: {error}", { error: t((error as Error).message) }), time: new Date() }]); }
    finally { setRunningAction(""); }
  }

  async function runWaitlistUpdate(action: NonNullable<Action["waitlistUpdate"]>) {
    if (!businessId || runningAction) return;
    setRunningAction(action.itemId);
    try {
      await updateDoc(doc(getDb(), "businesses", businessId, "waitlist", action.itemId), { status: action.status, updatedAt: serverTimestamp() });
      addDoc(collection(getDb(), "businesses", businessId, "auditLogs"), { action: "assistant.waitlist_updated", entityId: action.itemId, status: action.status, source: "business_assistant", actorUid: currentActorUid(), createdAt: serverTimestamp() }).catch(() => undefined);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: t("Tamamdır ✅ {customer} için bekleme listesi talebi {status}.", { customer: action.customerName, status: action.summary }), time: new Date(), actions: [{ label: t("Bekleme listesini kontrol et"), href: "/dashboard/bekleme-listesi" }] }]);
      await load();
    } catch (error) { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: t("Bekleme listesi güncellenemedi: {error}", { error: t((error as Error).message) }), time: new Date() }]); }
    finally { setRunningAction(""); }
  }

  const briefing = stats ? [
    { icon: CalendarDays, label: t("Bugünün akışı"), value: stats.today, detail: t("{count} onay bekliyor", { count: stats.pending }), prompt: tk("Bugün beni ne bekliyor?") },
    { icon: BellRing, label: t("Sıcak fırsat"), value: stats.waitlist, detail: t("bekleme listesi talebi"), prompt: tk("Büyüme önerisi") },
    { icon: Zap, label: t("Operasyon puanı"), value: `${score}/100`, detail: t("{count}/6 kaynak canlı", { count: stats.healthySources }), prompt: tk("İşletmemi analiz et") },
  ] : [];
  const outcomeCount = stats ? stats.completed + stats.cancelled + stats.noShow : 0;
  const completionRate = outcomeCount && stats ? Math.round(stats.completed / outcomeCount * 100) : 0;
  const loyaltyRate = stats?.customers ? Math.round(stats.returningCustomers / stats.customers * 100) : 0;
  const setupRate = stats ? Math.round(stats.healthySources / 6 * 100) : 0;
  const cockpitActions = stats ? [
    { icon: CheckCircle2, label: t("Onay bekleyen"), value: stats.pending, detail: stats.pending ? t("Şimdi kontrol et") : t("Tüm talepler temiz"), prompt: tk("Onay bekleyen randevularımı göster ve önceliklendir"), tone: stats.pending ? "urgent" : "clear" },
    { icon: BellRing, label: t("Bekleme fırsatı"), value: stats.waitlist, detail: stats.waitlist ? t("Boş saatle eşleştir") : t("Yeni talep yok"), prompt: tk("Bekleme listemdeki fırsatları analiz et"), tone: stats.waitlist ? "opportunity" : "clear" },
    { icon: CalendarDays, label: t("Yaklaşan randevu"), value: stats.upcoming, detail: stats.upcoming ? t("Akışı planla") : t("Takvim sakin"), prompt: tk("Yaklaşan randevularımı planlamama yardım et"), tone: "normal" },
  ] : [];
  const randeFocus = stats ? stats.pending > 0
    ? { eyebrow: t("ÖNCE ONAYLAR"), title: t("{count} randevu karar bekliyor", { count: stats.pending }), body: t("Bekleyen talepleri hızla onaylamak müşteri deneyimini ve takvim doluluğunu korur."), prompt: tk("Bekleyen randevularımı ve bugünkü önceliklerimi göster"), action: t("Onayları incele") }
    : stats.waitlist > 0
      ? { eyebrow: t("SICAK FIRSAT"), title: t("{count} müşteri uygun saat bekliyor", { count: stats.waitlist }), body: t("Boşalan saatleri bekleme listesindeki müşterilerle eşleştirerek kayıp kapasiteyi azaltabilirsiniz."), prompt: tk("Bekleme listemdeki fırsatları analiz et"), action: t("Fırsatları analiz et") }
      : stats.activeServices === 0 || stats.activeStaff === 0
        ? { eyebrow: t("KURULUM ODAĞI"), title: t("Randevu akışını tamamlayalım"), body: t("Aktif hizmet ve çalışan eşleşmeleri tamamlandığında müşteriler uygun saatleri sorunsuz görebilir."), prompt: tk("Kurulumumdaki eksikleri analiz et"), action: t("Eksikleri bul") }
        : { eyebrow: t("BÜYÜME ODAĞI"), title: t("{service} için yeni fırsat", { service: stats.topService }), body: t("En güçlü hizmetinizi boş saatler ve sadık müşterilerle eşleştirerek yeni talep oluşturabilirsiniz."), prompt: tk("Bugün için en iyi büyüme fırsatımı çıkar"), action: t("Planı oluştur") }
    : null;

  if (access?.role === "staff") return <section className="business-assistant-denied"><ShieldCheck size={30}/><h1>{t("İşletme asistanı yönetici hesabına özeldir.")}</h1><p>{t("Çalışan hesabınız kendi takvim ve randevularıyla sınırlandırılmıştır.")}</p><Link href="/dashboard/takvim">{t("Takvimime dön")}</Link></section>;

  return <main className="admin-assistant-page business-assistant-page">
    <section className="admin-assistant-hero rande-assistant-hero"><div><span><Sparkles size={15}/> {t("ROVİ · İŞLETME KOÇUN")}</span><h2>{t("İşletmeni Rovi’ye sor,")}<br/>{t("birlikte yönet.")}</h2><p>{t("{business} için randevudan gelire, ekipten müşteri sadakatine canlı ve uygulanabilir operasyon desteği.", { business: business?.name ?? t("Mağazanız") })}</p><nav className="rande-hero-capabilities" aria-label={t("Rovi yetenekleri")}><span><CheckCircle2 size={12}/> {t("Canlı analiz")}</span><span><ShieldCheck size={12}/> {t("Onaylı işlemler")}</span><span><Sparkles size={12}/> {t("Akıllı öneriler")}</span></nav></div><aside><i className={`rande-hero-avatar ${loading ? "is-loading" : ""}`}><RoviMascot size={96} alt={t("Rovi işletme asistanı")} priority /></i><div><small>{t("ROVİ ŞU AN")}</small><b>{loading ? t("Mağazanı inceliyor") : t("Hazır ve yanında")}</b><span>{stats ? t("{count}/6 veri kaynağı bağlı", { count: stats.healthySources }) : t("Güvenli bağlantı kuruluyor")}</span></div><button type="button" onClick={() => void load()} disabled={loading} aria-label={t("İşletme verilerini yenile")}><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button></aside></section>
    <section className="assistant-command-deck" aria-label={t("İşletme brifingi")}>{briefing.map((card) => <button type="button" key={card.label} onClick={() => send(card.prompt, t(card.prompt))}><span><card.icon size={18}/></span><div><small>{card.label}</small><b>{card.value}</b><p>{card.detail}</p></div><ArrowRight size={15}/></button>)}</section>
    {randeFocus && <section className="rande-focus-card" aria-label={t("Rovi'nin öncelikli önerisi")}><div className="rande-focus-mascot" aria-hidden="true"><RoviMascot size={96} alt="" /></div><div><span><Sparkles size={12}/> {randeFocus.eyebrow}</span><h3>{randeFocus.title}</h3><p>{randeFocus.body}</p></div><button type="button" onClick={() => void send(randeFocus.prompt, t(randeFocus.prompt))} disabled={loading || thinking}>{randeFocus.action}<ArrowRight size={15}/></button></section>}
    <section className="admin-assistant-layout"><div className="admin-assistant-chat"><header><div><span className="rande-chat-avatar"><RoviMascot size={46} alt="" /></span><span><b>Rovi · {business?.name ?? t("İşletme")}</b><small>{t("Canlı işletme koçunuz")}</small></span></div><nav><i className={`assistant-connection is-${connection}`}><span/> {connection === "thinking" ? t("ROVİ DÜŞÜNÜYOR") : connection === "fallback" ? t("GÜVENLİ MOD") : t("CANLI BAĞLANTI")}</i><button type="button" onClick={() => void clearConversation()} aria-label={t("Sohbeti temizle")}><Trash2 size={14}/></button></nav></header><div ref={messagesRef} className="admin-assistant-messages" aria-live="polite">{messages.map((message) => <article key={message.id} className={message.role}>{message.role === "assistant" && <span className="message-avatar rande-message-avatar"><RoviMascot size={34} alt="Rovi" /></span>}<div><p>{message.body}</p>{message.actions && <nav>{message.actions.map((action) => action.href ? <Link key={action.label} href={action.href}>{action.label}<ArrowRight size={13}/></Link> : action.staffUpdate ? <button className="assistant-confirm-action" key={action.label} onClick={() => action.staffUpdate && void runStaffUpdate(action.staffUpdate)} disabled={Boolean(runningAction)}>{runningAction === action.staffUpdate.staffId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : action.serviceUpdate ? <button className="assistant-confirm-action" key={action.label} onClick={() => action.serviceUpdate && void runServiceUpdate(action.serviceUpdate)} disabled={Boolean(runningAction)}>{runningAction === action.serviceUpdate.serviceId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : action.appointmentUpdate ? <button className="assistant-confirm-action" key={action.label} onClick={() => action.appointmentUpdate && void runAppointmentUpdate(action.appointmentUpdate)} disabled={Boolean(runningAction)}>{runningAction === action.appointmentUpdate.appointmentId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : action.waitlistUpdate ? <button className="assistant-confirm-action" key={action.label} onClick={() => action.waitlistUpdate && void runWaitlistUpdate(action.waitlistUpdate)} disabled={Boolean(runningAction)}>{runningAction === action.waitlistUpdate.itemId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : <button key={action.label} onClick={exportReport}><Download size={13}/>{action.label}</button>)}</nav>}<footer><time>{message.time.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</time>{message.role === "assistant" && <button type="button" onClick={() => void copyMessage(message)} aria-label={t("Yanıtı kopyala")}>{copiedId === message.id ? <CheckCircle2 size={12}/> : <Copy size={12}/>}</button>}</footer></div></article>)}{thinking && <article className="assistant"><span className="message-avatar rande-message-avatar"><RoviMascot size={34} alt="" /></span><div className="assistant-thinking"><i/><i/><i/></div></article>}</div><div className="admin-assistant-prompts" aria-label={t("Rovi'ye hızlı sorular")}>{prompts.map((prompt) => <button key={prompt.prompt} onClick={() => void send(prompt.prompt, t(prompt.prompt))} disabled={loading || thinking}><prompt.icon size={13}/>{t(prompt.label)}</button>)}</div><form onSubmit={(event: FormEvent) => { event.preventDefault(); void send(); }}><label><Sparkles size={17}/><textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={t("Rovi’ye işletmenle ilgili bir şey sor…")} aria-label={t("Rovi'ye mesaj")} disabled={loading}/></label><button aria-label={t("Mesajı gönder")} disabled={loading || thinking || !input.trim()}><Send size={19}/></button></form><footer><ShieldCheck size={13}/> {t("Rovi yalnız seçili mağazanın verilerini okur; kritik işlemleri siz onaylamadan uygulamaz.")}</footer></div>
    <aside className="admin-assistant-context business-live-cockpit">
      <i className="business-cockpit-aura" aria-hidden="true"/>
      <header className="business-live-header"><div><span><i/> {t("CANLI MAĞAZA")}</span><b>{business?.name ?? t("İşletme özeti")}</b><small>{t("{time} itibarıyla güncel", { time: stats?.updatedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) ?? "—" })}</small></div><em><Activity size={12}/> {t("Canlı")}</em></header>
      <section className="business-score-card business-score-card--compact">
        <div className="assistant-health"><span style={{ "--score": `${score}%` } as React.CSSProperties}><b>{score}</b><small>/100</small></span><div><small>{t("OPERASYON ENDEKSİ")}</small><b>{score >= 85 ? t("Mükemmel ritim") : score >= 65 ? t("Yükseliş fırsatı") : t("Gelişim alanı var")}</b><p>{score >= 85 ? t("Akışınız güçlü ve dengeli.") : score >= 65 ? t("Birkaç dokunuşla ivme kazanabilirsiniz.") : t("Kurulum adımlarını tamamlayarak başlayın.")}</p></div></div>
      </section>
      <section className="business-action-center"><header><div><span><Zap size={14}/> {t("AKSİYON MERKEZİ")}</span><b>{t("Şimdi ne yapmalı?")}</b></div><small>{t("{count} aktif konu", { count: cockpitActions.filter((item) => item.value > 0).length })}</small></header><div>{cockpitActions.map((item) => <button type="button" key={item.label} className={`is-${item.tone}`} onClick={() => void send(item.prompt, t(item.prompt))} disabled={loading || thinking}><span><item.icon size={16}/></span><div><b>{item.label}</b><small>{item.detail}</small></div><strong>{item.value}</strong><ArrowRight size={14}/></button>)}</div></section>
      <div className="assistant-context-grid business-metric-grid"><Metric icon={CalendarDays} label={t("Bugün")} value={stats?.today}/><Metric icon={TrendingUp} label={t("Bu ay gelir")} value={stats ? `${stats.monthRevenue.toLocaleString(locale)} ₺` : undefined}/><Metric icon={UsersRound} label={t("Müşteri")} value={stats?.customers}/><Metric icon={BellRing} label={t("Bekleme")} value={stats?.waitlist}/></div>
      <section className="business-progress-panel"><header><span><Sparkles size={14}/> {t("Akıllı performans")}</span><small>{t("Gemini destekli özet")}</small></header><div><Progress label={t("Tamamlama kalitesi")} value={completionRate}/><Progress label={t("Müşteri sadakati")} value={loyaltyRate}/><Progress label={t("Veri kurulumu")} value={setupRate}/></div></section>
      <div className="assistant-attention business-smart-summary"><b><Star size={15}/> {t("Bugünün öne çıkanları")}</b><p>{t("Popüler hizmet")} <strong>{stats?.topService ?? "—"}</strong></p><p>{t("Öne çıkan ekip")} <strong>{stats?.topStaff ?? "—"}</strong></p><p>{t("Yaklaşan randevu")} <strong>{stats?.upcoming ?? 0}</strong></p><p>{t("Ortalama puan")} <strong>{stats?.rating ? stats.rating.toFixed(1) : "—"}</strong></p></div>
      <div className="business-cockpit-actions"><button type="button" onClick={() => void send(tk("İşletmemi analiz et"), t("İşletmemi analiz et"))} disabled={!stats}><Sparkles size={15}/> {t("Analiz et")}</button><button className="assistant-report-button" type="button" onClick={exportReport} disabled={!stats}><Download size={16}/> {t("Raporu indir")}</button></div>
    </aside></section>
  </main>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value?: string | number }) { return <div><span><Icon size={16}/></span><b>{value ?? "—"}</b><small>{label}</small></div>; }
function Progress({ label, value }: { label: string; value: number }) { return <div><span><small>{label}</small><b>%{value}</b></span><i><span style={{ "--progress": `${value}%` } as React.CSSProperties}/></i></div>; }
