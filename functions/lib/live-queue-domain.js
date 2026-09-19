"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMINAL_QUEUE_STATUSES = exports.ACTIVE_QUEUE_STATUSES = void 0;
exports.isQueueStatus = isQueueStatus;
exports.isActiveQueueStatus = isActiveQueueStatus;
exports.canTransitionQueue = canTransitionQueue;
exports.isSameActiveJoin = isSameActiveJoin;
exports.liveQueueGate = liveQueueGate;
exports.liveOperationsGate = liveOperationsGate;
exports.queueIntakeOpen = queueIntakeOpen;
exports.operatorQueueTransitions = operatorQueueTransitions;
exports.validateQueueSelection = validateQueueSelection;
exports.ACTIVE_QUEUE_STATUSES = ["waiting", "on_the_way", "called", "in_service"];
exports.TERMINAL_QUEUE_STATUSES = ["completed", "cancelled", "expired", "no_show"];
const TRANSITIONS = {
    waiting: ["on_the_way", "called", "cancelled", "expired"],
    on_the_way: ["called", "cancelled", "expired"],
    called: ["in_service", "cancelled", "no_show", "expired"],
    in_service: ["completed", "cancelled"],
    completed: [], cancelled: [], expired: [], no_show: [],
};
function isQueueStatus(value) {
    return typeof value === "string" && Object.hasOwn(TRANSITIONS, value);
}
function isActiveQueueStatus(value) {
    return isQueueStatus(value) && exports.ACTIVE_QUEUE_STATUSES.includes(value);
}
function canTransitionQueue(from, to) {
    return TRANSITIONS[from].includes(to);
}
function isSameActiveJoin(entry, customerId, serviceId, staffId) {
    return !!entry && isActiveQueueStatus(entry.status) && entry.customerId === customerId &&
        entry.serviceId === serviceId && entry.requestedStaffId === staffId;
}
function liveQueueGate(flags, businessEnabled) {
    if (!flags || typeof flags !== "object" || Array.isArray(flags))
        return false;
    const values = flags;
    if (["liveFeaturesMaster", "liveAvailability", "liveQueue", "lastMinuteSlots", "availabilityAlerts", "liveOperations"]
        .some((key) => typeof values[key] !== "boolean"))
        return false;
    return values.liveFeaturesMaster === true && values.liveQueue === true && businessEnabled === true;
}
function liveOperationsGate(flags) {
    return liveQueueGate(flags, true) && flags.liveOperations === true;
}
function queueIntakeOpen(flags, businessEnabled, paused) {
    return liveOperationsGate(flags) && businessEnabled === true && paused !== true;
}
function operatorQueueTransitions(from) {
    return TRANSITIONS[from].filter((to) => to !== "on_the_way");
}
function validateQueueSelection(business, service, staff, serviceId, staffId) {
    if (!business || business.status !== "active" || business.isPublished !== true || business.isSuspended === true)
        return "business";
    if (!service || service.isActive !== true || service.isBookableOnline !== true)
        return "service";
    if (typeof service.durationMinutes !== "number" || !Number.isFinite(service.durationMinutes) ||
        service.durationMinutes < 5 || service.durationMinutes > 480)
        return "service";
    if (staffId) {
        if (!staff || staff.isActive !== true || staff.archivedAt)
            return "staff";
        const allowedStaff = Array.isArray(service.assignableStaffIds) ? service.assignableStaffIds : [];
        const services = Array.isArray(staff.serviceIds) ? staff.serviceIds : [];
        const specialties = Array.isArray(staff.specialtyCategoryIds) ? staff.specialtyCategoryIds : [];
        if (allowedStaff.length > 0 && !allowedStaff.includes(staffId))
            return "staff";
        if (services.length > 0 && !services.includes(serviceId))
            return "staff";
        if (specialties.length > 0 && !specialties.includes(service.category))
            return "staff";
    }
    return null;
}
//# sourceMappingURL=live-queue-domain.js.map