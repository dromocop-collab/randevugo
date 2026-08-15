"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import {
  listBusinessWorkingHours,
  updateWorkingHours,
  createSpecialDay,
  listSpecialDays,
  deleteSpecialDay,
} from "@/features/businesses/business-repository";
import type { DaySchedule } from "@/types/business";

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

interface SpecialDayRow {
  id: string;
  date: string;
  type: string;
  description?: string;
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

export default function WorkingHoursPage() {
  const { businessId } = useBusiness();
  const [hours, setHours] = useState<DaySchedule[]>(defaultSchedule());
  const [specialDays, setSpecialDays] = useState<SpecialDayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Special day form
  const [sdDate, setSdDate] = useState("");
  const [sdType, setSdType] = useState("holiday");
  const [sdDescription, setSdDescription] = useState("");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    Promise.all([
      listBusinessWorkingHours(businessId),
      listSpecialDays(businessId),
    ]).then(([wh, sd]) => {
      if (cancelled) return;
      if (wh.length > 0) {
        // Merge with defaults to ensure all 7 days exist
        const merged = ORDERED_DAYS.map((day) => {
          const existing = wh.find((h) => h.day === day);
          return existing ?? { day, isOpen: day !== 0, start: "09:00", end: "19:00" };
        });
        setHours(merged);
      }
      setSpecialDays(sd);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [businessId]);

  function updateDay(index: number, patch: Partial<DaySchedule>) {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...patch } : h))
    );
    setHasChanges(true);
  }

  async function handleSave() {
    if (!businessId) return;
    setSaving(true);
    try {
      await updateWorkingHours(businessId, hours);
      toast.success("Çalışma saatleri kaydedildi.");
      setHasChanges(false);
    } catch {
      toast.error("Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSpecialDay(e: FormEvent) {
    e.preventDefault();
    if (!businessId || !sdDate) return;

    try {
      await createSpecialDay(businessId, {
        date: sdDate,
        type: sdType,
        description: sdDescription || undefined,
      });
      setSpecialDays(await listSpecialDays(businessId));
      setSdDate("");
      setSdDescription("");
      toast.success("Özel gün eklendi.");
    } catch {
      toast.error("Özel gün eklenemedi.");
    }
  }

  async function handleDeleteSpecialDay(id: string) {
    if (!businessId) return;
    try {
      await deleteSpecialDay(businessId, id);
      setSpecialDays((prev) => prev.filter((sd) => sd.id !== id));
      toast.success("Özel gün silindi.");
    } catch {
      toast.error("Silme başarısız.");
    }
  }

  if (loading) {
    return <LoadingState title="Çalışma saatleri yükleniyor" description="Lütfen bekleyin..." />;
  }

  return (
    <div className="space-y-4">
      {/* Weekly Schedule */}
      <Card
        title="Haftalık Çalışma Saatleri"
        description="Her gün için açılış, kapanış ve mola saatlerini ayarlayın."
      >
        {hasChanges && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-medium text-amber-600">
              Kaydedilmemiş değişiklikler var
            </span>
          </div>
        )}

        <div className="space-y-2">
          {/* Header */}
          <div className="hidden items-center gap-3 rounded-xl bg-[var(--surface-2)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-3)] sm:grid sm:grid-cols-[140px_80px_1fr_1fr_1fr_1fr]">
            <span>Gün</span>
            <span>Durum</span>
            <span>Açılış</span>
            <span>Kapanış</span>
            <span>Mola Başlangıç</span>
            <span>Mola Bitiş</span>
          </div>

          {hours.map((h, idx) => (
            <div
              key={h.day}
              className={`rounded-xl border p-3 transition sm:grid sm:grid-cols-[140px_80px_1fr_1fr_1fr_1fr] sm:items-center sm:gap-3 sm:p-4 ${
                h.isOpen
                  ? "border-[var(--border)] bg-[var(--surface-1)]"
                  : "border-[var(--border)] bg-[var(--surface-2)] opacity-60"
              }`}
            >
              {/* Day name */}
              <div className="mb-2 flex items-center gap-2 sm:mb-0">
                <span className="text-sm font-semibold text-[var(--text-1)]">
                  {DAY_NAMES[h.day]}
                </span>
              </div>

              {/* Open/Close Toggle */}
              <div className="mb-2 sm:mb-0">
                <button
                  type="button"
                  onClick={() => updateDay(idx, { isOpen: !h.isOpen })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    h.isOpen ? "bg-emerald-500" : "bg-[var(--surface-3)]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      h.isOpen ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {h.isOpen ? (
                <>
                  {/* Start Time */}
                  <select
                    value={h.start}
                    onChange={(e) => updateDay(idx, { start: e.target.value })}
                    className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 text-sm text-[var(--text-1)] sm:mb-0"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* End Time */}
                  <select
                    value={h.end}
                    onChange={(e) => updateDay(idx, { end: e.target.value })}
                    className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 text-sm text-[var(--text-1)] sm:mb-0"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* Break Start */}
                  <select
                    value={h.breakStart ?? ""}
                    onChange={(e) =>
                      updateDay(idx, { breakStart: e.target.value || undefined })
                    }
                    className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 text-sm text-[var(--text-1)] sm:mb-0"
                  >
                    <option value="">Mola yok</option>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* Break End */}
                  <select
                    value={h.breakEnd ?? ""}
                    onChange={(e) =>
                      updateDay(idx, { breakEnd: e.target.value || undefined })
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 text-sm text-[var(--text-1)]"
                  >
                    <option value="">—</option>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </>
              ) : (
                <div className="col-span-4 text-center text-sm text-[var(--text-3)]">
                  Kapalı
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? "Kaydediliyor..." : "💾 Çalışma Saatlerini Kaydet"}
          </Button>
        </div>
      </Card>

      {/* Special Days */}
      <Card title="Özel Günler" description="Tatil, izin veya özel saat tanımlayın.">
        <form className="grid gap-3 sm:grid-cols-4" onSubmit={handleAddSpecialDay}>
          <Input
            label="Tarih"
            type="date"
            value={sdDate}
            onChange={(e) => setSdDate(e.target.value)}
            required
          />
          <Select
            label="Tip"
            value={sdType}
            onChange={(e) => setSdType(e.target.value)}
            options={[
              { value: "holiday", label: "Tatil" },
              { value: "leave", label: "İzin" },
              { value: "closed", label: "Kapalı" },
              { value: "custom", label: "Özel" },
            ]}
          />
          <Input
            label="Açıklama"
            value={sdDescription}
            onChange={(e) => setSdDescription(e.target.value)}
            placeholder="Opsiyonel"
          />
          <div className="flex items-end">
            <Button className="w-full" type="submit">Ekle</Button>
          </div>
        </form>

        {specialDays.length > 0 && (
          <div className="mt-4 space-y-2">
            {specialDays.map((sd) => (
              <div
                key={sd.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-1)]">{sd.date}</p>
                  <p className="text-xs text-[var(--text-3)]">
                    {sd.type === "holiday" ? "🎄 Tatil" : sd.type === "leave" ? "🏖️ İzin" : sd.type === "closed" ? "🚫 Kapalı" : "📌 Özel"}
                    {sd.description ? ` — ${sd.description}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSpecialDay(sd.id)}
                  className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-500/10"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
