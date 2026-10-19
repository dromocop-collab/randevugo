"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { enGB, tr } from "date-fns/locale";
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
import { useIntlLocale, useLocale, useT } from "@/i18n/client";
import { localizeHref, tk } from "@/i18n/config";
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
  service: tk("Hizmet"),
  staff: tk("Uzman"),
  datetime: tk("Tarih"),
  info: tk("Bilgiler"),
  verify: tk("Doğrula"),
  summary: tk("Özet"),
  success: tk("Tamamlandı"),
};

const STEP_TITLES: Record<WizardStep, string> = {
  service: tk("Hizmet seçin"),
  staff: tk("Uzman seçin"),
  datetime: tk("Tarih ve saat"),
  info: tk("İletişim bilgileri"),
  verify: tk("Telefon doğrulama"),
  summary: tk("Randevu özeti"),
  success: tk("Tamamlandı"),
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
  const t = useT();
  const locale = useLocale();
  const intlLocale = useIntlLocale();
  const dateLocale = locale === "tr" ? tr : enGB;
  const dayPattern = locale === "tr" ? "d MMMM EEEE" : "EEEE d MMMM";
  // Veri yükleyen efektler sözlük değişince yeniden çalışmasın diye t ref üzerinden okunur.
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);
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
    }).catch(() => { const t = tRef.current; toast.error(t("Randevu seçenekleri yüklenemedi.")); })
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
          else { const t = tRef.current; toast.info(t("Bu saat artık uygun değil. Diğer uygun saatleri görebilirsin.")); }
        }
      } })
      .catch((error) => {
        if (!cancelled) {
          setAvailableSlots([]);
          toast.error(tRef.current(userFacingError(error, tk("Uygun saatler alınamadı."))));
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
      toast.error(tRef.current(userFacingError(error, tk("Takvim müsaitliği alınamadı."))));
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
    for (const field of customFieldsForService) errors[field.id] = validateFieldValue(field, customValues[field.id], t);
    return errors;
  }, [customFieldsForService, customValues, t]);
  const firstInvalidCustomField = customFieldsForService.find((field) => customErrors[field.id]);
  const customValid = !firstInvalidCustomField;
  const visibleCustomErrors = useMemo(() => {
    const visible: Record<string, string | null> = {};
    for (const field of customFieldsForService) visible[field.id] = customTouched[field.id] ? customErrors[field.id] : null;
    return visible;
  }, [customErrors, customFieldsForService, customTouched]);
  const customSummary = useMemo(
    () => summarizeFieldValues(bookingFields.customFields, serviceId, customValues, t, intlLocale),
    [bookingFields.customFields, customValues, serviceId, t, intlLocale]
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
      toast.error(t("Bekleme listesi için adınızı ve telefon veya e-postanızı girin."));
      return;
    }
    setWaitlistBusy(true);
    try {
      const result = await joinAppointmentWaitlist({ businessId: props.businessId, serviceId: selectedService.id, staffId: staffId || undefined, preferredDate: appointmentsDate, customerName: customerName.trim(), customerPhone: normalizedCustomerPhone, customerEmail: customerEmail.trim() });
      setWaitlistDone(true);
      toast.success(result.alreadyJoined ? t("Bu tarih için zaten bekleme listesindesiniz.") : t("Bekleme listesine eklendiniz. Yer açıldığında işletme sizinle iletişime geçecek."));
    } catch (error) { toast.error(t(userFacingError(error, tk("Bekleme listesine eklenemediniz.")))); }
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
        toast.error(result.data.message ? t(result.data.message) : t("SMS şu anda iletilemedi. Lütfen birkaç dakika sonra tekrar deneyin."));
      } else {
        setCodeSent(true);
        setCodeSentPhone(normalizedCustomerPhone);
        setCountdown(60);
        toast.success(t("Doğrulama kodu gönderildi!"));
        window.setTimeout(() => pinRefs.current[0]?.focus(), 60);
      }
    } catch (error: unknown) {
      console.error("sendVerificationCode error:", error);
      const firebaseError = error as { code?: string; message?: string };
      let msg: string = tk("Kod gönderilemedi.");
      if (firebaseError.message?.includes("bekleyin")) { // i18n-ignore — sunucu mesajı denetimi
        msg = firebaseError.message;
      } else if (firebaseError.code === "functions/resource-exhausted") {
        msg = tk("Çok sık deneme. Lütfen biraz bekleyin.");
      }
      setVerifyError(msg);
      toast.error(t(msg));
    } finally {
      setSendingCode(false);
    }
  }, [normalizedCustomerPhone, phoneValid, sendingCode, t]);

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
      toast.success(t("Telefon numarası doğrulandı!"));
      // Auto-advance to summary after short delay
      setTimeout(() => {
        if (stepRef.current === "verify") changeStep("summary", "forward");
      }, 1200);
    } catch (error: unknown) {
      const msg = (error as { message?: string }).message ?? tk("Doğrulama başarısız.");
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
      toast.error(t("Seçtiğiniz saat artık müsait değil. Lütfen yeni bir saat seçin."));
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
        staffName: staffForSlot ? displayName(staffForSlot.fullName) : t("İşletme"),
        date: format(dateBase, "dd.MM.yyyy"),
        time: slot,
        startAtMillis: selectedSlot.startAtMillis,
        durationMinutes: selectedService.durationMinutes,
        price: selectedService.price,
      });
      setDirection("forward");
      setStep("success");
      window.scrollTo({ top: 0, behavior: "auto" });
      toast.success(t("Randevunuz başarıyla oluşturuldu!"));
    } catch (error) {
      const failure = error as { code?: string; message?: string } | null;
      const fieldMessage = String(failure?.message ?? "");
      const customFieldError = String(failure?.code ?? "").endsWith("invalid-argument")
        && customFieldsForService.some((field) => fieldMessage.includes(`"${field.label}"`));
      if (customFieldError) {
        // İşletme alanları bu arada değiştiyse müşteri bilgiler adımına döner ve sunucunun mesajını görür.
        toast.error(t(fieldMessage));
        jumpTo("info");
      } else {
        toast.error(t(userFacingError(error, tk("Randevunuz oluşturulamadı. Lütfen tekrar deneyin."))));
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
      description: [t("Hizmet: {service}", { service: displayName(successData.serviceName) }), t("Uzman: {name}", { name: successData.staffName }), props.businessPhone ? t("İşletme telefonu: {phone}", { phone: props.businessPhone }) : ""].filter(Boolean).join("\n"),
      reminder: t("Randevu hatırlatması"),
      location: props.businessAddress || props.businessName,
      url: successData.publicToken && typeof window !== "undefined" ? `${window.location.origin}${localizeHref(`/randevu/${encodeURIComponent(successData.publicToken)}`, locale)}` : undefined,
    };
    const dateObj = dateFromIso(appointmentsDate);
    return (
      <div className={`${s.root} ${s.tokens} ${s.rootDone}`}>
        <div className={s.success}>
          <section className={s.successHero}>
            <div className={s.confetti} aria-hidden="true">
              {CONFETTI.map((item, index) => <i key={index} style={{ "--x": item.x, "--d": item.d, "--r": item.r } as React.CSSProperties} />)}
            </div>
            <span className={s.successEyebrow}><CheckCircle2 size={13} /> {t("RANDEVU OLUŞTURULDU")}</span>
            <div className={s.mascot}><RoviMascot size={132} mood="happy" alt={t("Rovi randevunu kutluyor")} priority /></div>
            <h2>{t("Randevunuz Onaylandı!")}</h2>
            <p>{t("{name} sizi bekliyor. Detaylar aşağıda; değişiklik için güvenli bağlantınızı kullanabilirsiniz.", { name: props.businessName })}</p>
          </section>

          <section className={s.ticket} aria-label={t("Randevu detayları")}>
            <div className={s.ticketDate}>
              <div className={s.ticketCal}><small>{format(dateObj, "MMM", { locale: dateLocale })}</small><b>{format(dateObj, "d")}</b></div>
              <div>
                <strong>{format(dateObj, dayPattern, { locale: dateLocale })}</strong>
                <span>{t("Saat")} <b>{successData.time}</b> · {formatServiceDuration(successData.durationMinutes, t)}</span>
              </div>
            </div>
            <div className={s.perforation} aria-hidden="true" />
            <div className={s.rows}>
              <SummaryRow icon={Building2} label={t("İşletme")} value={props.businessName} index={0} />
              <SummaryRow icon={WandSparkles} label={t("Hizmet")} value={displayName(successData.serviceName)} index={1} />
              <SummaryRow icon={UserRound} label={t("Uzman")} value={successData.staffName} index={2} />
              <SummaryRow icon={Navigation} label={t("Adres")} value={props.businessAddress} index={3} />
            </div>
            <div className={s.total}><span>{t("Toplam tutar")}</span><b>{formatPrice(successData.price, intlLocale)}</b></div>
          </section>

          {successData.publicToken && (
            <a href={localizeHref(`/randevu/${encodeURIComponent(successData.publicToken)}`, locale)} className={`${s.linkCard} ${s.linkCardPrimary}`} style={{ "--i": 2 } as React.CSSProperties}>
              <i><ShieldCheck size={20} /></i>
              <span><small>{t("GÜVENLİ RANDEVU BAĞLANTISI")}</small>{t("Randevuyu görüntüle, saatini değiştir veya iptal et")}</span>
              <ArrowRight size={18} />
            </a>
          )}

          {successData.isGuest && successData.publicToken && authStatus !== "authenticated" && (
            <a href={localizeHref(`/musteri/giris?next=${encodeURIComponent("/hesabim")}`, locale)} className={s.linkCard} style={{ "--i": 3 } as React.CSSProperties}>
              <i><UserRound size={20} /></i>
              <span><small>{t("HESABIMA KAYDET")}</small>{t("Giriş yapın, bu randevu Randevularım listenize eklensin")}</span>
              <ArrowRight size={18} />
            </a>
          )}

          <div className={s.actionsGrid}>
            <button type="button" className={s.linkCard} style={{ "--i": 4 } as React.CSSProperties} onClick={() => addToDeviceCalendar(calendarEvent, { publicToken: successData.publicToken || undefined, fileName: `randevu-${appointmentsDate}.ics` })}>
              <i><Download size={19} /></i><span>{t("Takvime ekle")}</span>
            </button>
            <a className={s.linkCard} style={{ "--i": 5 } as React.CSSProperties} href={googleCalendarUrl(calendarEvent)} target="_blank" rel="noopener noreferrer">
              <i><CalendarPlus size={19} /></i><span>{t("Google Takvim")}</span>
            </a>
            <a className={s.linkCard} style={{ "--i": 6 } as React.CSSProperties} href={`tel:${props.businessPhone}`}>
              <i><Phone size={19} /></i><span>{t("İşletmeyi ara")}</span>
            </a>
            <a className={s.linkCard} style={{ "--i": 7 } as React.CSSProperties} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.businessAddress)}`} target="_blank" rel="noopener noreferrer">
              <i><Navigation size={19} /></i><span>{t("Yol tarifi")}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ━━━ Alt çubuk bilgileri ━━━ */
  const dateShort = format(dateFromIso(appointmentsDate), locale === "tr" ? "d MMM EEE" : "EEE d MMM", { locale: dateLocale });
  let blockReason = "";
  if (step === "service" && !serviceId) blockReason = t("Devam etmek için bir hizmet seçin");
  else if (step === "staff" && !staffId && !anyStaff) blockReason = t("Bir uzman seçin");
  else if (step === "datetime" && !slot) blockReason = slotsLoading ? t("Saatler yükleniyor…") : t("Uygun bir saat seçin");
  else if (step === "info" && !infoValid) {
    blockReason = !nameValid ? t("Adınızı girin") : !phoneValid ? t("Geçerli bir telefon girin") : !emailValid ? t("E-posta adresini kontrol edin")
      : firstInvalidCustomField ? `${firstInvalidCustomField.label}: ${customErrors[firstInvalidCustomField.id]}` : t("Aydınlatma metnini onaylayın");
  } else if (step === "verify" && !phoneVerified) blockReason = t("SMS ile gelen kodu girin");
  const nextDisabled = Boolean(blockReason);
  const staffLabel = anyStaff
    ? assignedStaff ? t("{name} (ilk müsait)", { name: displayName(assignedStaff.fullName) }) : t("Fark etmez · ilk müsait uzman")
    : selectedStaff ? displayName(selectedStaff.fullName) : "";

  return (
    <div ref={rootRef} className={`${s.root} ${s.tokens}`}>
      {/* ━━━ Adım göstergesi ━━━ */}
      <nav className={s.stepper} aria-label={t("Randevu adımları")}>
        <div className={s.stepperTop}>
          <div className={s.stepMeta}>
            <span className={s.stepCount}>{t("Adım {current} / {total}", { current: currentStepIndex + 1, total: activeSteps.length })}</span>
            <span className={s.stepTitle}>{t(STEP_TITLES[step])}</span>
          </div>
          <span className={s.stepPercent} aria-hidden="true">{t("%{percent}", { percent: progressPercent })}</span>
        </div>
        <ol className={s.steps}>
          {activeSteps.map((item, index) => {
            const state = index < currentStepIndex ? s.stepDone : index === currentStepIndex ? s.stepCurrent : "";
            return <li key={item} className={`${s.stepItem} ${state}`} aria-current={index === currentStepIndex ? "step" : undefined}>
              <button type="button" className={s.stepBtn} disabled={index >= currentStepIndex || submitting} onClick={() => jumpTo(item)} aria-label={index < currentStepIndex ? t("{number}. adım: {label} (tamamlandı, düzenlemek için dokunun)", { number: index + 1, label: t(STEP_LABELS[item]) }) : t("{number}. adım: {label}", { number: index + 1, label: t(STEP_LABELS[item]) })}>
                <span className={s.stepBar} />
                <span className={s.stepLabel}>{index < currentStepIndex && <Check size={11} strokeWidth={3} />}{t(STEP_LABELS[item])}</span>
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
            <StepHead headingRef={headingRef} icon={WandSparkles} title={t("Hangi hizmeti almak istersiniz?")} text={t("Süre ve fiyatları karşılaştırın, size uygun olanı seçin.")} badge={services.length ? t("{count} hizmet", { count: services.length }) : undefined} />
            {services.length > 6 && (
              <label className={s.searchBox}>
                <Search size={18} />
                <span className={s.srOnly}>{t("Hizmet ara")}</span>
                <input type="search" value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} placeholder={t("Hizmet ara…")} enterKeyHint="search" />
              </label>
            )}
            <div className={s.list} role="radiogroup" aria-label={t("Hizmetler")}>
              {catalogLoading && Array.from({ length: 3 }).map((_, index) => <div key={index} className={s.skeletonCard} aria-hidden="true" />)}
              {!catalogLoading && visibleServices.length === 0 && <div className={s.empty}><b>{t("Sonuç bulunamadı")}</b>{t("Farklı bir kelimeyle aramayı deneyin.")}</div>}
              {visibleServices.map((service, idx) => {
                const on = serviceId === service.id;
                return <label key={service.id} className={`${s.choice} ${on ? s.choiceOn : ""}`} style={{ "--i": idx } as React.CSSProperties}>
                  <input type="radio" name="service" value={service.id} checked={on} onChange={() => selectService(service)} className={s.srOnly} />
                  <span className={s.choiceTile} aria-hidden="true">{initials(service.name)}</span>
                  <span className={s.choiceBody}>
                    <span className={s.choiceName}>{displayName(service.name)}</span>
                    {service.description?.trim() && <span className={s.choiceDesc}>{service.description.trim()}</span>}
                    <span className={s.choiceMeta}>
                      <span className={s.metaChip}><Clock3 size={12} /> {formatServiceDuration(service.durationMinutes, t)}</span>
                      {service.requiresDeposit && service.depositAmount > 0 && <span className={`${s.metaChip} ${s.metaChipLime}`}>{t("Kapora {amount}", { amount: formatPrice(service.depositAmount, intlLocale) })}</span>}
                    </span>
                  </span>
                  <span className={s.choiceSide}>
                    <span className={s.price}>{formatPrice(service.price, intlLocale)}</span>
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
            <StepHead headingRef={headingRef} icon={UsersRound} title={t("Kiminle randevu almak istersiniz?")} text={t("Dilerseniz uzman seçimini bize bırakın; en erken müsait uzmanı atarız.")} badge={t("{count} uzman", { count: filteredStaff.length })} />
            {selectedService && <div className={s.context}><WandSparkles size={16} /><span><b>{displayName(selectedService.name)}</b> · {formatServiceDuration(selectedService.durationMinutes, t)}</span></div>}
            <div className={s.staffGrid} role="radiogroup" aria-label={t("Uzmanlar")}>
              {filteredStaff.length > 1 && (
                <label className={`${s.choice} ${anyStaff ? s.choiceOn : ""}`} style={{ "--i": 0 } as React.CSSProperties}>
                  <input type="radio" name="staff" value="" checked={anyStaff} onChange={() => { setAnyStaff(true); setStaffId(""); setSlot(""); }} className={s.srOnly} />
                  <span className={s.avatarStack} aria-hidden="true">
                    {filteredStaff.slice(0, 2).map((member) => <span key={member.id}>{member.photoUrl ? <Image src={member.photoUrl} alt="" fill sizes="36px" /> : initials(member.fullName)}</span>)}
                    <span><Sparkles size={11} /></span>
                  </span>
                  <span className={s.choiceBody}>
                    <span className={s.choiceName}>{t("Fark etmez")}</span>
                    <span className={s.staffRole}>{t("İlk müsait uzman atanır")}</span>
                    <span className={s.choiceMeta}><span className={`${s.metaChip} ${s.metaChipLime}`}>{t("En çok saat seçeneği")}</span></span>
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
                    {(member.position ?? "").trim().toLocaleLowerCase("tr-TR") !== level.toLocaleLowerCase("tr-TR") && <span className={s.staffLevel}>{t(level)}</span>}
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
            <StepHead headingRef={headingRef} icon={CalendarDays} title={t("Ne zaman uygunsunuz?")} text={t("Günü seçin, ardından size uyan saate dokunun.")} />
            {selectedService && <div className={s.context}><WandSparkles size={16} /><span><b>{displayName(selectedService.name)}</b> · {formatServiceDuration(selectedService.durationMinutes, t)}{staffLabel ? ` · ${staffLabel}` : ""}</span></div>}

            <div className={s.section}>
              <div className={s.sectionHead}>
                <span className={s.sectionTitle}>{t("Tarih")} <b>{format(dateFromIso(appointmentsDate), "MMMM yyyy", { locale: dateLocale })}</b></span>
                <button type="button" className={s.pillBtn} onClick={() => setCalendarOpen(true)}><CalendarRange size={16} /> {t("Takvim")}</button>
              </div>
              <DateStrip days={stripDays} value={appointmentsDate} today={minDate} counts={availableDateCounts} loading={datesLoading} onSelect={selectDate} />
              <div className={s.legend} aria-hidden="true">
                <span><i style={{ background: "#22c55e" }} />{t("Müsait")}</span>
                <span><i style={{ background: "var(--amber)" }} />{t("Az yer")}</span>
                <span><i style={{ background: "var(--line-strong)" }} />{t("Dolu / kapalı")}</span>
              </div>
              {autoJump && autoJump.to === appointmentsDate && (
                <div className={s.notice} role="status">
                  <Sparkles size={17} />
                  <span>{autoJump.from === minDate ? t("Bugün için uygun saat kalmadı") : t("{date} için uygun saat yok", { date: format(dateFromIso(autoJump.from), "d MMMM", { locale: dateLocale }) })}; {t("ilk müsait gün olan")} <b>{format(dateFromIso(autoJump.to), dayPattern, { locale: dateLocale })}</b> {t("seçildi.")}</span>
                </div>
              )}
            </div>

            <div className={s.section} aria-live="polite">
              <div className={s.sectionHead}>
                <span className={s.sectionTitle}>{t("Saat")} <b>{format(dateFromIso(appointmentsDate), dayPattern, { locale: dateLocale })}</b></span>
                {!slotsLoading && availableSlots.length > 0 && <span className={s.badge}>{t("{count} müsait", { count: availableSlots.length })}</span>}
              </div>

              {slotsLoading ? (
                <div className={s.skeletonGrid} aria-label={t("Müsait saatler yükleniyor")}>{Array.from({ length: 12 }).map((_, index) => <i key={index} />)}</div>
              ) : availableSlots.length === 0 ? (
                <div className={s.noSlots}>
                  <i><CalendarDays size={24} /></i>
                  <b>{t("Bu tarihte müsait saat bulunmuyor")}</b>
                  <p>{filteredStaff.length > 1 ? t("Başka bir gün seçin veya farklı bir uzman deneyin. Dilerseniz bekleme listesine katılın.") : t("Başka bir gün seçin. Dilerseniz bekleme listesine katılın.")}</p>
                  {!waitlistDone && !waitlistOpen && (
                    <div className={s.noSlotsActions}>
                      <button type="button" onClick={() => setWaitlistOpen(true)} className={`${s.ghost} ${s.amberBtn}`}><BellRing size={16} /> {t("Bekleme listesine katıl")}</button>
                      {filteredStaff.length > 1 && activeSteps.includes("staff") && <button type="button" onClick={() => jumpTo("staff")} className={s.ghost}><UsersRound size={16} /> {t("Uzmanı değiştir")}</button>}
                    </div>
                  )}
                  {waitlistOpen && !waitlistDone && (
                    <div className={s.waitlist}>
                      <div><b>{t("Yer açılırsa haber verelim")}</b><p>{t("İşletme talebinizi görecek ve uygunluk oluştuğunda sizinle iletişime geçecek.")}</p></div>
                      <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={t("Adınız soyadınız")} maxLength={80} autoComplete="name" className={`${s.input} ${s.inputPlain}`} aria-label={t("Adınız soyadınız")} />
                      <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="05xx xxx xx xx" type="tel" inputMode="tel" autoComplete="tel" className={`${s.input} ${s.inputPlain}`} aria-label={t("Telefon")} />
                      <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder={t("E-posta (opsiyonel)")} type="email" inputMode="email" autoComplete="email" className={`${s.input} ${s.inputPlain}`} aria-label={t("E-posta")} />
                      <div className={s.noSlotsActions} style={{ justifyContent: "stretch" }}>
                        <button type="button" onClick={() => void joinWaitlist()} disabled={waitlistBusy} className={s.primary} style={{ flex: 1 }}>{waitlistBusy ? <><LoaderCircle size={17} className={s.spin} /> {t("Kaydediliyor…")}</> : t("Talebi kaydet")}</button>
                        <button type="button" onClick={() => setWaitlistOpen(false)} className={s.ghost}>{t("Vazgeç")}</button>
                      </div>
                    </div>
                  )}
                  {waitlistDone && <div className={s.done}><CheckCircle2 size={16} /> {t("Bekleme listesi talebiniz alındı.")}</div>}
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
            <StepHead headingRef={headingRef} icon={UserRound} title={t("Size nasıl ulaşalım?")} text={bookingFields.collectName || bookingFields.collectEmail || bookingFields.collectNotes ? t("Randevu onayı ve hatırlatmalar için bilgilerinizi girin.") : t("Telefonunuzu doğrulayarak hızlıca randevu alın.")} />
            <div className={s.form}>
              {prefilled && authStatus === "authenticated" && <div className={s.prefill}><Sparkles size={16} /> {t("Hesabınızdaki bilgiler dolduruldu, dilerseniz düzenleyin.")}</div>}
              {bookingFields.collectName && (
                <div className={s.field}>
                  <label htmlFor="booking-name" className={s.fieldLabel}>{t("Ad Soyad")} <em>*</em></label>
                  <div className={s.inputWrap}>
                    <UserRound size={18} />
                    <input
                      id="booking-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onBlur={() => setInfoTouched(true)}
                      placeholder={t("Adınız Soyadınız")}
                      autoComplete="name"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      required
                      aria-invalid={infoTouched && !nameValid}
                      className={`${s.input} ${infoTouched && !nameValid ? s.inputError : ""}`}
                    />
                    {customerName.trim().length >= 2 && <CheckCircle2 size={18} className={s.inputOk} />}
                  </div>
                  {infoTouched && !nameValid && <p className={s.error}><AlertCircle size={14} /> {t("Adınızı ve soyadınızı girin.")}</p>}
                </div>
              )}
              <div className={s.field}>
                <label htmlFor="booking-phone" className={s.fieldLabel}>{t("Cep telefonu")} <em>*</em><small>{t("SMS ile doğrulanır")}</small></label>
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
                {infoTouched && !phoneValid && <p id="booking-phone-error" className={s.error}><AlertCircle size={14} /> {t("05XX XXX XX XX biçiminde geçerli bir Türkiye telefonu girin.")}</p>}
              </div>
              {bookingFields.collectEmail && (
                <div className={s.field}>
                  <label htmlFor="booking-email" className={s.fieldLabel}>{t("E-posta")} <small>{t("İsteğe bağlı")}</small></label>
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
                      placeholder={t("ornek@mail.com")}
                      aria-invalid={infoTouched && !emailValid}
                      aria-describedby={infoTouched && !emailValid ? "booking-email-error" : undefined}
                      className={`${s.input} ${infoTouched && !emailValid ? s.inputError : ""}`}
                    />
                  </div>
                  {infoTouched && !emailValid && <p id="booking-email-error" className={s.error}><AlertCircle size={14} /> {t("Geçerli bir e-posta adresi girin veya alanı boş bırakın.")}</p>}
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
                  <label htmlFor="booking-notes" className={s.fieldLabel}>{t("İşletmeye not")} <small>{t("İsteğe bağlı")}</small></label>
                  <div className={s.inputWrap}>
                    <textarea
                      id="booking-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder={t("Eklemek istediğiniz not...")}
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
                  <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setPrivacyModalOpen(true); }} className={s.linkBtn}>{t("Randevu Aydınlatma Metni")}</button>{t("'ni okudum ve bilgi edindim. Bu onay pazarlama izni değildir.")}
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
            <h2 ref={headingRef} tabIndex={-1}>{phoneVerified ? t("Telefon doğrulandı!") : t("Kodu girin")}</h2>
            <p>
              {phoneVerified ? (
                t("Harika! Randevu özetine yönlendiriliyorsunuz…")
              ) : (
                <><b>{maskPhone(customerPhone)}</b> {t("numarasına gönderilen 6 haneli kodu girin.")}</>
              )}
            </p>

            {!phoneVerified && (
              <>
                <div className={`${s.otp} ${verifyError ? s.otpError : ""}`} role="group" aria-label={t("6 haneli doğrulama kodu")}>
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
                      aria-label={t("{number}. hane", { number: idx + 1 })}
                      className={`${s.otpBox} ${digit ? s.otpFilled : ""}`}
                    />
                  ))}
                </div>

                {verifyError && <p className={s.verifyError} role="alert"><AlertCircle size={15} /> {t(verifyError)}</p>}

                {(verifying || sendingCode) && (
                  <p className={s.verifyStatus} role="status"><LoaderCircle size={16} className={s.spin} /> {verifying ? t("Doğrulanıyor…") : t("Kod gönderiliyor…")}</p>
                )}

                <div className={s.verifyLinks}>
                  {countdown > 0 ? (
                    <span className={s.countdown}><Clock3 size={15} /> {t("Yeniden gönder")} <b>{t("{count} sn", { count: countdown })}</b></span>
                  ) : (
                    <button type="button" onClick={handleSendCode} disabled={sendingCode} className={s.pillBtn}>
                      <Send size={15} /> {codeSent ? t("Kodu tekrar gönder") : t("Kodu gönder")}
                    </button>
                  )}
                  <button type="button" className={s.pillBtn} onClick={() => jumpTo("info")}><Phone size={15} /> {t("Numarayı değiştir")}</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Özet ── */}
        {step === "summary" && (
          <div>
            <StepHead headingRef={headingRef} icon={CheckCircle2} title={t("Her şey hazır")} text={t("Bilgilerinizi kontrol edin ve randevunuzu onaylayın.")} />
            <section className={s.summary}>
              <div className={s.summaryHero}>
                <small>{props.businessName.toLocaleUpperCase("tr-TR")}</small>
                <strong>{format(dateFromIso(appointmentsDate), dayPattern, { locale: dateLocale })}</strong>
                <span>{selectedService ? `${displayName(selectedService.name)} · ${formatServiceDuration(selectedService.durationMinutes, t)}` : ""}</span>
                <span className={s.summaryTime}>{slot}</span>
              </div>
              <div className={s.rows}>
                <SummaryRow icon={WandSparkles} label={t("Hizmet")} index={0}
                  value={selectedService ? `${displayName(selectedService.name)} (${formatServiceDuration(selectedService.durationMinutes, t)})` : ""}
                  onEdit={() => jumpTo("service")} />
                {activeSteps.includes("staff") && <SummaryRow icon={UserRound} label={t("Uzman")} value={staffLabel || t("İşletme")} index={1} onEdit={() => jumpTo("staff")} />}
                <SummaryRow icon={CalendarDays} label={t("Tarih ve saat")} value={`${appointmentsDate.split("-").reverse().join(".")} · ${slot}`} index={2} onEdit={() => jumpTo("datetime")} />
                {bookingFields.collectName && <SummaryRow icon={UserRound} label={t("Ad Soyad")} value={customerName} index={3} onEdit={() => jumpTo("info")} />}
                <SummaryRow icon={Phone} label={t("Telefon")} value={customerPhone} index={4} verified />
                {bookingFields.collectEmail && customerEmail && <SummaryRow icon={Mail} label={t("E-posta")} value={customerEmail} index={5} />}
                {customSummary.map((item) => <SummaryRow key={item.id} icon={ClipboardList} label={item.label} value={item.value} index={6} onEdit={() => jumpTo("info")} />)}
                {bookingFields.collectNotes && notes && <SummaryRow icon={MessageSquareText} label={t("Not")} value={notes} index={6} />}
                <SummaryRow icon={Building2} label={t("Adres")} value={props.businessAddress} index={7} />
              </div>
              <div className={s.total}><span><CircleDollarSign size={15} style={{ verticalAlign: -2, marginRight: 4 }} />{t("Toplam tutar")}</span><b>{selectedService ? formatPrice(selectedService.price, intlLocale) : ""}</b></div>
            </section>
            <p className={s.secure}><ShieldCheck size={16} /> {t("Ödeme işletmede yapılır. Onaydan sonra randevunuzu güvenli bağlantı ile yönetebilirsiniz.")}</p>
          </div>
        )}
      </div>

      {/* ━━━ Alt eylem çubuğu ━━━ */}
      <div className={s.actionBar}>
        <div className={s.actionInner}>
          {currentStepIndex > 0 && (
            <button type="button" className={s.iconBtn} onClick={goBack} disabled={submitting} aria-label={t("Önceki adım")}><ArrowLeft size={19} /></button>
          )}
          <div className={s.actionSummary} aria-live="polite">
            <span className={s.actionTitle}>{selectedService ? displayName(selectedService.name) : catalogLoading ? t("Yükleniyor…") : t("Hizmet seçin")}</span>
            {nextDisabled && step !== "service" ? (
              <span className={s.actionHint}>{blockReason}</span>
            ) : (
              <span className={s.actionSub}>
                {step === "service" || !slot ? (selectedService ? formatServiceDuration(selectedService.durationMinutes, t) : "") : `${dateShort} · ${slot}`}
                {selectedService && <> · <b>{formatPrice(selectedService.price, intlLocale)}</b></>}
              </span>
            )}
          </div>
          {step === "summary" ? (
            <button type="button" onClick={handleSubmit} disabled={submitting} className={`${s.primary} ${s.primaryLime}`}>
              {submitting ? <><LoaderCircle size={18} className={s.spin} /> {t("Oluşturuluyor")}</> : <><CheckCircle2 size={18} /> {t("Onayla")}</>}
            </button>
          ) : (
            <button type="button" onClick={goNext} disabled={nextDisabled} className={s.primary}>
              {t("Devam")} <ArrowRight size={18} />
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
  const t = useT();
  if (!value) return null;
  return (
    <div className={s.row} style={{ "--i": index } as React.CSSProperties}>
      <i aria-hidden="true"><Icon size={17} /></i>
      <span><small>{label}</small><b>{value}</b></span>
      {verified && <span className={s.badge}><ShieldCheck size={13} /> {t("Doğrulandı")}</span>}
      {onEdit && <button type="button" className={s.editBtn} onClick={onEdit} aria-label={t("{label} düzenle", { label })}>{t("Düzenle")}</button>}
    </div>
  );
}

