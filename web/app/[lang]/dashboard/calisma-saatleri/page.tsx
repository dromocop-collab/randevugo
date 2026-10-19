"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarOff, CalendarPlus, Check, Clock3, Copy, Plus, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/hooks/use-business";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import {
  listBusinessWorkingHours,
  updateWorkingHours,
  createSpecialDay,
  listSpecialDays,
  deleteSpecialDay,
} from "@/features/businesses/business-repository";
import type { DaySchedule } from "@/types/business";
import {
  Badge, Button, DashPage, EmptyState, Field, Input, PageHeader, Panel, SegmentedControl, Sheet, Skeleton, SkeletonList,
} from "@/components/dashboard/ui";
import { cx, useConfirm, useUnsavedWarning, ws } from "../_workspace/kit";
import { DAY_NAMES, DAY_SHORT, DayCard, ORDERED_DAYS, cleanSchedule, copySchedule, dayError, formatDuration, fromMinutes, toMinutes, workMinutes } from "../_workspace/week-editor";
import styles from "./working-hours.module.css";

interface SpecialDayRow {
  id: string;
  date: string;
  type: string;
  description?: string;
}

const SPECIAL_TYPES = [
  { value: "holiday", label: tk("Tatil"), hint: tk("Resmî veya işletme tatili") },
  { value: "leave", label: tk("İzin"), hint: tk("Planlı izin günü") },
  { value: "closed", label: tk("Kapalı"), hint: tk("Tüm gün hizmet yok") },
  { value: "custom", label: tk("Özel gün"), hint: tk("Size özel başka bir durum") },
] as const;

function specialTypeLabel(type: string) {
  return SPECIAL_TYPES.find((item) => item.value === type)?.label ?? tk("Özel gün");
}

function defaultSchedule(): DaySchedule[] {
  return ORDERED_DAYS.map((day) => ({
    day,
    isOpen: day !== 0,
    start: "09:00",
    end: "19:00",
    breakStart: "13:00",
    breakEnd: "14:00",
  }));
}






function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatLongDate(value: string, locale: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", weekday: "long" });
}

