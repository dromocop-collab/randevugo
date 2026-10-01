"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Check, Clock3, Coffee, Copy, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
const TIME_OPTIONS = TIME_SLOTS.map((time) => ({ value: time, label: time }));

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

  function applyWeekdayPreset(start: string, end: string) {
    setHours((current) => current.map((item) => item.day === 0 ? { ...item, isOpen: false } : { ...item, isOpen: true, start, end, breakStart: "13:00", breakEnd: "14:00" }));
    setHasChanges(true);
    toast.success("Hafta içi çalışma düzeni hazırlandı.");
  }

  function copyMondayToWeekdays() {
    const monday = hours.find((item) => item.day === 1);
    if (!monday) return;
    setHours((current) => current.map((item) => item.day >= 1 && item.day <= 5 ? { ...item, isOpen: monday.isOpen, start: monday.start, end: monday.end, breakStart: monday.breakStart, breakEnd: monday.breakEnd } : item));
    setHasChanges(true);
    toast.success("Pazartesi saatleri hafta içine kopyalandı.");
  }

  async function handleSave() {
    if (!businessId) return;
    const invalidDay = hours.find((item) => item.isOpen && item.start >= item.end);
    if (invalidDay) return toast.error(`${DAY_NAMES[invalidDay.day]} günü kapanış saati açılıştan sonra olmalı.`);
    const invalidBreak = hours.find((item) => item.isOpen && item.breakStart && (!item.breakEnd || item.breakStart >= item.breakEnd || item.breakStart < item.start || item.breakEnd > item.end));
    if (invalidBreak) return toast.error(`${DAY_NAMES[invalidBreak.day]} günü mola saatlerini çalışma aralığında seçin.`);
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
    <div className="space-y-5">
      <section className="dashboard-theme-hero relative overflow-hidden rounded-[30px] border border-[var(--border)] bg-[linear-gradient(120deg,var(--accent-3),var(--accent),var(--accent-2))] p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black tracking-[.12em]"><Sparkles size={14}/> ÇALIŞMA DÜZENİ</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Ne zaman hizmet verdiğinizi kolayca belirleyin.</h1><p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/80">Açık günleri seçin, çalışma ve mola saatlerini düzenleyin. Müşteriler yalnız uygun saatleri görsün.</p></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4"><small className="font-bold text-white/65">AÇIK GÜN</small><b className="mt-1 block text-2xl">{hours.filter((item) => item.isOpen).length}</b></div><div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4"><small className="font-bold text-white/65">ÖZEL GÜN</small><b className="mt-1 block text-2xl">{specialDays.length}</b></div></div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-xs font-black tracking-[.13em] text-[var(--accent)]">HAFTALIK PROGRAM</p><h2 className="mt-1 text-2xl font-black text-[var(--text-1)]">Normal çalışma saatleri</h2><p className="mt-1 text-sm text-[var(--text-3)]">Bir günü açın veya kapatın; saatleri o günün kartından yönetin.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => applyWeekdayPreset("09:00","18:00")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-bold text-[var(--text-1)]"><Clock3 size={16}/> 09:00–18:00 hazırla</button><button type="button" onClick={copyMondayToWeekdays} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-bold text-[var(--text-1)]"><Copy size={16}/> Pazartesiyi hafta içine kopyala</button></div></div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {hours.map((h, idx) => <article key={h.day} className={`rounded-3xl border p-4 transition sm:p-5 ${h.isOpen ? "border-[var(--border)] bg-[var(--surface-1)] shadow-sm" : "border-dashed border-[var(--border)] bg-[var(--surface-2)]"}`}>
            <header className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className={`grid size-11 place-items-center rounded-2xl ${h.isOpen ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--surface-3)] text-[var(--text-3)]"}`}><CalendarDays size={20}/></span><div><h3 className="text-base font-black text-[var(--text-1)]">{DAY_NAMES[h.day]}</h3><p className="text-xs font-semibold text-[var(--text-3)]">{h.isOpen ? `${h.start} – ${h.end}${h.breakStart ? ` · ${h.breakStart} mola` : ""}` : "Randevuya kapalı"}</p></div></div><button type="button" role="switch" aria-checked={h.isOpen} aria-label={`${DAY_NAMES[h.day]} gününü ${h.isOpen ? "kapat" : "aç"}`} onClick={() => updateDay(idx, { isOpen: !h.isOpen })} className={`relative h-8 w-14 shrink-0 rounded-full transition ${h.isOpen ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]"}`}><span className={`absolute top-1 grid size-6 place-items-center rounded-full bg-white shadow transition-all ${h.isOpen ? "left-7 text-[var(--accent)]" : "left-1 text-slate-400"}`}>{h.isOpen && <Check size={13}/>}</span></button></header>
            {h.isOpen ? <div className="mt-5 grid gap-3 sm:grid-cols-2"><Select label="Açılış" value={h.start} onChange={(event) => updateDay(idx,{start:event.target.value})} options={TIME_OPTIONS}/><Select label="Kapanış" value={h.end} onChange={(event) => updateDay(idx,{end:event.target.value})} options={TIME_OPTIONS}/><Select label="Mola başlangıcı" value={h.breakStart ?? ""} onChange={(event) => updateDay(idx,{breakStart:event.target.value||undefined,breakEnd:event.target.value ? (h.breakEnd ?? "14:00") : undefined})} options={[{value:"",label:"Mola yok",description:"Bu gün mola kullanılmayacak"},...TIME_OPTIONS]}/><Select label="Mola bitişi" disabled={!h.breakStart} value={h.breakEnd ?? ""} onChange={(event) => updateDay(idx,{breakEnd:event.target.value||undefined})} options={[{value:"",label:"Bitiş seçin"},...TIME_OPTIONS]}/></div> : <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-5 text-center"><b className="text-sm text-[var(--text-2)]">Bu gün kapalı</b><p className="mt-1 text-xs text-[var(--text-3)]">Açmak için sağ üstteki düğmeye dokunun.</p></div>}
          </article>)}
        </div>

        <div className={`mt-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${hasChanges ? "border-amber-400/40 bg-amber-500/[.07]" : "border-emerald-400/30 bg-emerald-500/[.06]"}`}><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-xl ${hasChanges ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700"}`}>{hasChanges ? <Clock3 size={19}/> : <Check size={19}/>}</span><div><b className="block text-sm text-[var(--text-1)]">{hasChanges ? "Değişiklikler henüz kaydedilmedi" : "Çalışma programınız güncel"}</b><small className="text-[var(--text-3)]">{hasChanges ? "Yeni saatlerin yayınlanması için kaydedin." : "Müşterileriniz güncel uygunluğu görüyor."}</small></div></div><Button onClick={handleSave} disabled={saving || !hasChanges} iconLeft={<Save size={17}/>}>{saving ? "Kaydediliyor..." : "Programı kaydet"}</Button></div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-lg sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-600"><Coffee size={20}/></span><div><p className="text-xs font-black tracking-[.13em] text-amber-600">İSTİSNALAR</p><h2 className="mt-1 text-2xl font-black text-[var(--text-1)]">Tatil ve özel günler</h2><p className="mt-1 text-sm text-[var(--text-3)]">Normal haftalık programın dışında kapalı olacağınız günleri ekleyin.</p></div></div>
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
              { value: "holiday", label: "Tatil", description: "Resmî veya işletme tatili" },
              { value: "leave", label: "İzin", description: "Planlı izin günü" },
              { value: "closed", label: "Kapalı", description: "Tüm gün hizmet verilmeyecek" },
              { value: "custom", label: "Özel gün", description: "Size özel başka bir durum" },
            ]}
          />
          <Input
            label="Açıklama"
            value={sdDescription}
            onChange={(e) => setSdDescription(e.target.value)}
            placeholder="Opsiyonel"
          />
          <div className="flex items-end">
            <Button className="w-full" type="submit" iconLeft={<Plus size={17}/>}>Özel gün ekle</Button>
          </div>
        </form>

        {specialDays.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {specialDays.map((sd) => (
              <div
                key={sd.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
              >
                <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><CalendarDays size={18}/></span><div className="min-w-0"><p className="text-sm font-black text-[var(--text-1)]">{new Date(`${sd.date}T12:00:00`).toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"})}</p><p className="truncate text-xs font-medium text-[var(--text-3)]">{sd.type === "holiday" ? "Tatil" : sd.type === "leave" ? "İzin" : sd.type === "closed" ? "Kapalı" : "Özel gün"}{sd.description ? ` · ${sd.description}` : ""}</p></div></div>
                <button
                  type="button"
                  onClick={() => handleDeleteSpecialDay(sd.id)}
                  aria-label="Özel günü sil"
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 transition hover:bg-rose-500/20"
                >
                  <Trash2 size={17}/>
                </button>
              </div>
            ))}
          </div>
        ) : <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-7 text-center"><CalendarDays className="mx-auto text-[var(--text-3)]" size={24}/><b className="mt-3 block text-sm text-[var(--text-2)]">Henüz özel gün yok</b><p className="mt-1 text-xs text-[var(--text-3)]">Tatil veya kapalı gün eklediğinizde burada görünür.</p></div>}
      </section>
    </div>
  );
}
