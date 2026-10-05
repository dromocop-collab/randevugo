"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import {
  createAppointment,
  joinAppointmentWaitlist,
  listAvailableDates,
  listAvailableSlots,
  type AvailableAppointmentSlot,
} from "@/features/appointments/appointment-repository";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { listBookableServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import type { DaySchedule } from "@/types/business";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { AvailabilityAlertAction } from "@/features/availability/availability-alert-action";
import { useAuth } from "@/hooks/use-auth";
import { getDb } from "@/lib/firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { addGuestBooking } from "@/features/appointments/guest-booking-store";
import {
  DEFAULT_BOOKING_FIELD_SETTINGS,
  getBookingFieldSettings,
  type BookingFieldSettings,
} from "@/features/booking/booking-field-settings-repository";
import {
  ArrowLeft, ArrowRight, BellRing, Building2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock3, FileCheck2, Mail, MessageSquareText, Phone,
  Send, ShieldCheck, Sparkles, UserRound, UsersRound, WandSparkles, X, type LucideIcon,
} from "lucide-react";

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
  preselectedStaffId?: string | null;
  preselectedDate?: string | null;
  preselectedStartAtMillis?: number | null;
  businessAlertsEnabled?: boolean;
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

function formatServiceDuration(minutes: number) {
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440} gün`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} saat`;
  if (minutes > 60) return `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
  return `${minutes} dk`;
}

function expertiseLabel(level: Staff["expertiseLevel"]) {
  if (level === "trainer") return "Eğitmen / Usta";
  if (level === "senior") return "Kıdemli uzman";
  if (level === "junior") return "Gelişen uzman";
  return "Uzman";
}

function displayName(value: string) {
  return value.trim().split(/\s+/).map((part) => part ? `${part.charAt(0).toLocaleUpperCase("tr-TR")}${part.slice(1).toLocaleLowerCase("tr-TR")}` : part).join(" ");
}

function publicStaffBio(value?: string) {
  const bio = value?.trim() ?? "";
  if (bio.length < 20 || /^(test|demo|deneme|lorem|x+|k+)$/i.test(bio)) return "";
  return bio;
}

function istanbulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDaysToIso(value: string, days: number) {
  const date = dateFromIso(value);
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}

function normalizeTurkishPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `+90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("905")) return `+${digits}`;
  return value.trim();
}

function isValidTurkishPhone(value: string) {
  return /^\+905\d{9}$/.test(normalizeTurkishPhone(value));
}

