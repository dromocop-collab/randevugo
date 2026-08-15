export type MemberRole = "owner" | "admin" | "manager" | "staff";

export const MANAGER_ROLES: MemberRole[] = ["owner", "admin", "manager"];
export const OPERATOR_ROLES: MemberRole[] = [
  "owner",
  "admin",
  "manager",
  "staff",
];

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "İşletme Sahibi",
  admin: "Yönetici",
  manager: "Müdür",
  staff: "Çalışan",
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: "İşletmenin tam sahibi. Paket, faturalama, üyeler ve kritik ayarlar.",
  admin: "Randevular, çalışanlar, hizmetler, müşteriler ve ayarlar.",
  manager: "Günlük operasyon, randevular, çalışan takvimi, CRM.",
  staff: "Kendi randevuları, çalışma takvimi ve atanmış müşteriler.",
};
