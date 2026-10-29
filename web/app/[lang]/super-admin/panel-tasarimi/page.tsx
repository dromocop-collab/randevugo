"use client";

// Süper admin › Panel Tasarımı: işletme panelinin menüsü, ana sayfası, teması, duyurusu ve metinleri.
// Kaydet ve yayınla → platformSettings/dashboardDesign; tüm işletmelerin web paneline anında (canlı dinleme) yansır.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, CalendarClock, Eye, EyeOff, History, Languages, LayoutDashboard, LayoutPanelTop, Link2, Lock, Megaphone,
  Palette, Plus, RotateCcw, Save, Search, Trash2, TriangleAlert, Type, Undo2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CUSTOM_LINK_ICON_COMPONENTS, DASHBOARD_NAV_ITEMS, GROUP_LABELS } from "@/components/dashboard/navigation";
import { dashboardSkins, defaultDashboardModules } from "@/components/dashboard/appearance-studio";
import {
  ANNOUNCEMENT_AUDIENCES, ANNOUNCEMENT_TONES, CUSTOM_LINK_ICONS, EMPTY_DESIGN, LOCKED_NAV_HREFS, MAX_CUSTOM_LINKS, MAX_TEXT_OVERRIDES, NAV_GROUPS,
  parseDashboardDesign, safeHref, sameVariables, type Announcement, type AnnouncementAudience, type AnnouncementTone, type CustomLink,
  type CustomLinkIcon, type DashboardDesign, type NavGroup, type NavItemDesign,
} from "@/features/dashboard-design/design-domain";
import { getDashboardDesign, listDesignHistory, saveDashboardDesign, type DesignHistoryEntry } from "@/features/dashboard-design/design-repository";
import {
  AdminPage, Btn, Card, Chips, ConfirmSheet, EmptyState, HeroStat, IconBtn, PageHeader, Pill, Segmented, SkeletonList, cx, fullDate, relativeTime, ui, useNow,
} from "../_pages-ui";
import s from "./panel.module.css";

type Tab = "menu" | "home" | "look" | "news" | "texts" | "history";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "menu", label: "Menü" }, { value: "home", label: "Ana sayfa" }, { value: "look", label: "Görünüm" },
  { value: "news", label: "Duyuru" }, { value: "texts", label: "Metinler" }, { value: "history", label: "Geçmiş" },
];
const GROUP_NAMES: Record<NavGroup, string> = GROUP_LABELS;
const TONE_LABEL: Record<AnnouncementTone, string> = { info: "Bilgi", success: "Müjde", warning: "Uyarı", danger: "Kritik" };
const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = { all: "Tüm işletmeler", trialing: "Denemedekiler", active: "Paketi aktif olanlar", expired: "Süresi dolanlar" };
const ICON_LABEL: Record<CustomLinkIcon, string> = {
  link: "Bağlantı", book: "Kitap", video: "Video", gift: "Hediye", megaphone: "Duyuru", star: "Yıldız", heart: "Kalp",
  sparkles: "Parıltı", graduation: "Eğitim", message: "Mesaj", phone: "Telefon", shop: "Mağaza",
};

/** Menü satırı: kod öğesi ya da özel bağlantı, ortak sıra. */
type Row = { key: string; kind: "item" | "custom"; order: number };

function orderedRows(design: DashboardDesign): Row[] {
  return [
    ...DASHBOARD_NAV_ITEMS.map((item, index) => ({ key: item.href, kind: "item" as const, order: design.nav.items[item.href]?.order ?? index * 10, index })),
    ...design.nav.custom.map((link, index) => ({ key: link.id, kind: "custom" as const, order: link.order, index: 1000 + index })),
  ].sort((a, b) => a.order - b.order || a.index - b.index).map(({ key, kind, order }) => ({ key, kind, order }));
}

function toLocalInput(ms: number | null) {
  if (!ms) return "";
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={s.switch} title={label}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={ui.field}>
      <span className={ui.fieldLabel}>{label}{hint && <small>{hint}</small>}</span>
      {children}
    </label>
  );
}

