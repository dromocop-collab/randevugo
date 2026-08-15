import { addMinutes, format, isBefore, isEqual, parse } from "date-fns";
import type { Appointment } from "@/types/appointments";
import type { DaySchedule } from "@/types/business";

interface AvailabilityInput {
  date: Date;
  businessHours: DaySchedule[];
  staffHours: DaySchedule[];
  appointments: Appointment[];
  serviceDurationMinutes: number;
  breakBufferMinutes: number;
  minimumNoticeMinutes: number;
  slotIntervalMinutes?: number;
  now: Date;
}

function toDate(base: Date, value: string): Date {
  const parsed = parse(value, "HH:mm", base);
  return parsed;
}

export function buildAvailableSlots(input: AvailabilityInput): string[] {
  const day = input.date.getDay();
  const business = input.businessHours.find((item) => item.day === day && item.isOpen);
  if (!business) return [];

  // Fall back to business hours if staff has no specific schedule for this day
  const staff = input.staffHours.length > 0
    ? input.staffHours.find((item) => item.day === day && item.isOpen)
    : business; // Use business hours as fallback
  if (!staff) return [];

  const open = [toDate(input.date, business.start), toDate(input.date, staff.start)].sort(
    (a, b) => a.getTime() - b.getTime()
  )[1];
  const close = [toDate(input.date, business.end), toDate(input.date, staff.end)].sort(
    (a, b) => a.getTime() - b.getTime()
  )[0];

  // Business breaks
  const breakStart = business.breakStart ? toDate(input.date, business.breakStart) : null;
  const breakEnd = business.breakEnd ? toDate(input.date, business.breakEnd) : null;

  // Staff breaks
  const staffBreakStart = staff.breakStart ? toDate(input.date, staff.breakStart) : null;
  const staffBreakEnd = staff.breakEnd ? toDate(input.date, staff.breakEnd) : null;

  const minAllowed = addMinutes(input.now, input.minimumNoticeMinutes);
  const interval = input.slotIntervalMinutes ?? 15;

  // Calculate available working minutes in the day
  const workingMinutes = (close.getTime() - open.getTime()) / 60000;
  // For services longer than the work day, use slot interval for fitting.
  // The booking marks a start time; the actual service may span multiple days.
  const effectiveDuration = input.serviceDurationMinutes > workingMinutes
    ? interval
    : input.serviceDurationMinutes;

  const slots: string[] = [];
  let cursor = new Date(open);

  while (isBefore(addMinutes(cursor, effectiveDuration), addMinutes(close, 1))) {
    const slotEnd = addMinutes(cursor, effectiveDuration + input.breakBufferMinutes);

    // Check business break overlap
    const overlapsBusinessBreak =
      !!breakStart &&
      !!breakEnd &&
      (isBefore(cursor, breakEnd) && isBefore(breakStart, slotEnd));

    // Check staff break overlap
    const overlapsStaffBreak =
      !!staffBreakStart &&
      !!staffBreakEnd &&
      (isBefore(cursor, staffBreakEnd) && isBefore(staffBreakStart, slotEnd));

    const overlapsAppointment = input.appointments.some((item) => {
      const startAt = new Date(item.startAt);
      const endAt = new Date(item.endAt);
      const blocked = item.status !== "cancelled";
      if (!blocked) return false;
      return isBefore(cursor, endAt) && isBefore(startAt, slotEnd);
    });

    const passesNotice = isBefore(minAllowed, cursor) || isEqual(minAllowed, cursor);

    if (!overlapsBusinessBreak && !overlapsStaffBreak && !overlapsAppointment && passesNotice) {
      slots.push(format(cursor, "HH:mm"));
    }

    cursor = addMinutes(cursor, interval);
  }

  return slots;
}
