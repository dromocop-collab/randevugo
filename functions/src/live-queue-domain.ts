export const ACTIVE_QUEUE_STATUSES = ["waiting", "on_the_way", "called", "in_service"] as const;
export const TERMINAL_QUEUE_STATUSES = ["completed", "cancelled", "expired", "no_show"] as const;
export type QueueStatus = typeof ACTIVE_QUEUE_STATUSES[number] | typeof TERMINAL_QUEUE_STATUSES[number];
export type QueueAssignmentMode = "specific_staff" | "first_available";

const TRANSITIONS: Record<QueueStatus, readonly QueueStatus[]> = {
  waiting: ["on_the_way", "called", "cancelled", "expired"],
  on_the_way: ["called", "cancelled", "expired"],
  called: ["in_service", "cancelled", "no_show", "expired"],
  in_service: ["completed", "cancelled"],
  completed: [], cancelled: [], expired: [], no_show: [],
};

export function isQueueStatus(value: unknown): value is QueueStatus {
  return typeof value === "string" && Object.hasOwn(TRANSITIONS, value);
}

export function isActiveQueueStatus(value: unknown): value is typeof ACTIVE_QUEUE_STATUSES[number] {
  return isQueueStatus(value) && ACTIVE_QUEUE_STATUSES.includes(value as typeof ACTIVE_QUEUE_STATUSES[number]);
}

export function canTransitionQueue(from: QueueStatus, to: QueueStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isSameActiveJoin(entry: Record<string, unknown> | null, customerId: string, serviceId: string, staffId: string | null): boolean {
  return !!entry && isActiveQueueStatus(entry.status) && entry.customerId === customerId &&
    entry.serviceId === serviceId && entry.requestedStaffId === staffId;
}

export function liveQueueGate(flags: unknown, businessEnabled: unknown): boolean {
  if (!flags || typeof flags !== "object" || Array.isArray(flags)) return false;
  const values = flags as Record<string, unknown>;
  if (["liveFeaturesMaster", "liveAvailability", "liveQueue", "lastMinuteSlots", "availabilityAlerts", "liveOperations"]
    .some((key) => typeof values[key] !== "boolean")) return false;
  return values.liveFeaturesMaster === true && values.liveQueue === true && businessEnabled === true;
}

export function liveOperationsGate(flags: unknown): boolean {
  return liveQueueGate(flags, true) && (flags as Record<string, unknown>).liveOperations === true;
}

export function queueIntakeOpen(flags: unknown, businessEnabled: unknown, paused: unknown): boolean {
  return liveOperationsGate(flags) && businessEnabled === true && paused !== true;
}

export function operatorQueueTransitions(from: QueueStatus): readonly QueueStatus[] {
  return TRANSITIONS[from].filter((to) => to !== "on_the_way");
}

export function validateQueueSelection(
  business: Record<string, unknown> | null,
  service: Record<string, unknown> | null,
  staff: Record<string, unknown> | null,
  serviceId: string,
  staffId: string | null,
): "business" | "service" | "staff" | null {
  if (!business || business.status !== "active" || business.isPublished !== true || business.isSuspended === true) return "business";
  if (!service || service.isActive !== true || service.isBookableOnline !== true) return "service";
  if (typeof service.durationMinutes !== "number" || !Number.isFinite(service.durationMinutes) ||
    service.durationMinutes < 5 || service.durationMinutes > 480) return "service";
  if (staffId) {
    if (!staff || staff.isActive !== true || staff.archivedAt) return "staff";
    const allowedStaff = Array.isArray(service.assignableStaffIds) ? service.assignableStaffIds : [];
    const services = Array.isArray(staff.serviceIds) ? staff.serviceIds : [];
    const specialties = Array.isArray(staff.specialtyCategoryIds) ? staff.specialtyCategoryIds : [];
    if (allowedStaff.length > 0 && !allowedStaff.includes(staffId)) return "staff";
    if (services.length > 0 && !services.includes(serviceId)) return "staff";
    if (specialties.length > 0 && !specialties.includes(service.category)) return "staff";
  }
  return null;
}
