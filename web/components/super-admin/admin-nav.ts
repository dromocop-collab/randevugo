import {
  BarChart3, BellRing, Inbox, Bot, Building2, CalendarCog, CircleGauge, ClipboardList, Headphones,
  Megaphone, MessageCircleHeart, MessageSquareText, MessagesSquare, PartyPopper, ReceiptText, Settings2, ShieldCheck, Siren, UsersRound, WalletCards, type LucideIcon,
} from "lucide-react";

export type AdminNavItem = { href: string; label: string; short?: string; icon: LucideIcon; keywords?: string };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Genel",
    items: [
      { href: "/super-admin", label: "Platform Özeti", short: "Özet", icon: CircleGauge, keywords: "dashboard panel ana sayfa kpi" },
      { href: "/super-admin/asistan", label: "Akıllı Asistan", short: "Asistan", icon: Bot, keywords: "ai yapay zeka rovi" },
      { href: "/super-admin/analitik", label: "Ziyaretçi Analitiği", short: "Analitik", icon: BarChart3, keywords: "trafik ziyaret" },
      { href: "/super-admin/reklamlar", label: "Reklamlar", icon: Megaphone, keywords: "meta facebook instagram reklam kampanya utm bütçe harcama dönüşüm" },
      { href: "/super-admin/anket", label: "Anket", icon: PartyPopper, keywords: "test karakter huni quiz dönüşüm" },
    ],
  },
  {
    label: "İşletme ve gelir",
    items: [
      { href: "/super-admin/isletmeler", label: "İşletmeler", icon: Building2, keywords: "mağaza şube onay askı gizle" },
      { href: "/super-admin/kullanicilar", label: "Kullanıcılar", icon: UsersRound, keywords: "hesap üye müşteri" },
      { href: "/super-admin/abonelikler", label: "Abonelikler", icon: WalletCards, keywords: "paket plan fiyat ödeme gelir" },
      { href: "/super-admin/odemeler", label: "Ödemeler & Faturalar", short: "Ödemeler", icon: ReceiptText, keywords: "paytr tahsilat fatura e-arşiv muhasebe kdv" },
    ],
  },
  {
    label: "Operasyon",
    items: [
      { href: "/super-admin/uyarilar", label: "Uyarılar", icon: Siren, keywords: "alarm kritik" },
      { href: "/super-admin/destek", label: "Destek", icon: Headphones, keywords: "talep ticket" },
      { href: "/super-admin/moderasyon", label: "Moderasyon", icon: ShieldCheck, keywords: "yorum gizleme kategori" },
      { href: "/super-admin/bildirimler", label: "Bildirim Merkezi", short: "Bildirim", icon: BellRing, keywords: "push duyuru" },
      { href: "/super-admin/sms", label: "SMS Merkezi", short: "SMS", icon: MessageSquareText, keywords: "mutlucell kredi" },
      { href: "/super-admin/whatsapp-gelen", label: "WhatsApp Gelen Kutusu", short: "Gelen", icon: Inbox, keywords: "whatsapp mesaj cevap sohbet müşteri yazışma otomatik" },
      { href: "/super-admin/whatsapp", label: "WhatsApp Kanalı", short: "WhatsApp", icon: MessagesSquare, keywords: "meta şablon template cloud api bildirim" },
      { href: "/super-admin/whatsapp-karsilama", label: "WhatsApp Karşılama", short: "Karşılama", icon: MessageCircleHeart, keywords: "hoş geldin yeni işletme kayıt onboarding kurulum hatırlatma deneme otomatik mesaj" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/super-admin/randevu-alanlari", label: "Randevu Alanları", icon: CalendarCog, keywords: "form alan" },
      { href: "/super-admin/ayarlar", label: "Ayarlar", icon: Settings2, keywords: "bakım seo duyuru özellik" },
      { href: "/super-admin/audit-logs", label: "Audit Kayıtları", short: "Audit", icon: ClipboardList, keywords: "log kayıt geçmiş" },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/** Mobil alt çubukta sabit duran 4 sayfa (5. öğe "Daha fazla"). */
export const ADMIN_MOBILE_PRIMARY = ["/super-admin", "/super-admin/isletmeler", "/super-admin/uyarilar", "/super-admin/destek"];

export const ALERTS_HREF = "/super-admin/uyarilar";

export function isNavActive(href: string, pathname: string) {
  return href === "/super-admin" ? pathname === "/super-admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function currentNavItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => isNavActive(item.href, pathname));
}
