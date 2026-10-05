"use client";

import { useId } from "react";
import { Check, Clock3, Coffee } from "lucide-react";
import {
  getStarterTemplates,
  formatPriceRange,
  type StarterSelections,
} from "@/features/businesses/service-templates";
import {
  DAY_SHORT, DAY_LONG, WEEK_ORDER, createDefaultWorkingHours, summarizeWorkingHours,
  type HoursPreset, type WorkingDay,
} from "@/features/businesses/setup-helpers";
import s from "./starter-services-step.module.css";

const DURATIONS = [15, 20, 25, 30, 45, 50, 60, 75, 90, 120, 150, 180, 240];

const PRESETS: Array<{ id: HoursPreset; label: string }> = [
  { id: "weekdays-saturday", label: "Pzt–Cmt" },
  { id: "weekdays", label: "Pzt–Cum" },
  { id: "everyday", label: "Her gün" },
];

interface Props {
  category: string;
  selections: StarterSelections;
  onSelectionsChange: (next: StarterSelections) => void;
  hours: WorkingDay[];
  onHoursChange: (next: WorkingDay[]) => void;
  hoursError?: string | null;
}

/** Onboarding: hazır hizmet şablonları (seç + fiyat/süre) ve hızlı çalışma saatleri. */
export function StarterServicesStep({ category, selections, onSelectionsChange, hours, onHoursChange, hoursError }: Props) {
  const uid = useId();
  const templates = getStarterTemplates(category);
  const selectedCount = templates.filter((item) => selections[item.id]?.selected).length;
  const openDays = hours.filter((day) => day.isOpen);
  const reference = openDays[0] ?? hours[0]!;
  const hasBreak = Boolean(reference?.breakStart && reference?.breakEnd);

  function patch(id: string, values: Partial<StarterSelections[string]>) {
    const current = selections[id] ?? { selected: false, price: 0, durationMinutes: 30 };
    onSelectionsChange({ ...selections, [id]: { ...current, ...values } });
  }

  function setAll(selected: boolean) {
    const next = { ...selections };
    templates.forEach((item) => { if (next[item.id]) next[item.id] = { ...next[item.id]!, selected }; });
    onSelectionsChange(next);
  }

  function setTimes(values: Partial<Pick<WorkingDay, "start" | "end" | "breakStart" | "breakEnd">>) {
    onHoursChange(hours.map((day) => ({ ...day, ...values })));
  }

  function applyPreset(preset: HoursPreset) {
    onHoursChange(createDefaultWorkingHours(preset, reference?.start ?? "09:00", reference?.end ?? "19:00").map((day) => (
      hasBreak ? { ...day, breakStart: reference!.breakStart, breakEnd: reference!.breakEnd } : day
    )));
  }

  function toggleDay(dayNumber: number) {
    onHoursChange(hours.map((day) => (day.day === dayNumber ? { ...day, isOpen: !day.isOpen } : day)));
  }

  function toggleBreak() {
    if (hasBreak) setTimes({ breakStart: undefined, breakEnd: undefined });
    else setTimes({ breakStart: "13:00", breakEnd: "14:00" });
  }

  const activePreset = PRESETS.find((preset) => {
    const expected = createDefaultWorkingHours(preset.id);
    return expected.every((day) => hours.find((item) => item.day === day.day)?.isOpen === day.isOpen);
  })?.id;

  return (
    <div className={s.root}>
      <section className={s.block} aria-labelledby={`${uid}-svc`}>
        <header className={s.blockHead}>
          <div>
            <h3 id={`${uid}-svc`}>Hizmetlerin</h3>
            <p>Sık kullanılanları seçtik. İşaretle, fiyatı ayarla — online randevuya hemen açılır.</p>
          </div>
          <button type="button" className={s.link} onClick={() => setAll(selectedCount !== templates.length)}>
            {selectedCount === templates.length ? "Hiçbirini seçme" : "Tümünü seç"}
          </button>
        </header>
        <ul className={s.services}>
          {templates.map((template) => {
            const choice = selections[template.id];
            const selected = choice?.selected ?? false;
            const priceId = `${uid}-${template.id}-price`;
            const durationId = `${uid}-${template.id}-duration`;
            const invalidPrice = selected && !(Number(choice?.price) > 0);
            return (
              <li key={template.id} className={selected ? s.on : ""}>
                <button type="button" className={s.check} aria-pressed={selected} onClick={() => patch(template.id, { selected: !selected })}>
                  <span className={s.box} aria-hidden="true">{selected ? <Check size={14} /> : null}</span>
                  <span className={s.svcText}>
                    <b>{template.name}</b>
                    <small><span aria-hidden="true">{template.group.icon}</span> {template.group.name} · önerilen {formatPriceRange(template)}</small>
                  </span>
                </button>
                <div className={s.svcInputs}>
                  <label className={s.mini} htmlFor={durationId}>
                    <span className="sr-only">{template.name} süresi</span>
                    <Clock3 size={14} aria-hidden="true" />
                    <select
                      id={durationId}
                      value={choice?.durationMinutes ?? template.durationMinutes}
                      onChange={(event) => patch(template.id, { durationMinutes: Number(event.target.value), selected: true })}
                    >
                      {Array.from(new Set([...DURATIONS, template.durationMinutes])).sort((a, b) => a - b).map((minutes) => (
                        <option key={minutes} value={minutes}>{minutes} dk</option>
                      ))}
                    </select>
                  </label>
                  <label className={`${s.mini} ${invalidPrice ? s.invalid : ""}`} htmlFor={priceId}>
                    <span className="sr-only">{template.name} fiyatı (TL)</span>
                    <b aria-hidden="true">₺</b>
                    <input
                      id={priceId}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={10}
                      value={choice?.price ? String(choice.price) : ""}
                      placeholder="0"
                      onChange={(event) => patch(template.id, { price: Math.max(0, Math.round(Number(event.target.value) || 0)), selected: true })}
                      aria-invalid={invalidPrice || undefined}
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
        <p className={s.note}>{selectedCount ? `${selectedCount} hizmet eklenecek.` : "Hizmet seçmezsen panelden sonra ekleyebilirsin."} Açıklama, personel ataması ve kapora ayarları panelde.</p>
      </section>

      <section className={s.block} aria-labelledby={`${uid}-hours`}>
        <header className={s.blockHead}>
          <div>
            <h3 id={`${uid}-hours`}>Çalışma saatlerin</h3>
            <p>{summarizeWorkingHours(hours)}</p>
          </div>
        </header>
        <div className={s.presets} role="group" aria-label="Hazır gün seçimi">
          {PRESETS.map((preset) => (
            <button type="button" key={preset.id} className={activePreset === preset.id ? s.chipOn : ""} aria-pressed={activePreset === preset.id} onClick={() => applyPreset(preset.id)}>{preset.label}</button>
          ))}
        </div>
        <div className={s.days} role="group" aria-label="Açık günler">
          {WEEK_ORDER.map((dayNumber) => {
            const day = hours.find((item) => item.day === dayNumber);
            const open = day?.isOpen ?? false;
            return (
              <button type="button" key={dayNumber} className={open ? s.dayOn : ""} aria-pressed={open} aria-label={`${DAY_LONG[dayNumber]} ${open ? "açık" : "kapalı"}`} onClick={() => toggleDay(dayNumber)}>
                {DAY_SHORT[dayNumber]}
              </button>
            );
          })}
        </div>
        <div className={s.times}>
          <label htmlFor={`${uid}-open`}><span>Açılış</span><input id={`${uid}-open`} type="time" step={900} value={reference?.start ?? "09:00"} onChange={(event) => setTimes({ start: event.target.value })} /></label>
          <label htmlFor={`${uid}-close`}><span>Kapanış</span><input id={`${uid}-close`} type="time" step={900} value={reference?.end ?? "19:00"} onChange={(event) => setTimes({ end: event.target.value })} /></label>
        </div>
        <button type="button" className={`${s.breakToggle} ${hasBreak ? s.chipOn : ""}`} aria-pressed={hasBreak} onClick={toggleBreak}>
          <Coffee size={15} aria-hidden="true" /> {hasBreak ? "Öğle arası var" : "Öğle arası ekle"}
        </button>
        {hasBreak ? (
          <div className={s.times}>
            <label htmlFor={`${uid}-bs`}><span>Mola başlangıç</span><input id={`${uid}-bs`} type="time" step={900} value={reference?.breakStart ?? "13:00"} onChange={(event) => setTimes({ breakStart: event.target.value })} /></label>
            <label htmlFor={`${uid}-be`}><span>Mola bitiş</span><input id={`${uid}-be`} type="time" step={900} value={reference?.breakEnd ?? "14:00"} onChange={(event) => setTimes({ breakEnd: event.target.value })} /></label>
          </div>
        ) : null}
        {hoursError ? <p className={s.error} role="alert">{hoursError}</p> : <p className={s.note}>Güne özel saat ve tatilleri panelde “Çalışma saatleri”nden ayarlayabilirsin.</p>}
      </section>
    </div>
  );
}
