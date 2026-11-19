// Personel saati ↔ işletme saati uyumu. Test: staff-hours-sync.test.mjs
// Randevu motoru iki saatin KESİŞİMİNİ kullanır: işletme 21:00'e kadar açık ama personel 19:00'da bitiyorsa
// müşteri 19:00'dan sonrasını göremez. İşletme saatini uzatan sahip bunu fark etmiyordu.
import type { DaySchedule } from "@/types/business";

export type StaffHoursGapDay = { day: number; businessStart: string; businessEnd: string; staffStart: string; staffEnd: string };
export type StaffHoursGap = { staffId: string; name: string; days: StaffHoursGapDay[] };

type StaffLike = { id: string; fullName?: string; isActive?: boolean; workingHours?: DaySchedule[] };

/** Personelin işletme açıkken daha geç başladığı ya da daha erken bitirdiği günler (izin günleri sayılmaz). */
export function staffHoursGaps(businessHours: DaySchedule[], staff: StaffLike[]): StaffHoursGap[] {
  const result: StaffHoursGap[] = [];
  for (const member of staff) {
    if (member.isActive === false) continue;
    const hours = Array.isArray(member.workingHours) ? member.workingHours : [];
    // Saat tanımlanmamış personel zaten işletme saatini kullanır.
    if (!hours.length) continue;
    const days: StaffHoursGapDay[] = [];
    for (const business of businessHours) {
      if (!business.isOpen) continue;
      const own = hours.find((item) => item.day === business.day);
      if (!own || !own.isOpen) continue;
      if (own.start > business.start || own.end < business.end) {
        days.push({ day: business.day, businessStart: business.start, businessEnd: business.end, staffStart: own.start, staffEnd: own.end });
      }
    }
    if (days.length) result.push({ staffId: member.id, name: member.fullName?.trim() || "Personel", days });
  }
  return result;
}

/** Personelin çalıştığı günlerde saatini işletme saatine eşitler; izin günleri ve molalar korunur. */
export function alignStaffHours(staffHours: DaySchedule[], businessHours: DaySchedule[]): DaySchedule[] {
  return staffHours.map((own) => {
    const business = businessHours.find((item) => item.day === own.day);
    if (!business?.isOpen || !own.isOpen) return own;
    const next: DaySchedule = { ...own, start: business.start, end: business.end };
    // Mola yeni aralığın dışında kaldıysa kaldırılır (geçersiz program olmasın).
    if (next.breakStart && next.breakEnd && (next.breakStart < next.start || next.breakEnd > next.end)) {
      delete next.breakStart;
      delete next.breakEnd;
    }
    return next;
  });
}
