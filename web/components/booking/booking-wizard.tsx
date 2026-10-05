"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
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
import { addToDeviceCalendar, googleCalendarUrl, type CalendarEventInput } from "@/lib/calendar/appointment-calendar";
import {
  DEFAULT_BOOKING_FIELD_SETTINGS,
  getBookingFieldSettings,
  type BookingFieldSettings,
} from "@/features/booking/booking-field-settings-repository";
import {
  buildCustomFieldPayload,
  fieldsForService,
  summarizeFieldValues,
  validateFieldValue,
  type CustomFieldInputValues,
} from "@/features/booking-fields/booking-fields-domain";
import { CustomFieldInputs } from "@/features/booking-fields/custom-field-inputs";
import {
  AlertCircle, ArrowLeft, ArrowRight, BellRing, Building2, CalendarDays, CalendarPlus, CalendarRange, Check, CheckCircle2,
  CircleDollarSign, ClipboardList, Clock3, Download, LoaderCircle, Mail, MessageSquareText, Navigation, Phone, Search,
  Send, ShieldCheck, Smartphone, Sparkles, UserRound, UsersRound, WandSparkles, type LucideIcon,
} from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { CalendarSheet, DateStrip, PrivacySheet, SlotGroups } from "./booking-parts";
import {
  addDaysToIso,
  dateFromIso,
  displayName,
  expertiseLabel,
  formatPrice,
  formatServiceDuration,
  initials,
  isValidOptionalEmail,
  isValidTurkishPhone,
  istanbulDateKey,
  maskPhone,
  normalizeTurkishPhone,
  publicStaffBio,
} from "./booking-utils";
import s from "./booking.module.css";

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
  staff: "Uzman",
  datetime: "Tarih",
  info: "Bilgiler",
  verify: "Doğrula",
  summary: "Özet",
  success: "Tamamlandı",
};

