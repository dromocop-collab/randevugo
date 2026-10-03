export const SUBSCRIPTION_ENTITLEMENTS = [
  { key: "appointments", label: "Randevu ve gelişmiş takvim", description: "Takvim, randevu yönetimi ve panelden hızlı kayıt", group: "Temel operasyon" },
  { key: "branches", label: "Çoklu şube", description: "Ana işletmeye bağlı yeni şubeler açma", group: "Temel operasyon" },
  { key: "staff", label: "Çalışan yönetimi", description: "Çalışan, yetki ve çalışma planı yönetimi", group: "Temel operasyon" },
  { key: "services", label: "Hizmet yönetimi", description: "Hizmet, kategori, süre ve fiyat yönetimi", group: "Temel operasyon" },
  { key: "customers", label: "Müşteri CRM", description: "Müşteri profilleri, geçmiş ve notlar", group: "Müşteri deneyimi" },
  { key: "reviews", label: "Yorum yönetimi", description: "Yorumları görüntüleme ve yanıtlama", group: "Müşteri deneyimi" },
  { key: "waitlist", label: "Bekleme listesi", description: "Boşalan saatlere müşteri toplama", group: "Müşteri deneyimi" },
  { key: "live_queue", label: "Canlı sıra", description: "Sıra, bekleme süresi ve canlı operasyon", group: "Müşteri deneyimi" },
  { key: "checkout", label: "Kasa ve adisyon", description: "Tahsilat, adisyon ve ödeme takibi", group: "Satış ve finans" },
  { key: "packages", label: "Hizmet paketleri", description: "Seans paketi oluşturma, satma ve kullanma", group: "Satış ve finans" },
  { key: "finance", label: "Finans ve stok", description: "Gelir, gider, ürün ve stok yönetimi", group: "Satış ve finans" },
  { key: "analytics", label: "Gelişmiş analiz", description: "Performans, doluluk ve büyüme raporları", group: "Büyüme" },
  { key: "automations", label: "Otomasyonlar", description: "Hatırlatma ve işletme otomasyonları", group: "Büyüme" },
  { key: "assistant", label: "İşletme asistanı", description: "Rovi işletme asistanı ve öneriler", group: "Büyüme" },
] as const;

export type SubscriptionEntitlement = typeof SUBSCRIPTION_ENTITLEMENTS[number]["key"];

export const ALL_SUBSCRIPTION_ENTITLEMENTS: SubscriptionEntitlement[] =
  SUBSCRIPTION_ENTITLEMENTS.map((item) => item.key);

export const DASHBOARD_ROUTE_ENTITLEMENTS: Record<string, SubscriptionEntitlement> = {
  "/dashboard/subeler": "branches",
  "/dashboard/asistan": "assistant",
  "/dashboard/takvim": "appointments",
  "/dashboard/randevular": "appointments",
  "/dashboard/operasyon": "checkout",
  "/dashboard/bekleme-listesi": "waitlist",
  "/dashboard/canli-operasyon": "live_queue",
  "/dashboard/analitik": "analytics",
  "/dashboard/buyume": "analytics",
  "/dashboard/otomasyonlar": "automations",
  "/dashboard/hizmetler": "services",
  "/dashboard/calisanlar": "staff",
  "/dashboard/calisma-saatleri": "staff",
  "/dashboard/musteriler": "customers",
  "/dashboard/yorumlar": "reviews",
};

export function entitlementLabel(key: string): string {
  return SUBSCRIPTION_ENTITLEMENTS.find((item) => item.key === key)?.label ?? key;
}