export default function PanelDesignPage() {
  const { user } = useAuth();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("menu");
  const [saved, setSaved] = useState<DashboardDesign | null>(null);
  const [draft, setDraft] = useState<DashboardDesign>(EMPTY_DESIGN);
  const [meta, setMeta] = useState<{ updatedAt: number | null; updatedBy: string }>({ updatedAt: null, updatedBy: "" });
  const [loadError, setLoadError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const result = await getDashboardDesign();
      setSaved(result.design);
      setDraft(result.design);
      setMeta({ updatedAt: result.updatedAt, updatedBy: result.updatedBy });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Tasarım yüklenemedi.");
    }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const dirty = saved !== null && JSON.stringify(parseDashboardDesign(draft)) !== JSON.stringify(saved);
  // Kaydedilmemiş değişiklikle sayfadan çıkarken uyar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (patch: (current: DashboardDesign) => DashboardDesign) => setDraft((current) => patch(current));

  async function publish() {
    if (!user?.email) return;
    setSaving(true);
    try {
      await saveDashboardDesign(draft, user.email, note);
      const clean = parseDashboardDesign(draft);
      setSaved(clean);
      setDraft(clean);
      setMeta({ updatedAt: Date.now(), updatedBy: user.email });
      setConfirmOpen(false);
      setNote("");
      toast.success("Panel tasarımı yayınlandı; tüm işletmelerin panelinde güncellendi.");
    } catch (error) {
      toast.error(error instanceof Error ? `Kaydedilemedi: ${error.message}` : "Kaydedilemedi.");
      throw error; // onay penceresi açık kalsın
    } finally {
      setSaving(false);
    }
  }

  const changes = useMemo(() => summarizeChanges(draft), [draft]);

  if (loadError) return <AdminPage><EmptyState title="Tasarım yüklenemedi" description={loadError} action={<Btn onClick={() => void load()}>Tekrar dene</Btn>} /></AdminPage>;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="İşletme paneli" icon={LayoutDashboard} title="Panel Tasarımı"
        description="İşletme panelinin menüsünü, ana sayfasını, temasını, duyurusunu ve metinlerini buradan düzenle. Yayınladığın anda tüm işletmelerin web panelinde uygulanır."
        meta={<>
          <HeroStat label="özelleştirme" value={changes} />
          <HeroStat label="son yayın" value={meta.updatedAt ? relativeTime(meta.updatedAt, now) : "henüz yok"} />
          {dirty && <Pill tone="amber" dot>Yayınlanmamış değişiklik var</Pill>}
        </>}
        actions={<>
          <Btn variant="onDark" icon={Undo2} disabled={!dirty || saving} onClick={() => saved && setDraft(saved)}>Geri al</Btn>
          <Btn variant="lime" icon={Save} disabled={!dirty} loading={saving} onClick={() => setConfirmOpen(true)}>Kaydet ve yayınla</Btn>
        </>}
      />

      {saved === null ? <SkeletonList rows={5} /> : (
        <div className={s.layout}>
          <div className={s.main}>
            <Segmented label="Panel tasarımı bölümleri" options={TABS} value={tab} onChange={setTab} />
            {tab === "menu" && <MenuEditor draft={draft} update={update} />}
            {tab === "home" && <HomeEditor draft={draft} update={update} />}
            {tab === "look" && <LookEditor draft={draft} update={update} />}
            {tab === "news" && <NewsEditor draft={draft} update={update} now={now} />}
            {tab === "texts" && <TextEditor draft={draft} update={update} />}
            {tab === "history" && <HistoryPanel onRestore={(design) => { setDraft(design); setTab("menu"); toast.info("Sürüm taslağa alındı. Kontrol edip 'Kaydet ve yayınla'ya bas."); }} now={now} />}
          </div>
          <aside className={s.side}>
            <Preview design={draft} now={now} />
            <Card title="Bilmen gerekenler" icon={TriangleAlert}>
              <ul className={s.notes}>
                <li>Değişiklikler yalnız <b>web</b> işletme paneline uygulanır; iOS/Android uygulamaları kendi menüsünü kullanır.</li>
                <li>Bugün, Ayarlar, Abonelik ve Destek kilitli: gizlenemez, kapatılamaz (işletme panelde mahsur kalmasın).</li>
                <li>Gizlenen sayfa adresle açılabilir; <b>kapatılan</b> sayfa işletmelere &quot;kullanılamıyor&quot; ekranı gösterir. Sen süper admin olarak görmeye devam edersin.</li>
                <li>Paket yetkileri ve çalışan izinleri yine geçerli: burada açsan da yetkisi olmayan göremez.</li>
              </ul>
            </Card>
          </aside>
        </div>
      )}

      <ConfirmSheet
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        onConfirm={publish}
        title="Tüm işletmelere yayınlansın mı?"
        description="Kaydettiğin anda bütün işletmelerin web panelinde uygulanır. Her kayıt Geçmiş'te saklanır; istediğin an eski sürüme dönebilirsin."
        confirmLabel="Yayınla"
        icon={Save}
      >
        <Field label="Kayıt notu" hint="isteğe bağlı">
          <input className={ui.input} value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} placeholder="Ör. Kampanya duyurusu eklendi" />
        </Field>
      </ConfirmSheet>
    </AdminPage>
  );
}

function summarizeChanges(design: DashboardDesign): number {
  const nav = Object.keys(design.nav.items).length + design.nav.custom.length + Object.keys(design.nav.groupLabels).length;
  return nav + (design.home.modules ? 1 : 0) + (design.appearance.defaultSkin || design.appearance.allowedSkins ? 1 : 0) + (design.announcement.enabled ? 1 : 0) + design.texts.length;
}

type EditorProps = { draft: DashboardDesign; update: (patch: (current: DashboardDesign) => DashboardDesign) => void };

