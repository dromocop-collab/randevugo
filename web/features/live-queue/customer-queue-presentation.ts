import type { CustomerQueueEntry } from "./customer-queue-repository";
import { tk } from "../../i18n/config.ts";

/** Metinler tk() ile işaretli Türkçe kaynaktır; gösterirken t(copy.title) kullanın. */

export const customerQueueStatusCopy: Record<CustomerQueueEntry["status"], { title: string; detail: string }> = {
  waiting: { title: tk("Sıradasın"), detail: tk("İşletmenin seni çağırmasını buradan takip edebilirsin.") },
  on_the_way: { title: tk("Yola çıktığını bildirdik"), detail: tk("Bu bildirim sıranın süresiz tutulacağı anlamına gelmez.") },
  called: { title: tk("Sıran geldi"), detail: tk("İşletme seni bekliyor.") },
  in_service: { title: tk("İşlemin başladı"), detail: tk("Hizmetin devam ediyor.") },
  completed: { title: tk("İşlem tamamlandı"), detail: tk("Canlı sıra deneyimin tamamlandı.") },
  cancelled: { title: tk("Sıradan ayrıldın"), detail: tk("Canlı sıra kaydın kapatıldı.") },
  expired: { title: tk("Sıran sona erdi"), detail: tk("Canlı sıra süresi doldu.") },
  no_show: { title: tk("Gelmedi olarak işaretlendin"), detail: tk("Daha fazla bilgi için işletmeyle görüşebilirsin.") },
};

export function canCustomerLeaveQueue(status: CustomerQueueEntry["status"]): boolean {
  return status === "waiting" || status === "on_the_way";
}