export default function WorkingHoursPage() {
  const { businessId } = useBusiness();
  const t = useT();
  const locale = useIntlLocale();
  const longDate = (value: string) => formatLongDate(value, locale);
  const [hours, setHours] = useState<DaySchedule[]>(defaultSchedule());
  const [savedHours, setSavedHours] = useState<DaySchedule[]>(defaultSchedule());
  const [specialDays, setSpecialDays] = useState<SpecialDayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [specialView, setSpecialView] = useState<"upcoming" | "past">("upcoming");
  const [showSpecialSheet, setShowSpecialSheet] = useState(false);
  const [specialBusy, setSpecialBusy] = useState(false);
  const { confirm, dialog } = useConfirm();

  // Özel gün formu
  const [sdDate, setSdDate] = useState("");
  const [sdType, setSdType] = useState("holiday");
  const [sdDescription, setSdDescription] = useState("");
  const [sdTouched, setSdTouched] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    Promise.all([
      listBusinessWorkingHours(businessId),
      listSpecialDays(businessId),
    ]).then(([wh, sd]) => {
      if (cancelled) return;
      if (wh.length > 0) {
        // Tüm 7 günün bulunduğundan emin ol
        const merged = ORDERED_DAYS.map((day) => {
          const existing = wh.find((h) => h.day === day);
          return existing ?? { day, isOpen: day !== 0, start: "09:00", end: "19:00" };
        });
        setHours(merged);
        setSavedHours(merged);
      }
      setSpecialDays(sd);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
        toast.error(t("Çalışma saatleri yüklenemedi."));
      }
    });

    return () => { cancelled = true; };
  }, [businessId, t]);

  const hasChanges = useMemo(() => JSON.stringify(hours) !== JSON.stringify(savedHours), [hours, savedHours]);
  useUnsavedWarning(hasChanges);
  const errors = useMemo(() => Object.fromEntries(hours.map((day) => [day.day, dayError(day)])) as Record<number, string | null>, [hours]);
  const errorCount = Object.values(errors).filter(Boolean).length;
  const openDays = hours.filter((item) => item.isOpen).length;
  const weeklyMinutes = hours.reduce((total, day) => total + workMinutes(day), 0);

  // Görsel hafta şeridi ölçeği
  const scale = useMemo(() => {
    const open = hours.filter((day) => day.isOpen && !errors[day.day]);
    const min = open.length ? Math.min(...open.map((day) => toMinutes(day.start))) : 8 * 60;
    const max = open.length ? Math.max(...open.map((day) => toMinutes(day.end))) : 20 * 60;
    const from = Math.max(0, Math.floor(min / 60) * 60 - 60);
    const to = Math.min(24 * 60, Math.ceil(max / 60) * 60 + 60);
    return { from, to, span: Math.max(60, to - from) };
  }, [errors, hours]);

  const sortedSpecialDays = useMemo(() => {
    const today = todayKey();
    const upcoming = specialDays.filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = specialDays.filter((item) => item.date < today).sort((a, b) => b.date.localeCompare(a.date));
    return { upcoming, past };
  }, [specialDays]);
  const visibleSpecialDays = sortedSpecialDays[specialView];

  function updateDay(dayNumber: number, patch: Partial<DaySchedule>) {
    setHours((prev) => prev.map((item) => (item.day === dayNumber ? { ...item, ...patch } : item)));
  }

  function applyWithUndo(next: DaySchedule[], message: string) {
    const previous = hours;
    setHours(next);
    toast.success(message, { action: { label: t("Geri al"), onClick: () => setHours(previous) } });
  }

  function applyWeekdayPreset(start: string, end: string) {
    applyWithUndo(
      hours.map((item) => item.day === 0 ? { ...item, isOpen: false } : { ...item, isOpen: true, start, end, breakStart: "13:00", breakEnd: "14:00" }),
      t("Pazartesi–Cumartesi {start}–{end} olarak hazırlandı.", { start, end }),
    );
  }

  function applyEveryDayPreset(start: string, end: string) {
    applyWithUndo(
      hours.map((item) => ({ ...item, isOpen: true, start, end, breakStart: undefined, breakEnd: undefined })),
      t("Her gün {start}–{end} olarak hazırlandı.", { start, end }),
    );
  }

  function copyDay(source: DaySchedule, target: "weekdays" | "all") {
    const label = t(DAY_NAMES[source.day]);
    applyWithUndo(
      copySchedule(hours, source, target),
      target === "weekdays" ? t("{day} saatleri hafta içine kopyalandı.", { day: label }) : t("{day} saatleri tüm günlere kopyalandı.", { day: label }),
    );
  }

  async function handleSave() {
    if (!businessId) return;
    const invalidDay = hours.find((item) => errors[item.day]);
    if (invalidDay) {
      toast.error(t("{day}: {error}", { day: t(DAY_NAMES[invalidDay.day]), error: t(errors[invalidDay.day] ?? "") }));
      document.getElementById(`day-${invalidDay.day}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    try {
      await updateWorkingHours(businessId, cleanSchedule(hours));
      setSavedHours(hours);
      toast.success(t("Çalışma saatleri kaydedildi. Müşteriler yeni saatleri görüyor."));
    } catch {
      toast.error(t("Kaydetme başarısız. Bağlantınızı kontrol edip yeniden deneyin."));
    } finally {
      setSaving(false);
    }
  }

  function openSpecialSheet() {
    setSdDate("");
    setSdType("holiday");
    setSdDescription("");
    setSdTouched(false);
    setShowSpecialSheet(true);
  }

  const sdDuplicate = Boolean(sdDate) && specialDays.some((item) => item.date === sdDate);
  const sdError = !sdDate ? t("Bir tarih seçin.") : sdDuplicate ? t("Bu tarih için zaten bir özel gün var.") : null;

  async function handleAddSpecialDay(e: FormEvent) {
    e.preventDefault();
    setSdTouched(true);
    if (!businessId || sdError) return;
    setSpecialBusy(true);
    try {
      await createSpecialDay(businessId, {
        date: sdDate,
        type: sdType,
        description: sdDescription.trim() || undefined,
      });
      setSpecialDays(await listSpecialDays(businessId));
      setSpecialView(sdDate >= todayKey() ? "upcoming" : "past");
      setShowSpecialSheet(false);
      toast.success(t("Özel gün eklendi. O gün randevuya kapalı görünecek."));
    } catch {
      toast.error(t("Özel gün eklenemedi."));
    } finally {
      setSpecialBusy(false);
    }
  }

  async function handleDeleteSpecialDay(row: SpecialDayRow) {
    if (!businessId) return;
    const ok = await confirm({
      title: t("Özel gün silinsin mi?"),
      description: t("{date} ({type}) kaldırılacak; o gün normal haftalık programa döner.", { date: longDate(row.date), type: t(specialTypeLabel(row.type)) }),
      confirmLabel: t("Sil"),
    });
    if (!ok) return;
    try {
      await deleteSpecialDay(businessId, row.id);
      setSpecialDays((prev) => prev.filter((sd) => sd.id !== row.id));
      toast.success(t("Özel gün silindi."));
    } catch {
      toast.error(t("Silme başarısız."));
    }
  }

  if (loading) {
    return (
      <DashPage>
        <Skeleton height={150} radius={24} />
        <Skeleton height={230} radius={22} />
        <SkeletonList rows={4} height={140} label={t("Çalışma saatleri yükleniyor")} />
      </DashPage>
    );
  }

  return (
    <DashPage className={styles.root}>
      <PageHeader
        eyebrow={t("Çalışma düzeni")}
        icon={Clock3}
        title={t("Ne zaman açıksınız?")}
        description={t("Günleri açıp kapatın, saatleri ve molaları ayarlayın. Müşteriler yalnızca uygun saatleri görür.")}
        meta={<>
          <Badge tone="accent" icon={CalendarDays}>{t("{count} açık gün", { count: openDays })}</Badge>
          <Badge tone="neutral" icon={Clock3}>{t("Haftalık {duration}", { duration: formatDuration(weeklyMinutes, t) })}</Badge>
          <Badge tone="neutral" icon={CalendarOff}>{t("{count} yaklaşan özel gün", { count: sortedSpecialDays.upcoming.length })}</Badge>
        </>}
      />

      {/* Haftalık görünüm */}
      <Panel title={t("Haftanız bir bakışta")} description={t("Çubuklar çalışma aralığını, taralı alan molayı gösterir. Bir güne dokunup düzenleyin.")} icon={CalendarDays}>
        <ol className={styles.week} aria-label={t("Haftalık özet")}>
          {hours.map((day) => {
            const startM = toMinutes(day.start);
            const endM = toMinutes(day.end);
            const range = Math.max(1, endM - startM);
            const left = ((startM - scale.from) / scale.span) * 100;
            const width = (range / scale.span) * 100;
            const breakLeft = day.breakStart ? ((toMinutes(day.breakStart) - startM) / range) * 100 : 0;
            const breakWidth = day.breakStart && day.breakEnd ? ((toMinutes(day.breakEnd) - toMinutes(day.breakStart)) / range) * 100 : 0;
            const invalid = Boolean(errors[day.day]);
            return (
              <li key={day.day} className={styles.weekRow}>
                <a href={`#day-${day.day}`} className={styles.weekDay} aria-label={t("{day} gününe git", { day: t(DAY_NAMES[day.day]) })}>{t(DAY_SHORT[day.day])}</a>
                <span className={styles.weekTrack}>
                  {day.isOpen && !invalid ? (
                    <span className={styles.weekBar} style={{ left: `${left}%`, width: `${width}%` }}>
                      {breakWidth > 0 ? <span className={styles.weekBreak} style={{ left: `${breakLeft}%`, width: `${breakWidth}%` }} /> : null}
                    </span>
                  ) : <span className={cx(styles.weekClosed, invalid && styles.weekInvalid)}>{invalid ? t("Hatalı saat") : t("Kapalı")}</span>}
                </span>
                <span className={cx(styles.weekTime, ws.mono)}>{day.isOpen ? `${day.start}–${day.end}` : "—"}</span>
              </li>
            );
          })}
        </ol>
        <div className={styles.scaleLegend} aria-hidden="true"><span>{fromMinutes(scale.from)}</span><span><i className={styles.legendBreak} /> {t("mola")}</span><span>{fromMinutes(scale.to)}</span></div>
      </Panel>

      {/* Hazır düzenler */}
      <Panel title={t("Hızlı kurulum")} description={t("Bir düzen seçin, sonra günleri tek tek ince ayarlayın. Her işlem geri alınabilir.")} icon={Copy}>
        <div className={ws.chips}>
          <button type="button" className={ws.chip} onClick={() => applyWeekdayPreset("09:00", "18:00")}><Clock3 size={15} /> {t("Pzt–Cmt {start}–{end}", { start: "09:00", end: "18:00" })}</button>
          <button type="button" className={ws.chip} onClick={() => applyWeekdayPreset("09:00", "19:00")}><Clock3 size={15} /> {t("Pzt–Cmt {start}–{end}", { start: "09:00", end: "19:00" })}</button>
          <button type="button" className={ws.chip} onClick={() => applyEveryDayPreset("10:00", "20:00")}><Clock3 size={15} /> {t("Her gün {start}–{end}", { start: "10:00", end: "20:00" })}</button>
          <button type="button" className={ws.chip} onClick={() => { const monday = hours.find((item) => item.day === 1); if (monday) copyDay(monday, "weekdays"); }}><Copy size={15} /> {t("Pazartesiyi hafta içine kopyala")}</button>
        </div>
      </Panel>

      {/* Gün düzenleyicileri */}
      <section className={styles.days} aria-label={t("Gün gün çalışma saatleri")}>
        {hours.map((day) => (
          <DayCard key={day.day} day={day} onChange={(patch) => updateDay(day.day, patch)} onCopy={(target) => copyDay(day, target)} />
        ))}
      </section>

      {/* Özel günler */}
      <Panel
        title={t("Tatil ve özel günler")}
        description={t("Normal programın dışında kapalı olacağınız günler.")}
        icon={CalendarOff}
        actions={<Button variant="primary" icon={CalendarPlus} onClick={openSpecialSheet}>{t("Özel gün ekle")}</Button>}
      >
        <div className={ws.stackSm}>
          <SegmentedControl
            ariaLabel={t("Özel gün görünümü")}
            value={specialView}
            onChange={setSpecialView}
            options={[
              { value: "upcoming", label: t("Yaklaşan"), count: sortedSpecialDays.upcoming.length },
              { value: "past", label: t("Geçmiş"), count: sortedSpecialDays.past.length },
            ]}
          />
          {visibleSpecialDays.length ? (
            <ul className={styles.specialList}>
              {visibleSpecialDays.map((row) => {
                const date = new Date(`${row.date}T12:00:00`);
                return (
                  <li key={row.id} className={cx(styles.special, specialView === "past" && styles.specialPast)}>
                    <span className={styles.specialDate} aria-hidden="true"><b>{date.getDate()}</b><small>{date.toLocaleDateString(locale, { month: "short" })}</small></span>
                    <div className={styles.specialCopy}>
                      <b>{longDate(row.date)}</b>
                      <span><Badge size="sm" tone={row.type === "custom" ? "accent" : row.type === "leave" ? "violet" : "amber"}>{t(specialTypeLabel(row.type))}</Badge>{row.description ? <span className={ws.truncate}>{row.description}</span> : null}</span>
                    </div>
                    <Button variant="dangerSoft" iconOnly icon={Trash2} onClick={() => void handleDeleteSpecialDay(row)} aria-label={t("{date} özel gününü sil", { date: longDate(row.date) })} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              compact
              mascot={specialView === "upcoming" ? "happy" : "idle"}
              title={specialView === "upcoming" ? t("Yaklaşan özel gün yok") : t("Geçmiş özel gün yok")}
              description={specialView === "upcoming" ? t("Bayram, tatil veya kapalı olacağınız bir günü ekleyin; o gün randevuya kapanır.") : t("Geçmişte eklediğiniz özel günler burada listelenir.")}
              action={specialView === "upcoming" ? <Button variant="soft" icon={CalendarPlus} onClick={openSpecialSheet}>{t("Özel gün ekle")}</Button> : undefined}
            />
          )}
        </div>
      </Panel>

      {/* Yapışkan kaydet çubuğu */}
      {hasChanges ? (
        <div className={ws.saveBar} role="region" aria-label={t("Kaydedilmemiş değişiklikler")}>
          <div className={ws.saveInner}>
            <span className={cx(ws.saveIcon, errorCount > 0 && ws.saveIconError)} aria-hidden="true">{errorCount ? <TriangleAlert size={17} /> : <Clock3 size={17} />}</span>
            <div className={ws.saveCopy}>
              <b>{errorCount ? t("{count} günde hatalı saat var", { count: errorCount }) : t("Kaydedilmemiş değişiklikler")}</b>
              <small>{errorCount ? t("Kaydetmeden önce işaretli günleri düzeltin.") : t("Yeni saatlerin yayınlanması için kaydedin.")}</small>
            </div>
            <Button variant="ghost" icon={RotateCcw} onClick={() => setHours(savedHours)} disabled={saving}>{t("Vazgeç")}</Button>
            <Button variant="primary" icon={Save} loading={saving} onClick={() => void handleSave()} disabled={errorCount > 0}>{t("Kaydet")}</Button>
          </div>
        </div>
      ) : (
        <p className={styles.savedNote}><Check size={15} /> {t("Çalışma programınız güncel.")}</p>
      )}

      <Sheet
        open={showSpecialSheet}
        onClose={() => setShowSpecialSheet(false)}
        dismissible={!specialBusy}
        size="sm"
        title={t("Özel gün ekle")}
        description={t("Seçtiğiniz gün tüm gün randevuya kapatılır.")}
        footer={<>
          <Button onClick={() => setShowSpecialSheet(false)} disabled={specialBusy}>{t("Vazgeç")}</Button>
          <Button type="submit" form="special-day-form" variant="primary" icon={Plus} loading={specialBusy}>{t("Ekle")}</Button>
        </>}
      >
        <form id="special-day-form" className={ws.stack} onSubmit={handleAddSpecialDay} noValidate>
          <Field label={t("Tarih")} error={sdTouched ? sdError : null}>
            <Input type="date" data-autofocus value={sdDate} min={todayKey()} onChange={(event) => { setSdDate(event.target.value); setSdTouched(true); }} aria-invalid={Boolean(sdTouched && sdError)} className={cx(sdTouched && sdError && styles.invalid)} />
          </Field>
          <fieldset className={styles.typeSet}>
            <legend className={styles.legend}>{t("Tür")}</legend>
            <div className={ws.checkGrid}>
              {SPECIAL_TYPES.map((type) => (
                <label key={type.value} className={ws.checkCard}>
                  <input type="radio" name="special-type" value={type.value} checked={sdType === type.value} onChange={() => setSdType(type.value)} />
                  <span className={ws.checkText}><b>{t(type.label)}</b><small>{t(type.hint)}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={t("Açıklama (isteğe bağlı)")} hint={t("Örn. Kurban Bayramı, ekip eğitimi")}>
            <Input value={sdDescription} maxLength={120} onChange={(event) => setSdDescription(event.target.value)} placeholder={t("Kısa bir not")} />
          </Field>
        </form>
      </Sheet>
      {dialog}
    </DashPage>
  );
}
