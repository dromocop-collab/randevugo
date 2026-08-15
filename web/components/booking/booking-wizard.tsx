"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parse, format } from "date-fns";
import { toast } from "sonner";
import { buildAvailableSlots } from "@/features/appointments/availability-engine";
import {
  createAppointment,
  listAppointmentsByDateRange,
} from "@/features/appointments/appointment-repository";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import type { DaySchedule } from "@/types/business";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";

interface Props {
  businessId: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  businessSlug: string;
  businessHours: DaySchedule[];
  minimumBookingNoticeMinutes: number;
  appointmentBufferMinutes: number;
  maximumBookingDaysAhead: number;
  slotIntervalMinutes: number;
  preselectedServiceId?: string | null;
}

type WizardStep =
  | "service"
  | "staff"
  | "datetime"
  | "info"
  | "verify"
  | "summary"
  | "success";

const STEP_LABELS: Record<WizardStep, string> = {
  service: "Hizmet",
  staff: "Çalışan",
  datetime: "Tarih & Saat",
  info: "Bilgiler",
  verify: "Doğrulama",
  summary: "Özet",
  success: "Tamamlandı",
};

const STEPS: WizardStep[] = [
  "service",
  "staff",
  "datetime",
  "info",
  "verify",
  "summary",
];

export function BookingWizard(props: Props) {
  const [step, setStep] = useState<WizardStep>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [booked, setBooked] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [serviceId, setServiceId] = useState(props.preselectedServiceId ?? "");
  const [staffId, setStaffId] = useState("");
  const [appointmentsDate, setAppointmentsDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [slot, setSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Phone verification state
  const [verificationCode, setVerificationCode] = useState(["" ,"", "", "", "", ""]);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifyError, setVerifyError] = useState("");
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Success data
  const [successData, setSuccessData] = useState<{
    appointmentId: string;
    serviceName: string;
    staffName: string;
    date: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      listServices(props.businessId, true),
      listStaff(props.businessId, true),
    ]).then(([serviceRows, staffRows]) => {
      setServices(serviceRows);
      setStaffList(staffRows);
      // Pre-select service: URL param takes priority, fallback to first
      if (props.preselectedServiceId && serviceRows.some((s) => s.id === props.preselectedServiceId)) {
        setServiceId(props.preselectedServiceId);
      } else if (serviceRows[0]) {
        setServiceId(serviceRows[0].id);
      }
      if (staffRows[0]) {
        setStaffId(staffRows[0].id);
      }
    });
  }, [props.businessId, props.preselectedServiceId]);

  useEffect(() => {
    if (!staffId) return;
    const selectedDate = new Date(appointmentsDate);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    listAppointmentsByDateRange(
      props.businessId,
      selectedDate,
      dayEnd
    ).then((rows) => {
      const selectedStaff = rows.filter((item) => item.staffId === staffId);
      setBooked(selectedStaff.map((item) => item.startAt));
    });
  }, [appointmentsDate, props.businessId, staffId]);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId),
    [serviceId, services]
  );
  const selectedStaff = useMemo(
    () => staffList.find((item) => item.id === staffId),
    [staffList, staffId]
  );

  // Filter staff to those who can provide selected service
  const filteredStaff = useMemo(() => {
    if (!serviceId) return staffList;
    return staffList.filter(
      (s) => s.serviceIds.length === 0 || s.serviceIds.includes(serviceId)
    );
  }, [staffList, serviceId]);

  const availableSlots = useMemo(() => {
    if (!selectedService) return [];
    // If no staff exists, use business hours directly
    const effectiveStaffHours = selectedStaff?.workingHours ?? [];

    return buildAvailableSlots({
      date: new Date(appointmentsDate),
      businessHours: props.businessHours,
      staffHours: effectiveStaffHours,
      appointments: booked.map((startAt) => ({
        id: startAt,
        businessId: props.businessId,
        staffId,
        serviceId,
        customerId: "",
        customerName: "",
        startAt,
        endAt: new Date(
          new Date(startAt).getTime() +
            selectedService.durationMinutes * 60000
        ).toISOString(),
        status: "confirmed",
        paymentStatus: "unpaid",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      serviceDurationMinutes: selectedService.durationMinutes,
      breakBufferMinutes: props.appointmentBufferMinutes,
      minimumNoticeMinutes: props.minimumBookingNoticeMinutes,
      slotIntervalMinutes: props.slotIntervalMinutes,
      now: new Date(),
    });
  }, [
    appointmentsDate,
    booked,
    props,
    selectedService,
    selectedStaff,
    serviceId,
    staffId,
  ]);

  const currentStepIndex = STEPS.indexOf(step);

  function goNext() {
    if (step === "success") return;
    const idx = STEPS.indexOf(step);
    let nextIdx = idx + 1;
    // Skip staff step if no staff available
    if (STEPS[nextIdx] === "staff" && filteredStaff.length === 0) {
      nextIdx++;
    }
    if (nextIdx < STEPS.length) {
      setStep(STEPS[nextIdx]);
      // Auto-send code when entering verify step
      if (STEPS[nextIdx] === "verify" && !codeSent && customerPhone) {
        handleSendCode();
      }
    }
  }

  function goBack() {
    const idx = STEPS.indexOf(step);
    let prevIdx = idx - 1;
    // Skip staff step if no staff available
    if (STEPS[prevIdx] === "staff" && filteredStaff.length === 0) {
      prevIdx--;
    }
    if (prevIdx >= 0) {
      setStep(STEPS[prevIdx]);
    }
  }

  // ━━━ Phone Verification Handlers ━━━
  const handleSendCode = useCallback(async () => {
    if (!customerPhone || sendingCode) return;
    setSendingCode(true);
    setVerifyError("");
    try {
      const functions = getFunctions(getFirebaseApp(), "europe-west1");
      const sendCode = httpsCallable<{ phone: string }, { success: boolean; _devCode?: string }>(functions, "sendVerificationCode");
      const result = await sendCode({ phone: customerPhone });
      setCodeSent(true);
      setCountdown(60);
      // In dev mode, show the code directly (will be removed in production)
      if (result.data._devCode) {
        toast.success(`Doğrulama kodu: ${result.data._devCode}`, { duration: 15000 });
      } else {
        toast.success("Doğrulama kodu gönderildi!");
      }
    } catch (error: unknown) {
      console.error("sendVerificationCode error:", error);
      const firebaseError = error as { code?: string; message?: string };
      let msg = "Kod gönderilemedi.";
      if (firebaseError.message?.includes("bekleyin")) {
        msg = firebaseError.message;
      } else if (firebaseError.code === "functions/resource-exhausted") {
        msg = "Çok sık deneme. Lütfen biraz bekleyin.";
      }
      setVerifyError(msg);
      toast.error(msg);
    } finally {
      setSendingCode(false);
    }
  }, [customerPhone, sendingCode]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function handlePinChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1);
    setVerificationCode(newCode);
    setVerifyError("");

    // Auto-focus next input
    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    const fullCode = newCode.join("");
    if (fullCode.length === 6) {
      handleVerifyCode(fullCode);
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  function handlePinPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      const newCode = paste.split("");
      setVerificationCode(newCode);
      pinRefs.current[5]?.focus();
      handleVerifyCode(paste);
    }
  }

  async function handleVerifyCode(code: string) {
    setVerifying(true);
    setVerifyError("");
    try {
      const functions = getFunctions(getFirebaseApp(), "europe-west1");
      const verify = httpsCallable(functions, "verifyPhoneCode");
      await verify({ phone: customerPhone, code });
      setPhoneVerified(true);
      toast.success("Telefon numarası doğrulandı!");
      // Auto-advance to summary after short delay
      setTimeout(() => {
        setStep("summary");
      }, 1200);
    } catch (error: unknown) {
      const msg = (error as { message?: string }).message ?? "Doğrulama başarısız.";
      setVerifyError(msg);
      setVerificationCode(["", "", "", "", "", ""]);
      pinRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit() {
    if (!selectedService || !slot) return;
    setSubmitting(true);

    const dateBase = new Date(appointmentsDate);
    const slotDate = parse(slot, "HH:mm", dateBase);

    try {
      const appointmentId = await createAppointment({
        businessId: props.businessId,
        staffId: selectedStaff?.id ?? "",
        serviceId: selectedService.id,
        customerName,
        customerPhone,
        customerEmail,
        notes,
        startAtMillis: slotDate.getTime(),
      });

      setSuccessData({
        appointmentId,
        serviceName: selectedService.name,
        staffName: selectedStaff?.fullName ?? "İşletme",
        date: format(dateBase, "dd.MM.yyyy"),
        time: slot,
      });
      setStep("success");
      toast.success("Randevunuz başarıyla oluşturuldu!");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Minimum/maximum date for date picker (stable per mount)
  const [minDate, maxDate] = useMemo(() => {
    const now = new Date();
    const min = now.toISOString().slice(0, 10);
    const max = new Date(
      now.getTime() + props.maximumBookingDaysAhead * 86400000
    )
      .toISOString()
      .slice(0, 10);
    return [min, max] as const;
  }, [props.maximumBookingDaysAhead]);

  if (step === "success" && successData) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center shadow-lg backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-[var(--text-1)]">
            Randevunuz Onaylandı!
          </h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Randevu detaylarınız aşağıdadır.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg backdrop-blur-xl">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">İşletme</span>
            <span className="font-medium text-[var(--text-1)]">{props.businessName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Hizmet</span>
            <span className="font-medium text-[var(--text-1)]">{successData.serviceName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Çalışan</span>
            <span className="font-medium text-[var(--text-1)]">{successData.staffName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Tarih</span>
            <span className="font-medium text-[var(--text-1)]">{successData.date}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Saat</span>
            <span className="font-medium text-[var(--text-1)]">{successData.time}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Adres</span>
            <span className="text-right font-medium text-[var(--text-1)]">{props.businessAddress}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:${props.businessPhone}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-3 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--field-bg-hover)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            İşletmeyi Ara
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.businessAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-3 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--field-bg-hover)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Yol Tarifi
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ━━━ Premium Progress Stepper ━━━ */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-4 shadow-lg backdrop-blur-xl">
        {/* Progress line background */}
        <div className="absolute left-0 right-0 top-1/2 mx-12 hidden h-0.5 -translate-y-1/2 rounded-full bg-[var(--border)] sm:block" />
        {/* Active progress line */}
        <div
          className="absolute left-0 top-1/2 mx-12 hidden h-0.5 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-3))] transition-all duration-700 ease-out sm:block"
          style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * (100 - 12)}%` }}
        />
        <div className="relative flex items-center justify-between">
          {STEPS.map((s, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <div key={s} className="flex flex-col items-center gap-1.5">
                <div
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                    done
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-100"
                      : active
                      ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/30 scale-110 ring-4 ring-[var(--accent)]/20"
                      : "border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-3)] scale-90"
                  }`}
                >
                  {done ? (
                    <svg className="h-4 w-4 animate-[scaleIn_0.3s_ease]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                  {active && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-20" />
                  )}
                </div>
                <span
                  className={`hidden text-[10px] font-semibold uppercase tracking-wider sm:block transition-colors duration-300 ${
                    active
                      ? "text-[var(--accent)]"
                      : done
                      ? "text-emerald-600"
                      : "text-[var(--text-3)]"
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━━ Step Content ━━━ */}
      <div
        key={step}
        className="animate-[fadeSlideIn_0.4s_ease] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-6 shadow-lg backdrop-blur-xl"
      >
        {/* ── Service Step ── */}
        {step === "service" && (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] shadow-md shadow-sky-500/20">
                <span className="text-lg">💼</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">Hizmet Seçin</h2>
                <p className="text-xs text-[var(--text-3)]">Randevu almak istediğiniz hizmeti seçin</p>
              </div>
            </div>
            <div className="mt-5 space-y-2.5">
              {services.map((service, idx) => (
                <label
                  key={service.id}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={`group flex animate-[fadeSlideIn_0.35s_ease_forwards] cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-4 opacity-0 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
                    serviceId === service.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-md shadow-sky-500/10"
                      : "border-transparent bg-[var(--surface-2)]/60 hover:border-[var(--accent)]/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="service"
                    value={service.id}
                    checked={serviceId === service.id}
                    onChange={() => setServiceId(service.id)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                        serviceId === service.id
                          ? "border-[var(--accent)] bg-[var(--accent)]"
                          : "border-[var(--border)] group-hover:border-[var(--accent)]/50"
                      }`}
                    >
                      {serviceId === service.id && (
                        <svg className="h-3 w-3 text-white animate-[scaleIn_0.2s_ease]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-1)]">{service.name}</p>
                      <p className="text-xs text-[var(--text-3)]">⏱ {service.durationMinutes} dk</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-lg bg-[var(--accent)]/10 px-2.5 py-1 text-sm font-bold text-[var(--accent)]">
                      {service.price.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Staff Step ── */}
        {step === "staff" && (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] shadow-md shadow-purple-500/20">
                <span className="text-lg">👤</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">Çalışan Seçin</h2>
                <p className="text-xs text-[var(--text-3)]">Hizmetinizi almak istediğiniz çalışanı seçin</p>
              </div>
            </div>
            <div className="mt-5 space-y-2.5">
              {filteredStaff.map((member, idx) => (
                <label
                  key={member.id}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={`group flex animate-[fadeSlideIn_0.35s_ease_forwards] cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 opacity-0 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
                    staffId === member.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-md shadow-sky-500/10"
                      : "border-transparent bg-[var(--surface-2)]/60 hover:border-[var(--accent)]/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="staff"
                    value={member.id}
                    checked={staffId === member.id}
                    onChange={() => setStaffId(member.id)}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      staffId === member.id
                        ? "border-[var(--accent)] bg-[var(--accent)]"
                        : "border-[var(--border)] group-hover:border-[var(--accent)]/50"
                    }`}
                  >
                    {staffId === member.id && (
                      <svg className="h-3 w-3 text-white animate-[scaleIn_0.2s_ease]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-md">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-3)] text-sm font-bold text-white">
                        {member.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-1)]">{member.fullName}</p>
                    {member.position && (
                      <p className="text-xs text-[var(--text-3)]">{member.position}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── DateTime Step ── */}
        {step === "datetime" && (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f59e0b,#d97706)] shadow-md shadow-amber-500/20">
                <span className="text-lg">📅</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">Tarih ve Saat Seçin</h2>
                <p className="text-xs text-[var(--text-3)]">Uygun tarih ve saati belirleyin</p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {/* Date Picker */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
                <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
                  🗓️ Tarih
                </label>
                <input
                  type="date"
                  value={appointmentsDate}
                  onChange={(e) => { setAppointmentsDate(e.target.value); setSlot(""); }}
                  min={minDate}
                  max={maxDate}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm font-semibold text-[var(--text-1)] shadow-sm transition-all duration-300 focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:shadow-lg"
                />
                {selectedService && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--accent)]/5 px-3 py-2.5 animate-[fadeSlideIn_0.3s_ease]">
                    <span className="text-xs">📋</span>
                    <p className="text-xs text-[var(--text-2)]">
                      <span className="font-bold text-[var(--text-1)]">{selectedService.name}</span>
                      {" · "}{selectedService.durationMinutes} dk
                      {" · "}<span className="font-bold text-[var(--accent)]">{selectedService.price.toLocaleString("tr-TR")} ₺</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Time Slots */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
                    🕐 Müsait Saatler
                  </label>
                  {availableSlots.length > 0 && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 animate-[fadeSlideIn_0.3s_ease]">
                      {availableSlots.length} slot müsait
                    </span>
                  )}
                </div>

                {availableSlots.length === 0 ? (
                  <div className="mt-4 flex flex-col items-center rounded-2xl border border-amber-200/60 bg-amber-50/50 p-8 text-center">
                    <span className="text-4xl animate-bounce">📭</span>
                    <p className="mt-3 text-sm font-semibold text-amber-800">
                      Bu tarihte müsait saat bulunmuyor
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      Lütfen başka bir tarih seçin veya farklı bir çalışan deneyin.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {/* Morning */}
                    {availableSlots.filter((t) => parseInt(t) < 12).length > 0 && (
                      <div className="animate-[fadeSlideIn_0.3s_ease]">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-100">☀️</span>
                          Sabah
                        </p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                          {availableSlots.filter((t) => parseInt(t) < 12).map((time, idx) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSlot(time)}
                              style={{ animationDelay: `${idx * 30}ms` }}
                              className={`animate-[scaleIn_0.25s_ease_forwards] rounded-xl border py-2.5 text-sm font-semibold opacity-0 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                slot === time
                                  ? "border-[var(--accent)] bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/25 scale-105"
                                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-1)] hover:border-[var(--accent)]/50 hover:shadow-md"
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Afternoon */}
                    {availableSlots.filter((t) => parseInt(t) >= 12 && parseInt(t) < 17).length > 0 && (
                      <div className="animate-[fadeSlideIn_0.4s_ease]">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-600">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-sky-100">🌤️</span>
                          Öğleden Sonra
                        </p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                          {availableSlots.filter((t) => parseInt(t) >= 12 && parseInt(t) < 17).map((time, idx) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSlot(time)}
                              style={{ animationDelay: `${idx * 30}ms` }}
                              className={`animate-[scaleIn_0.25s_ease_forwards] rounded-xl border py-2.5 text-sm font-semibold opacity-0 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                slot === time
                                  ? "border-[var(--accent)] bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/25 scale-105"
                                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-1)] hover:border-[var(--accent)]/50 hover:shadow-md"
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evening */}
                    {availableSlots.filter((t) => parseInt(t) >= 17).length > 0 && (
                      <div className="animate-[fadeSlideIn_0.5s_ease]">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-purple-600">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-purple-100">🌙</span>
                          Akşam
                        </p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                          {availableSlots.filter((t) => parseInt(t) >= 17).map((time, idx) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSlot(time)}
                              style={{ animationDelay: `${idx * 30}ms` }}
                              className={`animate-[scaleIn_0.25s_ease_forwards] rounded-xl border py-2.5 text-sm font-semibold opacity-0 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                slot === time
                                  ? "border-[var(--accent)] bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/25 scale-105"
                                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-1)] hover:border-[var(--accent)]/50 hover:shadow-md"
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {slot && (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 animate-[scaleIn_0.3s_ease]">
                        <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm font-bold text-emerald-700">
                          Seçilen saat: <span className="text-base">{slot}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Info Step ── */}
        {step === "info" && (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#10b981,#059669)] shadow-md shadow-emerald-500/20">
                <span className="text-lg">📝</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">İletişim Bilgileriniz</h2>
                <p className="text-xs text-[var(--text-3)]">Randevu onayı için bilgilerinizi girin</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="animate-[fadeSlideIn_0.3s_ease]">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[var(--text-2)]">
                  👤 Ad Soyad <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3.5 text-sm font-medium text-[var(--text-1)] shadow-sm transition-all duration-300 placeholder:text-[var(--text-3)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:shadow-lg"
                />
              </div>
              <div className="animate-[fadeSlideIn_0.35s_ease]">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[var(--text-2)]">
                  📞 Telefon <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="05XX XXX XX XX"
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3.5 text-sm font-medium text-[var(--text-1)] shadow-sm transition-all duration-300 placeholder:text-[var(--text-3)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:shadow-lg"
                />
              </div>
              <div className="animate-[fadeSlideIn_0.4s_ease]">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[var(--text-2)]">
                  📧 E-posta
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3.5 text-sm font-medium text-[var(--text-1)] shadow-sm transition-all duration-300 placeholder:text-[var(--text-3)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:shadow-lg"
                />
              </div>
              <div className="animate-[fadeSlideIn_0.45s_ease]">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[var(--text-2)]">
                  💬 Not
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Eklemek istediğiniz not..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3.5 text-sm font-medium text-[var(--text-1)] shadow-sm transition-all duration-300 placeholder:text-[var(--text-3)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:shadow-lg resize-none"
                />
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 cursor-pointer transition-all duration-300 hover:bg-[var(--surface-2)] animate-[fadeSlideIn_0.5s_ease]">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-[var(--accent)]"
                />
                <span className="text-xs leading-relaxed text-[var(--text-3)]">
                  Kişisel verilerimin randevu oluşturma amacıyla işlenmesini kabul ediyorum.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ── Verify Step ── */}
        {step === "verify" && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] shadow-lg shadow-sky-500/25">
              {phoneVerified ? (
                <svg className="h-8 w-8 text-white animate-[scaleIn_0.3s_ease]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>

            <h2 className="mt-4 text-lg font-bold text-[var(--text-1)]">
              {phoneVerified ? "Telefon Doğrulandı!" : "Telefon Doğrulama"}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-3)]">
              {phoneVerified ? (
                "Telefonunuz başarıyla doğrulandı. Özete yönlendiriliyorsunuz..."
              ) : (
                <>
                  <span className="font-semibold text-[var(--text-1)]">
                    {customerPhone.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 *** ** $4")}
                  </span>
                  {" "}numarasına gönderilen 6 haneli kodu girin.
                </>
              )}
            </p>

            {!phoneVerified && (
              <>
                {/* PIN Input */}
                <div className="mt-6 flex justify-center gap-2 sm:gap-3">
                  {verificationCode.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { pinRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      onPaste={idx === 0 ? handlePinPaste : undefined}
                      disabled={verifying}
                      className={`h-14 w-11 rounded-xl border-2 bg-[var(--field-bg)] text-center text-xl font-bold text-[var(--text-1)] transition-all duration-200 focus:outline-none sm:h-16 sm:w-14 sm:text-2xl ${
                        verifyError
                          ? "border-red-400 bg-red-50/50 animate-[shake_0.3s_ease]"
                          : digit
                          ? "border-[var(--accent)] shadow-md shadow-sky-500/10"
                          : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                      }`}
                    />
                  ))}
                </div>

                {verifyError && (
                  <p className="mt-3 text-sm font-medium text-red-500">⚠️ {verifyError}</p>
                )}

                {verifying && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--text-3)]">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Doğrulanıyor...
                  </div>
                )}

                <div className="mt-5">
                  {countdown > 0 ? (
                    <p className="text-sm text-[var(--text-3)]">
                      Tekrar gönder{" "}
                      <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg bg-[var(--surface-2)] px-2 font-mono text-xs font-bold text-[var(--text-1)]">
                        {countdown}s
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode}
                      className="text-sm font-semibold text-[var(--accent)] transition hover:underline disabled:opacity-50"
                    >
                      {sendingCode ? "Gönderiliyor..." : "📲 Kodu Tekrar Gönder"}
                    </button>
                  )}
                </div>
              </>
            )}

            {phoneVerified && (
              <div className="mt-6 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 animate-[scaleIn_0.3s_ease]">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* ── Summary Step ── */}
        {step === "summary" && (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#6366f1,#4f46e5)] shadow-md shadow-indigo-500/20">
                <span className="text-lg">📋</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">Randevu Özeti</h2>
                <p className="text-xs text-[var(--text-3)]">Bilgilerinizi kontrol edin ve onaylayın</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-5">
              <SummaryRow icon="🏢" label="İşletme" value={props.businessName} delay={0} />
              <SummaryRow
                icon="💼" label="Hizmet" delay={50}
                value={selectedService ? `${selectedService.name} (${selectedService.durationMinutes} dk)` : ""}
              />
              <SummaryRow icon="👤" label="Çalışan" value={selectedStaff?.fullName ?? ""} delay={100} />
              <SummaryRow icon="📅" label="Tarih" value={format(new Date(appointmentsDate), "dd.MM.yyyy")} delay={150} />
              <SummaryRow icon="🕐" label="Saat" value={slot} delay={200} />
              <SummaryRow
                icon="💰" label="Fiyat" delay={250}
                value={selectedService ? `${selectedService.price.toLocaleString("tr-TR")} ₺` : ""}
              />
              <hr className="border-[var(--border)]" />
              <SummaryRow icon="🙋" label="Ad Soyad" value={customerName} delay={300} />
              <SummaryRow icon="📞" label="Telefon" value={customerPhone} delay={350} />
              {customerEmail && <SummaryRow icon="📧" label="E-posta" value={customerEmail} delay={400} />}
              {notes && <SummaryRow icon="💬" label="Not" value={notes} delay={450} />}
            </div>
          </div>
        )}
      </div>

      {/* ━━━ Navigation ━━━ */}
      {step !== "success" && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStepIndex === 0}
            className="group flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-3 text-sm font-semibold text-[var(--text-2)] shadow-sm transition-all duration-300 hover:bg-[var(--field-bg-hover)] hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Geri
          </button>

          {step === "summary" ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="group flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-300 hover:shadow-xl hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  🎉 Randevuyu Onayla
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          ) : step === "verify" ? (
            <div />
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={
                (step === "service" && !serviceId) ||
                (step === "staff" && !staffId) ||
                (step === "datetime" && !slot) ||
                (step === "info" && (!customerName || !customerPhone || !privacyAccepted))
              }
              className="group flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-300 hover:shadow-xl hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Devam Et
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ━━━ Keyframes ━━━ */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

function SummaryRow({ icon, label, value, delay = 0 }: { icon: string; label: string; value: string; delay?: number }) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="flex items-center justify-between animate-[fadeSlideIn_0.3s_ease_forwards] opacity-0 py-1"
    >
      <span className="flex items-center gap-2 text-sm text-[var(--text-3)]">
        <span>{icon}</span> {label}
      </span>
      <span className="text-right text-sm font-semibold text-[var(--text-1)]">
        {value}
      </span>
    </div>
  );
}