function isValidOptionalEmail(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function BookingWizard(props: Props) {
  const { user, status: authStatus } = useAuth();
  const [step, setStep] = useState<WizardStep>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableAppointmentSlot[]>([]);
  const [availableDateCounts, setAvailableDateCounts] = useState<Record<string, number>>({});
  const [availabilityRange, setAvailabilityRange] = useState<{ start: string; end: string } | null>(null);
  const [datesLoading, setDatesLoading] = useState(false);
  const [dateAvailabilityUnavailable, setDateAvailabilityUnavailable] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [serviceId, setServiceId] = useState(props.preselectedServiceId ?? "");
  const [staffId, setStaffId] = useState(props.preselectedStaffId ?? "");
  const [appointmentsDate, setAppointmentsDate] = useState(() => {
    const today = istanbulDateKey();
    const latest = addDaysToIso(today, props.maximumBookingDaysAhead);
    return props.preselectedDate && /^\d{4}-\d{2}-\d{2}$/.test(props.preselectedDate) && props.preselectedDate >= today && props.preselectedDate <= latest
      ? props.preselectedDate
      : today;
  });
  const [slot, setSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingFields, setBookingFields] = useState<BookingFieldSettings>(DEFAULT_BOOKING_FIELD_SETTINGS);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);

  // Phone verification state
  const [verificationCode, setVerificationCode] = useState(["" ,"", "", "", "", ""]);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifyError, setVerifyError] = useState("");
  const [infoTouched, setInfoTouched] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const availabilityRequestRef = useRef(0);
  const availabilitySelectionRef = useRef("");

  useEffect(() => {
    availabilitySelectionRef.current = `${serviceId}:${staffId}`;
    availabilityRequestRef.current += 1;
  }, [serviceId, staffId]);

  useEffect(() => {
    if (!privacyModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPrivacyModalOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [privacyModalOpen]);

  // Giriş yapmış kullanıcının bilgilerini (users/{uid}: displayName, phone; Auth: e-posta) boş alanlara doldur.
  // Kullanıcının yazdığı değerin üzerine asla yazılmaz.
  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    let active = true;
    const fill = (setter: (update: (previous: string) => string) => void, value: unknown) => {
      const next = typeof value === "string" ? value.trim() : "";
      if (next) setter((previous) => (previous.trim() ? previous : next));
    };
    fill(setCustomerName, user.displayName);
    fill(setCustomerEmail, user.email);
    getDoc(doc(getDb(), "users", user.uid))
      .then((snapshot) => {
        if (!active || !snapshot.exists()) return;
        const data = snapshot.data();
        fill(setCustomerName, data.displayName);
        fill(setCustomerPhone, data.phone);
        fill(setCustomerEmail, data.email);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [authStatus, user]);

  // Success data
  const [successData, setSuccessData] = useState<{
    appointmentId: string;
    publicToken: string;
    isGuest: boolean;
    serviceName: string;
    staffName: string;
    date: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      listBookableServices(props.businessId),
      listStaff(props.businessId, true),
    ]).then(([serviceRows, staffRows]) => {
      setServices(serviceRows);
      setStaffList(staffRows);
      // Pre-select service: URL param takes priority, fallback to first
      const initialService = (props.preselectedServiceId && serviceRows.find((s) => s.id === props.preselectedServiceId)) || serviceRows[0];
      setServiceId(initialService?.id ?? "");
      // Yalnızca seçili hizmeti verebilen personel seçilir; aksi halde saatler yüklenemiyordu.
      const canServe = (member: Staff) => !initialService || member.serviceIds.includes(initialService.id) || (
        member.serviceIds.length === 0 &&
        (!member.specialtyCategoryIds?.length || member.specialtyCategoryIds.includes(initialService.category))
      );
      const preselected = props.preselectedStaffId ? staffRows.find((staff) => staff.id === props.preselectedStaffId && canServe(staff)) : undefined;
      setStaffId((preselected ?? staffRows.find(canServe))?.id ?? "");
    }).catch(() => toast.error("Randevu seçenekleri yüklenemedi."))
      .finally(() => setCatalogLoading(false));
  }, [props.businessId, props.preselectedServiceId, props.preselectedStaffId]);

  useEffect(() => {
    let active = true;
    getBookingFieldSettings()
      .then((settings) => {
        if (!active) return;
        setBookingFields(settings);
        if (!settings.collectName) setCustomerName("");
        if (!settings.collectEmail) setCustomerEmail("");
        if (!settings.collectNotes) setNotes("");
      })
      .catch(() => {
        if (active) setBookingFields(DEFAULT_BOOKING_FIELD_SETTINGS);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return [] as AvailableAppointmentSlot[];
      setSlotsLoading(true);
      setAvailableSlots([]);
      return listAvailableSlots({ businessId: props.businessId, serviceId, staffId, date: appointmentsDate });
    })
      .then((rows) => { if (!cancelled) {
        setAvailableSlots(rows);
        if (props.preselectedStartAtMillis && appointmentsDate === props.preselectedDate) {
          const selected = rows.find((item) => item.startAtMillis === props.preselectedStartAtMillis);
          if (selected) setSlot(selected.label);
          else toast.info("Bu saat artık uygun değil. Diğer uygun saatleri görebilirsin.");
        }
      } })
      .catch((error) => {
        if (!cancelled) {
          setAvailableSlots([]);
          toast.error(userFacingError(error, "Uygun saatler alınamadı."));
        }
      })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [appointmentsDate, props.businessId, props.preselectedDate, props.preselectedStartAtMillis, serviceId, staffId]);

  const loadDateAvailability = useCallback(async (startDate: string, endDate: string) => {
    if (!serviceId) return;
    const selectionKey = `${serviceId}:${staffId}`;
    const requestId = availabilityRequestRef.current + 1;
    availabilityRequestRef.current = requestId;
    setDatesLoading(true);
    setDateAvailabilityUnavailable(false);
    setAvailabilityRange({ start: startDate, end: endDate });
    setAvailableDateCounts({});
    try {
      const rows = await listAvailableDates({
        businessId: props.businessId,
        serviceId,
        staffId: staffId || undefined,
        startDate,
        endDate,
      });
      if (availabilityRequestRef.current !== requestId || availabilitySelectionRef.current !== selectionKey) return;
      setAvailableDateCounts(Object.fromEntries(rows.map((row) => [row.date, row.slotCount])));
    } catch (error) {
      if (availabilityRequestRef.current !== requestId || availabilitySelectionRef.current !== selectionKey) return;
      setAvailableDateCounts({});
      setAvailabilityRange(null);
      setDateAvailabilityUnavailable(true);
      toast.error(userFacingError(error, "Takvim müsaitliği alınamadı."));
    } finally {
      if (availabilityRequestRef.current === requestId && availabilitySelectionRef.current === selectionKey) setDatesLoading(false);
    }
  }, [props.businessId, serviceId, staffId]);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId),
    [serviceId, services]
  );
  const selectedStaff = useMemo(
    () => staffList.find((item) => item.id === staffId),
    [staffList, staffId]
  );
  const normalizedCustomerPhone = normalizeTurkishPhone(customerPhone);
  const phoneValid = isValidTurkishPhone(customerPhone);
  const emailValid = isValidOptionalEmail(customerEmail);
  const infoValid = phoneValid && emailValid && privacyAccepted && (!bookingFields.collectName || customerName.trim().length >= 2);

  // Filter staff to those who can provide selected service
  const filteredStaff = useMemo(() => {
    if (!serviceId) return staffList;
    const categoryId = selectedService?.category;
    return staffList.filter(
      (s) => s.serviceIds.includes(serviceId) || (
        s.serviceIds.length === 0 &&
        (!s.specialtyCategoryIds?.length || Boolean(categoryId && s.specialtyCategoryIds.includes(categoryId)))
      )
    );
  }, [staffList, serviceId, selectedService]);

  async function joinWaitlist() {
    if (!selectedService || customerName.trim().length < 2 || (!customerPhone.trim() && !customerEmail.trim())) {
      toast.error("Bekleme listesi için adınızı ve telefon veya e-postanızı girin.");
      return;
    }
    setWaitlistBusy(true);
    try {
      const result = await joinAppointmentWaitlist({ businessId: props.businessId, serviceId: selectedService.id, staffId: staffId || undefined, preferredDate: appointmentsDate, customerName: customerName.trim(), customerPhone: normalizedCustomerPhone, customerEmail: customerEmail.trim() });
      setWaitlistDone(true);
      toast.success(result.alreadyJoined ? "Bu tarih için zaten bekleme listesindesiniz." : "Bekleme listesine eklendiniz. Yer açıldığında işletme sizinle iletişime geçecek.");
    } catch (error) { toast.error(userFacingError(error, "Bekleme listesine eklenemediniz.")); }
    finally { setWaitlistBusy(false); }
  }

  const activeSteps = useMemo(() => filteredStaff.length ? STEPS : STEPS.filter((item) => item !== "staff"), [filteredStaff.length]);
  const currentStepIndex = Math.max(0, activeSteps.indexOf(step));
  const progressPercent = Math.round(((currentStepIndex + 1) / activeSteps.length) * 100);

  function goNext() {
    if (step === "success") return;
    const idx = activeSteps.indexOf(step);
    const nextIdx = idx + 1;
    if (nextIdx < activeSteps.length) {
      setStep(activeSteps[nextIdx]);
      // Auto-send code when entering verify step
      if (activeSteps[nextIdx] === "verify" && !codeSent && customerPhone) {
        handleSendCode();
      }
    }
  }

  function goBack() {
    const idx = activeSteps.indexOf(step);
    const prevIdx = idx - 1;
    if (prevIdx >= 0) {
      setStep(activeSteps[prevIdx]);
    }
  }

  // ━━━ Phone Verification Handlers ━━━
  const handleSendCode = useCallback(async () => {
    if (!phoneValid || sendingCode) return;
    setSendingCode(true);
    setVerifyError("");
    try {
      const functions = getFunctions(getFirebaseApp(), "europe-west1");
      const sendCode = httpsCallable<{ phone: string }, { success: boolean; smsDelivered?: boolean; message?: string }>(functions, "sendVerificationCode");
      const result = await sendCode({ phone: normalizedCustomerPhone });
      if (result.data.smsDelivered === false) {
        // SMS gitmediyse kod giriş adımına geçilmez; kullanıcı boşuna beklemez.
        toast.error(result.data.message || "SMS şu anda iletilemedi. Lütfen birkaç dakika sonra tekrar deneyin.");
      } else {
        setCodeSent(true);
        setCountdown(60);
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
  }, [normalizedCustomerPhone, phoneValid, sendingCode]);

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
      await verify({ phone: normalizedCustomerPhone, code });
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

    const dateBase = new Date(`${appointmentsDate}T12:00:00`);
    const selectedSlot = availableSlots.find((item) => item.label === slot);
    if (!selectedSlot) {
      setSubmitting(false);
      toast.error("Seçtiğiniz saat artık müsait değil. Lütfen yeni bir saat seçin.");
      return;
    }

    try {
      const createdAppointment = await createAppointment({
        businessId: props.businessId,
        staffId: selectedSlot.staffId ?? selectedStaff?.id ?? "",
        serviceId: selectedService.id,
        customerName: bookingFields.collectName ? customerName.trim() : undefined,
        customerPhone: normalizedCustomerPhone,
        customerEmail: bookingFields.collectEmail ? customerEmail.trim() : undefined,
        notes: bookingFields.collectNotes ? notes.trim() : undefined,
        startAtMillis: selectedSlot.startAtMillis,
      });

      const isGuest = !user;
      if (isGuest && createdAppointment.publicToken) {
        addGuestBooking({
          businessId: props.businessId,
          appointmentId: createdAppointment.appointmentId,
          publicToken: createdAppointment.publicToken,
        });
      }
      setSuccessData({
        appointmentId: createdAppointment.appointmentId,
        publicToken: createdAppointment.publicToken,
        isGuest,
        serviceName: selectedService.name,
        staffName: selectedStaff?.fullName ?? "İşletme",
        date: format(dateBase, "dd.MM.yyyy"),
        time: slot,
      });
      setStep("success");
      toast.success("Randevunuz başarıyla oluşturuldu!");
    } catch (error) {
      toast.error(userFacingError(error, "Randevunuz oluşturulamadı. Lütfen tekrar deneyin."));
    } finally {
      setSubmitting(false);
    }
  }

  // Minimum/maximum date for date picker (stable per mount)
  const [minDate, maxDate] = useMemo(() => {
    const min = istanbulDateKey();
    const max = addDaysToIso(min, props.maximumBookingDaysAhead);
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
            <span className="font-medium text-[var(--text-1)]">{displayName(successData.serviceName)}</span>
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

        {successData.publicToken && (
          <a
            href={`/randevu/${encodeURIComponent(successData.publicToken)}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100"
          >
            <span><small className="block font-semibold text-emerald-600">GÜVENLİ RANDEVU BAĞLANTISI</small>Randevuyu görüntüle, saatini değiştir veya iptal et</span>
            <ArrowRight size={18} />
          </a>
        )}

        {successData.isGuest && successData.publicToken && authStatus !== "authenticated" && (
          <a
            href={`/musteri/giris?next=${encodeURIComponent("/hesabim")}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm font-bold text-[var(--text-1)] transition hover:border-[var(--accent)]"
          >
            <span><small className="block font-semibold text-[var(--accent)]">HESABIMA KAYDET</small>Giriş yapın, bu randevu Randevularım listenize eklensin</span>
            <ArrowRight size={18} />
          </a>
        )}

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
    <div className="booking-wizard mx-auto max-w-2xl space-y-4">
      <div className="booking-progress rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-4 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] text-white"><Sparkles size={18} /></span>
            <div><small className="font-bold uppercase tracking-[.16em] text-[var(--accent)]">Adım {currentStepIndex + 1} / {activeSteps.length}</small><p className="text-sm font-bold text-[var(--text-1)]">{STEP_LABELS[step]}</p></div>
          </div>
          <span className="text-xs font-bold text-[var(--text-3)]">%{progressPercent}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]"><i className="block h-full rounded-full bg-[linear-gradient(90deg,var(--accent),#79d8a6)] transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div>
        <ol className="booking-step-rail" aria-label="Randevu adımları">{activeSteps.map((item, index) => <li key={item} className={index < currentStepIndex ? "is-done" : index === currentStepIndex ? "is-current" : ""} aria-current={index === currentStepIndex ? "step" : undefined}><span>{index < currentStepIndex ? <CheckCircle2 size={13}/> : index + 1}</span>{STEP_LABELS[item]}</li>)}</ol>
      </div>

      {/* ━━━ Step Content ━━━ */}
      <div
        key={step}
        className="booking-step-panel animate-[fadeSlideIn_0.35s_ease] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-6 shadow-lg backdrop-blur-xl"
      >
        {/* ── Service Step ── */}
        {step === "service" && (
          <div>
            <div className="booking-section-head flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] shadow-md shadow-sky-500/20">
                <WandSparkles size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">Hizmet Seçin</h2>
                <p className="text-xs text-[var(--text-3)]">Randevu almak istediğiniz hizmeti seçin</p>
              </div>
            </div>
            <div className="mt-5 space-y-2.5">
              {catalogLoading && Array.from({ length: 3 }).map((_, index) => <div key={index} className="booking-choice-skeleton" aria-hidden="true" />)}
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
                    onChange={() => {
                      setServiceId(service.id);
                      const eligible = staffList.find((member) => member.serviceIds.includes(service.id) || (
                        member.serviceIds.length === 0 &&
                        (!member.specialtyCategoryIds?.length || member.specialtyCategoryIds.includes(service.category))
                      ));
                      setStaffId(eligible?.id ?? "");
                      setSlot("");
                    }}
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
                      <p className="text-sm font-semibold text-[var(--text-1)]">{displayName(service.name)}</p>
                      <p className="text-xs text-[var(--text-3)]">⏱ {formatServiceDuration(service.durationMinutes)}</p>
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
            <div className="booking-section-head flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] shadow-md shadow-purple-500/20">
                <UsersRound size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">Çalışan Seçin</h2>
                <p className="text-xs text-[var(--text-3)]">Hizmetinizi almak istediğiniz çalışanı seçin</p>
              </div>
              <span className="booking-section-head__badge"><UsersRound size={13}/>{filteredStaff.length} uygun uzman</span>
            </div>
            {selectedService && <div className="booking-context-strip"><WandSparkles size={14}/><span><small>SEÇİLEN HİZMET</small><b>{displayName(selectedService.name)}</b></span><em>{formatServiceDuration(selectedService.durationMinutes)}</em></div>}
            <div className="booking-staff-grid mt-5">
              {filteredStaff.map((member, idx) => (
                <label
                  key={member.id}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={`booking-staff-card group flex animate-[fadeSlideIn_0.35s_ease_forwards] cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 opacity-0 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
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
                    onChange={() => { setStaffId(member.id); setSlot(""); }}
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
                  <div className="booking-staff-avatar h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-md">
                    {member.photoUrl ? (
                      <Image src={member.photoUrl} alt="" width={44} height={44} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-3)] text-sm font-bold text-white">
                        {member.fullName.charAt(0).toLocaleUpperCase("tr-TR")}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-1)]">{displayName(member.fullName)}</p>
                    {member.position && (
                      <p className="text-xs text-[var(--text-3)]">{member.position}</p>
                    )}
                    {(member.position ?? "").trim().toLocaleLowerCase("tr-TR") !== expertiseLabel(member.expertiseLevel).toLocaleLowerCase("tr-TR") && <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">{expertiseLabel(member.expertiseLevel)}</p>}
                    {publicStaffBio(member.bio) && <p className="booking-staff-bio">{publicStaffBio(member.bio)}</p>}
                  </div>
                  <span className="booking-staff-status">{staffId === member.id ? <><CheckCircle2 size={13}/> Seçili</> : "Seç"}</span>
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
                <CalendarDays size={20} className="text-white" />
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
                <BookingCalendar
                  value={appointmentsDate}
                  min={minDate}
                  max={maxDate}
                  availableDateCounts={availableDateCounts}
                  availabilityRange={availabilityRange}
                  loading={datesLoading}
                  availabilityUnavailable={dateAvailabilityUnavailable}
                  onRangeChange={loadDateAvailability}
                  onChange={(value) => { setAppointmentsDate(value); setSlot(""); }}
                />
                {selectedService && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--accent)]/5 px-3 py-2.5 animate-[fadeSlideIn_0.3s_ease]">
                    <span className="text-xs">📋</span>
                    <p className="text-xs text-[var(--text-2)]">
                      <span className="font-bold text-[var(--text-1)]">{displayName(selectedService.name)}</span>
                      {" · "}{formatServiceDuration(selectedService.durationMinutes)}
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

                {slotsLoading ? (
                  <div className="booking-slot-skeleton" aria-label="Müsait saatler yükleniyor">{Array.from({ length: 12 }).map((_, index) => <i key={index}/>)}</div>
                ) : availableSlots.length === 0 ? (
                  <div className="mt-4 flex flex-col items-center rounded-2xl border border-amber-200/60 bg-amber-50/50 p-8 text-center">
                    <span className="text-4xl animate-bounce">📭</span>
                    <p className="mt-3 text-sm font-semibold text-amber-800">
                      Bu tarihte müsait saat bulunmuyor
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      Lütfen başka bir tarih seçin veya farklı bir çalışan deneyin.
                    </p>
                    {!waitlistDone && !waitlistOpen && <button type="button" onClick={() => setWaitlistOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-800">Bekleme listesine katıl <BellRing size={14}/></button>}
                    {waitlistOpen && !waitlistDone && <div className="mt-5 grid w-full max-w-lg gap-2 rounded-2xl border border-amber-200 bg-white/80 p-4 text-left shadow-sm"><div><b className="text-sm text-amber-950">Yer açılırsa haber verelim</b><p className="mt-1 text-[10px] text-amber-700">İşletme talebinizi görecek ve uygunluk oluştuğunda sizinle iletişime geçecek.</p></div><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Adınız soyadınız" maxLength={80} className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-amber-500"/><div className="grid gap-2 sm:grid-cols-2"><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="05xx xxx xx xx" inputMode="tel" className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-amber-500"/><input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="E-posta (opsiyonel)" type="email" className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-amber-500"/></div><div className="flex gap-2"><button type="button" onClick={() => void joinWaitlist()} disabled={waitlistBusy} className="flex-1 rounded-xl bg-amber-700 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{waitlistBusy ? "Kaydediliyor…" : "Talebi kaydet"}</button><button type="button" onClick={() => setWaitlistOpen(false)} className="rounded-xl border border-amber-200 px-3 py-2.5 text-xs font-bold text-amber-800">Vazgeç</button></div></div>}
                    {waitlistDone && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-xs font-bold text-emerald-800"><CheckCircle2 size={16}/> Bekleme listesi talebiniz alındı.</div>}
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {/* Morning */}
                    {availableSlots.filter((t) => parseInt(t.label) < 12).length > 0 && (
                      <div className="animate-[fadeSlideIn_0.3s_ease]">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-100">☀️</span>
                          Sabah
                        </p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                          {availableSlots.filter((t) => parseInt(t.label) < 12).map((time, idx) => (
                            <button
                              key={time.startAtMillis}
                              type="button"
                              onClick={() => setSlot(time.label)}
                              style={{ animationDelay: `${idx * 30}ms` }}
                              className={`animate-[scaleIn_0.25s_ease_forwards] rounded-xl border py-2.5 text-sm font-semibold opacity-0 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                slot === time.label
                                  ? "border-[var(--accent)] bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/25 scale-105"
                                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-1)] hover:border-[var(--accent)]/50 hover:shadow-md"
                              }`}
                            >
                              {time.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Afternoon */}
                    {availableSlots.filter((t) => parseInt(t.label) >= 12 && parseInt(t.label) < 17).length > 0 && (
                      <div className="animate-[fadeSlideIn_0.4s_ease]">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-600">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-sky-100">🌤️</span>
                          Öğleden Sonra
                        </p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                          {availableSlots.filter((t) => parseInt(t.label) >= 12 && parseInt(t.label) < 17).map((time, idx) => (
                            <button
                              key={time.startAtMillis}
                              type="button"
                              onClick={() => setSlot(time.label)}
                              style={{ animationDelay: `${idx * 30}ms` }}
                              className={`animate-[scaleIn_0.25s_ease_forwards] rounded-xl border py-2.5 text-sm font-semibold opacity-0 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                slot === time.label
                                  ? "border-[var(--accent)] bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/25 scale-105"
                                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-1)] hover:border-[var(--accent)]/50 hover:shadow-md"
                              }`}
                            >
                              {time.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evening */}
                    {availableSlots.filter((t) => parseInt(t.label) >= 17).length > 0 && (
                      <div className="animate-[fadeSlideIn_0.5s_ease]">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-purple-600">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-purple-100">🌙</span>
                          Akşam
                        </p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                          {availableSlots.filter((t) => parseInt(t.label) >= 17).map((time, idx) => (
                            <button
                              key={time.startAtMillis}
                              type="button"
                              onClick={() => setSlot(time.label)}
                              style={{ animationDelay: `${idx * 30}ms` }}
                              className={`animate-[scaleIn_0.25s_ease_forwards] rounded-xl border py-2.5 text-sm font-semibold opacity-0 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                slot === time.label
                                  ? "border-[var(--accent)] bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/25 scale-105"
                                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-1)] hover:border-[var(--accent)]/50 hover:shadow-md"
                              }`}
                            >
                              {time.label}
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
              <AvailabilityAlertAction businessId={props.businessId} serviceId={serviceId}
                staffId={staffId || null} dateKey={appointmentsDate}
                businessEnabled={props.businessAlertsEnabled === true} />
            </div>
          </div>
        )}

        {/* ── Info Step ── */}
        {step === "info" && (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#10b981,#059669)] shadow-md shadow-emerald-500/20">
                <FileCheck2 size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">İletişim Bilgileriniz</h2>
                <p className="text-xs text-[var(--text-3)]">{bookingFields.collectName || bookingFields.collectEmail || bookingFields.collectNotes ? "Randevu onayı için gerekli bilgileri girin" : "Telefonunuzu doğrulayarak hızlıca randevu alın"}</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {bookingFields.collectName && <div className="animate-[fadeSlideIn_0.3s_ease]">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[var(--text-2)]">
                  <UserRound size={14} /> Ad Soyad <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3.5 text-sm font-medium text-[var(--text-1)] shadow-sm transition-all duration-300 placeholder:text-[var(--text-3)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:shadow-lg"
                />
              </div>}
              <div className="animate-[fadeSlideIn_0.35s_ease]">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[var(--text-2)]">
                  <Phone size={14} /> Telefon <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); setPhoneVerified(false); }}
                  onBlur={() => { setInfoTouched(true); if (phoneValid) setCustomerPhone(normalizedCustomerPhone); }}
                  placeholder="05XX XXX XX XX"
                  required
                  aria-invalid={infoTouched && !phoneValid}
                  aria-describedby={infoTouched && !phoneValid ? "booking-phone-error" : undefined}
                  className={`w-full rounded-xl border bg-[var(--field-bg)] px-4 py-3.5 text-sm font-medium text-[var(--text-1)] shadow-sm transition-all duration-300 placeholder:text-[var(--text-3)]/50 focus:outline-none focus:ring-4 ${infoTouched && !phoneValid ? "border-red-400 focus:border-red-500 focus:ring-red-500/10" : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/10"}`}
                />
                {infoTouched && !phoneValid && <p id="booking-phone-error" className="mt-1.5 text-xs font-medium text-red-600">05XX XXX XX XX biçiminde geçerli bir Türkiye telefonu girin.</p>}
              </div>
              {bookingFields.collectEmail && <div className="animate-[fadeSlideIn_0.4s_ease]">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[var(--text-2)]">
                  <Mail size={14} /> E-posta
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  onBlur={() => setInfoTouched(true)}
                  placeholder="ornek@mail.com"
                  aria-invalid={infoTouched && !emailValid}
                  aria-describedby={infoTouched && !emailValid ? "booking-email-error" : undefined}
                  className={`w-full rounded-xl border bg-[var(--field-bg)] px-4 py-3.5 text-sm font-medium text-[var(--text-1)] shadow-sm transition-all duration-300 placeholder:text-[var(--text-3)]/50 focus:outline-none focus:ring-4 ${infoTouched && !emailValid ? "border-red-400 focus:border-red-500 focus:ring-red-500/10" : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/10"}`}
                />
                {infoTouched && !emailValid && <p id="booking-email-error" className="mt-1.5 text-xs font-medium text-red-600">Geçerli bir e-posta adresi girin veya alanı boş bırakın.</p>}
              </div>}
              {bookingFields.collectNotes && <div className="animate-[fadeSlideIn_0.45s_ease]">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[var(--text-2)]">
                  <MessageSquareText size={14} /> Not
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Eklemek istediğiniz not..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3.5 text-sm font-medium text-[var(--text-1)] shadow-sm transition-all duration-300 placeholder:text-[var(--text-3)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:shadow-lg resize-none"
                />
              </div>}
              <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 cursor-pointer transition-all duration-300 hover:bg-[var(--surface-2)] animate-[fadeSlideIn_0.5s_ease]">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-[var(--accent)]"
                />
                <span className="text-xs leading-relaxed text-[var(--text-3)]">
                  <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setPrivacyModalOpen(true); }} className="font-semibold text-[var(--accent)] underline underline-offset-2">Randevu Aydınlatma Metni</button>&apos;ni okudum ve bilgi edindim. Bu onay pazarlama izni değildir.
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
                      {sendingCode ? "Gönderiliyor..." : <span className="inline-flex items-center gap-2"><Send size={14} /> Kodu Tekrar Gönder</span>}
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
                <FileCheck2 size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">Randevu Özeti</h2>
                <p className="text-xs text-[var(--text-3)]">Bilgilerinizi kontrol edin ve onaylayın</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-5">
              <SummaryRow icon={Building2} label="İşletme" value={props.businessName} delay={0} />
              <SummaryRow
                icon={WandSparkles} label="Hizmet" delay={50}
                value={selectedService ? `${displayName(selectedService.name)} (${formatServiceDuration(selectedService.durationMinutes)})` : ""}
              />
              <SummaryRow icon={UserRound} label="Çalışan" value={selectedStaff ? displayName(selectedStaff.fullName) : ""} delay={100} />
              <SummaryRow icon={CalendarDays} label="Tarih" value={appointmentsDate.split("-").reverse().join(".")} delay={150} />
              <SummaryRow icon={Clock3} label="Saat" value={slot} delay={200} />
              <SummaryRow
                icon={CircleDollarSign} label="Fiyat" delay={250}
                value={selectedService ? `${selectedService.price.toLocaleString("tr-TR")} ₺` : ""}
              />
              <hr className="border-[var(--border)]" />
              {bookingFields.collectName && <SummaryRow icon={UserRound} label="Ad Soyad" value={customerName} delay={300} />}
              <SummaryRow icon={Phone} label="Telefon" value={customerPhone} delay={350} />
              {bookingFields.collectEmail && customerEmail && <SummaryRow icon={Mail} label="E-posta" value={customerEmail} delay={400} />}
              {bookingFields.collectNotes && notes && <SummaryRow icon={MessageSquareText} label="Not" value={notes} delay={450} />}
            </div>
          </div>
        )}
      </div>

      {/* ━━━ Navigation ━━━ */}
      {step !== "success" && (
        <div className="booking-navigation flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStepIndex === 0}
            className="group flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-3 text-sm font-semibold text-[var(--text-2)] shadow-sm transition-all duration-300 hover:bg-[var(--field-bg-hover)] hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft size={16} />
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
                  <CheckCircle2 size={17} /> Randevuyu Onayla
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
                (step === "info" && !infoValid)
              }
              className="group flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-300 hover:shadow-xl hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Devam Et
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}

      {privacyModalOpen && <div className="booking-privacy-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPrivacyModalOpen(false); }}>
        <section className="booking-privacy-modal" role="dialog" aria-modal="true" aria-labelledby="booking-privacy-title">
          <header>
            <span><ShieldCheck size={20}/></span>
            <div><small>KVKK · RANDEVU SÜRECİ</small><h2 id="booking-privacy-title">Randevu Aydınlatma Metni</h2><p>Bilgilerinin neden ve nasıl işlendiğini sade biçimde incele.</p></div>
            <button type="button" onClick={() => setPrivacyModalOpen(false)} aria-label="Aydınlatma metnini kapat"><X size={19}/></button>
          </header>
          <div className="booking-privacy-modal__body">
            <article><b>01</b><div><h3>Hangi bilgiler işlenir?</h3><p>Telefon numaran; işletmenin ayarına göre ad-soyad, e-posta ve isteğe bağlı randevu notun; seçtiğin hizmet, çalışan, tarih ve saat bilgileri.</p></div></article>
            <article><b>02</b><div><h3>Neden işlenir?</h3><p>Randevuyu oluşturmak ve yönetmek, telefonunu doğrulamak, çakışmayı önlemek, randevu bildirimlerini iletmek ve işlem güvenliğini sağlamak için.</p></div></article>
            <article><b>03</b><div><h3>Kimlerle paylaşılır?</h3><p>Randevunun yürütülmesi için seçtiğin işletmeyle; hizmetin çalışması için gerekli barındırma, doğrulama, SMS/e-posta ve güvenlik sağlayıcılarıyla amaçla sınırlı olarak.</p></div></article>
            <article><b>04</b><div><h3>Hukuki sebep ve saklama</h3><p>Veriler sözleşmenin kurulması/ifası, hukuki yükümlülük, hakkın tesisi ve meşru menfaat sebeplerine dayanılarak; amaç ve yasal saklama yükümlülüğü sürdüğü kadar işlenir.</p></div></article>
            <aside><ShieldCheck size={17}/><p>Telefon doğrulama kodu yalnızca güvenlik içindir. Bu bilgilendirme pazarlama izni veya açık rıza talebi değildir.</p></aside>
          </div>
          <footer><a href="/kvkk#randevu-aydinlatmasi" target="_blank" rel="noreferrer">Tam KVKK metnini görüntüle</a><button type="button" onClick={() => setPrivacyModalOpen(false)}>Anladım, kapat <CheckCircle2 size={16}/></button></footer>
        </section>
      </div>}

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

