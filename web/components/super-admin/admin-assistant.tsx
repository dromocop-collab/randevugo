"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, collectionGroup, doc, getDocs, limit, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  ArrowRight, Bot, Building2, CalendarDays, CheckCircle2, Download,
  BrainCircuit, Copy, Headphones, LoaderCircle, RefreshCw, Send, ShieldAlert, Sparkles, Trash2, TrendingUp, UsersRound,
} from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { PLAN_PRICE } from "@/constants/plans";
import { askSmartAssistant, clearSmartAssistantHistory, getSmartAssistantHistory } from "@/features/assistant/assistant-repository";

type AssistantStats = {
  businesses: number;
  activeBusinesses: number;
  pendingBusinesses: number;
  suspendedBusinesses: number;
  users: number;
  appointments: number;
  appointments30d: number;
  completed: number;
  cancelled: number;
  noShow: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  openSupport: number;
  criticalSupport: number;
  pendingReviews: number;
  pendingCategories: number;
  healthySources: number;
  totalSources: number;
  updatedAt: Date;
};

type ManagedBusiness = { id: string; name: string; status: string; isSuspended: boolean };
type BusinessOperation = { businessId: string; businessName: string; operation: "suspend" | "activate" | "approve" | "plan"; plan?: string };
type SupportRow = { id: string; title: string; requesterName: string; status: string };
type SupportOperation = { ticketId: string; title: string; status: "in_progress" | "resolved" };
type AssistantAction = { label: string; href?: string; report?: boolean; businessOperation?: BusinessOperation; supportOperation?: SupportOperation };
type Message = { id: string; role: "assistant" | "user"; body: string; actions?: AssistantAction[]; createdAt: Date };

const QUICK_PROMPTS = [
  "Bugün önceliğimiz ne?",
  "Platform raporu hazırla",
  "Onay bekleyen işletmeleri göster",
  "Randevu kalitesini analiz et",
  "Gelir ve abonelik özeti",
  "Sistem sağlığını kontrol et",
  "Büyüme fırsatlarını bul",
  "Riskler için aksiyon planı çıkar",
];

