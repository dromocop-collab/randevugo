"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, Building2, CirclePlus, Clock3, Crown, ExternalLink, GitBranch, Hash,
  Info, MapPin, Network, ShieldCheck, Store, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBusinessContext } from "@/features/businesses/business-context";
import {
  createBusinessFromOnboarding,
  listBusinessWorkingHours,
} from "@/features/businesses/business-repository";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { getPlanFeatures } from "@/constants/plans";
import { SECTOR_TEMPLATES } from "@/constants/service-category-templates";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import {
  Badge, Button, Callout, DashPage, EmptyState, Field, FormGrid, Input, PageHeader, SearchField, SegmentedControl, Sheet,
  StatCard, StatGrid, Switch, Toolbar, inputClassName, type DashTone,
} from "@/components/dashboard/ui";
import { cx, matchesSearch, ws } from "../_workspace/kit";
import styles from "./branches.module.css";
import { CitySelect, DistrictSelect } from "@/components/ui/place-combobox";

const MAX_BRANCHES = getPlanFeatures().maxBranches;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function slugify(value: string) {
  return value.toLocaleLowerCase("tr-TR")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const statusCopy: Record<string, { label: string; tone: DashTone }> = {
  active: { label: "Yayında", tone: "green" },
  pending_review: { label: "Süper Admin onayında", tone: "amber" },
  rejected: { label: "Başvuru reddedildi", tone: "red" },
  suspended: { label: "Askıya alındı", tone: "neutral" },
};

type BranchFilter = "all" | "live" | "pending" | "other";
type FormState = { name: string; slug: string; phone: string; email: string; city: string; district: string; address: string };
type FormKey = keyof FormState;

function sectorLabel(category?: string) {
  if (!category) return "—";
  const canonical = canonicalBusinessCategory(category);
  return SECTOR_TEMPLATES[canonical]?.label ?? category;
}

export default function BranchesPage() {
  const { user } = useAuth();
  const { businesses, businessId, setBusinessId, refreshBusinesses, access } = useBusinessContext();
  const activeBusiness = businesses.find((item) => item.id === businessId) ?? businesses[0];
  const organizationId = activeBusiness?.organizationId;
  const branches = useMemo(() => {
    const rows = organizationId
      ? businesses.filter((item) => item.organizationId === organizationId)
      : businesses.filter((item) => item.ownerUid === activeBusiness?.ownerUid);
    return [...rows].sort((a, b) => Number(a.branchNumber ?? a.storePosition ?? 999) - Number(b.branchNumber ?? b.storePosition ?? 999));
  }, [activeBusiness?.ownerUid, businesses, organizationId]);
  const headquarters = branches.find((item) => item.isHeadquarters) ?? branches[0];
  const isOwner = access?.role === "owner";
  const limitReached = branches.length >= MAX_BRANCHES;
  const canCreate = isOwner && !limitReached;
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copyHours, setCopyHours] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BranchFilter>("all");
  const [touched, setTouched] = useState<Partial<Record<FormKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const emptyForm = (): FormState => ({
    name: "", slug: "", phone: activeBusiness?.phone ?? "", email: activeBusiness?.email ?? "",
    city: activeBusiness?.city ?? "", district: "", address: "",
  });
  const [form, setForm] = useState<FormState>(emptyForm);

  const liveCount = branches.filter((item) => item.status === "active" && !item.isSuspended).length;
  const pendingCount = branches.filter((item) => item.status === "pending_review").length;
  const otherCount = branches.length - liveCount - pendingCount;
  const usedSlugs = useMemo(() => new Set(businesses.map((item) => item.slug).filter(Boolean)), [businesses]);

  const visibleBranches = branches.filter((branch) => {
    const live = branch.status === "active" && !branch.isSuspended;
    const pending = branch.status === "pending_review";
    if (filter === "live" && !live) return false;
    if (filter === "pending" && !pending) return false;
    if (filter === "other" && (live || pending)) return false;
    return matchesSearch(search, branch.name, branch.city, branch.district, branch.branchCode, branch.slug);
  });

  const errors: Partial<Record<FormKey, string>> = {};
  if (form.name.trim().length < 2) errors.name = "Şube adı en az 2 karakter olmalı.";
  if (slugify(form.slug).length < 3) errors.slug = "Mağaza adresi en az 3 karakter olmalı.";
  else if (usedSlugs.has(slugify(form.slug))) errors.slug = "Bu adres hesabınızdaki başka bir şubede kullanılıyor.";
  if (form.phone.replace(/\D/g, "").length < 10) errors.phone = "Geçerli bir telefon numarası girin.";
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Geçerli bir e-posta adresi girin.";
  if (!form.city.trim()) errors.city = "Şehir zorunludur.";
  if (!form.district.trim()) errors.district = "İlçe zorunludur.";
  if (form.address.trim().length < 5) errors.address = "Açık adresi yazın.";
  const errorFor = (key: FormKey) => (submitted || touched[key]) ? errors[key] : undefined;
  const errorCount = Object.keys(errors).length;

  function setField(key: FormKey, value: string) {
    setForm((current) => ({ ...current, [key]: value, ...(key === "name" && !touched.slug ? { slug: slugify(value) } : {}) }));
  }

  function touch(key: FormKey) {
    setTouched((current) => ({ ...current, [key]: true }));
  }

  function openForm() {
    setForm(emptyForm());
    setTouched({});
    setSubmitted(false);
    setCopyHours(true);
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!user || !activeBusiness || !headquarters || !canCreate || busy) return;
    if (errorCount) {
      toast.error("Formdaki işaretli alanları kontrol edin.");
      return;
    }
    setBusy(true);
    try {
      const workingHours = copyHours ? await listBusinessWorkingHours(activeBusiness.id) : [];
      const result = await createBusinessFromOnboarding({
        ownerUid: user.uid,
        parentBusinessId: headquarters.id,
        name: form.name.trim(),
        slug: slugify(form.slug),
        category: activeBusiness.category,
        phone: form.phone,
        email: form.email,
        city: form.city,
        district: form.district,
        address: form.address,
        description: activeBusiness.description,
        logoUrl: activeBusiness.logoUrl,
        coverUrl: activeBusiness.coverUrl,
        workingHours,
      });
      refreshBusinesses();
      setBusinessId(result.businessId);
      setShowForm(false);
      toast.success("Şube oluşturuldu ve Süper Admin onayına gönderildi.");
    } catch (error) {
      toast.error(userFacingError(error, "Şube oluşturulamadı. Bilgileri kontrol edip yeniden deneyin."));
    } finally {
      setBusy(false);
    }
  }

  const createButton = canCreate
    ? <Button variant="bright" icon={CirclePlus} onClick={openForm}>Yeni şube ekle</Button>
    : null;

  return (
    <DashPage>
      <PageHeader
        eyebrow="Firma ve şube ağı"
        icon={Network}
        title={activeBusiness?.organizationName ?? headquarters?.name ?? "Şube yönetimi"}
        description="Her şubenin randevusu, ekibi, hizmeti ve çalışma saati ayrıdır. Firma sahipliği, paket ve onay süreci merkezden izlenir."
        actions={createButton}
        meta={<>
          <Badge tone="accent" icon={Store}>{branches.length} / {MAX_BRANCHES} şube</Badge>
          {pendingCount ? <Badge tone="amber" icon={Clock3} pulse>{pendingCount} onay bekliyor</Badge> : null}
        </>}
      />

      <StatGrid columns={4}>
        <StatCard label="Merkez şube" value={<span className={ws.truncate}>{headquarters?.name ?? "Belirleniyor"}</span>} icon={Crown} tone="amber" />
        <StatCard label="Yayında" value={liveCount} hint="Müşterilere açık" icon={BadgeCheck} tone="green" />
        <StatCard label="Onay bekleyen" value={pendingCount} hint="Süper Admin incelemesinde" icon={ShieldCheck} tone="amber" />
        <StatCard label="Paket kapasitesi" value={`${branches.length} / ${MAX_BRANCHES}`} progress={(branches.length / MAX_BRANCHES) * 100} icon={GitBranch} accent />
      </StatGrid>

      {!isOwner && (
        <Callout tone="blue" icon={Info} title="Şube açma yetkisi firma sahibine aittir.">
          Mevcut yetkinizle erişebildiğiniz şubeler arasında geçiş yapabilirsiniz.
        </Callout>
      )}
      {isOwner && limitReached && (
        <Callout tone="amber" title={`Paketinizdeki ${MAX_BRANCHES} şube sınırına ulaştınız.`} action={<Button size="sm" variant="secondary" href="/dashboard/abonelik">Paketi incele</Button>}>
          Yeni şube açmak için abonelik sayfasından destek alabilirsiniz.
        </Callout>
      )}

      {branches.length > 1 && (
        <Toolbar>
          <SearchField value={search} onChange={setSearch} placeholder="Şube, şehir veya kod ara" />
          <SegmentedControl
            ariaLabel="Şube durumu"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Tümü", count: branches.length },
              { value: "live", label: "Yayında", count: liveCount },
              { value: "pending", label: "Onayda", count: pendingCount },
              ...(otherCount ? [{ value: "other" as const, label: "Diğer", count: otherCount }] : []),
            ]}
          />
        </Toolbar>
      )}

      {branches.length === 0 ? (
        <EmptyState mascot="wave" title="Henüz şube yok" description="İlk işletmeniz merkez şube olarak listelenir. Yeni şube açtığınızda burada görünür." action={createButton} />
      ) : visibleBranches.length === 0 ? (
        <EmptyState mascot="thinking" compact title="Eşleşen şube yok" description="Aramayı veya filtreyi değiştirmeyi deneyin." action={<Button variant="soft" onClick={() => { setSearch(""); setFilter("all"); }}>Filtreleri temizle</Button>} />
      ) : (
        <section className={styles.grid} aria-label="Şubeler">
          {visibleBranches.map((branch) => {
            const status = statusCopy[branch.isSuspended ? "suspended" : branch.status] ?? statusCopy.suspended;
            const selected = branch.id === activeBusiness?.id;
            const isHq = branch.isHeadquarters || branch.id === headquarters?.id;
            return (
              <article key={branch.id} className={cx(styles.card, selected && styles.cardSelected)}>
                <header className={styles.cardHead}>
                  <span className={cx(styles.cardIcon, isHq && styles.cardIconHq)} aria-hidden="true">{isHq ? <Crown size={20} /> : <Store size={20} />}</span>
                  <div className={styles.cardTitle}>
                    <h2>{branch.name}</h2>
                    <p><MapPin size={13} aria-hidden="true" />{[branch.district, branch.city].filter(Boolean).join(", ") || "Konum eklenmemiş"}</p>
                  </div>
                </header>
                <div className={ws.row}>
                  {isHq ? <Badge size="sm" tone="accent" icon={Crown}>Merkez</Badge> : null}
                  <Badge size="sm" tone={status.tone} dot>{status.label}</Badge>
                  {selected ? <Badge size="sm" tone="green" icon={BadgeCheck}>Şu an yönetiliyor</Badge> : null}
                </div>
                <dl className={styles.meta}>
                  <div><dt><Hash size={12} aria-hidden="true" /> Şube kodu</dt><dd>{branch.branchCode ?? `ŞUBE-${branch.storePosition ?? 1}`}</dd></div>
                  <div><dt><Tag size={12} aria-hidden="true" /> Sektör</dt><dd>{sectorLabel(branch.category)}</dd></div>
                </dl>
                <footer className={styles.cardActions}>
                  {selected
                    ? <Button variant="soft" icon={BadgeCheck} disabled>Seçili çalışma alanı</Button>
                    : <Button variant="primary" trailingIcon={ArrowRight} onClick={() => setBusinessId(branch.id)}>Bu şubeyi yönet</Button>}
                  {branch.slug ? <Button variant="secondary" trailingIcon={ExternalLink} href={`/isletme/${branch.slug}`} external>Mağazayı gör</Button> : null}
                </footer>
              </article>
            );
          })}
        </section>
      )}

      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        dismissible={!busy}
        placement="side"
        size="lg"
        title="Firma ağına şube ekle"
        description="Şube ayrı bir operasyon alanı olarak açılır ve yayın öncesi Süper Admin onayına gider."
        footer={<>
          {submitted && errorCount ? <p className={cx(ws.footNote, ws.footNoteError)}>{errorCount} alan düzeltilmeli</p> : null}
          <Button variant="ghost" disabled={busy} onClick={() => setShowForm(false)}>Vazgeç</Button>
          <Button type="submit" form="branch-form" variant="primary" loading={busy} icon={Building2}>Oluştur ve onaya gönder</Button>
        </>}
      >
        <form id="branch-form" className={ws.stack} onSubmit={submit} noValidate>
          <FormGrid>
            <Field label="Şube adı" error={errorFor("name")}>
              <Input data-autofocus value={form.name} onChange={(e) => setField("name", e.target.value)} onBlur={() => touch("name")} placeholder="Kadıköy Şubesi" aria-invalid={Boolean(errorFor("name"))} className={cx(errorFor("name") && styles.invalid)} />
            </Field>
            <Field label="Mağaza adresi" error={errorFor("slug")} hint={slugify(form.slug) ? `seninrandevun.com/isletme/${slugify(form.slug)}` : "Müşterilerin şubeye ulaşacağı bağlantı"}>
              <Input value={form.slug} onChange={(e) => { touch("slug"); setField("slug", slugify(e.target.value)); }} placeholder="marka-kadikoy" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={Boolean(errorFor("slug"))} className={cx(errorFor("slug") && styles.invalid)} />
            </Field>
            <Field label="Telefon" error={errorFor("phone")}>
              <Input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} onBlur={() => touch("phone")} placeholder="05xx xxx xx xx" aria-invalid={Boolean(errorFor("phone"))} className={cx(errorFor("phone") && styles.invalid)} />
            </Field>
            <Field label="Şube e-postası" error={errorFor("email")}>
              <Input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setField("email", e.target.value)} onBlur={() => touch("email")} aria-invalid={Boolean(errorFor("email"))} className={cx(errorFor("email") && styles.invalid)} />
            </Field>
            <Field label="Şehir" error={errorFor("city")}>
              <CitySelect id="branch-city" value={form.city} onChange={(city) => { if (city !== form.city) setField("district", ""); setField("city", city); touch("city"); }} placeholder="Şehir seç veya yaz" invalid={Boolean(errorFor("city"))} inputClassName={cx(inputClassName, errorFor("city") && styles.invalid)} />
            </Field>
            <Field label="İlçe" error={errorFor("district")}>
              <DistrictSelect id="branch-district" city={form.city} value={form.district} onChange={(district) => { setField("district", district); touch("district"); }} placeholder="İlçe seç veya yaz" invalid={Boolean(errorFor("district"))} inputClassName={cx(inputClassName, errorFor("district") && styles.invalid)} />
            </Field>
            <Field label="Açık adres" wide error={errorFor("address")}>
              <Input value={form.address} onChange={(e) => setField("address", e.target.value)} onBlur={() => touch("address")} autoComplete="street-address" aria-invalid={Boolean(errorFor("address"))} className={cx(errorFor("address") && styles.invalid)} />
            </Field>
          </FormGrid>
          <div className={styles.switchBox}>
            <Switch checked={copyHours} onChange={setCopyHours} label="Seçili şubenin çalışma saatlerini kopyala" description="Kurulumdan sonra yeni şubeye özel saatleri değiştirebilirsiniz." />
          </div>
          <Callout tone="amber" icon={ShieldCheck} title="Onay süreci">
            Yeni şube taslak olarak oluşturulur. Süper Admin adres, kategori ve firma bağlantısını onayladıktan sonra müşterilere açılır.
          </Callout>
        </form>
      </Sheet>
    </DashPage>
  );
}