const STEP_TITLES: Record<WizardStep, string> = {
  service: "Hizmet seçin",
  staff: "Uzman seçin",
  datetime: "Tarih ve saat",
  info: "İletişim bilgileri",
  verify: "Telefon doğrulama",
  summary: "Randevu özeti",
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

/** Tarih şeridinde gösterilecek en fazla gün (getAvailableDates sınırı 42 gün). */
const STRIP_MAX_DAYS = 42;

const CONFETTI = [
  { x: 6, d: 0, r: 20 }, { x: 14, d: 180, r: -30 }, { x: 22, d: 60, r: 45 }, { x: 31, d: 260, r: 10 },
  { x: 39, d: 120, r: -50 }, { x: 47, d: 320, r: 70 }, { x: 55, d: 40, r: -15 }, { x: 63, d: 220, r: 35 },
  { x: 71, d: 100, r: -60 }, { x: 79, d: 300, r: 25 }, { x: 87, d: 160, r: -40 }, { x: 94, d: 20, r: 55 },
];

function canServe(member: Staff, service: Service | undefined) {
  return !service || member.serviceIds.includes(service.id) || (
    member.serviceIds.length === 0 &&
    (!member.specialtyCategoryIds?.length || member.specialtyCategoryIds.includes(service.category))
  );
}

export function BookingWizard(props: Props) {
  const { user, status: authStatus } = useAuth();
  const [step, setStep] = useState<WizardStep>("service");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableAppointmentSlot[]>([]);
  const [dateAvailability, setDateAvailability] = useState<{ key: string; counts: Record<string, number> }>({ key: "", counts: {} });
  const [datesLoadingCount, setDatesLoadingCount] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [autoJump, setAutoJump] = useState<{ from: string; to: string } | null>(null);

  const [serviceId, setServiceId] = useState(props.preselectedServiceId ?? "");
  const [staffId, setStaffId] = useState(props.preselectedStaffId ?? "");
  const [anyStaff, setAnyStaff] = useState(false);
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
  // İşletmenin süper admin onaylı ek alanları (alan id → değer).
  const [customValues, setCustomValues] = useState<CustomFieldInputValues>({});
  const [customTouched, setCustomTouched] = useState<Record<string, boolean>>({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Phone verification state
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeSentPhone, setCodeSentPhone] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [verifyError, setVerifyError] = useState("");
  const [infoTouched, setInfoTouched] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const availabilitySelectionRef = useRef("");
  const requestedRangesRef = useRef(new Set<string>());
  const userPickedDateRef = useRef(false);
  const appointmentsDateRef = useRef(appointmentsDate);
  const stepRef = useRef<WizardStep>(step);
  const focusHeadingRef = useRef(false);

  const selectionKey = `${serviceId}:${staffId}`;
  useEffect(() => {
    availabilitySelectionRef.current = selectionKey;
  }, [selectionKey]);
  useEffect(() => { appointmentsDateRef.current = appointmentsDate; }, [appointmentsDate]);
  useEffect(() => { stepRef.current = step; }, [step]);

  // Adım değişince başlığa odaklan ve sihirbazın üstünü görünür yap.
  useEffect(() => {
    if (!focusHeadingRef.current) return;
    focusHeadingRef.current = false;
    const root = rootRef.current;
    if (root) {
      const top = root.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.5) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: Math.max(0, window.scrollY + top - 84), behavior: reduce ? "auto" : "smooth" });
      }
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Giriş yapmış kullanıcının bilgilerini (users/{uid}: displayName, phone; Auth: e-posta) boş alanlara doldur.
  // Kullanıcının yazdığı değerin üzerine asla yazılmaz.
  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    let active = true;
    const fill = (setter: (update: (previous: string) => string) => void, value: unknown) => {
      const next = typeof value === "string" ? value.trim() : "";
      if (next) {
        setter((previous) => (previous.trim() ? previous : next));
        setPrefilled(true);
      }
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
    startAtMillis: number;
    durationMinutes: number;
    price: number;
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
      const preselected = props.preselectedStaffId ? staffRows.find((staff) => staff.id === props.preselectedStaffId && canServe(staff, initialService)) : undefined;
      setStaffId((preselected ?? staffRows.find((staff) => canServe(staff, initialService)))?.id ?? "");
    }).catch(() => toast.error("Randevu seçenekleri yüklenemedi."))
      .finally(() => setCatalogLoading(false));
  }, [props.businessId, props.preselectedServiceId, props.preselectedStaffId]);

  useEffect(() => {
    let active = true;
    getBookingFieldSettings(props.businessId)
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
  }, [props.businessId]);

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

  // Tarih müsaitliği: aralıklar birleştirilerek saklanır (şerit + aylık takvim aynı veriyi kullanır).
  const loadDateAvailability = useCallback(async (startDate: string, endDate: string) => {
    if (!serviceId || endDate < startDate) return;
    const key = `${serviceId}:${staffId}`;
    const requestKey = `${key}|${startDate}|${endDate}`;
    if (requestedRangesRef.current.has(requestKey)) return;
    requestedRangesRef.current.add(requestKey);
    setDatesLoadingCount((count) => count + 1);
    try {
      const rows = await listAvailableDates({
        businessId: props.businessId,
        serviceId,
        staffId: staffId || undefined,
        startDate,
        endDate,
      });
      if (availabilitySelectionRef.current !== key) return;
      const counts: Record<string, number> = {};
      for (let day = startDate; day <= endDate; day = addDaysToIso(day, 1)) counts[day] = 0;
      for (const row of rows) counts[row.date] = row.slotCount;
      setDateAvailability((previous) => ({ key, counts: { ...(previous.key === key ? previous.counts : {}), ...counts } }));
      // Bugün (veya seçili gün) için saat kalmadıysa ilk müsait güne geç — kullanıcı tarih seçmediyse.
      const current = appointmentsDateRef.current;
      if (!userPickedDateRef.current && !props.preselectedDate && counts[current] === 0) {
        const next = Object.keys(counts).sort().find((day) => day > current && counts[day] > 0);
        if (next) {
          setAppointmentsDate(next);
          setSlot("");
          setAutoJump({ from: current, to: next });
        }
      }
    } catch (error) {
      requestedRangesRef.current.delete(requestKey);
      if (availabilitySelectionRef.current !== key) return;
      toast.error(userFacingError(error, "Takvim müsaitliği alınamadı."));
    } finally {
      setDatesLoadingCount((count) => Math.max(0, count - 1));
    }
  }, [props.businessId, props.preselectedDate, serviceId, staffId]);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId),
    [serviceId, services]
  );
  const selectedStaff = useMemo(
    () => staffList.find((item) => item.id === staffId),
    [staffList, staffId]
  );
  const selectedSlotRow = useMemo(() => availableSlots.find((item) => item.label === slot), [availableSlots, slot]);
  const assignedStaff = useMemo(
    () => selectedStaff ?? (selectedSlotRow?.staffId ? staffList.find((item) => item.id === selectedSlotRow.staffId) : undefined),
    [selectedSlotRow, selectedStaff, staffList]
  );
  const normalizedCustomerPhone = normalizeTurkishPhone(customerPhone);
  const phoneValid = isValidTurkishPhone(customerPhone);
  const emailValid = isValidOptionalEmail(customerEmail);
  const nameValid = !bookingFields.collectName || customerName.trim().length >= 2;
  const customFieldsForService = useMemo(
    () => fieldsForService(bookingFields.customFields, serviceId),
    [bookingFields.customFields, serviceId]
  );
  const customErrors = useMemo(() => {
    const errors: Record<string, string | null> = {};
    for (const field of customFieldsForService) errors[field.id] = validateFieldValue(field, customValues[field.id]);
    return errors;
  }, [customFieldsForService, customValues]);
  const firstInvalidCustomField = customFieldsForService.find((field) => customErrors[field.id]);
  const customValid = !firstInvalidCustomField;
  const visibleCustomErrors = useMemo(() => {
    const visible: Record<string, string | null> = {};
    for (const field of customFieldsForService) visible[field.id] = customTouched[field.id] ? customErrors[field.id] : null;
    return visible;
  }, [customErrors, customFieldsForService, customTouched]);
  const customSummary = useMemo(
    () => summarizeFieldValues(bookingFields.customFields, serviceId, customValues),
    [bookingFields.customFields, customValues, serviceId]
  );
  const infoValid = phoneValid && emailValid && privacyAccepted && nameValid && customValid;
  const availableDateCounts = dateAvailability.key === selectionKey ? dateAvailability.counts : {};
  const datesLoading = datesLoadingCount > 0;

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

  const visibleServices = useMemo(() => {
    const query = serviceQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return services;
    return services.filter((service) => `${service.name} ${service.description ?? ""}`.toLocaleLowerCase("tr-TR").includes(query));
  }, [serviceQuery, services]);

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

  function changeStep(next: WizardStep, dir: "forward" | "back") {
    setDirection(dir);
    focusHeadingRef.current = true;
    setStep(next);
  }

  function goNext() {
    if (step === "success") return;
    const idx = activeSteps.indexOf(step);
    const nextIdx = idx + 1;
    if (nextIdx < activeSteps.length) {
      changeStep(activeSteps[nextIdx], "forward");
      // Auto-send code when entering verify step (numara değiştiyse yeni kod gönderilir)
      if (activeSteps[nextIdx] === "verify" && !phoneVerified && (!codeSent || codeSentPhone !== normalizedCustomerPhone) && customerPhone) {
        setVerificationCode(["", "", "", "", "", ""]);
        handleSendCode();
      }
    }
  }

  function goBack() {
    const idx = activeSteps.indexOf(step);
    const prevIdx = idx - 1;
    if (prevIdx >= 0) {
      changeStep(activeSteps[prevIdx], "back");
    }
  }

  function jumpTo(target: WizardStep) {
    const targetIndex = activeSteps.indexOf(target);
    if (targetIndex < 0 || targetIndex >= currentStepIndex) return;
    changeStep(target, "back");
  }

  function selectService(service: Service) {
    setServiceId(service.id);
    if (!anyStaff) {
      const eligible = staffList.find((member) => canServe(member, service));
      setStaffId(eligible?.id ?? "");
    }
    setSlot("");
  }

  function selectDate(value: string) {
    userPickedDateRef.current = true;
    setAutoJump(null);
    setAppointmentsDate(value);
    setSlot("");
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
        setCodeSentPhone(normalizedCustomerPhone);
        setCountdown(60);
        toast.success("Doğrulama kodu gönderildi!");
        window.setTimeout(() => pinRefs.current[0]?.focus(), 60);
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
    const digits = value.replace(/\D/g, "");
    if (value && !digits) return;
    // SMS otomatik doldurma / yapıştırma: birden çok hane tek kutuya gelirse dağıt.
    if (digits.length > 1) {
      const newCode = [...verificationCode];
      digits.slice(0, 6 - index).split("").forEach((digit, offset) => { newCode[index + offset] = digit; });
      setVerificationCode(newCode);
      setVerifyError("");
      const fullCode = newCode.join("");
      pinRefs.current[Math.min(5, index + digits.length)]?.focus();
      if (fullCode.length === 6) handleVerifyCode(fullCode);
      return;
    }
    const newCode = [...verificationCode];
    newCode[index] = digits.slice(-1);
    setVerificationCode(newCode);
    setVerifyError("");

    // Auto-focus next input
    if (digits && index < 5) {
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
    if (e.key === "ArrowLeft" && index > 0) pinRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) pinRefs.current[index + 1]?.focus();
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
        if (stepRef.current === "verify") changeStep("summary", "forward");
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
        // Her zaman gönderilir (boş olsa da): sunucu zorunlu ek alanları ancak anahtar varsa denetler.
        customFields: buildCustomFieldPayload(bookingFields.customFields, selectedService.id, customValues),
      });

      const isGuest = !user;
      if (isGuest && createdAppointment.publicToken) {
        addGuestBooking({
          businessId: props.businessId,
          appointmentId: createdAppointment.appointmentId,
          publicToken: createdAppointment.publicToken,
        });
      }
      const staffForSlot = selectedStaff ?? staffList.find((item) => item.id === selectedSlot.staffId);
      setSuccessData({
        appointmentId: createdAppointment.appointmentId,
        publicToken: createdAppointment.publicToken,
        isGuest,
        serviceName: selectedService.name,
        staffName: staffForSlot ? displayName(staffForSlot.fullName) : "İşletme",
        date: format(dateBase, "dd.MM.yyyy"),
        time: slot,
        startAtMillis: selectedSlot.startAtMillis,
        durationMinutes: selectedService.durationMinutes,
        price: selectedService.price,
      });
      setDirection("forward");
      setStep("success");
      window.scrollTo({ top: 0, behavior: "auto" });
      toast.success("Randevunuz başarıyla oluşturuldu!");
    } catch (error) {
      const failure = error as { code?: string; message?: string } | null;
      const fieldMessage = String(failure?.message ?? "");
      const customFieldError = String(failure?.code ?? "").endsWith("invalid-argument")
        && customFieldsForService.some((field) => fieldMessage.includes(`"${field.label}"`));
      if (customFieldError) {
        // İşletme alanları bu arada değiştiyse müşteri bilgiler adımına döner ve sunucunun mesajını görür.
        toast.error(fieldMessage);
        jumpTo("info");
      } else {
        toast.error(userFacingError(error, "Randevunuz oluşturulamadı. Lütfen tekrar deneyin."));
      }
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

  const stripDays = useMemo(() => {
    const days: string[] = [];
    for (let day = minDate; day <= maxDate && days.length < STRIP_MAX_DAYS; day = addDaysToIso(day, 1)) days.push(day);
    if (appointmentsDate > (days[days.length - 1] ?? "") && appointmentsDate <= maxDate) {
      for (let day = addDaysToIso(appointmentsDate, -3); days.length < STRIP_MAX_DAYS * 2 && day <= addDaysToIso(appointmentsDate, 7) && day <= maxDate; day = addDaysToIso(day, 1)) {
        if (!days.includes(day)) days.push(day);
      }
    }
    return days;
  }, [appointmentsDate, maxDate, minDate]);

  useEffect(() => {
    if (step !== "datetime" || !serviceId || !stripDays.length) return;
    const first = stripDays[0];
    const last = stripDays[Math.min(stripDays.length, STRIP_MAX_DAYS) - 1];
    void Promise.resolve().then(() => loadDateAvailability(first, last));
  }, [loadDateAvailability, serviceId, step, stripDays]);

  /* ━━━ Başarı ekranı ━━━ */
  if (step === "success" && successData) {
    const start = new Date(successData.startAtMillis);
    const calendarEvent: CalendarEventInput = {
      uid: successData.appointmentId || successData.publicToken || String(successData.startAtMillis),
      title: `${props.businessName} — ${displayName(successData.serviceName)}`,
      start,
      end: new Date(successData.startAtMillis + Math.max(successData.durationMinutes, 15) * 60000),
      description: [`Hizmet: ${displayName(successData.serviceName)}`, `Uzman: ${successData.staffName}`, props.businessPhone ? `İşletme telefonu: ${props.businessPhone}` : ""].filter(Boolean).join("\n"),
      location: props.businessAddress || props.businessName,
      url: successData.publicToken && typeof window !== "undefined" ? `${window.location.origin}/randevu/${encodeURIComponent(successData.publicToken)}` : undefined,
    };
    const dateObj = dateFromIso(appointmentsDate);
    return (
      <div className={`${s.root} ${s.tokens} ${s.rootDone}`}>
        <div className={s.success}>
          <section className={s.successHero}>
            <div className={s.confetti} aria-hidden="true">
              {CONFETTI.map((item, index) => <i key={index} style={{ "--x": item.x, "--d": item.d, "--r": item.r } as React.CSSProperties} />)}
            </div>
            <span className={s.successEyebrow}><CheckCircle2 size={13} /> RANDEVU OLUŞTURULDU</span>
            <div className={s.mascot}><RoviMascot size={132} mood="happy" alt="Rovi randevunu kutluyor" priority /></div>
            <h2>Randevunuz Onaylandı!</h2>
            <p>{props.businessName} sizi bekliyor. Detaylar aşağıda; değişiklik için güvenli bağlantınızı kullanabilirsiniz.</p>
          </section>

          <section className={s.ticket} aria-label="Randevu detayları">
            <div className={s.ticketDate}>
              <div className={s.ticketCal}><small>{format(dateObj, "MMM", { locale: tr })}</small><b>{format(dateObj, "d")}</b></div>
              <div>
                <strong>{format(dateObj, "d MMMM EEEE", { locale: tr })}</strong>
                <span>Saat <b>{successData.time}</b> · {formatServiceDuration(successData.durationMinutes)}</span>
              </div>
            </div>
            <div className={s.perforation} aria-hidden="true" />
            <div className={s.rows}>
              <SummaryRow icon={Building2} label="İşletme" value={props.businessName} index={0} />
              <SummaryRow icon={WandSparkles} label="Hizmet" value={displayName(successData.serviceName)} index={1} />
              <SummaryRow icon={UserRound} label="Uzman" value={successData.staffName} index={2} />
              <SummaryRow icon={Navigation} label="Adres" value={props.businessAddress} index={3} />
            </div>
            <div className={s.total}><span>Toplam tutar</span><b>{formatPrice(successData.price)}</b></div>
          </section>

          {successData.publicToken && (
            <a href={`/randevu/${encodeURIComponent(successData.publicToken)}`} className={`${s.linkCard} ${s.linkCardPrimary}`} style={{ "--i": 2 } as React.CSSProperties}>
              <i><ShieldCheck size={20} /></i>
              <span><small>GÜVENLİ RANDEVU BAĞLANTISI</small>Randevuyu görüntüle, saatini değiştir veya iptal et</span>
              <ArrowRight size={18} />
            </a>
          )}

          {successData.isGuest && successData.publicToken && authStatus !== "authenticated" && (
            <a href={`/musteri/giris?next=${encodeURIComponent("/hesabim")}`} className={s.linkCard} style={{ "--i": 3 } as React.CSSProperties}>
              <i><UserRound size={20} /></i>
              <span><small>HESABIMA KAYDET</small>Giriş yapın, bu randevu Randevularım listenize eklensin</span>
              <ArrowRight size={18} />
            </a>
          )}

          <div className={s.actionsGrid}>
            <button type="button" className={s.linkCard} style={{ "--i": 4 } as React.CSSProperties} onClick={() => addToDeviceCalendar(calendarEvent, { publicToken: successData.publicToken || undefined, fileName: `randevu-${appointmentsDate}.ics` })}>
              <i><Download size={19} /></i><span>Takvime ekle</span>
            </button>
            <a className={s.linkCard} style={{ "--i": 5 } as React.CSSProperties} href={googleCalendarUrl(calendarEvent)} target="_blank" rel="noopener noreferrer">
              <i><CalendarPlus size={19} /></i><span>Google Takvim</span>
            </a>
            <a className={s.linkCard} style={{ "--i": 6 } as React.CSSProperties} href={`tel:${props.businessPhone}`}>
              <i><Phone size={19} /></i><span>İşletmeyi ara</span>
            </a>
            <a className={s.linkCard} style={{ "--i": 7 } as React.CSSProperties} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.businessAddress)}`} target="_blank" rel="noopener noreferrer">
              <i><Navigation size={19} /></i><span>Yol tarifi</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ━━━ Alt çubuk bilgileri ━━━ */
  const dateShort = format(dateFromIso(appointmentsDate), "d MMM EEE", { locale: tr });
  let blockReason = "";
  if (step === "service" && !serviceId) blockReason = "Devam etmek için bir hizmet seçin";
  else if (step === "staff" && !staffId && !anyStaff) blockReason = "Bir uzman seçin";
  else if (step === "datetime" && !slot) blockReason = slotsLoading ? "Saatler yükleniyor…" : "Uygun bir saat seçin";
  else if (step === "info" && !infoValid) {
    blockReason = !nameValid ? "Adınızı girin" : !phoneValid ? "Geçerli bir telefon girin" : !emailValid ? "E-posta adresini kontrol edin"
      : firstInvalidCustomField ? `${firstInvalidCustomField.label}: ${customErrors[firstInvalidCustomField.id]}` : "Aydınlatma metnini onaylayın";
  } else if (step === "verify" && !phoneVerified) blockReason = "SMS ile gelen kodu girin";
  const nextDisabled = Boolean(blockReason);
  const staffLabel = anyStaff
    ? assignedStaff ? `${displayName(assignedStaff.fullName)} (ilk müsait)` : "Fark etmez · ilk müsait uzman"
    : selectedStaff ? displayName(selectedStaff.fullName) : "";

  return (
    <div ref={rootRef} className={`${s.root} ${s.tokens}`}>
      {/* ━━━ Adım göstergesi ━━━ */}
      <nav className={s.stepper} aria-label="Randevu adımları">
        <div className={s.stepperTop}>
          <div className={s.stepMeta}>
            <span className={s.stepCount}>Adım {currentStepIndex + 1} / {activeSteps.length}</span>
            <span className={s.stepTitle}>{STEP_TITLES[step]}</span>
          </div>
          <span className={s.stepPercent} aria-hidden="true">%{progressPercent}</span>
        </div>
        <ol className={s.steps}>
          {activeSteps.map((item, index) => {
            const state = index < currentStepIndex ? s.stepDone : index === currentStepIndex ? s.stepCurrent : "";
            return <li key={item} className={`${s.stepItem} ${state}`} aria-current={index === currentStepIndex ? "step" : undefined}>
              <button type="button" className={s.stepBtn} disabled={index >= currentStepIndex || submitting} onClick={() => jumpTo(item)} aria-label={`${index + 1}. adım: ${STEP_LABELS[item]}${index < currentStepIndex ? " (tamamlandı, düzenlemek için dokunun)" : ""}`}>
                <span className={s.stepBar} />
                <span className={s.stepLabel}>{index < currentStepIndex && <Check size={11} strokeWidth={3} />}{STEP_LABELS[item]}</span>
              </button>
            </li>;
          })}
        </ol>
      </nav>

      {/* ━━━ Adım içeriği ━━━ */}
      <div key={step} className={`${s.panel} ${direction === "back" ? s.panelBack : ""}`}>
        {/* ── Hizmet ── */}
        {step === "service" && (
          <div>
            <StepHead headingRef={headingRef} icon={WandSparkles} title="Hangi hizmeti almak istersiniz?" text="Süre ve fiyatları karşılaştırın, size uygun olanı seçin." badge={services.length ? `${services.length} hizmet` : undefined} />
            {services.length > 6 && (
              <label className={s.searchBox}>
                <Search size={18} />
                <span className={s.srOnly}>Hizmet ara</span>
                <input type="search" value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} placeholder="Hizmet ara…" enterKeyHint="search" />
              </label>
            )}
            <div className={s.list} role="radiogroup" aria-label="Hizmetler">
              {catalogLoading && Array.from({ length: 3 }).map((_, index) => <div key={index} className={s.skeletonCard} aria-hidden="true" />)}
              {!catalogLoading && visibleServices.length === 0 && <div className={s.empty}><b>Sonuç bulunamadı</b>Farklı bir kelimeyle aramayı deneyin.</div>}
              {visibleServices.map((service, idx) => {
                const on = serviceId === service.id;
                return <label key={service.id} className={`${s.choice} ${on ? s.choiceOn : ""}`} style={{ "--i": idx } as React.CSSProperties}>
                  <input type="radio" name="service" value={service.id} checked={on} onChange={() => selectService(service)} className={s.srOnly} />
                  <span className={s.choiceTile} aria-hidden="true">{initials(service.name)}</span>
                  <span className={s.choiceBody}>
                    <span className={s.choiceName}>{displayName(service.name)}</span>
                    {service.description?.trim() && <span className={s.choiceDesc}>{service.description.trim()}</span>}
                    <span className={s.choiceMeta}>
                      <span className={s.metaChip}><Clock3 size={12} /> {formatServiceDuration(service.durationMinutes)}</span>
                      {service.requiresDeposit && service.depositAmount > 0 && <span className={`${s.metaChip} ${s.metaChipLime}`}>Kapora {formatPrice(service.depositAmount)}</span>}
                    </span>
                  </span>
                  <span className={s.choiceSide}>
                    <span className={s.price}>{formatPrice(service.price)}</span>
                    <span className={s.check} aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                  </span>
                </label>;
              })}
            </div>
          </div>
        )}

        {/* ── Uzman ── */}
        {step === "staff" && (
          <div>
            <StepHead headingRef={headingRef} icon={UsersRound} title="Kiminle randevu almak istersiniz?" text="Dilerseniz uzman seçimini bize bırakın; en erken müsait uzmanı atarız." badge={`${filteredStaff.length} uzman`} />
            {selectedService && <div className={s.context}><WandSparkles size={16} /><span><b>{displayName(selectedService.name)}</b> · {formatServiceDuration(selectedService.durationMinutes)}</span></div>}
            <div className={s.staffGrid} role="radiogroup" aria-label="Uzmanlar">
              {filteredStaff.length > 1 && (
                <label className={`${s.choice} ${anyStaff ? s.choiceOn : ""}`} style={{ "--i": 0 } as React.CSSProperties}>
                  <input type="radio" name="staff" value="" checked={anyStaff} onChange={() => { setAnyStaff(true); setStaffId(""); setSlot(""); }} className={s.srOnly} />
                  <span className={s.avatarStack} aria-hidden="true">
                    {filteredStaff.slice(0, 2).map((member) => <span key={member.id}>{member.photoUrl ? <Image src={member.photoUrl} alt="" fill sizes="36px" /> : initials(member.fullName)}</span>)}
                    <span><Sparkles size={11} /></span>
                  </span>
                  <span className={s.choiceBody}>
                    <span className={s.choiceName}>Fark etmez</span>
                    <span className={s.staffRole}>İlk müsait uzman atanır</span>
                    <span className={s.choiceMeta}><span className={`${s.metaChip} ${s.metaChipLime}`}>En çok saat seçeneği</span></span>
                  </span>
                  <span className={s.check} aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                </label>
              )}
              {filteredStaff.map((member, idx) => {
                const on = !anyStaff && staffId === member.id;
                const bio = publicStaffBio(member.bio);
                const level = expertiseLabel(member.expertiseLevel);
                return <label key={member.id} className={`${s.choice} ${on ? s.choiceOn : ""}`} style={{ "--i": idx + 1 } as React.CSSProperties}>
                  <input type="radio" name="staff" value={member.id} checked={on} onChange={() => { setAnyStaff(false); setStaffId(member.id); setSlot(""); }} className={s.srOnly} />
                  <span className={s.avatar} aria-hidden="true">
                    {member.photoUrl ? <Image src={member.photoUrl} alt="" fill sizes="56px" /> : initials(member.fullName)}
                  </span>
                  <span className={s.choiceBody}>
                    <span className={s.choiceName}>{displayName(member.fullName)}</span>
                    {member.position && <span className={s.staffRole}>{member.position}</span>}
                    {(member.position ?? "").trim().toLocaleLowerCase("tr-TR") !== level.toLocaleLowerCase("tr-TR") && <span className={s.staffLevel}>{level}</span>}
                    {bio && <span className={s.choiceDesc}>{bio}</span>}
                  </span>
                  <span className={s.check} aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                </label>;
              })}
            </div>
          </div>
        )}

        {/* ── Tarih & Saat ── */}
        {step === "datetime" && (
          <div>
            <StepHead headingRef={headingRef} icon={CalendarDays} title="Ne zaman uygunsunuz?" text="Günü seçin, ardından size uyan saate dokunun." />
            {selectedService && <div className={s.context}><WandSparkles size={16} /><span><b>{displayName(selectedService.name)}</b> · {formatServiceDuration(selectedService.durationMinutes)}{staffLabel ? ` · ${staffLabel}` : ""}</span></div>}

            <div className={s.section}>
              <div className={s.sectionHead}>
                <span className={s.sectionTitle}>Tarih <b>{format(dateFromIso(appointmentsDate), "MMMM yyyy", { locale: tr })}</b></span>
                <button type="button" className={s.pillBtn} onClick={() => setCalendarOpen(true)}><CalendarRange size={16} /> Takvim</button>
              </div>
              <DateStrip days={stripDays} value={appointmentsDate} today={minDate} counts={availableDateCounts} loading={datesLoading} onSelect={selectDate} />
              <div className={s.legend} aria-hidden="true">
                <span><i style={{ background: "#22c55e" }} />Müsait</span>
                <span><i style={{ background: "var(--amber)" }} />Az yer</span>
                <span><i style={{ background: "var(--line-strong)" }} />Dolu / kapalı</span>
              </div>
              {autoJump && autoJump.to === appointmentsDate && (
                <div className={s.notice} role="status">
                  <Sparkles size={17} />
                  <span>{autoJump.from === minDate ? "Bugün için uygun saat kalmadı" : `${format(dateFromIso(autoJump.from), "d MMMM", { locale: tr })} için uygun saat yok`}; ilk müsait gün olan <b>{format(dateFromIso(autoJump.to), "d MMMM EEEE", { locale: tr })}</b> seçildi.</span>
                </div>
              )}
            </div>

            <div className={s.section} aria-live="polite">
              <div className={s.sectionHead}>
                <span className={s.sectionTitle}>Saat <b>{format(dateFromIso(appointmentsDate), "d MMMM EEEE", { locale: tr })}</b></span>
                {!slotsLoading && availableSlots.length > 0 && <span className={s.badge}>{availableSlots.length} müsait</span>}
              </div>

              {slotsLoading ? (
                <div className={s.skeletonGrid} aria-label="Müsait saatler yükleniyor">{Array.from({ length: 12 }).map((_, index) => <i key={index} />)}</div>
              ) : availableSlots.length === 0 ? (
                <div className={s.noSlots}>
                  <i><CalendarDays size={24} /></i>
                  <b>Bu tarihte müsait saat bulunmuyor</b>
                  <p>Başka bir gün seçin{filteredStaff.length > 1 ? " veya farklı bir uzman deneyin" : ""}. Dilerseniz bekleme listesine katılın.</p>
                  {!waitlistDone && !waitlistOpen && (
                    <div className={s.noSlotsActions}>
                      <button type="button" onClick={() => setWaitlistOpen(true)} className={`${s.ghost} ${s.amberBtn}`}><BellRing size={16} /> Bekleme listesine katıl</button>
                      {filteredStaff.length > 1 && activeSteps.includes("staff") && <button type="button" onClick={() => jumpTo("staff")} className={s.ghost}><UsersRound size={16} /> Uzmanı değiştir</button>}
                    </div>
                  )}
                  {waitlistOpen && !waitlistDone && (
                    <div className={s.waitlist}>
                      <div><b>Yer açılırsa haber verelim</b><p>İşletme talebinizi görecek ve uygunluk oluştuğunda sizinle iletişime geçecek.</p></div>
                      <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Adınız soyadınız" maxLength={80} autoComplete="name" className={`${s.input} ${s.inputPlain}`} aria-label="Adınız soyadınız" />
                      <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="05xx xxx xx xx" type="tel" inputMode="tel" autoComplete="tel" className={`${s.input} ${s.inputPlain}`} aria-label="Telefon" />
                      <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="E-posta (opsiyonel)" type="email" inputMode="email" autoComplete="email" className={`${s.input} ${s.inputPlain}`} aria-label="E-posta" />
                      <div className={s.noSlotsActions} style={{ justifyContent: "stretch" }}>
                        <button type="button" onClick={() => void joinWaitlist()} disabled={waitlistBusy} className={s.primary} style={{ flex: 1 }}>{waitlistBusy ? <><LoaderCircle size={17} className={s.spin} /> Kaydediliyor…</> : "Talebi kaydet"}</button>
                        <button type="button" onClick={() => setWaitlistOpen(false)} className={s.ghost}>Vazgeç</button>
                      </div>
                    </div>
                  )}
                  {waitlistDone && <div className={s.done}><CheckCircle2 size={16} /> Bekleme listesi talebiniz alındı.</div>}
                </div>
              ) : (
                <SlotGroups slots={availableSlots} value={slot} onSelect={(item) => setSlot(item.label)} />
              )}
            </div>
            <div className={s.alertSlot}>
              <AvailabilityAlertAction businessId={props.businessId} serviceId={serviceId}
                staffId={staffId || null} dateKey={appointmentsDate}
                businessEnabled={props.businessAlertsEnabled === true} />
            </div>
          </div>
        )}

        {/* ── Bilgiler ── */}
        {step === "info" && (
          <div>
            <StepHead headingRef={headingRef} icon={UserRound} title="Size nasıl ulaşalım?" text={bookingFields.collectName || bookingFields.collectEmail || bookingFields.collectNotes ? "Randevu onayı ve hatırlatmalar için bilgilerinizi girin." : "Telefonunuzu doğrulayarak hızlıca randevu alın."} />
            <div className={s.form}>
              {prefilled && authStatus === "authenticated" && <div className={s.prefill}><Sparkles size={16} /> Hesabınızdaki bilgiler dolduruldu, dilerseniz düzenleyin.</div>}
              {bookingFields.collectName && (
                <div className={s.field}>
                  <label htmlFor="booking-name" className={s.fieldLabel}>Ad Soyad <em>*</em></label>
                  <div className={s.inputWrap}>
                    <UserRound size={18} />
                    <input
                      id="booking-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onBlur={() => setInfoTouched(true)}
                      placeholder="Adınız Soyadınız"
                      autoComplete="name"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      required
                      aria-invalid={infoTouched && !nameValid}
                      className={`${s.input} ${infoTouched && !nameValid ? s.inputError : ""}`}
                    />
                    {customerName.trim().length >= 2 && <CheckCircle2 size={18} className={s.inputOk} />}
                  </div>
                  {infoTouched && !nameValid && <p className={s.error}><AlertCircle size={14} /> Adınızı ve soyadınızı girin.</p>}
                </div>
              )}
              <div className={s.field}>
                <label htmlFor="booking-phone" className={s.fieldLabel}>Cep telefonu <em>*</em><small>SMS ile doğrulanır</small></label>
                <div className={s.inputWrap}>
                  <Phone size={18} />
                  <input
                    id="booking-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="next"
                    value={customerPhone}
                    onChange={(e) => { setCustomerPhone(e.target.value); setPhoneVerified(false); }}
                    onBlur={() => { setInfoTouched(true); if (phoneValid) setCustomerPhone(normalizedCustomerPhone); }}
                    placeholder="05XX XXX XX XX"
                    required
                    aria-invalid={infoTouched && !phoneValid}
                    aria-describedby={infoTouched && !phoneValid ? "booking-phone-error" : undefined}
                    className={`${s.input} ${infoTouched && !phoneValid ? s.inputError : ""}`}
                  />
                  {phoneValid && <CheckCircle2 size={18} className={s.inputOk} />}
                </div>
                {infoTouched && !phoneValid && <p id="booking-phone-error" className={s.error}><AlertCircle size={14} /> 05XX XXX XX XX biçiminde geçerli bir Türkiye telefonu girin.</p>}
              </div>
              {bookingFields.collectEmail && (
                <div className={s.field}>
                  <label htmlFor="booking-email" className={s.fieldLabel}>E-posta <small>İsteğe bağlı</small></label>
                  <div className={s.inputWrap}>
                    <Mail size={18} />
                    <input
                      id="booking-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      enterKeyHint="next"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      onBlur={() => setInfoTouched(true)}
                      placeholder="ornek@mail.com"
                      aria-invalid={infoTouched && !emailValid}
                      aria-describedby={infoTouched && !emailValid ? "booking-email-error" : undefined}
                      className={`${s.input} ${infoTouched && !emailValid ? s.inputError : ""}`}
                    />
                  </div>
                  {infoTouched && !emailValid && <p id="booking-email-error" className={s.error}><AlertCircle size={14} /> Geçerli bir e-posta adresi girin veya alanı boş bırakın.</p>}
                </div>
              )}
              {customFieldsForService.length > 0 && (
                <CustomFieldInputs
                  fields={customFieldsForService}
                  values={customValues}
                  errors={visibleCustomErrors}
                  idPrefix="booking-custom"
                  onChange={(id, value) => {
                    setCustomValues((previous) => {
                      const next = { ...previous };
                      if (value === undefined) delete next[id];
                      else next[id] = value;
                      return next;
                    });
                    setCustomTouched((previous) => (previous[id] ? previous : { ...previous, [id]: true }));
                  }}
                />
              )}
              {bookingFields.collectNotes && (
                <div className={s.field}>
                  <label htmlFor="booking-notes" className={s.fieldLabel}>İşletmeye not <small>İsteğe bağlı</small></label>
                  <div className={s.inputWrap}>
                    <textarea
                      id="booking-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Eklemek istediğiniz not..."
                      className={`${s.input} ${s.inputPlain}`}
                    />
                  </div>
                </div>
              )}
              <label className={`${s.consent} ${privacyAccepted ? s.consentOn : ""}`}>
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className={s.srOnly}
                />
                <span className={s.consentBox} aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
                <span className={s.consentText}>
                  <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setPrivacyModalOpen(true); }} className={s.linkBtn}>Randevu Aydınlatma Metni</button>&apos;ni okudum ve bilgi edindim. Bu onay pazarlama izni değildir.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ── Doğrulama ── */}
        {step === "verify" && (
          <div className={s.verify}>
            <div className={`${s.verifyIcon} ${phoneVerified ? s.verifyIconOk : ""}`} aria-hidden="true">
              {phoneVerified ? <Check size={36} strokeWidth={3} /> : <Smartphone size={32} />}
            </div>
            <h2 ref={headingRef} tabIndex={-1}>{phoneVerified ? "Telefon doğrulandı!" : "Kodu girin"}</h2>
            <p>
              {phoneVerified ? (
                "Harika! Randevu özetine yönlendiriliyorsunuz…"
              ) : (
                <><b>{maskPhone(customerPhone)}</b> numarasına gönderilen 6 haneli kodu girin.</>
              )}
            </p>

            {!phoneVerified && (
              <>
                <div className={`${s.otp} ${verifyError ? s.otpError : ""}`} role="group" aria-label="6 haneli doğrulama kodu">
                  {verificationCode.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { pinRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={idx === 0 ? "one-time-code" : "off"}
                      maxLength={idx === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      onPaste={handlePinPaste}
                      onFocus={(e) => e.currentTarget.select()}
                      disabled={verifying}
                      aria-label={`${idx + 1}. hane`}
                      className={`${s.otpBox} ${digit ? s.otpFilled : ""}`}
                    />
                  ))}
                </div>

                {verifyError && <p className={s.verifyError} role="alert"><AlertCircle size={15} /> {verifyError}</p>}

                {(verifying || sendingCode) && (
                  <p className={s.verifyStatus} role="status"><LoaderCircle size={16} className={s.spin} /> {verifying ? "Doğrulanıyor…" : "Kod gönderiliyor…"}</p>
                )}

                <div className={s.verifyLinks}>
                  {countdown > 0 ? (
                    <span className={s.countdown}><Clock3 size={15} /> Yeniden gönder <b>{countdown} sn</b></span>
                  ) : (
                    <button type="button" onClick={handleSendCode} disabled={sendingCode} className={s.pillBtn}>
                      <Send size={15} /> {codeSent ? "Kodu tekrar gönder" : "Kodu gönder"}
                    </button>
                  )}
                  <button type="button" className={s.pillBtn} onClick={() => jumpTo("info")}><Phone size={15} /> Numarayı değiştir</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Özet ── */}
        {step === "summary" && (
          <div>
            <StepHead headingRef={headingRef} icon={CheckCircle2} title="Her şey hazır" text="Bilgilerinizi kontrol edin ve randevunuzu onaylayın." />
            <section className={s.summary}>
              <div className={s.summaryHero}>
                <small>{props.businessName.toLocaleUpperCase("tr-TR")}</small>
                <strong>{format(dateFromIso(appointmentsDate), "d MMMM EEEE", { locale: tr })}</strong>
                <span>{selectedService ? `${displayName(selectedService.name)} · ${formatServiceDuration(selectedService.durationMinutes)}` : ""}</span>
                <span className={s.summaryTime}>{slot}</span>
              </div>
              <div className={s.rows}>
                <SummaryRow icon={WandSparkles} label="Hizmet" index={0}
                  value={selectedService ? `${displayName(selectedService.name)} (${formatServiceDuration(selectedService.durationMinutes)})` : ""}
                  onEdit={() => jumpTo("service")} />
                {activeSteps.includes("staff") && <SummaryRow icon={UserRound} label="Uzman" value={staffLabel || "İşletme"} index={1} onEdit={() => jumpTo("staff")} />}
                <SummaryRow icon={CalendarDays} label="Tarih ve saat" value={`${appointmentsDate.split("-").reverse().join(".")} · ${slot}`} index={2} onEdit={() => jumpTo("datetime")} />
                {bookingFields.collectName && <SummaryRow icon={UserRound} label="Ad Soyad" value={customerName} index={3} onEdit={() => jumpTo("info")} />}
                <SummaryRow icon={Phone} label="Telefon" value={customerPhone} index={4} verified />
                {bookingFields.collectEmail && customerEmail && <SummaryRow icon={Mail} label="E-posta" value={customerEmail} index={5} />}
                {customSummary.map((item) => <SummaryRow key={item.id} icon={ClipboardList} label={item.label} value={item.value} index={6} onEdit={() => jumpTo("info")} />)}
                {bookingFields.collectNotes && notes && <SummaryRow icon={MessageSquareText} label="Not" value={notes} index={6} />}
                <SummaryRow icon={Building2} label="Adres" value={props.businessAddress} index={7} />
              </div>
              <div className={s.total}><span><CircleDollarSign size={15} style={{ verticalAlign: -2, marginRight: 4 }} />Toplam tutar</span><b>{selectedService ? formatPrice(selectedService.price) : ""}</b></div>
            </section>
            <p className={s.secure}><ShieldCheck size={16} /> Ödeme işletmede yapılır. Onaydan sonra randevunuzu güvenli bağlantı ile yönetebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* ━━━ Alt eylem çubuğu ━━━ */}
      <div className={s.actionBar}>
        <div className={s.actionInner}>
          {currentStepIndex > 0 && (
            <button type="button" className={s.iconBtn} onClick={goBack} disabled={submitting} aria-label="Önceki adım"><ArrowLeft size={19} /></button>
          )}
          <div className={s.actionSummary} aria-live="polite">
            <span className={s.actionTitle}>{selectedService ? displayName(selectedService.name) : catalogLoading ? "Yükleniyor…" : "Hizmet seçin"}</span>
            {nextDisabled && step !== "service" ? (
              <span className={s.actionHint}>{blockReason}</span>
            ) : (
              <span className={s.actionSub}>
                {step === "service" || !slot ? (selectedService ? formatServiceDuration(selectedService.durationMinutes) : "") : `${dateShort} · ${slot}`}
                {selectedService && <> · <b>{formatPrice(selectedService.price)}</b></>}
              </span>
            )}
          </div>
          {step === "summary" ? (
            <button type="button" onClick={handleSubmit} disabled={submitting} className={`${s.primary} ${s.primaryLime}`}>
              {submitting ? <><LoaderCircle size={18} className={s.spin} /> Oluşturuluyor</> : <><CheckCircle2 size={18} /> Onayla</>}
            </button>
          ) : (
            <button type="button" onClick={goNext} disabled={nextDisabled} className={s.primary}>
              Devam <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>

      {calendarOpen && (
        <CalendarSheet
          value={appointmentsDate}
          min={minDate}
          max={maxDate}
          counts={availableDateCounts}
          loading={datesLoading}
          onRangeChange={loadDateAvailability}
          onSelect={selectDate}
          onClose={() => setCalendarOpen(false)}
        />
      )}
      {privacyModalOpen && <PrivacySheet onClose={() => setPrivacyModalOpen(false)} />}
    </div>
  );
}

function StepHead({ headingRef, icon: Icon, title, text, badge }: { headingRef: React.RefObject<HTMLHeadingElement | null>; icon: LucideIcon; title: string; text: string; badge?: string }) {
  return (
    <div className={s.head}>
      <span className={s.headIcon} aria-hidden="true"><Icon size={21} /></span>
      <div className={s.headText}>
        <h2 ref={headingRef} tabIndex={-1}>{title}</h2>
        <p>{text}</p>
      </div>
      {badge && <span className={s.badge}>{badge}</span>}
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, index = 0, onEdit, verified }: { icon: LucideIcon; label: string; value: string; index?: number; onEdit?: () => void; verified?: boolean }) {
  if (!value) return null;
  return (
    <div className={s.row} style={{ "--i": index } as React.CSSProperties}>
      <i aria-hidden="true"><Icon size={17} /></i>
      <span><small>{label}</small><b>{value}</b></span>
      {verified && <span className={s.badge}><ShieldCheck size={13} /> Doğrulandı</span>}
      {onEdit && <button type="button" className={s.editBtn} onClick={onEdit} aria-label={`${label} düzenle`}>Düzenle</button>}
    </div>
  );
}

