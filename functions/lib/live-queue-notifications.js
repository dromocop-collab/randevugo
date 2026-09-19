"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ETA_OPTIONS = exports.CALLED_GRACE_MINUTES = void 0;
exports.isDeclaredEta = isDeclaredEta;
exports.isCalledOverdue = isCalledOverdue;
exports.shouldExpirePreviousBusinessDay = shouldExpirePreviousBusinessDay;
exports.statusNotice = statusNotice;
exports.shouldSendAlmostReady = shouldSendAlmostReady;
exports.noticeCopy = noticeCopy;
exports.CALLED_GRACE_MINUTES = 10;
exports.ETA_OPTIONS = [5, 10, 15, 20];
function isDeclaredEta(value) {
    return typeof value === "number" && exports.ETA_OPTIONS.some((option) => option === value);
}
function isCalledOverdue(calledAtMs, nowMs) {
    return calledAtMs !== null && Number.isFinite(calledAtMs) &&
        nowMs >= calledAtMs + exports.CALLED_GRACE_MINUTES * 60_000;
}
function shouldExpirePreviousBusinessDay(status, businessDayKey, todayKey) {
    return (status === "waiting" || status === "on_the_way" || status === "called") &&
        /^\d{4}-\d{2}-\d{2}$/.test(businessDayKey) && businessDayKey < todayKey;
}
function statusNotice(before, after, cancelledBy) {
    if (before === after || before === null)
        return null;
    if (after === "called")
        return "called";
    if (after === "no_show")
        return "no_show";
    if (after === "expired")
        return "expired";
    if (after === "cancelled" && cancelledBy === "business")
        return "business_cancelled";
    return null;
}
function shouldSendAlmostReady(status, estimate) {
    return (status === "waiting" || status === "on_the_way") &&
        estimate.peopleAhead !== null && estimate.peopleAhead <= 1 &&
        estimate.minWaitMinutes !== null && estimate.minWaitMinutes <= 20;
}
function noticeCopy(kind) {
    switch (kind) {
        case "almost_ready": return { title: "Sıran yaklaşıyor", body: "İşletmeye yakın olmanı öneriyoruz. Sıranı kontrol et." };
        case "called": return { title: "Sıran geldi", body: "İşletme seni bekliyor. Sıranı kontrol et." };
        case "no_show": return { title: "Canlı sıran sonlandırıldı", body: "İşletme seni gelmedi olarak işaretledi." };
        case "expired": return { title: "Canlı sıran sona erdi", body: "Sıranın güncel durumunu kontrol et." };
        case "business_cancelled": return { title: "Canlı sıran iptal edildi", body: "Sıranın güncel durumunu kontrol et." };
    }
}
//# sourceMappingURL=live-queue-notifications.js.map