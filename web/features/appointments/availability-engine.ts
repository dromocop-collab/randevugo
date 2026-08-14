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
  now: Date;
}

function toDate(base: Date, value: string): Date {
  const parsed = parse(value, "HH:mm", base);
  return parsed;
}

export function buildAvailableSlots(input: AvailabilityInput): string[] {
  const day = input.date.getDay();
  const business = input.businessHours.find((item) => item.day === day && item.isOpen);
  const staff = input.staffHours.find((item) => item.day === day && item.isOpen);
  if (!business || !staff) return [];

  const open = [toDate(input.date, business.start), toDate(input.date, staff.start)].sort(
    (a, b) => a.getTime() - b.getTime()
  )[1];
  const close = [toDate(input.date, business.end), toDate(input.date, staff.end)].sort(
    (a, b) => a.getTime() - b.getTime()
  )[0];

  const breakStart = business.breakStart ? toDate(input.date, business.breakStart) : null;
  const breakEnd = business.breakEnd ? toDate(input.date, business.breakEnd) : null;

  const minAllowed = addMinutes(input.now, input.minimumNoticeMinutes);

  const slots: string[] = [];
  let cursor = new Date(open);

  while (isBefore(addMinutes(cursor, input.serviceDurationMinutes), addMinutes(close, 1))) {
    const slotEnd = addMinutes(cursor, input.serviceDurationMinutes + input.breakBufferMinutes);

    const overlapsBreak =
      !!breakStart &&
      !!breakEnd &&
      (isBefore(cursor, breakEnd) && isBefore(breakStart, slotEnd));

    const overlapsAppointment = input.appointments.some((item) => {
      const startAt = new Date(item.startAt);
      const endAt = new Date(item.endAt);
      const blocked = item.status !== "cancelled";
      if (!blocked) return false;
      return isBefore(cursor, endAt) && isBefore(startAt, slotEnd);
    });

    const passesNotice = isBefore(minAllowed, cursor) || isEqual(minAllowed, cursor);

    if (!overlapsBreak && !overlapsAppointment && passesNotice) {
      slots.push(format(cursor, "HH:mm"));
    }

    cursor = addMinutes(cursor, 15);
  }

  return slots;
}