function dateFrom(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function initialMessage(): Message {
  return {
    id: "welcome",
    role: "assistant",
    body: "Merhaba, ben SeninRandevun Platform Asistanı. Canlı operasyon verilerini analiz edebilir, yönetim raporu oluşturabilir ve sizi doğru aksiyon ekranına götürebilirim. Nereden başlayalım?",
    createdAt: new Date(),
  };
}

export function AdminAssistant() {
  const [stats, setStats] = useState<AssistantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([initialMessage()]);
  const [copiedId, setCopiedId] = useState("");
  const [businessRows, setBusinessRows] = useState<ManagedBusiness[]>([]);
  const [supportRows, setSupportRows] = useState<SupportRow[]>([]);
  const [runningAction, setRunningAction] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const lastBusinessId = useRef("");
  const lastSupportId = useRef("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const db = getDb();
    const sources = await Promise.allSettled([
      getDocs(collection(db, "businesses")),
      getDocs(collection(db, "users")),
      getDocs(query(collectionGroup(db, "appointments"), limit(1500))),
      getDocs(collection(db, "subscriptions")),
      getDocs(query(collection(db, "supportTickets"), where("status", "in", ["open", "in_progress", "waiting_user", "waiting_admin"]))),
      getDocs(query(collectionGroup(db, "reviews"), where("status", "==", "pending"), limit(250))),
      getDocs(query(collection(db, "categoryRequests"), where("status", "==", "pending"))),
    ]);
    const rows = (index: number) => sources[index].status === "fulfilled" ? sources[index].value.docs : [];
    const businesses = rows(0), appointments = rows(2), subscriptions = rows(3), support = rows(4);
    setBusinessRows(businesses.map((item) => ({ id: item.id, name: String(item.data().name ?? "İsimsiz işletme"), status: String(item.data().status ?? "active"), isSuspended: item.data().isSuspended === true })));
    setSupportRows(support.map((item) => ({ id: item.id, title: String(item.data().title ?? "Destek kaydı"), requesterName: String(item.data().requesterName ?? item.data().businessName ?? "Kullanıcı"), status: String(item.data().status ?? "open") })));
    const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
    const businessStatus = (status: string) => businesses.filter((item) => {
      const data = item.data();
      if (status === "suspended") return data.isSuspended === true || data.status === "suspended";
      if (status === "pending") return data.status === "pending_review" || data.approvalStatus === "pending";
      return data.status === status && data.isSuspended !== true;
    }).length;
    const appointmentStatus = (status: string) => appointments.filter((item) => item.data().status === status).length;
    const subscriptionStatus = (status: string) => subscriptions.filter((item) => item.data().status === status).length;
    setStats({
      businesses: businesses.length,
      activeBusinesses: businessStatus("active"),
      pendingBusinesses: businessStatus("pending"),
      suspendedBusinesses: businessStatus("suspended"),
      users: rows(1).length,
      appointments: appointments.length,
      appointments30d: appointments.filter((item) => {
        const appointmentDate = dateFrom(item.data().startAt) ?? dateFrom(item.data().createdAt);
        return appointmentDate !== null && appointmentDate.getTime() >= thirtyDaysAgo;
      }).length,
      completed: appointmentStatus("completed"),
      cancelled: appointmentStatus("cancelled"),
      noShow: appointmentStatus("no_show"),
      activeSubscriptions: subscriptionStatus("active"),
      trialSubscriptions: subscriptionStatus("trialing"),
      pastDueSubscriptions: subscriptionStatus("past_due"),
      openSupport: support.length,
      criticalSupport: support.filter((item) => ["critical", "high"].includes(String(item.data().priority))).length,
      pendingReviews: rows(5).length,
      pendingCategories: rows(6).length,
      healthySources: sources.filter((item) => item.status === "fulfilled").length,
      totalSources: sources.length,
      updatedAt: new Date(),
    });
    setLoading(false);
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadData(); }); }, [loadData]);
  useEffect(() => {
    let cancelled = false;
    void getSmartAssistantHistory("platform").then((history) => {
      if (cancelled || history.length === 0) return;
      setMessages(history.map((item) => {
        const parsed = new Date(item.createdAt);
        return { id: item.id, role: item.role, body: item.body, createdAt: Number.isNaN(parsed.getTime()) ? new Date() : parsed };
      }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  const healthScore = useMemo(() => {
    if (!stats) return 0;
    const outcome = stats.completed + stats.cancelled + stats.noShow;
    const quality = outcome ? stats.completed / outcome : 1;
    return Math.round((stats.healthySources / stats.totalSources) * 60 + quality * 40);
  }, [stats]);

  function createAnswer(raw: string): Omit<Message, "id" | "role" | "createdAt"> {
    if (!stats) return { body: "Canlı veriler henüz hazır değil. Birkaç saniye sonra tekrar deneyin." };
    const text = raw.toLocaleLowerCase("tr-TR");
    const outcome = stats.completed + stats.cancelled + stats.noShow;
    const problemRate = outcome ? ((stats.cancelled + stats.noShow) / outcome) * 100 : 0;
    const mrr = Math.round(stats.activeSubscriptions * PLAN_PRICE.monthlyEquivalent);
    const moderation = stats.pendingReviews + stats.pendingCategories;
    if (/^(selam|merhaba|hey|sa|günaydın|iyi akşamlar)[!. ]*$/.test(text)) return { body: `Merhaba! Ben iyiyim ve platform için hazırım 🙂 Şu anda sağlık puanı ${healthScore}/100; ${stats.pendingBusinesses + stats.criticalSupport + moderation} operasyon kaydı dikkatinizi bekliyor. Siz nasılsınız, bugün neyi birlikte yönetelim?` };
    if (/nasılsın|ne haber|naber/.test(text)) return { body: `Gayet iyiyim, teşekkür ederim 🙂 Platformu da kontrol ettim: ${stats.healthySources}/${stats.totalSources} veri kaynağı canlı ve sağlık puanı ${healthScore}/100. İsterseniz size bugünün önceliklerini hemen sıralayayım.` };
    if (/teşekkür|sağ ol|eyvallah/.test(text)) return { body: "Rica ederim 🙂 Platformu birlikte daha güçlü hale getiriyoruz. Sıradaki işlemi söylemeniz yeterli." };

    const directBusiness = businessRows.find((item) => text.includes(item.name.toLocaleLowerCase("tr-TR")));
    if (directBusiness) lastBusinessId.current = directBusiness.id;
    const mentionedBusiness = directBusiness ?? (/onu|bu işletme|aynı işletme|az önceki/.test(text) ? businessRows.find((item) => item.id === lastBusinessId.current) : undefined);
    if (mentionedBusiness && /(paket|plan)/.test(text) && /(güncelle|değiştir|yap|ata)/.test(text)) {
      const plan = text.match(/\b(free|pro|business|randevugo)\b/i)?.[1]?.toUpperCase();
      if (plan) return { body: `${mentionedBusiness.name} işletmesinin paketi ${plan} olarak değiştirilecek. Abonelik yetkilerini etkileyen bu işlem için onayınızı bekliyorum.`, actions: [{ label: `${plan} paketine geçir`, businessOperation: { businessId: mentionedBusiness.id, businessName: mentionedBusiness.name, operation: "plan", plan } }, { label: "Abonelikleri incele", href: "/super-admin/abonelikler" }] };
      return { body: `${mentionedBusiness.name} işletmesini buldum. Hedef paketi FREE, PRO, BUSINESS veya RANDEVUGO olarak belirtin; örneğin “${mentionedBusiness.name} planını PRO yap”.` };
    }
    if (mentionedBusiness && /(askıya al|pasif yap|durdur|aktif et|yayına al|onayla)/.test(text)) {
      const operation: BusinessOperation["operation"] = /onayla|yayına al/.test(text) && mentionedBusiness.status === "pending_review" ? "approve" : /aktif et|yayına al/.test(text) ? "activate" : "suspend";
      const wording = operation === "approve" ? "onaylanıp yayına alınacak" : operation === "activate" ? "yeniden aktif edilecek" : "askıya alınacak";
      return { body: `${mentionedBusiness.name} işletmesini buldum. İşletme ${wording}. Bu işlem mağazanın görünürlüğünü etkileyebilir; uygulamadan önce onayınızı bekliyorum.`, actions: [{ label: operation === "suspend" ? "Askıya almayı onayla" : operation === "approve" ? "Onayla ve yayınla" : "Aktif etmeyi onayla", businessOperation: { businessId: mentionedBusiness.id, businessName: mentionedBusiness.name, operation } }, { label: "İşletmeyi incele", href: "/super-admin/isletmeler" }] };
    }
    if (/(işletme|mağaza).*(askıya al|aktif et|onayla)/.test(text) && !mentionedBusiness) return { body: "İşlem yapılacak işletmeyi net bulamadım. İşletmenin panelde görünen tam adını yazın; örneğin “Dromocob işletmesini askıya al”. Uygulamadan önce size onay kartı göstereceğim.", actions: [{ label: "İşletmeleri aç", href: "/super-admin/isletmeler" }] };
    const directSupport = supportRows.find((item) => text.includes(item.requesterName.toLocaleLowerCase("tr-TR")) || text.includes(item.title.toLocaleLowerCase("tr-TR")));
    if (directSupport) lastSupportId.current = directSupport.id;
    const mentionedSupport = directSupport ?? (/onu|bu destek|aynı kayıt|az önceki/.test(text) ? supportRows.find((item) => item.id === lastSupportId.current) : undefined);
    if (mentionedSupport && /(işleme al|çöz|çözüldü|kapat|tamamla)/.test(text)) {
      const status: SupportOperation["status"] = /işleme al/.test(text) ? "in_progress" : "resolved";
      const summary = status === "in_progress" ? "işleme alınacak" : "çözüldü olarak kapatılacak";
      return { body: `“${mentionedSupport.title}” destek kaydını buldum (${mentionedSupport.requesterName}). Kayıt ${summary}. Onaylıyor musunuz?`, actions: [{ label: status === "in_progress" ? "İşleme almayı onayla" : "Çözümü onayla", supportOperation: { ticketId: mentionedSupport.id, title: mentionedSupport.title, status } }, { label: "Destek kaydını incele", href: "/super-admin/destek" }] };
    }
    if (/öncelik|ne yap|aksiyon|bugün/.test(text)) {
      const items = [
        { count: stats.pendingBusinesses, label: "işletme başvurusu onay bekliyor", href: "/super-admin/isletmeler" },
        { count: stats.criticalSupport, label: "kritik destek kaydı var", href: "/super-admin/destek" },
        { count: moderation, label: "moderasyon kaydı bekliyor", href: "/super-admin/moderasyon" },
        { count: stats.pastDueSubscriptions, label: "abonelik ödeme riski taşıyor", href: "/super-admin/abonelikler" },
      ].filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
      return items.length ? {
        body: `Şu anda ${items.reduce((sum, item) => sum + item.count, 0)} aksiyon bekleyen kayıt var. Önce ${items[0].count} ${items[0].label}. Ardından ${items.slice(1).map((item) => `${item.count} ${item.label}`).join(", ") || "diğer akışlar temiz"}.`,
        actions: items.slice(0, 3).map((item) => ({ label: `${item.count} kaydı aç`, href: item.href })),
      } : { body: "Harika: onay, kritik destek, moderasyon ve ödeme riski kuyruklarında bekleyen kayıt yok. Büyüme ve randevu kalitesine odaklanabilirsiniz.", actions: [{ label: "Analitiği aç", href: "/super-admin/analitik" }] };
    }
    if (/işletme|mağaza|onay/.test(text)) return {
      body: `Platformda ${stats.businesses} işletme var: ${stats.activeBusinesses} aktif, ${stats.pendingBusinesses} onay bekliyor, ${stats.suspendedBusinesses} askıda. Aktiflik oranı %${stats.businesses ? (stats.activeBusinesses / stats.businesses * 100).toFixed(1) : "0"}.`,
      actions: [{ label: "İşletmeleri yönet", href: "/super-admin/isletmeler" }],
    };
    if (/destek|mesaj|talep/.test(text)) return {
      body: `${stats.openSupport} açık destek kaydı bulunuyor. Bunların ${stats.criticalSupport} tanesi yüksek veya kritik öncelikli. Kritik kayıtları önce ele almak müşteri kaybı riskini azaltır.`,
      actions: [{ label: "Destek merkezini aç", href: "/super-admin/destek" }],
    };
    if (/randevu|iptal|gelmedi|kalite/.test(text)) return {
      body: `Toplam ${stats.appointments} randevu içinde ${stats.completed} tamamlanan, ${stats.cancelled} iptal ve ${stats.noShow} gelmeme kaydı var. Son 30 gün hacmi ${stats.appointments30d}. Sonuçlanmış randevularda sorun oranı %${problemRate.toFixed(1)}; ${problemRate > 15 ? "iptal ve no-show azaltma akışları önceliklendirilmeli" : "operasyon kalitesi sağlıklı aralıkta"}.`,
      actions: [{ label: "Analitiği incele", href: "/super-admin/analitik" }],
    };
    if (/gelir|abonelik|ödeme|mrr/.test(text)) return {
      body: `${stats.activeSubscriptions} aktif, ${stats.trialSubscriptions} deneme ve ${stats.pastDueSubscriptions} ödeme bekleyen abonelik var. Mevcut plan üzerinden tahmini aylık tekrar eden gelir ${mrr.toLocaleString("tr-TR")} ₺.`,
      actions: [{ label: "Abonelikleri aç", href: "/super-admin/abonelikler" }],
    };
    if (/kullanıcı|müşteri/.test(text)) return { body: `Platformda kayıtlı ${stats.users.toLocaleString("tr-TR")} kullanıcı ve ${stats.businesses} işletme bulunuyor. Kullanıcı davranışı ve trafik kırılımını analitik ekranından inceleyebilirsiniz.`, actions: [{ label: "Kullanıcıları aç", href: "/super-admin/kullanicilar" }, { label: "Analitiği aç", href: "/super-admin/analitik" }] };
    if (/sistem|sağlık|hata|kaynak/.test(text)) return { body: `Platform sağlık puanı ${healthScore}/100. ${stats.healthySources}/${stats.totalSources} veri kaynağı erişilebilir. ${stats.healthySources === stats.totalSources ? "Canlı veri bağlantılarının tamamı sağlıklı." : "Erişilemeyen kaynaklar için yetki ve indeks kontrolleri yapılmalı."}`, actions: [{ label: "Audit kayıtları", href: "/super-admin/audit-logs" }] };
    if (/rapor|özet|indir|csv/.test(text)) return { body: `Yönetim raporunu hazırladım. Rapor; platform sağlığı, işletme, kullanıcı, randevu, destek, moderasyon ve abonelik göstergelerini ${stats.updatedAt.toLocaleString("tr-TR")} anlık görüntüsüyle içeriyor.`, actions: [{ label: "Raporu indir", report: true }] };
    if (/moderasyon|yorum|kategori/.test(text)) return { body: `${stats.pendingReviews} yorum ve ${stats.pendingCategories} kategori isteği olmak üzere toplam ${moderation} moderasyon kaydı bekliyor.`, actions: [{ label: "Moderasyonu aç", href: "/super-admin/moderasyon" }] };
    if (/büyü|fırsat|geliştir/.test(text)) {
      const activeRate = stats.businesses ? stats.activeBusinesses / stats.businesses * 100 : 0;
      return { body: `Büyüme radarı üç fırsat gösteriyor: ${stats.trialSubscriptions} deneme işletmesini aboneliğe dönüştürmek, aktiflik oranını %${activeRate.toFixed(1)} seviyesinden yükseltmek ve son 30 gündeki ${stats.appointments30d} randevu hacmini yerel keşif trafiğiyle büyütmek. Önce denemedeki işletmelerin kurulum tamamlama ve kullanım sıklığını inceleyin.`, actions: [{ label: "Abonelik havuzu", href: "/super-admin/abonelikler" }, { label: "Ziyaretçi analitiği", href: "/super-admin/analitik" }] };
    }
    if (/risk|aksiyon planı|plan çıkar/.test(text)) {
      const riskTotal = stats.criticalSupport + stats.pastDueSubscriptions + stats.pendingBusinesses + moderation;
      return { body: riskTotal ? `Önerilen aksiyon planı: 1) ${stats.criticalSupport} kritik destek kaydını sonuçlandırın. 2) ${stats.pendingBusinesses} işletme başvurusunu inceleyin. 3) ${moderation} moderasyon kaydını temizleyin. 4) ${stats.pastDueSubscriptions} ödeme riskini takip edin. Toplam ${riskTotal} kayıt operasyon takibi istiyor.` : "Kritik risk kuyruğu temiz. Sonraki plan: deneme dönüşümü, randevu hacmi ve işletme aktiflik oranını büyütmek.", actions: [{ label: "Komuta merkezini aç", href: "/super-admin" }, { label: "Audit kontrolü", href: "/super-admin/audit-logs" }] };
    }
    return { body: "Bunu canlı platform verisiyle güvenli bir komuta çevirebilirim. İşletmeler, destek, randevu kalitesi, kullanıcılar, abonelik, moderasyon, sistem sağlığı veya yönetim raporu hakkında sorabilirsiniz.", actions: [{ label: "Platform özeti", href: "/super-admin" }] };
  }

  async function submit(raw = input) {
    const clean = raw.trim();
    if (!clean || thinking) return;
    const history = messages.slice(-6).map((item) => ({ role: item.role, body: item.body }));
    const deterministic = createAnswer(clean);
    setInput("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", body: clean, createdAt: new Date() }]);
    setThinking(true);
    try {
      const response = await askSmartAssistant({
        scope: "platform",
        message: clean,
        history,
        context: {
          healthScore,
          metrics: stats ? {
            businesses: stats.businesses,
            activeBusinesses: stats.activeBusinesses,
            pendingBusinesses: stats.pendingBusinesses,
            suspendedBusinesses: stats.suspendedBusinesses,
            users: stats.users,
            appointments: stats.appointments,
            appointmentsLast30Days: stats.appointments30d,
            completedAppointments: stats.completed,
            cancelledAppointments: stats.cancelled,
            noShowAppointments: stats.noShow,
            activeSubscriptions: stats.activeSubscriptions,
            trialSubscriptions: stats.trialSubscriptions,
            pastDueSubscriptions: stats.pastDueSubscriptions,
            openSupportTickets: stats.openSupport,
            criticalSupportTickets: stats.criticalSupport,
            pendingReviews: stats.pendingReviews,
            pendingCategories: stats.pendingCategories,
            healthyDataSources: stats.healthySources,
            totalDataSources: stats.totalSources,
          } : null,
        },
      });
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: response.body, actions: deterministic.actions, createdAt: new Date() }]);
    } catch {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", createdAt: new Date(), ...deterministic }]);
    } finally {
      setThinking(false);
    }
  }

  async function clearConversation() {
    setMessages([initialMessage()]);
    await clearSmartAssistantHistory("platform").catch(() => undefined);
  }

  function exportReport() {
    if (!stats) return;
    const report = `# SeninRandevun Platform Yönetim Raporu\n\nTarih: ${stats.updatedAt.toLocaleString("tr-TR")}\nSağlık puanı: ${healthScore}/100\n\n## İşletmeler\n- Toplam: ${stats.businesses}\n- Aktif: ${stats.activeBusinesses}\n- Onay bekleyen: ${stats.pendingBusinesses}\n- Askıda: ${stats.suspendedBusinesses}\n\n## Operasyon\n- Kullanıcı: ${stats.users}\n- Randevu: ${stats.appointments}\n- Son 30 gün randevu: ${stats.appointments30d}\n- Açık destek: ${stats.openSupport}\n- Kritik destek: ${stats.criticalSupport}\n- Moderasyon: ${stats.pendingReviews + stats.pendingCategories}\n\n## Abonelik\n- Aktif: ${stats.activeSubscriptions}\n- Deneme: ${stats.trialSubscriptions}\n- Ödeme bekleyen: ${stats.pastDueSubscriptions}\n`;
    const url = URL.createObjectURL(new Blob([report], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `seninrandevun-yonetim-raporu-${new Date().toISOString().slice(0, 10)}.md`; anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyMessage(message: Message) {
    await navigator.clipboard.writeText(message.body);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(""), 1400);
  }

  async function runBusinessOperation(action: BusinessOperation) {
    if (runningAction) return;
    setRunningAction(action.businessId);
    try {
      if (action.operation === "approve") {
        const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "reviewBusiness");
        await callable({ businessId: action.businessId, decision: "approved" });
      } else if (action.operation === "plan") {
        const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "assignBusinessPlan");
        await callable({ businessId: action.businessId, plan: action.plan, status: "active" });
      } else {
        await updateDoc(doc(getDb(), "businesses", action.businessId), {
          isSuspended: action.operation === "suspend",
          status: action.operation === "suspend" ? "suspended" : "active",
          updatedAt: serverTimestamp(),
        });
        void addDoc(collection(getDb(), "platformAuditLogs"), { action: `assistant.business_${action.operation}`, businessId: action.businessId, actorSource: "platform_assistant", createdAt: serverTimestamp() }).catch(() => undefined);
      }
      const result = action.operation === "approve" ? "onaylandı ve yayına alındı" : action.operation === "suspend" ? "askıya alındı" : action.operation === "plan" ? `${action.plan} paketine geçirildi` : "aktif edildi";
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `İşlem tamamlandı ✅ ${action.businessName} ${result}. Canlı platform verilerini yeniledim.`, createdAt: new Date(), actions: [{ label: "İşletmeleri kontrol et", href: "/super-admin/isletmeler" }] }]);
      await loadData();
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `İşlem uygulanamadı: ${(error as Error).message || "Yetki veya bağlantı hatası oluştu."}`, createdAt: new Date() }]);
    } finally { setRunningAction(""); }
  }

  async function runSupportOperation(action: SupportOperation) {
    if (runningAction) return;
    setRunningAction(action.ticketId);
    try {
      await updateDoc(doc(getDb(), "supportTickets", action.ticketId), { status: action.status, updatedAt: serverTimestamp(), assistantManaged: true });
      void addDoc(collection(getDb(), "platformAuditLogs"), { action: `assistant.support_${action.status}`, entityId: action.ticketId, actorSource: "platform_assistant", createdAt: serverTimestamp() }).catch(() => undefined);
      const summary = action.status === "in_progress" ? "işleme alındı" : "çözüldü olarak kapatıldı";
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `Tamamlandı ✅ “${action.title}” destek kaydı ${summary}.`, createdAt: new Date(), actions: [{ label: "Destek merkezini aç", href: "/super-admin/destek" }] }]);
      await loadData();
    } catch (error) { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", body: `Destek kaydı güncellenemedi: ${(error as Error).message}`, createdAt: new Date() }]); }
    finally { setRunningAction(""); }
  }

  const executiveCards = stats ? [
    { icon: ShieldAlert, label: "Aksiyon kuyruğu", value: stats.pendingBusinesses + stats.criticalSupport + stats.pendingReviews + stats.pendingCategories, detail: "onay, destek ve moderasyon", prompt: "Bugün önceliğimiz ne?" },
    { icon: TrendingUp, label: "Büyüme sinyali", value: stats.trialSubscriptions, detail: "dönüşüm bekleyen deneme", prompt: "Büyüme fırsatlarını bul" },
    { icon: BrainCircuit, label: "Platform zekâsı", value: `${healthScore}/100`, detail: `${stats.healthySources}/${stats.totalSources} kaynak canlı`, prompt: "Riskler için aksiyon planı çıkar" },
  ] : [];

  return <main className="admin-assistant-page">
    <section className="admin-assistant-hero">
      <div><span><Sparkles size={15}/> PLATFORM ZEKÂ KATMANI</span><h2>Sor, analiz et,<br/>aksiyona geç.</h2><p>Canlı platform verisini konuşmaya dönüştüren güvenli yönetim asistanınız.</p></div>
      <aside><i className={loading ? "is-loading" : ""}><Bot size={30}/></i><div><small>ASİSTAN DURUMU</small><b>{loading ? "Veriler hazırlanıyor" : "Canlı ve hazır"}</b><span>{stats ? `${stats.healthySources}/${stats.totalSources} veri kaynağı bağlı` : "Güvenli bağlantı kuruluyor"}</span></div><button type="button" onClick={() => void loadData()} disabled={loading} aria-label="Verileri yenile"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button></aside>
    </section>

    <section className="assistant-command-deck" aria-label="Yönetici brifingi">{executiveCards.map((card) => <button type="button" key={card.label} onClick={() => submit(card.prompt)}><span><card.icon size={18}/></span><div><small>{card.label}</small><b>{card.value}</b><p>{card.detail}</p></div><ArrowRight size={15}/></button>)}</section>

    <section className="admin-assistant-layout">
      <div className="admin-assistant-chat">
        <header><div><Bot size={20}/><span><b>SR Platform Asistanı</b><small>Gerçek zamanlı yönetim yardımcısı</small></span></div><nav><i><span/> ÇEVRİMİÇİ</i><button type="button" onClick={() => void clearConversation()} aria-label="Sohbeti temizle" title="Sohbeti temizle"><Trash2 size={14}/></button></nav></header>
        <div className="admin-assistant-messages" aria-live="polite">
          {messages.map((message) => <article key={message.id} className={message.role}>
            {message.role === "assistant" && <span className="message-avatar"><Bot size={16}/></span>}
            <div><p>{message.body}</p>{message.actions && <nav>{message.actions.map((action) => action.href ? <Link key={action.label} href={action.href}>{action.label}<ArrowRight size={13}/></Link> : action.businessOperation ? <button className="assistant-confirm-action" key={action.label} type="button" onClick={() => action.businessOperation && void runBusinessOperation(action.businessOperation)} disabled={Boolean(runningAction)}>{runningAction === action.businessOperation.businessId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : action.supportOperation ? <button className="assistant-confirm-action" key={action.label} type="button" onClick={() => action.supportOperation && void runSupportOperation(action.supportOperation)} disabled={Boolean(runningAction)}>{runningAction === action.supportOperation.ticketId ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} {action.label}</button> : <button key={action.label} type="button" onClick={exportReport}><Download size={13}/>{action.label}</button>)}</nav>}<footer><time>{message.createdAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</time>{message.role === "assistant" && <button type="button" onClick={() => void copyMessage(message)} aria-label="Yanıtı kopyala">{copiedId === message.id ? <CheckCircle2 size={12}/> : <Copy size={12}/>}</button>}</footer></div>
          </article>)}
          {thinking && <article className="assistant"><span className="message-avatar"><Bot size={16}/></span><div className="assistant-thinking"><i/><i/><i/></div></article>}
          <div ref={endRef}/>
        </div>
        <div className="admin-assistant-prompts">{QUICK_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => void submit(prompt)} disabled={loading || thinking}>{prompt}</button>)}</div>
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(); }}><label><Sparkles size={17}/><textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Platform hakkında bir şey sorun veya komut verin…" disabled={loading}/></label><button type="submit" disabled={loading || thinking || !input.trim()} aria-label="Gönder">{thinking ? <LoaderCircle size={19} className="animate-spin"/> : <Send size={19}/>}</button></form>
        <footer><ShieldAlert size={13}/> Kritik yönetim işlemleri asistan tarafından doğrudan uygulanmaz; güvenli yönetim ekranında onayınız istenir.</footer>
      </div>

      <aside className="admin-assistant-context">
        <header><span>CANLI BAĞLAM</span><b>Platform özeti</b><small>{stats?.updatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) ?? "—"} itibarıyla</small></header>
        <div className="assistant-health"><span style={{ "--score": `${healthScore}%` } as React.CSSProperties}><b>{healthScore}</b><small>/100</small></span><div><b>Operasyon sağlığı</b><small>{healthScore >= 85 ? "Platform güçlü durumda" : healthScore >= 65 ? "Bazı alanlar izlenmeli" : "Aksiyon gerekiyor"}</small></div></div>
        <div className="assistant-context-grid">
          <ContextMetric icon={Building2} label="İşletme" value={stats?.businesses}/>
          <ContextMetric icon={UsersRound} label="Kullanıcı" value={stats?.users}/>
          <ContextMetric icon={CalendarDays} label="30 gün" value={stats?.appointments30d}/>
          <ContextMetric icon={Headphones} label="Açık destek" value={stats?.openSupport}/>
        </div>
        <div className="assistant-attention"><b><ShieldAlert size={15}/> Aksiyon radarı</b><Attention label="İşletme onayı" value={stats?.pendingBusinesses ?? 0} href="/super-admin/isletmeler"/><Attention label="Kritik destek" value={stats?.criticalSupport ?? 0} href="/super-admin/destek"/><Attention label="Moderasyon" value={(stats?.pendingReviews ?? 0) + (stats?.pendingCategories ?? 0)} href="/super-admin/moderasyon"/><Attention label="Ödeme riski" value={stats?.pastDueSubscriptions ?? 0} href="/super-admin/abonelikler"/></div>
        <button className="assistant-report-button" type="button" onClick={exportReport} disabled={!stats}><Download size={16}/> Yönetim raporunu indir</button>
      </aside>
    </section>
  </main>;
}

function ContextMetric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value?: number }) {
  return <div><span><Icon size={16}/></span><b>{value?.toLocaleString("tr-TR") ?? "—"}</b><small>{label}</small></div>;
}

function Attention({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link href={href}><span>{value ? <ShieldAlert size={14}/> : <CheckCircle2 size={14}/>} {label}</span><b>{value}</b></Link>;
}