/* ───────────────────────── Menü ───────────────────────── */

function MenuEditor({ draft, update }: EditorProps) {
  const rows = orderedRows(draft);
  const [adding, setAdding] = useState(false);

  function patchItem(href: string, patch: Partial<NavItemDesign>) {
    update((current) => {
      const next = { ...(current.nav.items[href] ?? {}), ...patch };
      (Object.keys(next) as Array<keyof NavItemDesign>).forEach((key) => { if (next[key] === undefined || next[key] === "" || next[key] === false) delete next[key]; });
      const items = { ...current.nav.items };
      if (Object.keys(next).length) items[href] = next; else delete items[href];
      return { ...current, nav: { ...current.nav, items } };
    });
  }
  function patchCustom(id: string, patch: Partial<CustomLink>) {
    update((current) => ({ ...current, nav: { ...current.nav, custom: current.nav.custom.map((link) => (link.id === id ? { ...link, ...patch } : link)) } }));
  }
  /** Satırı yukarı/aşağı taşı; tüm sıralar 10'ar aralıkla yeniden yazılır. */
  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    update((current) => {
      const items = { ...current.nav.items };
      let custom = [...current.nav.custom];
      next.forEach((row, position) => {
        const order = position * 10;
        if (row.kind === "item") items[row.key] = { ...(items[row.key] ?? {}), order };
        else custom = custom.map((link) => (link.id === row.key ? { ...link, order } : link));
      });
      return { ...current, nav: { ...current.nav, items, custom } };
    });
  }
  function resetOrder() {
    update((current) => {
      const items = Object.fromEntries(Object.entries(current.nav.items).flatMap(([href, entry]) => {
        const rest = { ...entry };
        delete rest.order;
        return Object.keys(rest).length ? [[href, rest]] : [];
      }));
      return { ...current, nav: { ...current.nav, items, custom: current.nav.custom.map((link, index) => ({ ...link, order: 500 + index })) } };
    });
  }

  return (
    <>
      <Card title="Menü grupları" description="Grup başlıklarının adı (boş bırakılan varsayılanı kullanır)." icon={LayoutPanelTop}>
        <div className={s.grid2}>
          {NAV_GROUPS.map((group) => (
            <Field key={group} label={GROUP_NAMES[group]}>
              <input className={ui.input} maxLength={40} placeholder={GROUP_NAMES[group]} value={draft.nav.groupLabels[group] ?? ""}
                onChange={(event) => update((current) => {
                  const groupLabels = { ...current.nav.groupLabels, [group]: event.target.value };
                  if (!event.target.value.trim()) delete groupLabels[group];
                  return { ...current, nav: { ...current.nav, groupLabels } };
                })} />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Menü öğeleri" description="Sırala, yeniden adlandır, grubunu değiştir, gizle veya sayfayı tamamen kapat." icon={Link2}
        action={<Btn size="sm" icon={RotateCcw} onClick={resetOrder}>Sırayı sıfırla</Btn>} flush>
        <ol className={s.rows}>
          {rows.map((row, index) => {
            if (row.kind === "custom") {
              const link = draft.nav.custom.find((item) => item.id === row.key);
              if (!link) return null;
              const Icon = CUSTOM_LINK_ICON_COMPONENTS[link.icon];
              return (
                <li key={row.key} className={cx(s.row, s.rowCustom)}>
                  <MoveButtons index={index} total={rows.length} onMove={move} />
                  <span className={s.rowIcon}><Icon size={17} aria-hidden /></span>
                  <div className={s.rowBody}>
                    <div className={s.rowFields}>
                      <input className={ui.input} aria-label="Bağlantı adı" maxLength={40} value={link.label} onChange={(event) => patchCustom(link.id, { label: event.target.value })} />
                      <select className={ui.select} aria-label="Grup" value={link.group} onChange={(event) => patchCustom(link.id, { group: event.target.value as NavGroup })}>
                        {NAV_GROUPS.map((group) => <option key={group} value={group}>{draft.nav.groupLabels[group] || GROUP_NAMES[group]}</option>)}
                      </select>
                    </div>
                    <small className={s.rowHint}><Pill tone="violet">Özel bağlantı</Pill> {link.href}{link.newTab ? " · yeni sekmede" : ""}</small>
                  </div>
                  <IconBtn label="Bağlantıyı sil" icon={Trash2} onClick={() => update((current) => ({ ...current, nav: { ...current.nav, custom: current.nav.custom.filter((item) => item.id !== link.id) } }))} />
                </li>
              );
            }
            const item = DASHBOARD_NAV_ITEMS.find((entry) => entry.href === row.key);
            if (!item) return null;
            const entry = draft.nav.items[item.href] ?? {};
            const locked = (LOCKED_NAV_HREFS as readonly string[]).includes(item.href);
            const Icon = item.icon;
            return (
              <li key={row.key} className={cx(s.row, (entry.hidden || entry.disabled) && s.rowOff)}>
                <MoveButtons index={index} total={rows.length} onMove={move} />
                <span className={s.rowIcon}><Icon size={17} aria-hidden /></span>
                <div className={s.rowBody}>
                  <div className={s.rowFields}>
                    <input className={ui.input} aria-label={`${item.label} adı`} maxLength={40} placeholder={item.label} value={entry.label ?? ""} onChange={(event) => patchItem(item.href, { label: event.target.value })} />
                    <select className={ui.select} aria-label={`${item.label} grubu`} value={entry.group ?? item.group} onChange={(event) => patchItem(item.href, { group: event.target.value === item.group ? undefined : event.target.value as NavGroup })}>
                      {NAV_GROUPS.map((group) => <option key={group} value={group}>{draft.nav.groupLabels[group] || GROUP_NAMES[group]}</option>)}
                    </select>
                  </div>
                  <small className={s.rowHint}>
                    {item.href}
                    {locked && <> · <Lock size={11} aria-hidden /> kilitli</>}
                    {entry.disabled ? <Pill tone="red">Sayfa kapalı</Pill> : entry.hidden ? <Pill tone="amber">Menüde gizli</Pill> : null}
                  </small>
                  <details className={s.more}>
                    <summary><Languages size={12} aria-hidden /> İngilizce ad</summary>
                    <input className={ui.input} aria-label={`${item.label} İngilizce adı`} maxLength={40} placeholder="Varsayılan çeviri" value={entry.labelEn ?? ""} onChange={(event) => patchItem(item.href, { labelEn: event.target.value })} />
                  </details>
                </div>
                <div className={s.rowToggles}>
                  <span title={locked ? "Kilitli öğe" : undefined}><Eye size={13} aria-hidden /> Menüde <Switch label={`${item.label} menüde göster`} checked={!entry.hidden && !entry.disabled} disabled={locked || entry.disabled} onChange={(value) => patchItem(item.href, { hidden: !value })} /></span>
                  <span title={locked ? "Kilitli öğe" : undefined}><Lock size={13} aria-hidden /> Sayfa açık <Switch label={`${item.label} sayfası açık`} checked={!entry.disabled} disabled={locked} onChange={(value) => patchItem(item.href, { disabled: !value })} /></span>
                </div>
              </li>
            );
          })}
        </ol>
        <div className={s.cardFoot}>
          {adding
            ? <CustomLinkForm draft={draft} onCancel={() => setAdding(false)} onAdd={(link) => { update((current) => ({ ...current, nav: { ...current.nav, custom: [...current.nav.custom, link] } })); setAdding(false); }} />
            : <Btn icon={Plus} disabled={draft.nav.custom.length >= MAX_CUSTOM_LINKS} onClick={() => setAdding(true)}>Özel bağlantı ekle {draft.nav.custom.length ? `(${draft.nav.custom.length}/${MAX_CUSTOM_LINKS})` : ""}</Btn>}
        </div>
      </Card>
    </>
  );
}

function MoveButtons({ index, total, onMove }: { index: number; total: number; onMove: (index: number, delta: -1 | 1) => void }) {
  return (
    <span className={s.move}>
      <IconBtn label="Yukarı taşı" icon={ArrowUp} disabled={index === 0} onClick={() => onMove(index, -1)} />
      <IconBtn label="Aşağı taşı" icon={ArrowDown} disabled={index === total - 1} onClick={() => onMove(index, 1)} />
    </span>
  );
}

function CustomLinkForm({ draft, onAdd, onCancel }: { draft: DashboardDesign; onAdd: (link: CustomLink) => void; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [icon, setIcon] = useState<CustomLinkIcon>("link");
  const [group, setGroup] = useState<NavGroup>("sistem");
  const safe = safeHref(href);
  const external = Boolean(safe?.startsWith("https://"));
  const [newTab, setNewTab] = useState(true);
  const error = !label.trim() ? "Bir ad yaz." : !href.trim() ? "Adres yaz." : !safe ? "Adres /dashboard/... ile başlamalı ya da https:// olmalı." : null;

  function add() {
    if (error || !safe) return;
    const base = label.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "baglanti";
    let id = base.length >= 2 ? base : `${base}-1`;
    for (let index = 2; draft.nav.custom.some((link) => link.id === id); index += 1) id = `${base}-${index}`;
    onAdd({ id, label: label.trim(), href: safe, icon, group, order: 900 + draft.nav.custom.length, newTab: external ? newTab : false });
  }

  return (
    <div className={s.addForm}>
      <div className={s.grid2}>
        <Field label="Ad"><input className={ui.input} autoFocus maxLength={40} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ör. Eğitim videoları" /></Field>
        <Field label="Adres" hint="/dashboard/... ya da https://"><input className={ui.input} value={href} onChange={(event) => setHref(event.target.value)} placeholder="https://youtube.com/@seninrandevun" inputMode="url" /></Field>
        <Field label="Grup">
          <select className={ui.select} value={group} onChange={(event) => setGroup(event.target.value as NavGroup)}>
            {NAV_GROUPS.map((item) => <option key={item} value={item}>{draft.nav.groupLabels[item] || GROUP_NAMES[item]}</option>)}
          </select>
        </Field>
        {external && <Field label="Yeni sekmede aç"><span className={s.inlineSwitch}><Switch label="Yeni sekmede aç" checked={newTab} onChange={setNewTab} /> {newTab ? "Evet" : "Hayır"}</span></Field>}
      </div>
      <div className={s.iconPicker} role="radiogroup" aria-label="Simge">
        {CUSTOM_LINK_ICONS.map((key) => {
          const Icon = CUSTOM_LINK_ICON_COMPONENTS[key];
          return <button key={key} type="button" role="radio" aria-checked={icon === key} title={ICON_LABEL[key]} className={cx(s.iconChoice, icon === key && s.iconChoiceOn)} onClick={() => setIcon(key)}><Icon size={17} aria-hidden /></button>;
        })}
      </div>
      {error && (label || href) && <p className={s.warn}><TriangleAlert size={13} aria-hidden /> {error}</p>}
      <div className={s.formActions}>
        <Btn variant="ghost" onClick={onCancel}>Vazgeç</Btn>
        <Btn variant="primary" icon={Plus} disabled={Boolean(error)} onClick={add}>Menüye ekle</Btn>
      </div>
    </div>
  );
}

/* ───────────────────────── Ana sayfa ───────────────────────── */

function HomeEditor({ draft, update }: EditorProps) {
  const custom = draft.home.modules !== null;
  const modules = draft.home.modules ?? defaultDashboardModules.map((item) => ({ id: item.id, enabled: true }));
  const setModules = (next: Array<{ id: string; enabled: boolean }> | null, locked = draft.home.locked) => update((current) => ({ ...current, home: { modules: next, locked: next ? locked : false } }));
  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= modules.length) return;
    const next = [...modules];
    [next[index], next[target]] = [next[target], next[index]];
    setModules(next);
  }
  return (
    <Card title="Ana sayfa (Bugün) kartları" description="İşletmelerin ana sayfasındaki kartların varsayılan sırası ve görünürlüğü." icon={LayoutPanelTop}>
      <div className={s.optionRow}>
        <div><b>Varsayılan düzeni ben belirleyeyim</b><small>Kapalıyken herkes kodun varsayılan sırasını görür.</small></div>
        <Switch label="Varsayılan düzeni belirle" checked={custom} onChange={(value) => setModules(value ? modules : null)} />
      </div>
      {custom && <>
        <div className={s.optionRow}>
          <div><b>Kilitle</b><small>Açıkken işletmeler kendi düzenini değiştiremez; herkes bu düzeni görür. Kapalıyken yalnız düzenini hiç değiştirmemiş işletmelere uygulanır.</small></div>
          <Switch label="Düzeni kilitle" checked={draft.home.locked} onChange={(value) => setModules(modules, value)} />
        </div>
        <ol className={s.rows}>
          {modules.map((module, index) => {
            const meta = defaultDashboardModules.find((item) => item.id === module.id);
            return (
              <li key={module.id} className={cx(s.row, !module.enabled && s.rowOff)}>
                <MoveButtons index={index} total={modules.length} onMove={move} />
                <div className={s.rowBody}><b>{meta?.label ?? module.id}</b><small className={s.rowHint}>{meta?.note}</small></div>
                <div className={s.rowToggles}><span>{module.enabled ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />} Göster <Switch label={`${meta?.label ?? module.id} göster`} checked={module.enabled} onChange={(value) => setModules(modules.map((item) => (item.id === module.id ? { ...item, enabled: value } : item)))} /></span></div>
              </li>
            );
          })}
        </ol>
      </>}
    </Card>
  );
}

/* ───────────────────────── Görünüm ───────────────────────── */

function LookEditor({ draft, update }: EditorProps) {
  const { defaultSkin, forceSkin, allowedSkins } = draft.appearance;
  const setAppearance = (patch: Partial<DashboardDesign["appearance"]>) => update((current) => ({ ...current, appearance: { ...current.appearance, ...patch } }));
  return (
    <>
      <Card title="Varsayılan tema" description="Temasını hiç seçmemiş işletmelere uygulanır. Zorunlu yaparsan herkes bu temayı görür." icon={Palette}>
        <div className={s.skins}>
          <button type="button" className={cx(s.skin, !defaultSkin && s.skinOn)} onClick={() => setAppearance({ defaultSkin: null, forceSkin: false })}>
            <i className={s.skinNone}>—</i><span>Varsayılan yok</span>
          </button>
          {dashboardSkins.map((skin) => (
            <button key={skin.id} type="button" className={cx(s.skin, defaultSkin === skin.id && s.skinOn)} onClick={() => setAppearance({ defaultSkin: skin.id })} aria-pressed={defaultSkin === skin.id}>
              <i>{skin.colors.map((color) => <b key={color} style={{ background: color }} />)}</i>
              <span>{skin.name}</span>
            </button>
          ))}
        </div>
        <div className={s.optionRow}>
          <div><b>Zorunlu tema</b><small>Açıkken işletmeler tema seçemez; herkes seçtiğin temayı görür.</small></div>
          <Switch label="Zorunlu tema" checked={forceSkin} disabled={!defaultSkin} onChange={(value) => setAppearance({ forceSkin: value })} />
        </div>
      </Card>
      <Card title="Seçilebilir temalar" description="Hiçbiri işaretli değilse işletmeler tüm temaları seçebilir." icon={Palette}>
        <div className={s.skins}>
          {dashboardSkins.map((skin) => {
            const on = Boolean(allowedSkins?.includes(skin.id));
            return (
              <label key={skin.id} className={cx(s.skin, on && s.skinOn, forceSkin && s.skinDisabled)}>
                <input type="checkbox" className={s.srOnly} checked={on} disabled={forceSkin} onChange={(event) => {
                  const next = event.target.checked ? [...(allowedSkins ?? []), skin.id] : (allowedSkins ?? []).filter((id) => id !== skin.id);
                  setAppearance({ allowedSkins: next.length ? next : null });
                }} />
                <i>{skin.colors.map((color) => <b key={color} style={{ background: color }} />)}</i>
                <span>{skin.name}</span>
              </label>
            );
          })}
        </div>
      </Card>
    </>
  );
}

/* ───────────────────────── Duyuru ───────────────────────── */

function NewsEditor({ draft, update, now }: EditorProps & { now: number }) {
  const item = draft.announcement;
  const set = (patch: Partial<Announcement>) => update((current) => ({ ...current, announcement: { ...current.announcement, ...patch } }));
  const linkInvalid = Boolean(item.linkHref) && !safeHref(item.linkHref);
  const state = !item.enabled ? "Kapalı" : item.startsAt && now < item.startsAt ? "Zamanı bekliyor" : item.endsAt && now >= item.endsAt ? "Süresi doldu" : "Yayında";
  return (
    <Card title="Panel duyurusu" description="İşletme panelinin en üstünde görünen şerit. Metin değişince işletmelerin 'kapattım' tercihi sıfırlanır." icon={Megaphone}
      action={<Pill tone={state === "Yayında" ? "green" : state === "Kapalı" ? "neutral" : "amber"} dot>{state}</Pill>}>
      <div className={s.optionRow}>
        <div><b>Duyuruyu göster</b><small>Başlık veya mesaj yazmadan açılmaz.</small></div>
        <Switch label="Duyuruyu göster" checked={item.enabled} onChange={(value) => set({ enabled: value })} />
      </div>
      <div className={s.stack}>
        <Chips label="Tür" value={item.tone} onChange={(tone) => set({ tone })} options={ANNOUNCEMENT_TONES.map((tone) => ({ value: tone, label: TONE_LABEL[tone] }))} />
        <Field label="Başlık" hint={`${item.title.length}/80`}><input className={ui.input} maxLength={80} value={item.title} onChange={(event) => set({ title: event.target.value })} placeholder="Ör. Yeni özellik: birden fazla hizmet" /></Field>
        <Field label="Mesaj" hint={`${item.message.length}/600`}><textarea className={ui.textarea} maxLength={600} value={item.message} onChange={(event) => set({ message: event.target.value })} placeholder="Müşterileriniz artık tek randevuda birden fazla hizmet seçebilir." /></Field>
        <div className={s.grid2}>
          <Field label="Düğme metni"><input className={ui.input} maxLength={30} value={item.linkLabel} onChange={(event) => set({ linkLabel: event.target.value })} placeholder="Ayarlara git" /></Field>
          <Field label="Düğme adresi" hint="/dashboard/... ya da https://"><input className={cx(ui.input, linkInvalid && s.invalid)} value={item.linkHref} onChange={(event) => set({ linkHref: event.target.value })} placeholder="/dashboard/ayarlar" /></Field>
          <Field label="Başlangıç" hint="boş: hemen"><input type="datetime-local" className={ui.input} value={toLocalInput(item.startsAt)} onChange={(event) => set({ startsAt: event.target.value ? new Date(event.target.value).getTime() : null })} /></Field>
          <Field label="Bitiş" hint="boş: süresiz"><input type="datetime-local" className={ui.input} value={toLocalInput(item.endsAt)} onChange={(event) => set({ endsAt: event.target.value ? new Date(event.target.value).getTime() : null })} /></Field>
        </div>
        {linkInvalid && <p className={s.warn}><TriangleAlert size={13} aria-hidden /> Adres geçersiz; düğme gösterilmez.</p>}
        {item.startsAt && item.endsAt && item.endsAt <= item.startsAt && <p className={s.warn}><TriangleAlert size={13} aria-hidden /> Bitiş başlangıçtan önce; bitiş yok sayılır.</p>}
        <Chips label="Kime" value={item.audience} onChange={(audience) => set({ audience })} options={ANNOUNCEMENT_AUDIENCES.map((audience) => ({ value: audience, label: AUDIENCE_LABEL[audience] }))} />
        <div className={s.optionRow}>
          <div><b>Kapatılabilir</b><small>İşletme şeridi kapatabilir (kapatan bir daha görmez, metin değişene kadar).</small></div>
          <Switch label="Kapatılabilir" checked={item.dismissible} onChange={(value) => set({ dismissible: value })} />
        </div>
        <p className={s.muted}><CalendarClock size={13} aria-hidden /> Saatler bu cihazın saatine göre; Türkiye saati ise doğrudan yaz.</p>
      </div>
    </Card>
  );
}

/* ───────────────────────── Metinler ───────────────────────── */

type Catalog = string[];
let catalogPromise: Promise<Catalog> | null = null;
/** Panelin tüm Türkçe metinleri (İngilizce sözlük anahtarları = kaynak metinler). */
function loadCatalog(): Promise<Catalog> {
  catalogPromise ??= Promise.all([
    import("@/i18n/messages/en/dashboard-a.json"), import("@/i18n/messages/en/dashboard-b.json"), import("@/i18n/messages/en/dashboard-c.json"),
    import("@/i18n/messages/en/dashboard-shell.json"), import("@/i18n/messages/en/services-editor.json"), import("@/i18n/messages/en/services-ops.json"),
  ]).then((modules) => [...new Set(modules.flatMap((module) => Object.keys(module.default ?? module)).map((key) => key.replace(/^[a-z]+::/, "")))].sort((a, b) => a.localeCompare(b, "tr")));
  return catalogPromise;
}

function TextEditor({ draft, update }: EditorProps) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => { void loadCatalog().then(setCatalog).catch(() => setCatalog([])); }, []);
  const used = new Set(draft.texts.map((row) => row.from));
  const term = query.trim().toLocaleLowerCase("tr-TR");
  const results = term.length >= 2 && catalog ? catalog.filter((text) => !used.has(text) && text.toLocaleLowerCase("tr-TR").includes(term)).slice(0, 30) : [];
  const setTexts = (texts: DashboardDesign["texts"]) => update((current) => ({ ...current, texts }));
  const full = draft.texts.length >= MAX_TEXT_OVERRIDES;

  return (
    <>
      <Card title="Metin değiştir" description="Paneldeki herhangi bir yazıyı bul, yerine kendi metnini yaz. {count} gibi değişkenler yeni metinde de aynen kalmalı." icon={Type}>
        <label className={s.search}>
          <Search size={16} aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={catalog ? `${catalog.length.toLocaleString("tr-TR")} metin içinde ara… (ör. Randevu)` : "Metinler yükleniyor…"} aria-label="Metin ara" />
        </label>
        {term.length >= 2 && (
          results.length ? (
            <ul className={s.results}>
              {results.map((text) => (
                <li key={text}>
                  <span>{text}</span>
                  <Btn size="sm" icon={Plus} disabled={full} onClick={() => { setTexts([{ from: text, to: text }, ...draft.texts]); setQuery(""); }}>Değiştir</Btn>
                </li>
              ))}
            </ul>
          ) : (
            <div className={s.noResult}>
              <span>Eşleşen metin yok.</span>
              <Btn size="sm" icon={Plus} disabled={full || used.has(query.trim())} onClick={() => { setTexts([{ from: query.trim(), to: query.trim() }, ...draft.texts]); setQuery(""); }}>&quot;{query.trim()}&quot; metnini yine de ekle</Btn>
            </div>
          )
        )}
      </Card>
      <Card title={`Değiştirilen metinler (${draft.texts.length})`} icon={Languages} flush>
        {draft.texts.length === 0 ? <div className={ui.cardBody}><EmptyState title="Henüz metin değiştirilmedi" description="Yukarıdan bir metin arayıp 'Değiştir'e bas." /></div> : (
          <ul className={s.rows}>
            {draft.texts.map((row, index) => {
              const badVars = !sameVariables(row.from, row.to) || Boolean(row.toEn && !sameVariables(row.from, row.toEn));
              const unchanged = row.from === row.to.trim();
              return (
                <li key={row.from} className={cx(s.row, s.textRow)}>
                  <div className={s.rowBody}>
                    <small className={s.rowHint}>Orijinal: <q>{row.from}</q></small>
                    <div className={s.grid2}>
                      <input className={cx(ui.input, badVars && s.invalid)} aria-label="Yeni metin" maxLength={300} value={row.to} onChange={(event) => setTexts(draft.texts.map((item, position) => (position === index ? { ...item, to: event.target.value } : item)))} />
                      <input className={ui.input} aria-label="İngilizce yeni metin" maxLength={300} placeholder="İngilizce (isteğe bağlı)" value={row.toEn ?? ""} onChange={(event) => setTexts(draft.texts.map((item, position) => (position === index ? { ...item, toEn: event.target.value || undefined } : item)))} />
                    </div>
                    {badVars && <p className={s.warn}><TriangleAlert size={13} aria-hidden /> Değişkenler ({row.from.match(/\{\w+\}/g)?.join(", ") || "yok"}) yeni metinde aynen olmalı; yoksa bu satır uygulanmaz.</p>}
                    {unchanged && <p className={s.muted}>Aynı metin; değiştirilmeden kaydedilmez.</p>}
                  </div>
                  <IconBtn label="Değişikliği kaldır" icon={Trash2} onClick={() => setTexts(draft.texts.filter((_, position) => position !== index))} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

/* ───────────────────────── Geçmiş ───────────────────────── */

function HistoryPanel({ onRestore, now }: { onRestore: (design: DashboardDesign) => void; now: number }) {
  const [rows, setRows] = useState<DesignHistoryEntry[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void listDesignHistory().then(setRows).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Geçmiş yüklenemedi.")); }, []);
  return (
    <Card title="Yayın geçmişi" description="Her 'Kaydet ve yayınla' bir sürüm saklar. Bir sürümü taslağa alıp tekrar yayınlayarak geri dönebilirsin." icon={History}
      action={<Btn size="sm" icon={RotateCcw} onClick={() => onRestore(EMPTY_DESIGN)}>Tümünü varsayılana sıfırla</Btn>} flush>
      {error ? <div className={ui.cardBody}><EmptyState title="Geçmiş yüklenemedi" description={error} /></div>
        : rows === null ? <div className={ui.cardBody}><SkeletonList rows={3} /></div>
        : rows.length === 0 ? <div className={ui.cardBody}><EmptyState title="Henüz yayın yok" description="İlk 'Kaydet ve yayınla' ile geçmiş başlar." /></div>
        : (
          <ul className={s.rows}>
            {rows.map((row) => (
              <li key={row.id} className={s.row}>
                <div className={s.rowBody}>
                  <b>{row.note || "Not yok"}</b>
                  <small className={s.rowHint} title={fullDate(row.savedAt)}>{relativeTime(row.savedAt, now)} · {row.savedBy} · {summarizeChanges(row.design)} özelleştirme</small>
                </div>
                <Btn size="sm" icon={Undo2} onClick={() => onRestore(row.design)}>Taslağa al</Btn>
              </li>
            ))}
          </ul>
        )}
    </Card>
  );
}

/* ───────────────────────── Önizleme ───────────────────────── */

function Preview({ design, now }: { design: DashboardDesign; now: number }) {
  const clean = parseDashboardDesign(design);
  const rows = orderedRows(clean);
  const groups = NAV_GROUPS.map((group) => ({
    group,
    items: rows.flatMap((row) => {
      if (row.kind === "custom") {
        const link = clean.nav.custom.find((item) => item.id === row.key);
        return link && link.group === group ? [{ key: link.id, label: link.label, Icon: CUSTOM_LINK_ICON_COMPONENTS[link.icon], external: link.href.startsWith("https://") }] : [];
      }
      const item = DASHBOARD_NAV_ITEMS.find((entry) => entry.href === row.key);
      const entry = clean.nav.items[row.key];
      if (!item || entry?.hidden || entry?.disabled || (entry?.group ?? item.group) !== group) return [];
      return [{ key: item.href, label: entry?.label ?? item.label, Icon: item.icon, external: false }];
    }),
  })).filter((entry) => entry.items.length);
  const announcement = clean.announcement.enabled ? clean.announcement : null;
  const scheduled = announcement && ((announcement.startsAt && now < announcement.startsAt) || (announcement.endsAt && now >= announcement.endsAt));
  return (
    <Card title="Canlı önizleme" description="Kaydetmeden önce işletme menüsü böyle görünür (paket/yetki filtreleri hariç)." icon={Eye}>
      {announcement && (
        <div className={cx(s.previewNews, s[`news-${announcement.tone}`])}>
          <Megaphone size={14} aria-hidden />
          <span><b>{announcement.title}</b>{announcement.message && <small>{announcement.message}</small>}</span>
          {scheduled && <Pill tone="amber">zamanı dışında</Pill>}
        </div>
      )}
      <nav className={s.previewNav} aria-label="Menü önizlemesi">
        {groups.map(({ group, items }) => (
          <section key={group}>
            <p>{clean.nav.groupLabels[group] ?? GROUP_NAMES[group]}</p>
            {items.map(({ key, label, Icon, external }) => <span key={key}><Icon size={15} aria-hidden /> {label}{external && <Link2 size={11} aria-hidden />}</span>)}
          </section>
        ))}
      </nav>
    </Card>
  );
}
