"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarOff, CalendarPlus, Check, Clock3, Copy, Plus, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/hooks/use-business";
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
  { value: "holiday", label: "Tatil", hint: "Resmî veya işletme tatili" },
  { value: "leave", label: "İzin", hint: "Planlı izin günü" },
  { value: "closed", label: "Kapalı", hint: "Tüm gün hizmet yok" },
  { value: "custom", label: "Özel gün", hint: "Size özel başka bir durum" },
] as const;

function specialTypeLabel(type: string) {
  return SPECIAL_TYPES.find((item) => item.value === type)?.label ?? "Özel gün";
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

function formatLongDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
}

export default function WorkingHoursPage() {
  const { businessId } = useBusiness();
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
        toast.error("Çalışma saatleri yüklenemedi.");
      }
    });

    return () => { cancelled = true; };
  }, [businessId]);

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
    toast.success(message, { action: { label: "Geri al", onClick: () => setHours(previous) } });
  }

  function applyWeekdayPreset(start: string, end: string) {
    applyWithUndo(
      hours.map((item) => item.day === 0 ? { ...item, isOpen: false } : { ...item, isOpen: true, start, end, breakStart: "13:00", breakEnd: "14:00" }),
      `Pazartesi–Cumartesi ${start}–${end} olarak hazırlandı.`,
    );
  }

  function applyEveryDayPreset(start: string, end: string) {
    applyWithUndo(
      hours.map((item) => ({ ...item, isOpen: true, start, end, breakStart: undefined, breakEnd: undefined })),
      `Her gün ${start}–${end} olarak hazırlandı.`,
    );
  }

  function copyDay(source: DaySchedule, target: "weekdays" | "all") {
    const label = DAY_NAMES[source.day];
    applyWithUndo(
      copySchedule(hours, source, target),
      target === "weekdays" ? `${label} saatleri hafta içine kopyalandı.` : `${label} saatleri tüm günlere kopyalandı.`,
    );
  }

  async function handleSave() {
    if (!businessId) return;
    const invalidDay = hours.find((item) => errors[item.day]);
    if (invalidDay) {
      toast.error(`${DAY_NAMES[invalidDay.day]}: ${errors[invalidDay.day]}`);
      document.getElementById(`day-${invalidDay.day}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    try {
      await updateWorkingHours(businessId, cleanSchedule(hours));
      setSavedHours(hours);
      toast.success("Çalışma saatleri kaydedildi. Müşteriler yeni saatleri görüyor.");
    } catch {
      toast.error("Kaydetme başarısız. Bağlantınızı kontrol edip yeniden deneyin.");
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
  const sdError = !sdDate ? "Bir tarih seçin." : sdDuplicate ? "Bu tarih için zaten bir özel gün var." : null;

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
      toast.success("Özel gün eklendi. O gün randevuya kapalı görünecek.");
    } catch {
      toast.error("Özel gün eklenemedi.");
    } finally {
      setSpecialBusy(false);
    }
  }

  async function handleDeleteSpecialDay(row: SpecialDayRow) {
    if (!businessId) return;
    const ok = await confirm({
      title: "Özel gün silinsin mi?",
      description: `${formatLongDate(row.date)} (${specialTypeLabel(row.type)}) kaldırılacak; o gün normal haftalık programa döner.`,
      confirmLabel: "Sil",
    });
    if (!ok) return;
    try {
      await deleteSpecialDay(businessId, row.id);
      setSpecialDays((prev) => prev.filter((sd) => sd.id !== row.id));
      toast.success("Özel gün silindi.");
    } catch {
      toast.error("Silme başarısız.");
    }
  }

  if (loading) {
    return (
      <DashPage>
        <Skeleton height={150} radius={24} />
        <Skeleton height={230} radius={22} />
        <SkeletonList rows={4} height={140} label="Çalışma saatleri yükleniyor" />
      </DashPage>
    );
  }

  return (
    <DashPage className={styles.root}>
      <PageHeader
        eyebrow="Çalışma düzeni"
        icon={Clock3}
        title="Ne zaman açıksınız?"
        description="Günleri açıp kapatın, saatleri ve molaları ayarlayın. Müşteriler yalnızca uygun saatleri görür."
        meta={<>
          <Badge tone="accent" icon={CalendarDays}>{openDays} açık gün</Badge>
          <Badge tone="neutral" icon={Clock3}>Haftalık {formatDuration(weeklyMinutes)}</Badge>
          <Badge tone="neutral" icon={CalendarOff}>{sortedSpecialDays.upcoming.length} yaklaşan özel gün</Badge>
        </>}
      />

      {/* Haftalık görünüm */}
      <Panel title="Haftanız bir bakışta" description="Çubuklar çalışma aralığını, taralı alan molayı gösterir. Bir güne dokunup düzenleyin." icon={CalendarDays}>
        <ol className={styles.week} aria-label="Haftalık özet">
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
                <a href={`#day-${day.day}`} className={styles.weekDay} aria-label={`${DAY_NAMES[day.day]} gününe git`}>{DAY_SHORT[day.day]}</a>
                <span className={styles.weekTrack}>
                  {day.isOpen && !invalid ? (
                    <span className={styles.weekBar} style={{ left: `${left}%`, width: `${width}%` }}>
                      {breakWidth > 0 ? <span className={styles.weekBreak} style={{ left: `${breakLeft}%`, width: `${breakWidth}%` }} /> : null}
                    </span>
                  ) : <span className={cx(styles.weekClosed, invalid && styles.weekInvalid)}>{invalid ? "Hatalı saat" : "Kapalı"}</span>}
                </span>
                <span className={cx(styles.weekTime, ws.mono)}>{day.isOpen ? `${day.start}–${day.end}` : "—"}</span>
              </li>
            );
          })}
        </ol>
        <div className={styles.scaleLegend} aria-hidden="true"><span>{fromMinutes(scale.from)}</span><span><i className={styles.legendBreak} /> mola</span><span>{fromMinutes(scale.to)}</span></div>
      </Panel>

      {/* Hazır düzenler */}
      <Panel title="Hızlı kurulum" description="Bir düzen seçin, sonra günleri tek tek ince ayarlayın. Her işlem geri alınabilir." icon={Copy}>
        <div className={ws.chips}>
          <button type="button" className={ws.chip} onClick={() => applyWeekdayPreset("09:00", "18:00")}><Clock3 size={15} /> Pzt–Cmt 09:00–18:00</button>
          <button type="button" className={ws.chip} onClick={() => applyWeekdayPreset("09:00", "19:00")}><Clock3 size={15} /> Pzt–Cmt 09:00–19:00</button>
          <button type="button" className={ws.chip} onClick={() => applyEveryDayPreset("10:00", "20:00")}><Clock3 size={15} /> Her gün 10:00–20:00</button>
          <button type="button" className={ws.chip} onClick={() => { const monday = hours.find((item) => item.day === 1); if (monday) copyDay(monday, "weekdays"); }}><Copy size={15} /> Pazartesiyi hafta içine kopyala</button>
        </div>
      </Panel>

      {/* Gün düzenleyicileri */}
      <section className={styles.days} aria-label="Gün gün çalışma saatleri">
        {hours.map((day) => (
          <DayCard key={day.day} day={day} onChange={(patch) => updateDay(day.day, patch)} onCopy={(target) => copyDay(day, target)} />
        ))}
      </section>

      {/* Özel günler */}
      <Panel
        title="Tatil ve özel günler"
        description="Normal programın dışında kapalı olacağınız günler."
        icon={CalendarOff}
        actions={<Button variant="primary" icon={CalendarPlus} onClick={openSpecialSheet}>Özel gün ekle</Button>}
      >
        <div className={ws.stackSm}>
          <SegmentedControl
            ariaLabel="Özel gün görünümü"
            value={specialView}
            onChange={setSpecialView}
            options={[
              { value: "upcoming", label: "Yaklaşan", count: sortedSpecialDays.upcoming.length },
              { value: "past", label: "Geçmiş", count: sortedSpecialDays.past.length },
            ]}
          />
          {visibleSpecialDays.length ? (
            <ul className={styles.specialList}>
              {visibleSpecialDays.map((row) => {
                const date = new Date(`${row.date}T12:00:00`);
                return (
                  <li key={row.id} className={cx(styles.special, specialView === "past" && styles.specialPast)}>
                    <span className={styles.specialDate} aria-hidden="true"><b>{date.getDate()}</b><small>{date.toLocaleDateString("tr-TR", { month: "short" })}</small></span>
                    <div className={styles.specialCopy}>
                      <b>{formatLongDate(row.date)}</b>
                      <span><Badge size="sm" tone={row.type === "custom" ? "accent" : row.type === "leave" ? "violet" : "amber"}>{specialTypeLabel(row.type)}</Badge>{row.description ? <span className={ws.truncate}>{row.description}</span> : null}</span>
                    </div>
                    <Button variant="dangerSoft" iconOnly icon={Trash2} onClick={() => void handleDeleteSpecialDay(row)} aria-label={`${formatLongDate(row.date)} özel gününü sil`} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              compact
              mascot={specialView === "upcoming" ? "happy" : "idle"}
              title={specialView === "upcoming" ? "Yaklaşan özel gün yok" : "Geçmiş özel gün yok"}
              description={specialView === "upcoming" ? "Bayram, tatil veya kapalı olacağınız bir günü ekleyin; o gün randevuya kapanır." : "Geçmişte eklediğiniz özel günler burada listelenir."}
              action={specialView === "upcoming" ? <Button variant="soft" icon={CalendarPlus} onClick={openSpecialSheet}>Özel gün ekle</Button> : undefined}
            />
          )}
        </div>
      </Panel>

      {/* Yapışkan kaydet çubuğu */}
      {hasChanges ? (
        <div className={ws.saveBar} role="region" aria-label="Kaydedilmemiş değişiklikler">
          <div className={ws.saveInner}>
            <span className={cx(ws.saveIcon, errorCount > 0 && ws.saveIconError)} aria-hidden="true">{errorCount ? <TriangleAlert size={17} /> : <Clock3 size={17} />}</span>
            <div className={ws.saveCopy}>
              <b>{errorCount ? `${errorCount} günde hatalı saat var` : "Kaydedilmemiş değişiklikler"}</b>
              <small>{errorCount ? "Kaydetmeden önce işaretli günleri düzeltin." : "Yeni saatlerin yayınlanması için kaydedin."}</small>
            </div>
            <Button variant="ghost" icon={RotateCcw} onClick={() => setHours(savedHours)} disabled={saving}>Vazgeç</Button>
            <Button variant="primary" icon={Save} loading={saving} onClick={() => void handleSave()} disabled={errorCount > 0}>Kaydet</Button>
          </div>
        </div>
      ) : (
        <p className={styles.savedNote}><Check size={15} /> Çalışma programınız güncel.</p>
      )}

      <Sheet
        open={showSpecialSheet}
        onClose={() => setShowSpecialSheet(false)}
        dismissible={!specialBusy}
        size="sm"
        title="Özel gün ekle"
        description="Seçtiğiniz gün tüm gün randevuya kapatılır."
        footer={<>
          <Button onClick={() => setShowSpecialSheet(false)} disabled={specialBusy}>Vazgeç</Button>
          <Button type="submit" form="special-day-form" variant="primary" icon={Plus} loading={specialBusy}>Ekle</Button>
        </>}
      >
        <form id="special-day-form" className={ws.stack} onSubmit={handleAddSpecialDay} noValidate>
          <Field label="Tarih" error={sdTouched ? sdError : null}>
            <Input type="date" data-autofocus value={sdDate} min={todayKey()} onChange={(event) => { setSdDate(event.target.value); setSdTouched(true); }} aria-invalid={Boolean(sdTouched && sdError)} className={cx(sdTouched && sdError && styles.invalid)} />
          </Field>
          <fieldset className={styles.typeSet}>
            <legend className={styles.legend}>Tür</legend>
            <div className={ws.checkGrid}>
              {SPECIAL_TYPES.map((type) => (
                <label key={type.value} className={ws.checkCard}>
                  <input type="radio" name="special-type" value={type.value} checked={sdType === type.value} onChange={() => setSdType(type.value)} />
                  <span className={ws.checkText}><b>{type.label}</b><small>{type.hint}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Açıklama (isteğe bağlı)" hint="Örn. Kurban Bayramı, ekip eğitimi">
            <Input value={sdDescription} maxLength={120} onChange={(event) => setSdDescription(event.target.value)} placeholder="Kısa bir not" />
          </Field>
        </form>
      </Sheet>
      {dialog}
    </DashPage>
  );
}
