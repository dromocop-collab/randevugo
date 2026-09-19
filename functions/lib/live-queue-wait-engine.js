"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentBlocksWait = appointmentBlocksWait;
exports.calculateLiveQueueWait = calculateLiveQueueWait;
const MINUTE = 60_000;
const ACTIVE_WAITING = new Set(["waiting", "on_the_way"]);
function appointmentBlocksWait(status) {
    return status === "pending" || status === "confirmed";
}
function validDuration(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 5 && value <= 480;
}
function response(input, status, reason, staffCount, start = null, ahead = null) {
    const min = start === null ? null : Math.max(0, Math.ceil((start - input.now) / MINUTE));
    // A short bounded range acknowledges operator hand-off and live-service overruns.
    const upper = min === null ? null : min === 0 ? 0 : min + Math.min(15, 5 + Math.max(0, ahead ?? 0) * 2);
    return { status, minWaitMinutes: min, maxWaitMinutes: upper,
        estimatedServiceStart: start === null ? null : new Date(start).toISOString(), peopleAhead: ahead,
        eligibleStaffCount: staffCount, reason, calculatedAt: new Date(input.now).toISOString() };
}
function earliestSlot(staff, blocks, now, duration, buffer) {
    for (const window of [...staff.windows].sort((a, b) => a.start - b.start)) {
        let cursor = Math.max(now, window.start);
        const ordered = blocks.filter((block) => block.end > cursor && block.start < window.end)
            .sort((a, b) => a.start - b.start || a.end - b.end);
        while (cursor + duration <= window.end) {
            const conflict = ordered.find((block) => cursor < block.end && block.start < cursor + duration + buffer);
            if (!conflict)
                return cursor;
            cursor = Math.max(cursor, conflict.end);
        }
    }
    return null;
}
function calculateLiveQueueWait(input) {
    if (!Number.isFinite(input.now) || input.now <= 0)
        throw new Error("A valid server time is required");
    const services = new Map(input.services.map((item) => [item.id, item]));
    const staff = new Map(input.staff.map((item) => [item.id, item]));
    const targetService = services.get(input.target.serviceId);
    if (!targetService || !validDuration(targetService.durationMinutes))
        return response(input, "insufficient_data", "SERVICE_DURATION", 0);
    const targetEntry = input.target.entryId ? input.queue.find((item) => item.id === input.target.entryId) : null;
    const requested = targetEntry?.assignedStaffId ?? targetEntry?.requestedStaffId ?? input.target.staffId ?? null;
    const candidateIds = targetService.eligibleStaffIds.filter((id) => staff.has(id) && (!requested || id === requested));
    if (candidateIds.length === 0)
        return response(input, "no_eligible_staff", "STAFF_CAPABILITY", 0);
    if (candidateIds.every((id) => staff.get(id).windows.length === 0))
        return response(input, "business_closed", "WORKING_HOURS", candidateIds.length);
    const blocks = new Map(input.staff.map((person) => [person.id, [...person.blocks, ...person.appointmentBlocks]]));
    const currentWork = new Set();
    let uncertainCurrentWork = false;
    const buffer = Math.max(0, input.bufferAfterMinutes) * MINUTE;
    for (const entry of input.queue) {
        if (entry.status !== "in_service" && entry.status !== "called")
            continue;
        const staffId = entry.assignedStaffId ?? entry.requestedStaffId;
        if (!staffId || !staff.has(staffId))
            continue;
        currentWork.add(staffId);
        const service = services.get(entry.serviceId);
        const duration = service?.durationByStaff?.[staffId] ?? service?.durationMinutes;
        if (!validDuration(duration)) {
            uncertainCurrentWork = true;
            blocks.get(staffId).push({ start: input.now, end: Math.max(input.now, ...staff.get(staffId).windows.map((window) => window.end)) });
            continue;
        }
        const expectedEnd = entry.status === "called" ? input.now + duration * MINUTE + buffer
            : typeof entry.serviceStartedAt === "number" ? entry.serviceStartedAt + duration * MINUTE + buffer : NaN;
        // An overrun or missing start time is not evidence that the worker is free.
        const safeEnd = Number.isFinite(expectedEnd) && expectedEnd > input.now ? expectedEnd
            : Math.max(input.now, ...staff.get(staffId).windows.map((window) => window.end));
        if (!Number.isFinite(expectedEnd) || expectedEnd <= input.now)
            uncertainCurrentWork = true;
        blocks.get(staffId).push({ start: input.now, end: safeEnd });
    }
    const ordered = input.queue.filter((entry) => ACTIVE_WAITING.has(entry.status))
        .sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const targetIsActive = !!targetEntry && ACTIVE_WAITING.has(targetEntry.status);
    if (!targetIsActive)
        ordered.push({ id: "__target__", serviceId: input.target.serviceId, status: "waiting",
            joinedAt: Number.MAX_SAFE_INTEGER, assignmentMode: requested ? "specific_staff" : "first_available",
            requestedStaffId: requested, assignedStaffId: null });
    const simulated = [];
    for (const entry of ordered) {
        const isTarget = targetIsActive ? entry.id === input.target.entryId : entry.id === "__target__";
        const service = services.get(entry.serviceId);
        if (!service || !validDuration(service.durationMinutes)) {
            return response(input, "insufficient_data", "SERVICE_DURATION", candidateIds.length);
        }
        const fixedStaff = entry.assignedStaffId ?? entry.requestedStaffId;
        const ids = service.eligibleStaffIds.filter((id) => staff.has(id) && (!fixedStaff || id === fixedStaff));
        let best = null;
        for (const id of ids) {
            const durationMinutes = service.durationByStaff?.[id] ?? service.durationMinutes;
            if (!validDuration(durationMinutes))
                continue;
            const start = earliestSlot(staff.get(id), blocks.get(id), input.now, durationMinutes * MINUTE, buffer);
            if (start !== null && (!best || start < best.start || start === best.start && id < best.staffId))
                best = { staffId: id, start, duration: durationMinutes * MINUTE };
        }
        if (isTarget) {
            if (!best) {
                if (uncertainCurrentWork && candidateIds.every((id) => currentWork.has(id)))
                    return response(input, "insufficient_data", "ACTIVE_SERVICE_OVERRUN", candidateIds.length);
                const hasAppointment = candidateIds.some((id) => staff.get(id).appointmentBlocks.some((block) => block.end > input.now));
                return response(input, hasAppointment ? "cannot_fit_before_appointment" : "temporarily_unavailable", hasAppointment ? "APPOINTMENT_CAPACITY" : "NO_SAFE_GAP", candidateIds.length);
            }
            const ahead = simulated.filter((item) => item.staffId === best.staffId && item.start <= best.start).length +
                (currentWork.has(best.staffId) ? 1 : 0);
            const wait = Math.max(0, Math.ceil((best.start - input.now) / MINUTE));
            return response(input, wait === 0 ? "available_now" : wait <= 20 ? "short_wait" : "waiting", "SCHEDULED_CAPACITY", candidateIds.length, best.start, ahead);
        }
        if (best) {
            blocks.get(best.staffId).push({ start: best.start, end: best.start + best.duration + buffer });
            simulated.push({ staffId: best.staffId, entryId: entry.id, start: best.start });
        }
    }
    return response(input, "insufficient_data", "TARGET_MISSING", candidateIds.length);
}
//# sourceMappingURL=live-queue-wait-engine.js.map