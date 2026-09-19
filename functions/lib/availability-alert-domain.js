"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALERT_COOLDOWN_MINUTES = exports.LAST_MINUTE_WINDOW_HOURS = void 0;
exports.liveModuleEnabled = liveModuleEnabled;
exports.alertCoversSlot = alertCoversSlot;
exports.isNewAlertMatch = isNewAlertMatch;
exports.LAST_MINUTE_WINDOW_HOURS = 24;
exports.ALERT_COOLDOWN_MINUTES = 30;
function liveModuleEnabled(flags, module, businessEnabled) {
    if (!flags || typeof flags !== "object" || Array.isArray(flags))
        return false;
    const row = flags;
    const keys = ["liveFeaturesMaster", "liveAvailability", "liveQueue", "lastMinuteSlots", "availabilityAlerts", "liveOperations"];
    return keys.every((key) => typeof row[key] === "boolean") && row.liveFeaturesMaster === true &&
        row[module] === true && businessEnabled === true;
}
function alertCoversSlot(alert, dateKey, minute, staffId) {
    return alert.dateKey === dateKey && minute >= alert.startMinute && minute < alert.endMinute &&
        (!alert.staffId || alert.staffId === staffId);
}
function isNewAlertMatch(lastMatchedAtMillis, lastMatchedStartAtMillis, candidateStartMillis, nowMillis) {
    return lastMatchedStartAtMillis !== candidateStartMillis &&
        (lastMatchedAtMillis === null || nowMillis - lastMatchedAtMillis >= exports.ALERT_COOLDOWN_MINUTES * 60_000);
}
//# sourceMappingURL=availability-alert-domain.js.map