"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, CalendarClock, Copy, Dices, ExternalLink, Gift, LoaderCircle, Lock, Plus, RefreshCcw, Sparkles, Trash2, Trophy, Users,
} from "lucide-react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listServices } from "@/features/services/service-repository";
import { ConfirmSheet, EmptyState, HeroChip, Notice, Panel, Pill, Segmented, StudioHero, StudioPage, StudioSkeleton, Toggle, cx, studio as st, type PillTone } from "@/app/[lang]/dashboard/_studio";
import { SpinWheel, type SpinWheelHandle } from "@/features/campaign-wheel/spin-wheel";
import { ConfettiBurst } from "@/features/campaign-wheel/confetti-burst";
import { playMiss, playWin, primeWheelAudio } from "@/features/campaign-wheel/wheel-sound";
import {
  WHEEL_MAX_SLICES, WHEEL_MIN_SLICES, WHEEL_PALETTE, previewPick, sliceColor, sliceOdds, wheelIsLive,
  type WheelPrizeType, type WheelSettings,
} from "@/features/campaign-wheel/wheel-domain";
import { getCampaignWheelSettings, listCampaignWheelSpins, saveCampaignWheelSettings, type WheelSettingsInput, type WheelSpinRow } from "@/features/campaign-wheel/wheel-repository";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk, type TFunction } from "@/i18n/config";
import type { Service } from "@/types/service";
import css from "./kampanya-carki.module.css";

type DraftSlice = WheelSettingsInput["slices"][number] & { key: string };
type Draft = Omit<WheelSettingsInput, "slices" | "newCampaign"> & { slices: DraftSlice[] };
type SpinFilter = "all" | "won" | "reserved" | "used" | "none";

const TYPE_OPTIONS: Array<{ value: WheelPrizeType; label: string; unit: string }> = [
  { value: "percent", label: tk("Yüzde indirim"), unit: "%" },
  { value: "amount", label: tk("TL indirim"), unit: "₺" },
  { value: "free_service", label: tk("Ücretsiz hizmet"), unit: "" },
  { value: "points", label: tk("Puan"), unit: tk("puan") },
  { value: "none", label: tk("Boş dilim"), unit: "" },
];

let keySeed = 0;
const newKey = () => `k${Date.now().toString(36)}${(keySeed++).toString(36)}`;

function slice(label: string, type: WheelPrizeType, value: number, weight: number, stock: number | null = null): DraftSlice {
  return { key: newKey(), id: "", label, type, value, serviceId: null, weight, stock, color: null };
}

const PRESETS: Array<{ id: string; label: string; slices: () => DraftSlice[] }> = [
  { id: "salon", label: tk("Kuaför & berber"), slices: () => [
    slice("%10 indirim", "percent", 10, 30), slice("Tekrar dene", "none", 0, 20), slice("%20 indirim", "percent", 20, 15), // i18n-ignore — işletmenin dilimlerine yazılan varsayılan metin
    slice("50 ₺ indirim", "amount", 50, 15), slice("Bu sefer olmadı", "none", 0, 12), slice("100 puan", "points", 100, 6), slice("%50 indirim", "percent", 50, 2, 5), // i18n-ignore — işletmenin dilimlerine yazılan varsayılan metin
  ] },
  { id: "beauty", label: tk("Güzellik & spa"), slices: () => [
    slice("%15 indirim", "percent", 15, 28), slice("Bu sefer olmadı", "none", 0, 22), slice("100 ₺ indirim", "amount", 100, 15), // i18n-ignore — işletmenin dilimlerine yazılan varsayılan metin
    slice("%25 indirim", "percent", 25, 12), slice("200 puan", "points", 200, 15), slice("Ücretsiz bakım", "free_service", 0, 3, 3), slice("Tekrar dene", "none", 0, 5), // i18n-ignore — işletmenin dilimlerine yazılan varsayılan metin
  ] },
  { id: "clinic", label: tk("Klinik & diş"), slices: () => [
    slice("%5 indirim", "percent", 5, 35), slice("Bu sefer olmadı", "none", 0, 30), slice("%10 indirim", "percent", 10, 20), // i18n-ignore — işletmenin dilimlerine yazılan varsayılan metin
    slice("250 ₺ indirim", "amount", 250, 10, 20), slice("Ücretsiz muayene", "free_service", 0, 5, 10), // i18n-ignore — işletmenin dilimlerine yazılan varsayılan metin
  ] },
];

