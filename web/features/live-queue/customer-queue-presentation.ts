import type { CustomerQueueEntry } from "./customer-queue-repository";

export const customerQueueStatusCopy: Record<CustomerQueueEntry["status"], { title: string; detail: string }> = {
  waiting: { title: "Sıradasın", detail: "İşletmenin seni çağırmasını buradan takip edebilirsin." },
  on_the_way: { title: "Yola çıktığını bildirdik", detail: "Bu bildirim sıranın süresiz tutulacağı anlamına gelmez." },
  called: { title: "Sıran geldi", detail: "İşletme seni bekliyor." },
  in_service: { title: "İşlemin başladı", detail: "Hizmetin devam ediyor." },
  completed: { title: "İşlem tamamlandı", detail: "Canlı sıra deneyimin tamamlandı." },
  cancelled: { title: "Sıradan ayrıldın", detail: "Canlı sıra kaydın kapatıldı." },
  expired: { title: "Sıran sona erdi", detail: "Canlı sıra süresi doldu." },
  no_show: { title: "Gelmedi olarak işaretlendin", detail: "Daha fazla bilgi için işletmeyle görüşebilirsin." },
};

export function canCustomerLeaveQueue(status: CustomerQueueEntry["status"]): boolean {
  return status === "waiting" || status === "on_the_way";
}
