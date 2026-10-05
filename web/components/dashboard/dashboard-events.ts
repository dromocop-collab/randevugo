/** İşletme paneli kabuğu ile sayfalar arasındaki tarayıcı olayları. */

/** Hızlı randevu penceresini açar (DashboardShell dinler). */
export const NEW_APPOINTMENT_EVENT = "sr-dashboard-new-appointment";
/** Panelden randevu oluşturulduğunda/değiştiğinde yayınlanır; sayfalar veriyi tazeler. */
export const APPOINTMENTS_CHANGED_EVENT = "sr-dashboard-appointments-changed";

export function openQuickAppointment(startAt?: Date) {
  window.dispatchEvent(new CustomEvent(NEW_APPOINTMENT_EVENT, { detail: { startAt: startAt?.getTime() } }));
}

export function notifyAppointmentsChanged() {
  window.dispatchEvent(new Event(APPOINTMENTS_CHANGED_EVENT));
}