function emptyDraft(t: TFunction): Draft {
  return { enabled: false, title: t("Şans çarkı"), subtitle: t("Çarkı çevir, kazandığın indirim randevunda otomatik uygulansın."), startsAt: null, endsAt: null, prizeValidDays: 30, slices: PRESETS[0].slices() };
}

function fromSettings(settings: WheelSettings): Draft {
  return {
    enabled: settings.enabled, title: settings.title, subtitle: settings.subtitle,
    startsAt: settings.startsAt, endsAt: settings.endsAt, prizeValidDays: settings.prizeValidDays,
    slices: settings.slices.map((item) => ({ key: newKey(), id: item.id, label: item.label, type: item.type, value: item.value, serviceId: item.serviceId, weight: item.weight, stock: item.stock, color: item.color })),
  };
}

function toInput(draft: Draft, newCampaign: boolean): WheelSettingsInput {
  return { ...draft, slices: draft.slices.map((item) => ({ id: item.id, label: item.label, type: item.type, value: item.value, serviceId: item.serviceId, weight: item.weight, stock: item.stock, color: item.color })), ...(newCampaign ? { newCampaign: true } : {}) };
}

/** datetime-local ↔ milisaniye (tarayıcının saat diliminde; işletmeler TR'de). */
function toLocalInput(ms: number | null): string {
  if (!ms) return "";
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

const STATUS_LABEL: Record<string, { label: string; tone: PillTone }> = {
  won: { label: tk("Kullanılmadı"), tone: "accent" },
  reserved: { label: tk("Randevuya bağlı"), tone: "info" },
  used: { label: tk("Kullanıldı"), tone: "ok" },
  points_awarded: { label: tk("Puan yüklendi"), tone: "ok" },
  none: { label: tk("Kazanamadı"), tone: "neutral" },
};

export default function CampaignWheelPage() {
  const t = useT();
  const intl = useIntlLocale();
  const { businessId, businesses, access } = useBusinessContext();
  const business = businesses.find((item) => item.id === businessId) ?? null;
  const canManage = access?.role !== "staff";
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<WheelSettings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [spins, setSpins] = useState<WheelSpinRow[]>([]);
  const [spinFilter, setSpinFilter] = useState<SpinFilter>("all");
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOutcome, setTestOutcome] = useState<"win" | "miss" | null>(null);
  const [testResult, setTestResult] = useState("");
  const [confetti, setConfetti] = useState(0);
  const wheelRef = useRef<SpinWheelHandle>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [settings, serviceList, spinRows] = await Promise.all([
        getCampaignWheelSettings(businessId),
        listServices(businessId, true).catch(() => [] as Service[]),
        listCampaignWheelSpins(businessId).catch(() => [] as WheelSpinRow[]),
      ]);
      setSaved(settings);
      setServices(serviceList);
      setSpins(spinRows);
      const next = settings ? fromSettings(settings) : emptyDraft(t);
      setDraft(next);
      setBaseline(settings ? JSON.stringify(toInput(next, false)) : "");
    } catch (error) {
      toast.error(t(userFacingError(error, tk("Çark ayarları yüklenemedi."))));
    } finally {
      setLoading(false);
    }
  }, [businessId, t]);

  useEffect(() => { if (canManage) queueMicrotask(() => void load()); }, [load, canManage]);

  const dirty = Boolean(draft) && JSON.stringify(toInput(draft!, false)) !== baseline;
  const odds = useMemo(() => draft ? sliceOdds(draft.slices.map((item) => ({ id: item.id, weight: item.weight, stock: item.stock })), saved?.awarded ?? {}) : [], [draft, saved]);
  const winChance = useMemo(() => draft ? draft.slices.reduce((sum, item, index) => sum + (item.type === "none" ? 0 : odds[index] ?? 0), 0) : 0, [draft, odds]);
  const previewSlices = useMemo(() => draft?.slices.map((item, index) => ({ id: item.id || item.key, label: item.label || "—", type: item.type, color: item.color ?? WHEEL_PALETTE[index % WHEEL_PALETTE.length] })) ?? [], [draft]);
  const live = saved ? saved.enabled && wheelIsLive(saved, now) : false;
  const storefrontUrl = business?.slug && typeof window !== "undefined" ? `${window.location.origin}/isletme/${business.slug}?cark=1` : "";

  const update = (patch: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...patch } : current));
  const updateSlice = (key: string, patch: Partial<DraftSlice>) => setDraft((current) => current ? { ...current, slices: current.slices.map((item) => (item.key === key ? { ...item, ...patch } : item)) } : current);
  const moveSlice = (index: number, delta: number) => setDraft((current) => {
    if (!current) return current;
    const next = [...current.slices];
    const target = index + delta;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return { ...current, slices: next };
  });

  async function save(newCampaign = false) {
    if (!businessId || !draft) return;
    setSaving(true);
    try {
      const settings = await saveCampaignWheelSettings(businessId, toInput(draft, newCampaign));
      if (settings) {
        setSaved(settings);
        const next = fromSettings(settings);
        setDraft(next);
        setBaseline(JSON.stringify(toInput(next, false)));
      }
      if (newCampaign) setSpins([]);
      toast.success(newCampaign ? t("Yeni kampanya başladı; herkes yeniden çevirebilir.") : t("Çark kaydedildi."));
      setResetOpen(false);
    } catch (error) {
      toast.error(t(userFacingError(error, tk("Çark kaydedilemedi."))));
    } finally {
      setSaving(false);
    }
  }

  async function testSpin() {
    if (!draft || testing || draft.slices.length < 2) return;
    primeWheelAudio();
    setTesting(true);
    setTestOutcome(null);
    setTestResult("");
    wheelRef.current?.start();
    const index = previewPick(draft.slices.map((item, i) => ({ weight: odds[i] ?? 0 })), Math.random());
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    await wheelRef.current?.land(index);
    const picked = draft.slices[index];
    const won = picked.type !== "none";
    setTestOutcome(won ? "win" : "miss");
    setTestResult(picked.label);
    if (won) { playWin(); setConfetti((value) => value + 1); } else playMiss();
    setTesting(false);
  }

  if (!canManage) {
    return (
      <StudioPage label={t("Kampanya Çarkı")}>
        <StudioHero eyebrow={t("Kampanya")} icon={Gift} title={t("Kampanya Çarkı")} mascot={false} />
        <Notice tone="warn" icon={Lock} title={t("Yetki gerekiyor")}>{t("Kampanya çarkını yalnızca işletme sahibi ve yöneticiler düzenleyebilir.")}</Notice>
      </StudioPage>
    );
  }

  if (loading || !draft) return <StudioSkeleton stats={3} rows={5} label={t("Kampanya Çarkı")} />;

  const filteredSpins = spins.filter((row) => spinFilter === "all" ? true : spinFilter === "won" ? row.status === "won" : spinFilter === "none" ? row.status === "none" : spinFilter === "used" ? row.status === "used" || row.status === "points_awarded" : row.status === spinFilter);
  const typeUnit = (type: WheelPrizeType) => t(TYPE_OPTIONS.find((option) => option.value === type)?.unit ?? "");

  return (
    <StudioPage label={t("Kampanya Çarkı")}>
      <StudioHero
        eyebrow={t("Kampanya")}
        icon={Gift}
        title={t("Kampanya Çarkı")}
        description={t("Müşterin vitrininde çarkı çevirir, kazandığı indirim randevusunda otomatik uygulanır. Kimin ne kazanacağına sunucu karar verir; şansları ve stokları sen belirlersin.")}
        mascot={false}
        actions={storefrontUrl ? (
          <>
            <button type="button" className={cx(st.btn, st.btnGlass)} onClick={() => { void navigator.clipboard?.writeText(storefrontUrl).then(() => toast.success(t("Bağlantı kopyalandı"))).catch(() => toast.message(storefrontUrl)); }}>
              <Copy size={16} aria-hidden /> {t("Çark bağlantısı")}
            </button>
            <a className={cx(st.btn, st.btnBright)} href={storefrontUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden /> {t("Vitrinde gör")}</a>
          </>
        ) : null}
      >
        <HeroChip icon={Sparkles} value={live ? t("Yayında") : saved?.enabled ? t("Planlandı") : t("Kapalı")} label="" />
        <HeroChip icon={Users} value={saved?.spins ?? 0} label={t("çevirme")} />
        <HeroChip icon={Trophy} value={saved?.wins ?? 0} label={t("ödül")} />
      </StudioHero>

      <div className={css.layout}>
        <div className={css.editor}>
          <Panel title={t("Kampanya")} icon={CalendarClock} actions={<Toggle checked={draft.enabled} onChange={(value) => update({ enabled: value })} label={t("Çark vitrinde görünsün")} />}>
            <div className={cx(st.fields, st.fields2)}>
              <label className={cx(st.field, st.span2)}>
                <span className={st.label}>{t("Başlık")}</span>
                <input id="wheel-title" className={st.input} value={draft.title} maxLength={60} onChange={(event) => update({ title: event.target.value })} />
              </label>
              <label className={cx(st.field, st.span2)}>
                <span className={st.label}>{t("Kısa açıklama")}</span>
                <input id="wheel-subtitle" className={st.input} value={draft.subtitle} maxLength={140} onChange={(event) => update({ subtitle: event.target.value })} />
              </label>
              <label className={st.field}>
                <span className={st.label}>{t("Başlangıç (boşsa hemen)")}</span>
                <input id="wheel-start" type="datetime-local" className={st.input} value={toLocalInput(draft.startsAt)} onChange={(event) => update({ startsAt: fromLocalInput(event.target.value) })} />
              </label>
              <label className={st.field}>
                <span className={st.label}>{t("Bitiş (boşsa süresiz)")}</span>
                <input id="wheel-end" type="datetime-local" className={st.input} value={toLocalInput(draft.endsAt)} onChange={(event) => update({ endsAt: fromLocalInput(event.target.value) })} />
              </label>
              <label className={st.field}>
                <span className={st.label}>{t("Ödül kaç gün geçerli")}</span>
                <span className={st.inputAffix}>
                  <input id="wheel-valid" type="number" min={1} max={365} className={st.input} value={draft.prizeValidDays} onChange={(event) => update({ prizeValidDays: Number(event.target.value) || 1 })} />
                  <span>{t("gün")}</span>
                </span>
              </label>
              <div className={st.field}>
                <span className={st.label}>{t("Kazanma ihtimali")}</span>
                <div className={css.chance}><b>{t("%{value}", { value: Math.round(winChance) })}</b><span>{t("çevirenlerin bir ödül kazanma ihtimali")}</span></div>
              </div>
            </div>
          </Panel>

          <Panel
            title={t("Dilimler")}
            description={t("{count} dilim · en az {min}, en fazla {max}. Şans göreli ağırlıktır; yüzdesi yanında görünür.", { count: draft.slices.length, min: WHEEL_MIN_SLICES, max: WHEEL_MAX_SLICES })}
            icon={Dices}
            actions={
              <div className={css.presetRow}>
                {PRESETS.map((preset) => (
                  <button key={preset.id} type="button" className={cx(st.btn, st.btnSoft, st.btnSm)} onClick={() => update({ slices: preset.slices() })}>{t(preset.label)}</button>
                ))}
              </div>
            }
          >
            <ol className={css.slices}>
              {draft.slices.map((item, index) => {
                const awarded = saved?.awarded?.[item.id] ?? 0;
                const soldOut = item.stock !== null && awarded >= item.stock;
                return (
                  <li key={item.key} className={css.slice} data-none={item.type === "none" ? "true" : "false"}>
                    <label className={css.swatch} style={{ background: sliceColor(item, index) }} title={t("Renk")}>
                      <input type="color" value={sliceColor(item, index)} onChange={(event) => updateSlice(item.key, { color: event.target.value })} aria-label={t("{label} rengi", { label: item.label || String(index + 1) })} />
                    </label>
                    <div className={css.sliceFields}>
                      <input className={cx(st.input, css.sliceLabel)} value={item.label} maxLength={28} placeholder={t("Dilim adı")} onChange={(event) => updateSlice(item.key, { label: event.target.value })} aria-label={t("{n}. dilim adı", { n: index + 1 })} />
                      <select className={st.select} value={item.type} onChange={(event) => updateSlice(item.key, { type: event.target.value as WheelPrizeType, value: event.target.value === "percent" ? 10 : event.target.value === "amount" ? 50 : event.target.value === "points" ? 100 : 0 })} aria-label={t("Ödül türü")}>
                        {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
                      </select>
                      {(item.type === "percent" || item.type === "amount" || item.type === "points") && (
                        <span className={st.inputAffix}>
                          <input type="number" className={st.input} min={1} max={item.type === "percent" ? 100 : 100000} value={item.value} onChange={(event) => updateSlice(item.key, { value: Number(event.target.value) })} aria-label={t("Değer")} />
                          <span>{typeUnit(item.type)}</span>
                        </span>
                      )}
                      {item.type === "free_service" && (
                        <select className={st.select} value={item.serviceId ?? ""} onChange={(event) => updateSlice(item.key, { serviceId: event.target.value || null })} aria-label={t("Ücretsiz hizmet")}>
                          <option value="">{t("Hizmet seç")}</option>
                          {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                        </select>
                      )}
                      <span className={st.inputAffix} title={t("Göreli şans")}>
                        <input type="number" className={st.input} min={0} max={1000} value={item.weight} onChange={(event) => updateSlice(item.key, { weight: Number(event.target.value) })} aria-label={t("Şans")} />
                        <span>{t("%{value}", { value: (odds[index] ?? 0).toFixed(odds[index] && odds[index] < 1 ? 1 : 0) })}</span>
                      </span>
                      {item.type !== "none" && (
                        <span className={st.inputAffix} title={t("Bu ödülden en fazla kaç tane verilsin (boş = sınırsız)")}>
                          <input type="number" className={st.input} min={0} placeholder={t("Sınırsız")} value={item.stock ?? ""} onChange={(event) => updateSlice(item.key, { stock: event.target.value === "" ? null : Number(event.target.value) })} aria-label={t("Stok")} />
                          <span>{item.stock !== null ? `${awarded}/${item.stock}` : t("adet")}</span>
                        </span>
                      )}
                    </div>
                    <div className={css.sliceActions}>
                      {soldOut ? <Pill tone="warn">{t("Tükendi")}</Pill> : null}
                      <button type="button" className={cx(st.btn, st.btnGhost, st.btnSm)} onClick={() => moveSlice(index, -1)} disabled={index === 0} aria-label={t("Yukarı taşı")}><ArrowUp size={15} aria-hidden /></button>
                      <button type="button" className={cx(st.btn, st.btnGhost, st.btnSm)} onClick={() => moveSlice(index, 1)} disabled={index === draft.slices.length - 1} aria-label={t("Aşağı taşı")}><ArrowDown size={15} aria-hidden /></button>
                      <button type="button" className={cx(st.btn, st.btnDangerSoft, st.btnSm)} onClick={() => update({ slices: draft.slices.filter((row) => row.key !== item.key) })} disabled={draft.slices.length <= WHEEL_MIN_SLICES} aria-label={t("Dilimi sil")}><Trash2 size={15} aria-hidden /></button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <button type="button" className={cx(st.btn, st.btnSoft, css.addSlice)} onClick={() => update({ slices: [...draft.slices, slice(t("Yeni ödül"), "percent", 10, 10)] })} disabled={draft.slices.length >= WHEEL_MAX_SLICES}>
              <Plus size={16} aria-hidden /> {t("Dilim ekle")}
            </button>
          </Panel>

          <Panel title={t("Çevirenler")} icon={Users} description={t("Kim ne kazandı, ödül kullanıldı mı? Kod, adisyonda ödülü doğrulamak için.")}
            actions={<button type="button" className={cx(st.btn, st.btnGhost, st.btnSm)} onClick={() => void load()}><RefreshCcw size={15} aria-hidden /> {t("Yenile")}</button>}>
            <Segmented<SpinFilter>
              label={t("Filtre")}
              value={spinFilter}
              onChange={setSpinFilter}
              options={[
                { value: "all", label: t("Tümü"), count: spins.length },
                { value: "won", label: t("Bekleyen"), count: spins.filter((row) => row.status === "won").length },
                { value: "reserved", label: t("Randevuda"), count: spins.filter((row) => row.status === "reserved").length },
                { value: "used", label: t("Kullanıldı"), count: spins.filter((row) => row.status === "used" || row.status === "points_awarded").length },
                { value: "none", label: t("Kazanamadı"), count: spins.filter((row) => row.status === "none").length },
              ]}
            />
            {filteredSpins.length === 0 ? (
              <EmptyState title={t("Henüz çeviren yok")} description={t("Çarkı açıp vitrin bağlantısını Instagram biyografine ve hikayene koy.")} mood="wave" size={80} />
            ) : (
              <div className={css.tableWrap}>
                <table className={css.table}>
                  <thead>
                    <tr><th>{t("Müşteri")}</th><th>{t("Ödül")}</th><th>{t("Kod")}</th><th>{t("Durum")}</th><th>{t("Tarih")}</th></tr>
                  </thead>
                  <tbody>
                    {filteredSpins.map((row) => {
                      const status = STATUS_LABEL[row.status] ?? { label: row.status, tone: "neutral" as PillTone };
                      const expired = row.status === "won" && row.expiresAt !== null && row.expiresAt < now;
                      return (
                        <tr key={row.id}>
                          <td><b>{row.customerName || t("İsimsiz")}</b><small>{row.phone}</small></td>
                          <td>{row.prizeText || "—"}{row.discountApplied ? <small>{t("−{amount} ₺ düşüldü", { amount: row.discountApplied.toLocaleString(intl) })}</small> : null}</td>
                          <td className={css.code}>{row.code ?? "—"}</td>
                          <td><Pill tone={expired ? "bad" : status.tone} dot>{expired ? t("Süresi doldu") : t(status.label)}</Pill></td>
                          <td>{row.createdAt ? new Date(row.createdAt).toLocaleString(intl, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {saved ? (
            <Panel title={t("Yeni kampanya")} icon={RefreshCcw} description={t("Yeni kampanya başlatınca herkes bir kez daha çevirebilir ve stok sayaçları sıfırlanır. Kazanılmış ödüller geçerliliğini korur.")}>
              <button type="button" className={cx(st.btn, st.btnDangerSoft)} onClick={() => setResetOpen(true)}><RefreshCcw size={16} aria-hidden /> {t("Yeni kampanya başlat")}</button>
            </Panel>
          ) : null}
        </div>

        <aside className={css.preview} aria-label={t("Önizleme")}>
          <div className={css.previewStage}>
            <ConfettiBurst fireKey={confetti} originY={0.45} />
            <p className={css.previewTitle}>{draft.title || t("Şans çarkı")}</p>
            {draft.subtitle ? <p className={css.previewSub}>{draft.subtitle}</p> : null}
            <SpinWheel
              ref={wheelRef}
              slices={previewSlices}
              hubLabel={testing ? "…" : t("DENE")}
              hubDisabled={testing || draft.slices.length < 2}
              onHubClick={() => void testSpin()}
              outcome={testOutcome}
              ariaLabel={t("Çark önizlemesi")}
              compact
            />
            <p className={css.previewNote} aria-live="polite">
              {testResult ? t("Deneme sonucu: {label}", { label: testResult }) : t("Deneme çevirmesi kayıt oluşturmaz; şanslara göre örnek sonuç gösterir.")}
            </p>
            <button type="button" className={cx(st.btn, st.btnBright, st.btnBlock)} onClick={() => void testSpin()} disabled={testing}>
              {testing ? <LoaderCircle size={16} className={st.spin} aria-hidden /> : <Sparkles size={16} aria-hidden />} {t("Deneme çevir")}
            </button>
          </div>
          <div className={css.saveBox}>
            {dirty || !saved ? <p>{saved ? t("Kaydedilmemiş değişiklikler var.") : t("Çark henüz kaydedilmedi.")}</p> : <p>{t("Tüm değişiklikler kaydedildi.")}</p>}
            <button type="button" className={cx(st.btn, st.btnPrimary, st.btnBlock)} onClick={() => void save(false)} disabled={saving || (!dirty && Boolean(saved))}>
              {saving ? <LoaderCircle size={16} className={st.spin} aria-hidden /> : null}{saved ? t("Kaydet") : t("Çarkı oluştur")}
            </button>
          </div>
        </aside>
      </div>

      <ConfirmSheet
        open={resetOpen}
        title={t("Yeni kampanya başlatılsın mı?")}
        description={t("Mevcut ayarlarla yeni bir kampanya açılır; herkes bir kez daha çevirebilir, stok sayaçları sıfırlanır. Daha önce kazanılan ödüller kullanılabilir kalır.")}
        confirmLabel={t("Yeni kampanya başlat")}
        cancelLabel={t("Vazgeç")}
        tone="danger"
        busy={saving}
        onConfirm={() => void save(true)}
        onClose={() => setResetOpen(false)}
      />
    </StudioPage>
  );
}
