"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { ArrowRight, BellRing, Bot, CalendarDays, CheckCircle2, Copy, Download, RefreshCw, Send, ShieldCheck, Sparkles, Trash2, TrendingUp, UsersRound, Zap } from "lucide-react";
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
  const [copiedId, setCopiedId] = useState("");
  const [staffRows, setStaffRows] = useState<Staff[]>([]);
  const [serviceRows, setServiceRows] = useState<Service[]>([]);
  const [appointmentRows, setAppointmentRows] = useState<Appointment[]>([]);
  const [waitlistRows, setWaitlistRows] = useState<WaitlistRow[]>([]);
  const [runningAction, setRunningAction] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
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
    setWaitlistRows(waitlist.map((item) => ({ id: item.id, customerName: String(item.data().customerName ?? "Müşteri"), status: String(item.data().status ?? "waiting") })));
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
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setMessages([welcome()]); });
    if (!businessId || access?.role === "staff") return () => { cancelled = true; };
    void getSmartAssistantHistory("business", businessId).then((history) => {
      if (cancelled || history.length === 0) return;
      setMessages(history.map((item) => {
        const parsed = new Date(item.createdAt);
        return { id: item.id, role: item.role, body: item.body, time: Number.isNaN(parsed.getTime()) ? new Date() : parsed };
      }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [access?.role, businessId]);
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
    if (/^(selam|merhaba|hey|sa|günaydın|iyi akşamlar)[!. ]*$/.test(text)) return { body: `Merhaba! Ben iyiyim ve ${business?.name ?? "işletmeniz"} için hazırım 🙂 Bugün ${stats.today} randevu, ${stats.pending} onay ve ${stats.waitlist} bekleme listesi talebi görünüyor. Siz nasılsınız, neyi birlikte halledelim?` };
    if (/nasılsın|ne haber|naber/.test(text)) return { body: `Gayet iyiyim, teşekkür ederim 🙂 ${business?.name ?? "işletmenizin"} verilerini de kontrol ettim; operasyon puanı ${score}/100. Bugün sizin için randevuları mı, ekibi mi yoksa büyüme fırsatlarını mı ele alalım?` };
    if (/teşekkür|sağ ol|eyvallah/.test(text)) return { body: "Rica ederim, her zaman buradayım 🙂 İsterseniz sıradaki en önemli işi de birlikte belirleyelim." };

    const directStaff = staffRows.find((item) => text.includes(item.fullName.toLocaleLowerCase("tr-TR")) || text.includes(item.fullName.split(" ")[0]!.toLocaleLowerCase("tr-TR")));
    if (directStaff) lastStaffId.current = directStaff.id;
    const mentionedStaff = directStaff ?? (/onun|bu çalışan|aynı çalışan|az önceki/.test(text) ? staffRows.find((item) => item.id === lastStaffId.current) : undefined);
    if (mentionedStaff && /(güncelle|değiştir|yap|ayarla)/.test(text)) {
      let patch: StaffPatch | null = null; let summary = "";
      if (/pozisyon|ünvan|unvan|görev/.test(text)) {
        const value = raw.match(/(?:pozisyon(?:unu)?|[üu]nvan(?:ını|ini)?|görev(?:ini)?)\s+(.+?)(?:\s+(?:yap|olarak güncelle|olarak değiştir|güncelle|değiştir))?[.!]?$/i)?.[1]?.trim();
        if (value && value.length <= 80) { patch = { position: value }; summary = `pozisyonu “${value}”`; }
      } else if (/telefon/.test(text)) {
        const value = raw.match(/(?:\+?\d[\d\s()-]{8,}\d)/)?.[0]?.replace(/\s+/g, " ");
        if (value) { patch = { phone: value }; summary = `telefonu “${value}”`; }
      } else if (/e-?posta|mail/.test(text)) {
        const value = raw.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
        if (value) { patch = { email: value }; summary = `e-postası “${value}”`; }
      } else if (/komisyon/.test(text)) {
        const value = Number(raw.match(/(?:%\s*)?(\d{1,3})(?:\s*%)/)?.[1] ?? raw.match(/komisyon\D+(\d{1,3})/i)?.[1]);
        if (Number.isFinite(value) && value >= 0 && value <= 100) { patch = { commissionRate: value }; summary = `komisyon oranı %${value}`; }
      } else if (/uzmanlık|seviye|kıdem/.test(text)) {
        const levels = [{ keys: /junior|başlangıç/, value: "junior" }, { keys: /specialist|uzman/, value: "specialist" }, { keys: /senior|kıdemli/, value: "senior" }, { keys: /trainer|eğitmen/, value: "trainer" }] as const;
        const level = levels.find((item) => item.keys.test(text));
        if (level) { patch = { expertiseLevel: level.value }; summary = `uzmanlık seviyesi “${level.value}”`; }
      }
      if (patch) return { body: `${mentionedStaff.fullName} için değişikliği anladım: ${summary} olarak güncellenecek. Yanlış işlem olmaması için uygulamadan önce onayınızı bekliyorum.`, actions: [{ label: "Değişikliği onayla", staffUpdate: { staffId: mentionedStaff.id, staffName: mentionedStaff.fullName, patch, summary } }, { label: "Çalışan profilini aç", href: "/dashboard/calisanlar" }] };
      return { body: `${mentionedStaff.fullName} adlı çalışanı buldum; fakat hangi alanı hangi değerle değiştireceğinizi net anlayamadım. “${mentionedStaff.fullName} pozisyonunu Saç Uzmanı yap”, “komisyonunu %20 yap”, “telefonunu 05… olarak güncelle” veya “uzmanlık seviyesini senior yap” şeklinde yazabilirsiniz.`, actions: [{ label: "Çalışanları aç", href: "/dashboard/calisanlar" }] };
    }
    if (/(çalışan|personel).*(güncelle|değiştir)/.test(text) && !mentionedStaff) return { body: "Güncellenecek çalışanı bulamadım. Adı panelde kayıtlı haliyle yazın; örneğin “Cihat pozisyonunu Yönetici yap”. Değişikliği uygulamadan önce size mutlaka onay göstereceğim.", actions: [{ label: "Çalışan listesini aç", href: "/dashboard/calisanlar" }] };
    const directService = serviceRows.find((item) => text.includes(item.name.toLocaleLowerCase("tr-TR")));
    if (directService) lastServiceId.current = directService.id;
    const mentionedService = directService ?? (/onun|bu hizmet|aynı hizmet|az önceki/.test(text) ? serviceRows.find((item) => item.id === lastServiceId.current) : undefined);
    if (mentionedService && /(güncelle|değiştir|yap|ayarla|aç|kapat)/.test(text)) {
      let patch: ServicePatch | null = null; let summary = "";
      if (/fiyat|ücret/.test(text)) {
        const value = Number(raw.match(/(?:fiyat(?:ını|i)?|ücret(?:ini|i)?)\D{0,12}(\d+(?:[.,]\d{1,2})?)/i)?.[1]?.replace(",", "."));
        if (Number.isFinite(value) && value >= 0 && value <= 1_000_000) { patch = { price: value }; summary = `fiyatı ${value.toLocaleString("tr-TR")} ₺`; }
      } else if (/süre|dakika/.test(text)) {
        const value = Number(raw.match(/(\d{1,3})\s*(?:dakika|dk)/i)?.[1]);
        if (Number.isFinite(value) && value >= 5 && value <= 720) { patch = { durationMinutes: value }; summary = `süresi ${value} dakika`; }
      } else if (/online/.test(text)) {
        const enabled = !/(kapat|pasif|kaldır)/.test(text); patch = { isBookableOnline: enabled }; summary = `online randevu ${enabled ? "açık" : "kapalı"}`;
      } else if (/aktif|pasif|kapat|aç/.test(text)) {
        const enabled = !/(pasif|kapat)/.test(text); patch = { isActive: enabled }; summary = `${enabled ? "aktif" : "pasif"}`;
      }
      if (patch) return { body: `${mentionedService.name} hizmeti için değişikliği anladım: ${summary} olacak. Kaydetmeden önce onayınızı bekliyorum.`, actions: [{ label: "Hizmet değişikliğini onayla", serviceUpdate: { serviceId: mentionedService.id, serviceName: mentionedService.name, patch, summary } }, { label: "Hizmeti incele", href: "/dashboard/hizmetler" }] };
      return { body: `${mentionedService.name} hizmetini buldum ancak değişiklik net değil. “Fiyatını 750 TL yap”, “süresini 60 dakika yap” veya “online randevuya kapat” şeklinde yazabilirsiniz.` };
    }
    const appointmentCandidates = appointmentRows.filter((item) => text.includes(item.customerName.toLocaleLowerCase("tr-TR"))).sort((a, b) => Math.abs(new Date(a.startAt).getTime() - Date.now()) - Math.abs(new Date(b.startAt).getTime() - Date.now()));
    const directAppointment = appointmentCandidates[0];
    if (directAppointment) lastAppointmentId.current = directAppointment.id;
    const mentionedAppointment = directAppointment ?? (/onun|bu randevu|aynı randevu|az önceki/.test(text) ? appointmentRows.find((item) => item.id === lastAppointmentId.current) : undefined);
    if (mentionedAppointment && /(onayla|tamamla|tamamlandı|iptal|gelmedi|no.?show)/.test(text)) {
      const status: AppointmentStatus = /iptal/.test(text) ? "cancelled" : /gelmedi|no.?show/.test(text) ? "no_show" : /tamamla|tamamlandı/.test(text) ? "completed" : "confirmed";
      const label = { confirmed: "onaylandı", completed: "tamamlandı", cancelled: "iptal edildi", no_show: "gelmedi olarak işaretlendi", pending: "bekliyor" }[status];
      const date = new Date(mentionedAppointment.startAt).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
      return { body: `${mentionedAppointment.customerName} adlı müşterinin ${date} tarihli “${mentionedAppointment.serviceName || "randevu"}” kaydı ${label} olarak güncellenecek. Onaylıyor musunuz?`, actions: [{ label: "Randevu değişikliğini onayla", appointmentUpdate: { appointmentId: mentionedAppointment.id, customerName: mentionedAppointment.customerName, status, summary: label } }, { label: "Randevuyu incele", href: `/dashboard/randevular?appointment=${encodeURIComponent(mentionedAppointment.id)}` }] };
    }
    const directWaitlist = waitlistRows.find((item) => text.includes(item.customerName.toLocaleLowerCase("tr-TR")));
    if (directWaitlist) lastWaitlistId.current = directWaitlist.id;
    const mentionedWaitlist = directWaitlist ?? (/onun|bu talep|aynı talep|az önceki/.test(text) ? waitlistRows.find((item) => item.id === lastWaitlistId.current) : undefined);
    if (mentionedWaitlist && /(ulaşıldı|iletişim|randevuya dönüştü|kapat|tamamla)/.test(text)) {
      const status = /randevuya dönüştü/.test(text) ? "booked" : /kapat|tamamla/.test(text) ? "closed" : "contacted";
      const summary = status === "booked" ? "randevuya dönüştü" : status === "closed" ? "kapatıldı" : "iletişime geçildi";
      return { body: `${mentionedWaitlist.customerName} adlı müşterinin bekleme listesi talebi “${summary}” yapılacak. Uygulamamı onaylıyor musunuz?`, actions: [{ label: "Talep değişikliğini onayla", waitlistUpdate: { itemId: mentionedWaitlist.id, customerName: mentionedWaitlist.customerName, status, summary } }, { label: "Bekleme listesini aç", href: "/dashboard/bekleme-listesi" }] };
    }
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

  async function send(raw = input) {
    const clean = raw.trim(); if (!clean || thinking) return;
    const history = messages.slice(-6).map((item) => ({ role: item.role, body: item.body }));
    const deterministic = answer(clean);
    setInput(""); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", body: clean, time: new Date() }]); setThinking(true);
    try {
      const response = await askSmartAssistant({
        scope: "business",
        businessId: businessId ?? undefined,
        message: clean,
        history,
        context: {
          businessName: business?.name ?? "İşletme",
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
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: response.body, actions: deterministic.actions, time: new Date() }]);
    } catch {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", time: new Date(), ...deterministic }]);
    } finally {
      setThinking(false);
    }
  }

  async function clearConversation() {
    setMessages([welcome()]);
    if (businessId) await clearSmartAssistantHistory("business", businessId).catch(() => undefined);
  }

  function exportReport() {
    if (!stats) return;
    const body = `# ${business?.name ?? "İşletme"} Yönetim Raporu\n\nTarih: ${stats.updatedAt.toLocaleString("tr-TR")}\nOperasyon puanı: ${score}/100\n\n## Randevu\n- Bugün: ${stats.today}\n- Yaklaşan: ${stats.upcoming}\n- Tamamlanan: ${stats.completed}\n- İptal: ${stats.cancelled}\n- Gelmedi: ${stats.noShow}\n- Bekleme listesi: ${stats.waitlist}\n\n## Finans ve müşteri\n- Bu ay gelir: ${stats.monthRevenue} ₺\n- Toplam kayıtlı gelir: ${stats.revenue} ₺\n- Müşteri: ${stats.customers}\n- Tekrar gelen: ${stats.returningCustomers}\n\n## Operasyon\n- Aktif hizmet: ${stats.activeServices}/${stats.services}\n- Aktif çalışan: ${stats.activeStaff}/${stats.staff}\n- En popüler hizmet: ${stats.topService}\n- Öne çıkan çalışan: ${stats.topStaff}\n- Ortalama puan: ${stats.rating.toFixed(1)}\n`;
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
      void addDoc(collection(getDb(), "businesses", businessId, "auditLogs"), { action: "assistant.staff_updated", entityId: action.staffId, summary: action.summary, source: "business_assistant", createdAt: serverTimestamp() }).catch(() => undefined);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `Tamamdır ✅ ${action.staffName} için ${action.summary} başarıyla güncellendi.`, time: new Date(), actions: [{ label: "Çalışanları kontrol et", href: "/dashboard/calisanlar" }] }]);
      await load();
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `Değişiklik uygulanamadı: ${(error as Error).message || "Yetki veya bağlantı hatası oluştu."}`, time: new Date() }]);
    } finally { setRunningAction(""); }
  }

  async function runServiceUpdate(action: NonNullable<Action["serviceUpdate"]>) {
    if (!businessId || runningAction) return;
    setRunningAction(action.serviceId);
    try {
      await updateService(businessId, action.serviceId, action.patch);
      void addDoc(collection(getDb(), "businesses", businessId, "auditLogs"), { action: "assistant.service_updated", entityId: action.serviceId, summary: action.summary, source: "business_assistant", createdAt: serverTimestamp() }).catch(() => undefined);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `Tamamdır ✅ ${action.serviceName} hizmetinin ${action.summary} olarak güncellendi.`, time: new Date(), actions: [{ label: "Hizmetleri kontrol et", href: "/dashboard/hizmetler" }] }]);
      await load();
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `Hizmet güncellenemedi: ${(error as Error).message || "Yetki veya bağlantı hatası oluştu."}`, time: new Date() }]);
    } finally { setRunningAction(""); }
  }

  async function runAppointmentUpdate(action: NonNullable<Action["appointmentUpdate"]>) {
    if (!businessId || runningAction) return;
    setRunningAction(action.appointmentId);
    try {
      await updateAppointmentStatus(businessId, action.appointmentId, action.status);
      void addDoc(collection(getDb(), "businesses", businessId, "auditLogs"), { action: "assistant.appointment_updated", entityId: action.appointmentId, status: action.status, source: "business_assistant", createdAt: serverTimestamp() }).catch(() => undefined);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `İşlem tamamlandı ✅ ${action.customerName} randevusu ${action.summary}.`, time: new Date(), actions: [{ label: "Randevuyu kontrol et", href: `/dashboard/randevular?appointment=${encodeURIComponent(action.appointmentId)}` }] }]);
      await load();
    } catch (error) { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `Randevu güncellenemedi: ${(error as Error).message}`, time: new Date() }]); }
    finally { setRunningAction(""); }
  }

  async function runWaitlistUpdate(action: NonNullable<Action["waitlistUpdate"]>) {
    if (!businessId || runningAction) return;
    setRunningAction(action.itemId);
    try {
      await updateDoc(doc(getDb(), "businesses", businessId, "waitlist", action.itemId), { status: action.status, updatedAt: serverTimestamp() });
      void addDoc(collection(getDb(), "businesses", businessId, "auditLogs"), { action: "assistant.waitlist_updated", entityId: action.itemId, status: action.status, source: "business_assistant", createdAt: serverTimestamp() }).catch(() => undefined);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `Tamamdır ✅ ${action.customerName} için bekleme listesi talebi ${action.summary}.`, time: new Date(), actions: [{ label: "Bekleme listesini kontrol et", href: "/dashboard/bekleme-listesi" }] }]);
      await load();
    } catch (error) { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `Bekleme listesi güncellenemedi: ${(error as Error).message}`, time: new Date() }]); }
    finally { setRunningAction(""); }
  }

  const briefing = stats ? [
    { icon: CalendarDays, label: "Bugünün akışı", value: stats.today, detail: `${stats.pending} onay bekliyor`, prompt: "Bugün beni ne bekliyor?" },
    { icon: BellRing, label: "Sıcak fırsat", value: stats.waitlist, detail: "bekleme listesi talebi", prompt: "Büyüme önerisi" },
    { icon: Zap, label: "Operasyon puanı", value: `${score}/100`, detail: `${stats.healthySources}/6 kaynak canlı`, prompt: "İşletmemi analiz et" },
  ] : [];

  if (access?.role === "staff") return <section className="business-assistant-denied"><ShieldCheck size={30}/><h1>İşletme asistanı yönetici hesabına özeldir.</h1><p>Çalışan hesabınız kendi takvim ve randevularıyla sınırlandırılmıştır.</p><Link href="/dashboard/takvim">Takvimime dön</Link></section>;

  return <main className="admin-assistant-page business-assistant-page">
    <section className="admin-assistant-hero"><div><span><Sparkles size={15}/> İŞLETME ZEKÂ MERKEZİ</span><h2>İşletmeni sorarak<br/>yönet.</h2><p>{business?.name ?? "Mağazanız"} için randevudan gelire, ekipten müşteri sadakatine canlı operasyon asistanı.</p></div><aside><i className={loading ? "is-loading" : ""}><Bot size={30}/></i><div><small>MAĞAZA ASİSTANI</small><b>{loading ? "Analiz hazırlanıyor" : "Canlı ve hazır"}</b><span>{stats ? `${stats.healthySources}/6 veri kaynağı bağlı` : "Güvenli bağlantı kuruluyor"}</span></div><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button></aside></section>
    <section className="assistant-command-deck" aria-label="İşletme brifingi">{briefing.map((card) => <button type="button" key={card.label} onClick={() => send(card.prompt)}><span><card.icon size={18}/></span><div><small>{card.label}</small><b>{card.value}</b><p>{card.detail}</p></div><ArrowRight size={15}/></button>)}</section>
    <section className="admin-assistant-layout"><div className="admin-assistant-chat"><header><div><Bot size={20}/><span><b>{business?.name ?? "İşletme"} Asistanı</b><small>Size özel operasyon yardımcısı</small></span></div><nav><i><span/> ÇEVRİMİÇİ</i><button type="button" onClick={() => void clearConversation()} aria-label="Sohbeti temizle"><Trash2 size={14}/></button></nav></header><div className="admin-assistant-messages" aria-live="polite">{messages.map((message) => <article key={message.id} className={message.role}>{message.role === "assistant" && <span className="message-avatar"><Bot size={16}/></span>}<div><p>{message.body}</p>{message.actions && <nav>{message.actions.map((action) => action.href ? <Link key={action.label} href={action.href}>{action.label}<ArrowRight size={13}/></Link> : action.staffUpdate ? <button className="assistant-confirm-action" key={action.label} onClick={() => action.staffUpdate && void runStaffUpdate(action.staffUpdate)} disabled={Boolean(runningAction)}>{runningAction === action.staffUpdate.staffId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : action.serviceUpdate ? <button className="assistant-confirm-action" key={action.label} onClick={() => action.serviceUpdate && void runServiceUpdate(action.serviceUpdate)} disabled={Boolean(runningAction)}>{runningAction === action.serviceUpdate.serviceId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : action.appointmentUpdate ? <button className="assistant-confirm-action" key={action.label} onClick={() => action.appointmentUpdate && void runAppointmentUpdate(action.appointmentUpdate)} disabled={Boolean(runningAction)}>{runningAction === action.appointmentUpdate.appointmentId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : action.waitlistUpdate ? <button className="assistant-confirm-action" key={action.label} onClick={() => action.waitlistUpdate && void runWaitlistUpdate(action.waitlistUpdate)} disabled={Boolean(runningAction)}>{runningAction === action.waitlistUpdate.itemId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : <button key={action.label} onClick={exportReport}><Download size={13}/>{action.label}</button>)}</nav>}<footer><time>{message.time.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</time>{message.role === "assistant" && <button type="button" onClick={() => void copyMessage(message)} aria-label="Yanıtı kopyala">{copiedId === message.id ? <CheckCircle2 size={12}/> : <Copy size={12}/>}</button>}</footer></div></article>)}{thinking && <article className="assistant"><span className="message-avatar"><Bot size={16}/></span><div className="assistant-thinking"><i/><i/><i/></div></article>}<div ref={endRef}/></div><div className="admin-assistant-prompts">{prompts.map((prompt) => <button key={prompt} onClick={() => void send(prompt)} disabled={loading || thinking}>{prompt}</button>)}</div><form onSubmit={(event: FormEvent) => { event.preventDefault(); void send(); }}><label><Sparkles size={17}/><textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Mesaj yazın…" disabled={loading}/></label><button disabled={loading || thinking || !input.trim()}><Send size={19}/></button></form><footer><ShieldCheck size={13}/> Veriler yalnız seçili mağazanızdan okunur; kritik değişiklikler yönetim ekranında onaylanır.</footer></div>
    <aside className="admin-assistant-context"><header><span>CANLI MAĞAZA</span><b>{business?.name ?? "İşletme özeti"}</b><small>{stats?.updatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) ?? "—"} itibarıyla</small></header><div className="assistant-health"><span style={{ "--score": `${score}%` } as React.CSSProperties}><b>{score}</b><small>/100</small></span><div><b>Operasyon puanı</b><small>{score >= 85 ? "İşletmeniz güçlü durumda" : score >= 65 ? "Büyüme fırsatları var" : "Kurulum ve kalite geliştirilmeli"}</small></div></div><div className="assistant-context-grid"><Metric icon={CalendarDays} label="Bugün" value={stats?.today}/><Metric icon={TrendingUp} label="Bu ay gelir" value={stats ? `${stats.monthRevenue.toLocaleString("tr-TR")} ₺` : undefined}/><Metric icon={UsersRound} label="Müşteri" value={stats?.customers}/><Metric icon={BellRing} label="Bekleme" value={stats?.waitlist}/></div><div className="assistant-attention"><b><Sparkles size={15}/> Akıllı özet</b><p>Popüler hizmet <strong>{stats?.topService ?? "—"}</strong></p><p>Öne çıkan ekip <strong>{stats?.topStaff ?? "—"}</strong></p><p>Yaklaşan randevu <strong>{stats?.upcoming ?? 0}</strong></p><p>Ortalama puan <strong>{stats?.rating ? stats.rating.toFixed(1) : "—"}</strong></p></div><button className="assistant-report-button" onClick={exportReport} disabled={!stats}><Download size={16}/> Yönetim raporunu indir</button></aside></section>
  </main>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value?: string | number }) { return <div><span><Icon size={16}/></span><b>{value ?? "—"}</b><small>{label}</small></div>; }
