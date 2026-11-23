"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { addDays } from "date-fns";
import { AlertTriangle, BookUser, CalendarDays, CheckCircle2, Clock3, Layers, MessageCircle, Phone, Plus, Save, Scissors, StickyNote, UserRound, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { createDashboardAppointment, listAppointmentsByDateRange, updateDashboardAppointment } from "@/features/appointments/appointment-repository";
import { clockToMinutes, customerByPhone, findConflict, formatTrPhone, freeStarts, isMobileKey, matchCustomers, minutesToClock, noShowRisk, phoneDigits, phoneKey, type CustomerLite, type DayHours, type DayInterval } from "@/features/appointments/quick-add-domain";
import { listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listCustomers } from "@/features/customers/customer-repository";
import { listServices } from "@/features/services/service-repository";
import { localizedServiceName, localizedVariantName, moneyFormatter, serviceForStaff, servicePriceLabel, variantPriceLabel, variantsOf } from "@/features/services/service-pricing";
import { listStaff } from "@/features/staff/staff-repository";
import { userFacingError } from "@/lib/errors/user-facing-error";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";
import type { Appointment } from "@/types/appointments";
import { millisToZonedDateTime, zonedDateTimeToMillis } from "@/lib/time/zoned";
import { Badge, Button, Callout, Field, FormGrid, Input, NativeSelect, Sheet, Switch, Textarea } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import { useIntlLocale, useLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import styles from "./quick-appointment-modal.module.css";

interface Props {
  businessId: string;
  open: boolean;
  initialStartAt?: Date;
  appointment?: Appointment;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}

type ContactPicker = { select: (props: string[], options?: { multiple?: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>> };

function defaultStart() {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(Math.ceil((date.getMinutes() + 1) / 30) * 30);
  return date;
}

function contactPicker(): ContactPicker | null {
  if (typeof navigator === "undefined") return null;
  const contacts = (navigator as Navigator & { contacts?: ContactPicker }).contacts;
  return contacts && typeof contacts.select === "function" ? contacts : null;
}

const GENERATED_NAME = "Rezerve saat"; // i18n-ignore (veri değeri)

/**
 * Hızlı randevu ekleme/düzenleme. Tarih+saat zorunlu; müşteri (ad, telefon), işlem, kişi ve not isteğe bağlı.
 * Kayıtlı müşteri ad/telefonla önerilir, seçilen günün boş saatleri ve çakışma anında gösterilir.
 */
export function QuickAppointmentModal({ businessId, open, initialStartAt, appointment, onClose, onCreated }: Props) {
  const t = useT();
  const locale = useIntlLocale();
  const siteLocale = useLocale();
  const { businesses, access } = useBusinessContext();
  const businessName = businesses.find((item) => item.id === businessId)?.name ?? "";
  const money = useMemo(() => moneyFormatter(locale), [locale]);
  const formId = useId();
  const suggestId = useId();
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [hours, setHours] = useState<Array<DayHours & { day: number }> | null>(null);
  const [dayRows, setDayRows] = useState<DayInterval[] | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickedId, setPickedId] = useState("");
  const [suggestFor, setSuggestFor] = useState<"name" | "phone" | null>(null);
  const [notify, setNotify] = useState(true);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [serviceId, setServiceId] = useState("");
  // Seçenekli hizmette seçilen seçenek (yalnız yeni randevuda gönderilir; düzenlemede sunucu desteklemiyor).
  const [variantId, setVariantId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const blurTimer = useRef<number | undefined>(undefined);

  // Online müşterinin doğrulanmış numarası panelden değiştirilmez.
  const phoneLocked = Boolean(appointment && appointment.source && appointment.source !== "dashboard");

  useEffect(() => {
    if (!open) return;
    const start = appointment ? new Date(appointment.startAt) : initialStartAt ?? defaultStart();
    queueMicrotask(() => {
      // Ön doldurma da işletme saatiyle yapılır (tarayıcı saat diliminden bağımsız).
      const zoned = millisToZonedDateTime(start.getTime());
      setNowMs(Date.now());
      setDate(zoned.date);
      setTime(zoned.time);
      setCustomerName(appointment?.customerName === GENERATED_NAME ? "" : appointment?.customerName ?? "");
      setPhone(appointment?.customerPhone ? formatTrPhone(appointment.customerPhone) : "");
      setPickedId("");
      setSuggestFor(null);
      setNotify(appointment?.customerNotify !== false);
      setNotes(appointment?.notes ?? "");
      setShowNotes(Boolean(appointment?.notes));
      setServiceId(appointment?.serviceId ?? "");
      setVariantId(appointment?.serviceVariantId ?? "");
      setStaffId(appointment?.staffId ?? access?.staffId ?? "");
    });
    Promise.all([listServices(businessId, true), listStaff(businessId, true)])
      .then(([nextServices, nextStaff]) => {
        setServices(nextServices);
        setStaff(nextStaff);
      })
      .catch(() => toast.error(t("Hizmet ve çalışan listesi alınamadı.")));
    // Müşteri listesi ve çalışma saatleri yardımcı bilgi: yetki yoksa ya da alınamazsa sessizce atlanır.
    if (access?.permissions.viewCustomers !== false) {
      listCustomers(businessId)
        .then((rows) => setCustomers(rows.map((row) => ({ ...row, phone: String(row.phone ?? "") }))))
        .catch(() => setCustomers([]));
    }
    listBusinessWorkingHours(businessId).then(setHours).catch(() => setHours(null));
  }, [access?.permissions.viewCustomers, access?.staffId, appointment, businessId, initialStartAt, open, t]);

  // Seçilen günün randevuları (çakışma ve boş saat önerisi için).
  useEffect(() => {
    if (!open || !date) return;
    let cancelled = false;
    const dayStart = zonedDateTimeToMillis(date, "00:00");
    if (!Number.isFinite(dayStart)) return;
    listAppointmentsByDateRange(businessId, new Date(dayStart - 12 * 3_600_000), new Date(dayStart + 24 * 3_600_000 - 1))
      .then((rows) => {
        if (cancelled) return;
        setDayRows(rows.map((row) => {
          const start = Date.parse(row.startAt);
          const end = Date.parse(row.endAt);
          return {
            id: row.id, staffId: row.staffId || undefined, status: String(row.status),
            label: row.customerName === GENERATED_NAME ? "" : row.customerName,
            start: Math.round((start - dayStart) / 60_000), end: Math.round(((Number.isFinite(end) ? end : start + 30 * 60_000) - dayStart) / 60_000),
          };
        }));
      })
      .catch(() => { if (!cancelled) setDayRows(null); });
    return () => { cancelled = true; };
  }, [businessId, date, open]);

  const quickDays = useMemo(() => {
    const today = new Date();
    return [0, 1, 2].map((offset) => {
      const day = addDays(today, offset);
      return { value: millisToZonedDateTime(day.getTime()).date, label: offset === 0 ? t("Bugün") : offset === 1 ? t("Yarın") : new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }).format(day) };
    });
  }, [locale, t]);
  const rawService = services.find((service) => service.id === serviceId);
  // Seçili çalışanın bu hizmete özel süre/fiyat/fiyat tipi (sunucu randevuyu bununla yazar).
  const selectedService = rawService ? serviceForStaff(rawService, staff.find((member) => member.id === staffId)) : undefined;
  const variants = variantsOf(rawService);
  const selectedVariant = variants.find((variant) => variant.id === variantId) ?? (appointment ? undefined : variants[0]);
  // Düzenlemede mevcut seçenek yalnız gösterilir.
  const keptVariantName = appointment && appointment.serviceId === serviceId ? appointment.serviceVariantName : undefined;
  const serviceHint = selectedService
    ? selectedVariant && !appointment
      ? t("{minutes} dk · {price}", { minutes: selectedVariant.durationMinutes, price: selectedService.priceType === "quote" ? t("Fiyat görüşmede") : variantPriceLabel(selectedService, selectedVariant, t, money) })
      : t("{minutes} dk · {price}", { minutes: selectedService.durationMinutes, price: servicePriceLabel(selectedService, t, money) })
    : undefined;
  const duration = (selectedVariant && !appointment ? selectedVariant.durationMinutes : selectedService?.durationMinutes) ?? 30;

  // ── Müşteri ──
  const key = phoneKey(phone);
  const phoneStarted = phoneDigits(phone).length > 0;
  const phoneInvalid = phoneStarted && !key && phoneDigits(phone).length >= 10;
  const known = customers.find((row) => row.id === pickedId) ?? customerByPhone(customers, key);
  const risk = noShowRisk(known);
  const suggestions = !suggestFor || known ? [] : matchCustomers(customers, suggestFor === "name" ? customerName : phone, 5);
  const mobile = isMobileKey(key);
  const canNotify = Boolean(key && mobile);

  function pickCustomer(row: CustomerLite) {
    setPickedId(row.id);
    setCustomerName(row.fullName);
    setPhone(formatTrPhone(row.phone));
    setSuggestFor(null);
  }

  function clearCustomer() {
    setPickedId("");
    setCustomerName("");
    if (!phoneLocked) setPhone("");
  }

  async function pickFromContacts() {
    const picker = contactPicker();
    if (!picker) return;
    try {
      const [contact] = await picker.select(["name", "tel"], { multiple: false });
      if (!contact) return;
      const tel = contact.tel?.find((value) => phoneKey(value)) ?? contact.tel?.[0] ?? "";
      if (tel) setPhone(formatTrPhone(tel));
      if (contact.name?.[0] && !customerName.trim()) setCustomerName(contact.name[0].slice(0, 80));
      setPickedId("");
    } catch {
      /* Kullanıcı vazgeçti. */
    }
  }

  // ── Saat: çakışma ve boş saatler ──
  const minutes = clockToMinutes(time);
  const weekday = date ? new Date(`${date}T12:00:00Z`).getUTCDay() : -1;
  const dayHours = hours?.find((row) => row.day === weekday) ?? (hours ? { isOpen: false, start: "09:00", end: "18:00" } : null);
  const todayKey = nowMs ? millisToZonedDateTime(nowMs).date : "";
  const notBefore = date && date === todayKey ? clockToMinutes(millisToZonedDateTime(nowMs).time) ?? 0 : 0;
  const conflict = dayRows && minutes !== null ? findConflict(dayRows, minutes, minutes + duration, staffId, appointment?.id ?? "") : undefined;
  const closedDay = Boolean(dayHours && !dayHours.isOpen);
  const outsideHours = Boolean(dayHours?.isOpen && minutes !== null && (() => {
    const open = clockToMinutes(dayHours.start);
    const close = clockToMinutes(dayHours.end);
    return open !== null && close !== null && (minutes < open || minutes + duration > close);
  })());
  const freeTimes = dayRows ? freeStarts({ rows: dayRows, hours: dayHours, duration, staffId, ignoreId: appointment?.id, notBefore, around: conflict ? minutes : null, limit: 6 }) : [];
  const showFree = Boolean(dayRows) && (Boolean(conflict) || outsideHours || freeTimes.length > 0);
  const conflictName = conflict?.label || "";
  const conflictStaff = conflict?.staffId ? staff.find((member) => member.id === conflict.staffId)?.fullName : "";

  function changeService(nextId: string) {
    setServiceId(nextId);
    setVariantId(variantsOf(services.find((service) => service.id === nextId))[0]?.id ?? "");
  }

  function requestClose() {
    if (!saving) onClose();
  }

  function whatsappShare(token: string, startMillis: number) {
    if (!key) return;
    const when = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(startMillis);
    const link = `${window.location.origin}/randevu/${token}`;
    const name = customerName.trim();
    const text = name
      ? t("Merhaba {name}, {business} randevunuz {when} için oluşturuldu. Randevu bilgileriniz: {link}", { name, business: businessName, when, link })
      : t("Merhaba, {business} randevunuz {when} için oluşturuldu. Randevu bilgileriniz: {link}", { business: businessName, when, link });
    window.open(`https://wa.me/${key.replace("+", "")}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!date || !time) {
      toast.error(t("Lütfen randevu tarihini ve saatini seçin."));
      return;
    }
    if (phoneStarted && !key && !phoneLocked) {
      toast.error(t("Telefon numarası eksik veya hatalı. Örn. 0532 123 45 67"));
      return;
    }
    // Tarih/saat işletme saatiyle (Europe/Istanbul) yorumlanır; tarayıcının saat dilimi farklı olsa da doğru kaydedilir.
    const startAt = new Date(zonedDateTimeToMillis(date, time));
    if (Number.isNaN(startAt.getTime())) {
      toast.error(t("Tarih veya saat geçersiz."));
      return;
    }
    setSaving(true);
    try {
      const input = {
        businessId,
        startAtMillis: startAt.getTime(),
        ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
        ...(serviceId ? { serviceId } : {}),
        ...(staffId ? { staffId } : {}),
        customerPhone: phoneLocked ? appointment?.customerPhone ?? "" : key ?? "",
        notes: notes.trim(),
        notifyCustomer: canNotify ? notify : false,
      };
      if (appointment) {
        await updateDashboardAppointment({ ...input, appointmentId: appointment.id });
        toast.success(t("Randevu güncellendi."));
      } else {
        const result = await createDashboardAppointment({ ...input, ...(serviceId && selectedVariant ? { variantId: selectedVariant.id } : {}) });
        const token = result.publicToken;
        const message = key && canNotify && notify
          ? t("Randevu kaydedildi. Müşteriye onay mesajı gönderiliyor.")
          : t("Randevu takvime eklendi; seçilen saat artık dolu görünecek.");
        toast.success(message, {
          description: result.linkedAccount ? t("Müşterinin uygulama hesabı var; randevu hesabında da görünür.") : undefined,
          ...(token && mobile && !(canNotify && notify) ? { action: { label: t("WhatsApp'tan gönder"), onClick: () => whatsappShare(token, startAt.getTime()) } } : {}),
        });
      }
      await onCreated?.();
      onClose();
    } catch (error) {
      toast.error(t(userFacingError(error, tk("Randevu kaydedilemedi. Lütfen yeniden deneyin."))));
    } finally {
      setSaving(false);
    }
  }

  const suggestionList = suggestions.length > 0 && (
    <ul id={suggestId} className={styles.suggest} role="listbox" aria-label={t("Kayıtlı müşteriler")}>
      {suggestions.map((row) => (
        <li key={row.id} role="option" aria-selected={false}>
          <button type="button" className={styles.suggestRow} onMouseDown={(event) => event.preventDefault()} onClick={() => pickCustomer(row)}>
            <span className={styles.avatar} aria-hidden>{(row.fullName || "?").trim().charAt(0).toLocaleUpperCase("tr-TR")}</span>
            <span className={styles.suggestText}>
              <b>{row.fullName || t("İsimsiz müşteri")}</b>
              <small>{formatTrPhone(row.phone)} · {t("{count} randevu", { count: row.totalAppointments ?? 0 })}</small>
            </span>
            {noShowRisk(row) && <Badge tone="amber" size="sm">{t("Gelmeme riski")}</Badge>}
          </button>
        </li>
      ))}
    </ul>
  );

  function onFieldBlur() {
    window.clearTimeout(blurTimer.current);
    blurTimer.current = window.setTimeout(() => setSuggestFor(null), 120);
  }

  return (
    <Sheet
      open={open}
      onClose={requestClose}
      dismissible={!saving}
      title={appointment ? t("Randevuyu düzenle") : t("Yeni randevu")}
      description={t("Tarih ve saat yeterli. Diğer bilgileri şimdi veya daha sonra ekleyebilirsiniz.")}
      footer={<>
        <Button variant="secondary" onClick={requestClose} disabled={saving}>{t("Vazgeç")}</Button>
        <Button type="submit" form={formId} variant="primary" icon={appointment ? Save : Plus} loading={saving} disabled={!date || !time}>
          {saving ? t("Kaydediliyor…") : appointment ? t("Değişiklikleri kaydet") : t("Randevuyu kaydet")}
        </Button>
      </>}
    >
      <form id={formId} onSubmit={submit} className={styles.form} aria-busy={saving}>
        <div className={styles.quickDays} role="group" aria-label={t("Hızlı tarih seçimi")}>
          {quickDays.map((day) => (
            <button key={day.value} type="button" className={cn(styles.dayChip, date === day.value && styles.dayChipActive)} aria-pressed={date === day.value} onClick={() => setDate(day.value)}>{day.label}</button>
          ))}
        </div>
        <FormGrid>
          <Field label={<span className={styles.label}><CalendarDays size={14} aria-hidden /> {t("Tarih")} <b>*</b></span>}>
            <Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label={<span className={styles.label}><Clock3 size={14} aria-hidden /> {t("Saat")} <b>*</b></span>}>
            <Input type="time" required step={900} value={time} onChange={(event) => setTime(event.target.value)} />
          </Field>
        </FormGrid>

        {conflict ? (
          <Callout tone="red" icon={AlertTriangle} title={t("Bu saat dolu")}>
            {[conflictName, conflictStaff, `${minutesToClock(conflict.start)}–${minutesToClock(conflict.end)}`].filter(Boolean).join(" · ")}
          </Callout>
        ) : closedDay ? (
          <Callout tone="amber" icon={AlertTriangle} title={t("İşletme bu gün kapalı")}>{t("Yine de kaydedebilirsiniz; randevu takvimde görünür.")}</Callout>
        ) : outsideHours ? (
          <Callout tone="amber" icon={AlertTriangle} title={t("Çalışma saatleri dışında")}>{t("{start}–{end} arası açıksınız; yine de kaydedebilirsiniz.", { start: dayHours?.start ?? "", end: dayHours?.end ?? "" })}</Callout>
        ) : null}
        {showFree && freeTimes.length > 0 && (
          <div className={styles.freeTimes} role="group" aria-label={t("Uygun saatler")}>
            <span className={styles.freeLabel}>{conflict ? t("En yakın boş saatler") : t("Uygun saatler")}</span>
            {freeTimes.map((start) => {
              const value = minutesToClock(start);
              return <button key={start} type="button" className={cn(styles.timeChip, value === time && styles.timeChipActive)} aria-pressed={value === time} onClick={() => setTime(value)}>{value}</button>;
            })}
          </div>
        )}
        {showFree && freeTimes.length === 0 && !closedDay && <p className={styles.muted}>{t("Bu gün için boş saat kalmadı.")}</p>}

        <fieldset className={styles.customer}>
          <legend className={styles.label}><UserRound size={14} aria-hidden /> {t("Müşteri")} <small>{t("İsteğe bağlı")}</small></legend>
          {known ? (
            <div className={styles.knownCard}>
              <span className={styles.avatar} aria-hidden>{(known.fullName || "?").trim().charAt(0).toLocaleUpperCase("tr-TR")}</span>
              <div className={styles.knownText}>
                <b>{customerName.trim() || known.fullName}</b>
                <small>{formatTrPhone(known.phone)} · {t("{count} randevu", { count: known.totalAppointments ?? 0 })}{known.lastVisitAt ? ` · ${t("son ziyaret {date}", { date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(known.lastVisitAt)) })}` : ""}</small>
                {(known.tags?.length || risk) ? (
                  <span className={styles.knownTags}>
                    {risk && <Badge tone="amber" size="sm" icon={AlertTriangle}>{t("{count} kez gelmedi", { count: risk.count })}</Badge>}
                    {known.tags?.slice(0, 4).map((tag) => <Badge key={tag} size="sm">{tag}</Badge>)}
                  </span>
                ) : null}
                {known.notes && <small className={styles.knownNote}>{known.notes}</small>}
              </div>
              {!phoneLocked && <button type="button" className={styles.iconButton} onClick={clearCustomer} aria-label={t("Müşteriyi değiştir")}><X size={16} aria-hidden /></button>}
            </div>
          ) : (
            <FormGrid>
              <div className={styles.suggestWrap}>
                <Field label={t("Ad soyad")}>
                  <Input value={customerName} maxLength={80} placeholder={t("Örn. Ayşe Yılmaz")} autoComplete="off"
                    aria-autocomplete="list" aria-controls={suggestFor === "name" ? suggestId : undefined}
                    onFocus={() => setSuggestFor("name")} onBlur={onFieldBlur}
                    onChange={(event) => { setCustomerName(event.target.value); setSuggestFor("name"); }} />
                </Field>
                {suggestFor === "name" && suggestionList}
              </div>
              <div className={styles.suggestWrap}>
                <Field label={<span className={styles.label}><Phone size={13} aria-hidden /> {t("Telefon")}</span>}
                  error={phoneInvalid ? t("Geçerli bir numara girin (0 ile başlayan 11 hane).") : undefined}
                  hint={phoneLocked ? t("Müşterinin online randevuda doğruladığı numara değiştirilemez.") : undefined}>
                  <span className={styles.phoneRow}>
                    <Input type="tel" inputMode="tel" autoComplete="off" placeholder="05XX XXX XX XX" value={phone} readOnly={phoneLocked}
                      aria-invalid={phoneInvalid || undefined} aria-autocomplete="list" aria-controls={suggestFor === "phone" ? suggestId : undefined}
                      onFocus={() => setSuggestFor("phone")} onBlur={onFieldBlur}
                      onChange={(event) => { setPhone(formatTrPhone(event.target.value)); setPickedId(""); setSuggestFor("phone"); }} />
                    {!phoneLocked && contactPicker() && (
                      <button type="button" className={styles.iconButton} onClick={pickFromContacts} aria-label={t("Rehberden seç")} title={t("Rehberden seç")}><BookUser size={17} aria-hidden /></button>
                    )}
                  </span>
                </Field>
                {suggestFor === "phone" && suggestionList}
              </div>
            </FormGrid>
          )}
          {key && !known && customers.length > 0 && <p className={styles.muted}><CheckCircle2 size={13} aria-hidden /> {t("Yeni müşteri; kaydedince müşteri listenize eklenir.")}</p>}
          {key && !phoneLocked && (canNotify ? (
            <Switch checked={notify} onChange={setNotify} label={<span className={styles.label}><MessageCircle size={14} aria-hidden /> {t("Müşteriye onay ve hatırlatma gönder")}</span>}
              description={t("WhatsApp'tan, ulaşmazsa SMS ile; randevu bağlantısıyla birlikte. 1 saat kala hatırlatma gider.")} />
          ) : (
            <p className={styles.muted}>{t("Sabit hatta mesaj gönderilemez; numara yalnız kayıt için saklanır.")}</p>
          ))}
        </fieldset>

        <FormGrid>
          <Field label={<span className={styles.label}><Scissors size={14} aria-hidden /> {t("İşlem")} <small>{t("İsteğe bağlı")}</small></span>} hint={serviceHint}>
            <NativeSelect value={serviceId} onChange={(event) => changeService(event.target.value)}>
              <option value="">{t("İşlem seçmeden devam et")}</option>
              {services.map((service) => <option key={service.id} value={service.id}>{localizedServiceName(service, siteLocale)} · {t("{minutes} dk", { minutes: service.durationMinutes })}</option>)}
            </NativeSelect>
          </Field>
          <Field label={<span className={styles.label}><UsersRound size={14} aria-hidden /> {t("Kişi")} <small>{t("İsteğe bağlı")}</small></span>}>
            <NativeSelect value={staffId} onChange={(event) => setStaffId(event.target.value)} disabled={Boolean(access?.staffId && access.role === "staff")}>
              <option value="">{t("Kişi atamadan devam et")}</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.fullName}{item.position ? ` · ${item.position}` : ""}</option>)}
            </NativeSelect>
          </Field>
        </FormGrid>
        {selectedService && !appointment && variants.length > 0 && (
          <Field label={<span className={styles.label}><Layers size={14} aria-hidden /> {t("Seçenek", { ctx: "hizmet" })}</span>}>
            <NativeSelect value={selectedVariant?.id ?? ""} onChange={(event) => setVariantId(event.target.value)}>
              {variants.map((variant) => <option key={variant.id} value={variant.id}>{localizedVariantName(selectedService, variant, siteLocale)} · {t("{minutes} dk", { minutes: variant.durationMinutes })} · {variantPriceLabel(selectedService, variant, t, money)}</option>)}
            </NativeSelect>
          </Field>
        )}
        {keptVariantName && (
          <Field label={<span className={styles.label}><Layers size={14} aria-hidden /> {t("Seçenek", { ctx: "hizmet" })}</span>} hint={t("Seçenek düzenlemede değiştirilemez; farklı seçenek için yeni randevu oluşturun.")}>
            <Input value={keptVariantName} readOnly disabled />
          </Field>
        )}
        {showNotes ? (
          <Field label={<span className={styles.label}><StickyNote size={14} aria-hidden /> {t("Not")} <small>{t("Yalnız ekibiniz görür")}</small></span>}>
            <Textarea rows={2} maxLength={1000} value={notes} placeholder={t("Örn. Boya rengi 7.1, kapıda ödeme")} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        ) : (
          <button type="button" className={styles.addNote} onClick={() => setShowNotes(true)}><StickyNote size={14} aria-hidden /> {t("Not ekle")}</button>
        )}
      </form>
    </Sheet>
  );
}