function SummaryRow({ icon: Icon, label, value, delay = 0 }: { icon: LucideIcon; label: string; value: string; delay?: number }) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="flex items-center justify-between animate-[fadeSlideIn_0.3s_ease_forwards] opacity-0 py-1"
    >
      <span className="flex items-center gap-2 text-sm text-[var(--text-3)]">
        <Icon size={15} /> {label}
      </span>
      <span className="text-right text-sm font-semibold text-[var(--text-1)]">
        {value}
      </span>
    </div>
  );
}

function dateFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function BookingCalendar({
  value,
  min,
  max,
  availableDateCounts,
  availabilityRange,
  loading,
  availabilityUnavailable,
  onRangeChange,
  onChange,
}: {
  value: string;
  min: string;
  max: string;
  availableDateCounts: Record<string, number>;
  availabilityRange: { start: string; end: string } | null;
  loading: boolean;
  availabilityUnavailable: boolean;
  onRangeChange: (start: string, end: string) => void;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(dateFromIso(value)));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const selectedDate = dateFromIso(value);
  const minMonth = startOfMonth(dateFromIso(min));
  const maxMonth = startOfMonth(dateFromIso(max));
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 }) });
  const rangeStart = format(days[0], "yyyy-MM-dd");
  const rangeEnd = format(days[days.length - 1], "yyyy-MM-dd");
  const rangeLoaded = availabilityRange?.start === rangeStart && availabilityRange.end === rangeEnd;

  useEffect(() => {
    if (open) onRangeChange(rangeStart, rangeEnd);
  }, [open, onRangeChange, rangeEnd, rangeStart]);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    const focusTimer = window.setTimeout(() => focusable()[0]?.focus(), 20);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open]);

  return <div className={`booking-calendar ${open ? "is-open" : ""}`}>
    <button ref={triggerRef} type="button" className="booking-calendar-trigger" onClick={() => { if (!open) setVisibleMonth(startOfMonth(selectedDate)); setOpen(!open); }} aria-expanded={open} aria-haspopup="dialog"><span><CalendarDays size={17}/><span><small>RANDEVU TARİHİ</small><b>{format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })}</b></span></span><ChevronRight size={17}/></button>
    {open && typeof document !== "undefined" && createPortal(<><button type="button" className="booking-calendar-backdrop" aria-label="Takvimi kapat" onClick={() => setOpen(false)}/><section ref={dialogRef} className="booking-calendar-popover" role="dialog" aria-modal="true" aria-label="Randevu tarihi seç" aria-busy={loading}>
      <header><div><small>UYGUN TARİH</small><h3>{format(visibleMonth, "MMMM yyyy", { locale: tr })}</h3></div><nav><button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, -1))} disabled={visibleMonth <= minMonth} aria-label="Önceki ay"><ChevronLeft size={18}/></button><button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} disabled={visibleMonth >= maxMonth} aria-label="Sonraki ay"><ChevronRight size={18}/></button></nav></header>
      <div className="booking-calendar-week" aria-hidden="true">{["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="booking-calendar-days" role="grid">{days.map((day) => {
        const iso = format(day, "yyyy-MM-dd");
        const outside = day.getMonth() !== visibleMonth.getMonth();
        const outsideBookingRange = iso < min || iso > max;
        const slotCount = availableDateCounts[iso] ?? 0;
        const availabilityKnown = rangeLoaded && !loading;
        const hasAvailability = availabilityKnown && slotCount > 0;
        const disabled = outsideBookingRange || loading || (availabilityKnown && !hasAvailability);
        const selected = iso === value;
        const today = iso === istanbulDateKey();
        const availabilityLabel = loading ? "müsaitlik yükleniyor" : availabilityUnavailable ? "seçildiğinde saatler kontrol edilir" : hasAvailability ? `${slotCount} müsait saat` : "müsait saat yok";
        return <button key={iso} type="button" role="gridcell" disabled={disabled} className={`${outside ? "is-outside" : ""} ${selected ? "is-selected" : ""} ${today ? "is-today" : ""} ${hasAvailability ? "is-available" : availabilityKnown ? "is-unavailable" : ""}`} aria-label={`${format(day, "d MMMM yyyy EEEE", { locale: tr })}, ${availabilityLabel}`} aria-selected={selected} onClick={() => { onChange(iso); setOpen(false); }}><span>{format(day, "d")}</span>{hasAvailability && <small>{slotCount}</small>}{today && <i />}</button>;
      })}</div>
      <footer><span className="booking-calendar-legend"><i className="is-available"/> Müsait <i className="is-today"/> Bugün {loading && <b>Yükleniyor…</b>}{availabilityUnavailable && <b>Gün seçince kontrol edilir</b>}</span><button type="button" disabled={loading || (rangeLoaded && (availableDateCounts[istanbulDateKey()] ?? 0) === 0)} onClick={() => { const today = istanbulDateKey(); if (today >= min && today <= max) onChange(today); setOpen(false); }}>Bugün</button></footer>
    </section></>, document.body)}
  </div>;
}
