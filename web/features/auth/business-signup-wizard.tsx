"use client";

import { trackAction } from "@/features/analytics/track-action";
import Image from "next/image";
import Link from "@/i18n/link";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, BarChart3, CalendarCheck2, Check, ChevronDown, Clock3,
  Loader2, MapPin, Navigation, Search, Sparkles, Store, UserRound, UsersRound, X, Zap, type LucideIcon,
} from "lucide-react";
import { RegisterForm } from "@/features/auth/auth-forms";
import { listDynamicCategories } from "@/features/categories/category-request-repository";
import {
  readBusinessOnboardingDraft,
  writeBusinessOnboardingDraft,
  type BusinessOnboardingDraft,
} from "@/features/businesses/onboarding-draft";
import { CATEGORY_CATALOG, FALLBACK_CATEGORY_IMAGE, categoryImageFor } from "@/components/marketing/category-catalog";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { StorePreview } from "@/features/businesses/store-preview";
import { previewServices } from "@/features/businesses/service-templates";
import { isBusinessSlugAvailable } from "@/features/businesses/starter-setup";
import {
  canonicalCity, finalizeSlug, formatPhoneInput, isValidMobilePhone, isValidSlug,
  remainingTimeLabel, searchKey, slugifyBusinessName, storeDisplayUrl, suggestSlugAlternatives,
} from "@/features/businesses/setup-helpers";
import w from "./business-signup.module.css";
import { CitySelect, DistrictSelect } from "@/components/ui/place-combobox";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";

type Draft = Partial<BusinessOnboardingDraft>;

interface SignupCategory {
  value: string;
  label: string;
  description: string;
  image?: string;
  emoji: string;
  accent: string;
}

const OTHER_CATEGORY: SignupCategory = { value: "diger", label: tk("Diğer"), description: tk("Listede yoksa kendin yaz"), image: FALLBACK_CATEGORY_IMAGE, emoji: "✨", accent: "#475569" };

const BASE_CATEGORIES: SignupCategory[] = CATEGORY_CATALOG.map((item) => ({
  value: item.slug,
  label: item.label,
  description: item.description,
  image: item.image,
  emoji: item.emoji,
  accent: item.accent,
}));

const STEPS = [
  { title: tk("Kategori"), benefit: tk("Hizmet ve vitrin önerileri sana göre gelir") },
  { title: tk("İşletme bilgisi"), benefit: tk("Müşterilerin seni tek linkle bulur") },
  { title: tk("Çalışma şekli"), benefit: tk("Takvim ve yetkiler hazır kurulur") },
  { title: tk("Hesap"), benefit: tk("30 gün ücretsiz, kart gerekmez") },
] as const;
/** Rovi'nin adım adım kısa cesaret mesajları. */
const ROVI_TIPS = [
  tk("Kategorini seç, gerisini ben hazırlarım."),
  tk("Harika! Müşterilerin seni bu adresle bulacak."),
  tk("Neredeyse bitti, iki kısa tercih kaldı."),
  tk("Son adım! 30 gün ücretsiz, kart gerekmez."),
] as const;
/** Adım başına tahmini süre (sn) — "~1 dk kaldı" etiketi için. */
const STEP_SECONDS = [15, 35, 10, 45] as const;
const LAST_STEP = STEPS.length - 1;

const GOALS: Array<{ id: string; title: string; icon: LucideIcon }> = [
  { id: "online-booking", title: tk("Daha fazla online randevu"), icon: CalendarCheck2 },
  { id: "organize", title: tk("Günümü düzenlemek"), icon: Clock3 },
  { id: "customers", title: tk("Müşterilerimi büyütmek"), icon: UsersRound },
  { id: "revenue", title: tk("Gelirimi takip etmek"), icon: BarChart3 },
  { id: "no-show", title: tk("Gelmemeyi azaltmak"), icon: BadgeCheck },
  { id: "brand", title: tk("Markamı öne çıkarmak"), icon: Sparkles },
];

const VOLUMES = [
  { id: "0-5" as const, title: "0–5" },
  { id: "6-10" as const, title: "6–10" },
  { id: "11-20" as const, title: "11–20" },
  { id: "21+" as const, title: "21+" },
];

const MANAGERS = [
  { id: "owner" as const, title: tk("Ben yöneteceğim"), text: tk("Tek kişilik ya da sahibi yönetiyor"), icon: UserRound },
  { id: "team" as const, title: tk("Ben ve ekibim"), text: tk("Çalışan takvimi ve yetkiler"), icon: UsersRound },
];

function businessStepValid(draft: Draft) {
  return Boolean(
    (draft.name?.trim().length ?? 0) >= 2 &&
    isValidSlug(finalizeSlug(draft.slug ?? "")) &&
    (draft.city?.trim().length ?? 0) >= 2 &&
    (draft.district?.trim().length ?? 0) >= 2 &&
    isValidMobilePhone(draft.phone ?? ""),
  );
}

function stepValid(index: number, draft: Draft) {
  if (index === 0) return Boolean(draft.category) && (draft.category !== "diger" || (draft.customCategory?.trim().length ?? 0) >= 2);
  if (index === 1) return businessStepValid(draft);
  if (index === 2) return Boolean(draft.appointmentManagers) && typeof draft.allowOnlineBooking === "boolean";
  return false;
}

function canEnter(index: number, draft: Draft) {
  for (let i = 0; i < index; i++) if (!stepValid(i, draft)) return false;
  return true;
}

export function BusinessSignupWizard() {
  const t = useT();
  const intlLocale = useIntlLocale();
  const [step, setStepState] = useState(0);
  const [furthest, setFurthest] = useState(0);
  // Canlı izleme: işletme kaydındaki adım (süper admin canlı panelinde görünür).
  useEffect(() => { trackAction(`signup:${step}`); }, [step]);
  // Geçiş yönü: ileri adımlar sağdan, geri adımlar soldan kayar.
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const setStep = (index: number) => {
    setDirection(index >= step ? "forward" : "back");
    setStepState(index);
    setFurthest((current) => Math.max(current, index));
  };
  const [draft, setDraft] = useState<Draft>({});
  const [categories, setCategories] = useState<SignupCategory[]>([...BASE_CATEGORIES, OTHER_CATEGORY]);
  const [query, setQuery] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [slugState, setSlugState] = useState<{ slug: string; available: boolean | null } | null>(null);
  const [touched, setTouched] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const ids = { name: `${uid}-name`, slug: `${uid}-slug`, city: `${uid}-city`, district: `${uid}-district`, phone: `${uid}-phone`, other: `${uid}-other` };
  const firstRender = useRef(true);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = readBusinessOnboardingDraft();
      const restored: Draft = {
        appointmentManagers: "owner",
        allowOnlineBooking: true,
        ...stored,
        // Eski taslaklarda adres "seninrandevun.com/<slug>" olarak tutuluyordu; yalnız güvenli hali kalsın.
        slug: stored.slug ? finalizeSlug(stored.slug) : stored.slug,
      };
      setDraft(restored);
      if (restored.category === "diger") setShowOther(true);
      let first = 0;
      while (first < LAST_STEP && stepValid(first, restored)) first++;
      setStepState(first);
      setFurthest(first);
    });
    listDynamicCategories().then((rows) => {
      setCategories((current) => {
        const known = new Set(current.map((item) => item.value));
        const custom: SignupCategory[] = rows.filter((row) => !known.has(row.slug)).map((row) => ({
          value: row.slug, label: row.label, description: tk("Randevulu hizmet işletmesi"), image: row.imageUrl || categoryImageFor(row.slug, row.label), emoji: row.emoji || "📂", accent: "#1f7a4a",
        }));
        return [...current.filter((item) => item.value !== "diger"), ...custom, OTHER_CATEGORY];
      });
    }).catch(() => undefined);
  }, []);

  // Adım değişince başlığa odaklan (ekran okuyucu + klavye).
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest" });
  }, [step]);

  // Mağaza adresi uygunluğu (gecikmeli).
  const finalSlug = finalizeSlug(draft.slug ?? "");
  useEffect(() => {
    if (!isValidSlug(finalSlug)) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      isBusinessSlugAvailable(finalSlug).then((available) => {
        if (!cancelled) setSlugState({ slug: finalSlug, available });
      });
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [finalSlug]);
  const slugChecking = isValidSlug(finalSlug) && slugState?.slug !== finalSlug;
  const slugTaken = slugState?.slug === finalSlug && slugState.available === false;

  function update(values: Draft) {
    setDraft((current) => {
      const next = { ...current, ...values };
      writeBusinessOnboardingDraft(next);
      return next;
    });
  }

  function goTo(index: number) {
    const target = Math.max(0, Math.min(index, LAST_STEP));
    if (target > step && !canEnter(target, draft)) return;
    setTouched(false);
    setStep(target);
  }

  function chooseCategory(value: string) {
    if (value === "diger") {
      update({ category: "diger" });
      setShowOther(true);
      return;
    }
    setShowOther(false);
    const next = { ...draft, category: value, customCategory: undefined };
    update({ category: value, customCategory: undefined });
    window.setTimeout(() => { if (canEnter(1, next)) setStep(1); }, 160);
  }

  function submitOther(event: FormEvent) {
    event.preventDefault();
    if ((draft.customCategory?.trim().length ?? 0) < 2) return;
    goTo(1);
  }

  function submitBusiness(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!businessStepValid(draft) || slugTaken) return;
    update({ slug: finalSlug, city: canonicalCity(draft.city ?? "") });
    setTouched(false);
    setStep(2);
  }

  function submitPreferences(event: FormEvent) {
    event.preventDefault();
    goTo(3);
  }

  const filtered = useMemo(() => {
    const key = searchKey(query);
    if (!key) return categories;
    const hits = categories.filter((item) => item.value !== "diger" && searchKey(`${item.label} ${t(item.label)} ${item.description} ${item.value}`).includes(key));
    return [...hits, OTHER_CATEGORY];
  }, [categories, query, t]);

  const selectedCategory = categories.find((item) => item.value === draft.category);
  const categoryLabel = draft.category === "diger" ? (draft.customCategory?.trim() || t("Diğer")) : selectedCategory ? t(selectedCategory.label) : undefined;
  const progress = Math.round((step / STEPS.length) * 100 + 100 / STEPS.length / 2);
  const remaining = remainingTimeLabel(STEP_SECONDS, step, t);
  const services = previewServices(draft.category ?? "diger");
  const preview = (compact: boolean) => (
    <StorePreview
      compact={compact}
      name={draft.name}
      categoryLabel={categoryLabel}
      image={selectedCategory?.image}
      emoji={selectedCategory?.emoji}
      accent={selectedCategory?.accent}
      city={draft.city}
      district={draft.district}
      slug={finalSlug}
      allowOnlineBooking={draft.allowOnlineBooking !== false}
      services={services}
    />
  );

  const err = (condition: boolean) => touched && condition;
  const nameError = err((draft.name?.trim().length ?? 0) < 2);
  const slugError = err(!isValidSlug(finalSlug)) || slugTaken;
  const cityError = err((draft.city?.trim().length ?? 0) < 2);
  const districtError = err((draft.district?.trim().length ?? 0) < 2);
  const phoneError = err(!isValidMobilePhone(draft.phone ?? ""));

  return (
    <main className={w.stage}>
      <div className={w.blobs} aria-hidden="true"><i /><i /><i /></div>
      <header className={w.header}>
        <Link href="/" aria-label={t("SeninRandevun ana sayfa")} className={w.brand}><Image src="/logo.png" alt="" width={40} height={40} /><b>Senin<span>Randevun</span></b></Link>
        <div className={w.headerBadges}><small>{t("İLK AY ÜCRETSİZ")}</small><span><BadgeCheck size={15} aria-hidden="true" /> {t("Kredi kartı gerekmez")}</span></div>
      </header>

      <section className={w.shell}>
        <aside className={w.rail} aria-label={t("Kurulum adımları")}>
          <div className={w.rovi}>
            <span className={w.roviFloat}><RoviMascot size={72} mood={step === LAST_STEP ? "happy" : "wave"} alt="" /></span>
            <span><small>{t("ROVİ · KURULUM KOÇUN")}</small><b>{t("İşletmeni birlikte hazırlayalım.")}</b></span>
          </div>
          <p key={`tip-${step}`} className={w.roviTip} aria-live="polite">{t(ROVI_TIPS[step]!)}</p>
          <ol className={w.steps}>
            {STEPS.map((item, index) => {
              const done = index !== step && index < LAST_STEP && index < Math.max(step, furthest) && stepValid(index, draft) && canEnter(index, draft);
              const clickable = index !== step && canEnter(index, draft);
              const content = <><i aria-hidden="true">{done ? <Check size={15} /> : index + 1}</i><span><b>{t(item.title)}</b><small>{index === step ? t("Şimdi buradasın") : t(item.benefit)}</small></span></>;
              return (
                <li key={item.title} className={`${index === step ? w.stepActive : ""} ${done ? w.stepDone : ""}`}>
                  {clickable
                    ? <button type="button" onClick={() => goTo(index)} aria-label={done ? t("{step} adımına git (tamamlandı)", { step: t(item.title) }) : t("{step} adımına git", { step: t(item.title) })}>{content}</button>
                    : <div aria-current={index === step ? "step" : undefined}>{content}</div>}
                </li>
              );
            })}
          </ol>
          <div className={w.railNote}><Zap size={17} aria-hidden="true" /><p><b>{t("Ortalama 2 dakika")}</b><span>{t("Hizmetlerini ve çalışma saatlerini hazır şablonlarla tek tıkla ekleyeceksin.")}</span></p></div>
        </aside>

        <div className={w.main}>
          <div className={w.mobileTop}>
            <Link href="/" aria-label={t("SeninRandevun ana sayfa")}><Image src="/logo.png" alt="" width={32} height={32} /><b>SeninRandevun</b></Link>
            <span>{step + 1}/{STEPS.length} · {remaining}</span>
          </div>
          <div className={w.progress} role="progressbar" aria-label={t("Kurulum ilerlemesi")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={t("{total} adımdan {current}. adım, {remaining}", { total: STEPS.length, current: step + 1, remaining })}><i style={{ width: `${progress}%` }} /></div>
          <div className={w.topline}>
            <button type="button" onClick={() => step > 0 ? goTo(step - 1) : history.back()} aria-label={step > 0 ? t("Önceki adım") : t("Geri dön")}><ArrowLeft size={20} /></button>
            <span>{t("ADIM {current} / {total} · {title}", { current: step + 1, total: STEPS.length, title: t(STEPS[step]!.title).toLocaleUpperCase(intlLocale) })}</span>
            <small><Clock3 size={13} aria-hidden="true" /> {remaining}</small>
          </div>

          <div key={`mtip-${step}`} className={w.mobileTip} aria-hidden="true">
            <span className={w.roviFloat}><RoviMascot size={38} mood={step === LAST_STEP ? "happy" : "wave"} alt="" /></span>
            <p>{t(ROVI_TIPS[step]!)}</p>
          </div>

          {step > 0 ? (
            <details className={w.previewMobile}>
              <summary><Store size={16} aria-hidden="true" /><span><b>{t("Mağaza önizlemesi")}</b><small>{storeDisplayUrl(finalSlug)}</small></span><ChevronDown size={18} aria-hidden="true" className={w.chevron} /></summary>
              <div className={w.previewMobileBody}>{preview(true)}</div>
            </details>
          ) : null}

          <div key={step} className={w.step} data-dir={direction}>
            {step === 0 && <>
              <StepHeading refEl={headingRef} eyebrow={t("SENİ TANIYALIM")} title={t("İşletmen hangi kategoride?")} text={t("Doğru kategori; hizmet şablonlarını, çalışma saatlerini ve vitrinini sana göre hazırlar.")} />
              <label className={w.search}>
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">{t("Kategori ara")}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const first = filtered[0];
                    if (!first) return;
                    if (first.value === "diger" && query.trim()) {
                      update({ category: "diger", customCategory: query.trim() });
                      setShowOther(true);
                      return;
                    }
                    chooseCategory(first.value);
                  }}
                  placeholder={t("Kategori ara: berber, pilates, diyetisyen…")}
                  autoComplete="off"
                  enterKeyHint="go"
                />
                {query ? <button type="button" onClick={() => setQuery("")} aria-label={t("Aramayı temizle")}><X size={16} /></button> : null}
              </label>
              <div className={w.categoryGrid}>
                {filtered.map((item, index) => {
                  const selected = draft.category === item.value;
                  return (
                    <button
                      type="button"
                      key={item.value}
                      className={`${w.categoryCard} ${selected ? w.selected : ""}`}
                      aria-pressed={selected}
                      onClick={() => {
                        if (item.value === "diger" && query.trim() && !draft.customCategory) update({ customCategory: query.trim() });
                        chooseCategory(item.value);
                      }}
                      style={{ ["--accent" as string]: item.accent, ["--i" as string]: Math.min(index, 14) }}
                    >
                      <span className={w.categoryMedia} aria-hidden="true">
                        {item.image ? <Image src={item.image} alt="" fill sizes="(max-width: 820px) 46vw, 180px" /> : <em>{item.emoji}</em>}
                      </span>
                      <span className={w.categoryText}><b>{t(item.label)}</b><small>{t(item.description)}</small></span>
                      {selected ? <span className={w.tick} aria-hidden="true"><Check size={14} /></span> : null}
                    </button>
                  );
                })}
              </div>
              {filtered.length === 1 && query.trim() ? <p className={w.hint}>{t("“{query}” için hazır kategori bulamadık. “Diğer”i seçip kendi kategorini yazabilirsin.", { query: query.trim() })}</p> : null}
              {showOther && draft.category === "diger" ? (
                <form className={w.otherForm} onSubmit={submitOther}>
                  <label htmlFor={ids.other}>
                    <span>{t("Kategorini yaz")}</span>
                  </label>
                    <input
                      id={ids.other}
                      aria-describedby={`${ids.other}-hint`}
                      autoFocus
                      value={draft.customCategory ?? ""}
                      onChange={(event) => update({ customCategory: event.target.value.slice(0, 60) })}
                      placeholder={t("Örn: Dövme stüdyosu, fotoğraf stüdyosu")}
                      enterKeyHint="next"
                    />
                    <small id={`${ids.other}-hint`}>{t("Şimdilik “Diğer” ile devam edersin; kategorin ekibimize öneri olarak iletilir ve onaylanınca mağazana eklenir.")}</small>
                  <button type="submit" className={w.primary} disabled={(draft.customCategory?.trim().length ?? 0) < 2}>{t("Devam et")} <ArrowRight size={17} aria-hidden="true" /></button>
                </form>
              ) : null}
            </>}

            {step === 1 && <form onSubmit={submitBusiness} noValidate>
              <StepHeading refEl={headingRef} eyebrow={t("MAĞAZANI OLUŞTURALIM")} title={t("Müşterilerin seni nerede bulsun?")} text={t("Yazdıkça sağdaki vitrinin güncellenir. Tüm bunları daha sonra panelden değiştirebilirsin.")} />
              <div className={w.form}>
                <Field id={ids.name} icon={Store} label={t("İşletme adı")} valid={(draft.name?.trim().length ?? 0) >= 2} error={nameError ? t("İşletme adını yaz (en az 2 karakter).") : undefined}>
                  <input
                    id={ids.name}
                    aria-describedby={`${ids.name}-msg`}
                    value={draft.name ?? ""}
                    onChange={(event) => {
                      const name = event.target.value.slice(0, 100);
                      const autoSlug = !draft.slug || draft.slug === slugifyBusinessName(draft.name ?? "") || finalizeSlug(draft.slug) === finalizeSlug(slugifyBusinessName(draft.name ?? ""));
                      update({ name, ...(autoSlug ? { slug: finalizeSlug(slugifyBusinessName(name)) } : {}) });
                    }}
                    placeholder={selectedCategory && selectedCategory.value !== "diger" ? t("Örn: Şehrin En İyi {category}", { category: t(selectedCategory.label) }) : t("İşletmenin adı")}
                    autoComplete="organization"
                    enterKeyHint="next"
                    aria-invalid={nameError || undefined}
                  />
                </Field>
                <Field id={ids.slug} label={t("Online randevu adresin")} valid={slugState?.slug === finalSlug && slugState.available === true} error={slugTaken ? t("Bu adres alınmış. Aşağıdaki önerilerden birini seçebilirsin.") : slugError ? t("En az 3 karakter; harf, rakam ve tire kullan.") : undefined}
                  extra={slugTaken ? (
                    <div className={w.suggestions} aria-label={t("Önerilen adresler")}>
                      {suggestSlugAlternatives(finalSlug, draft.district, draft.city).map((option) => (
                        <button type="button" key={option} onClick={() => update({ slug: option })}>{option}</button>
                      ))}
                    </div>
                  ) : null}
                  hint={!slugError ? (slugChecking ? <><Loader2 size={12} className={w.spin} aria-hidden="true" /> {t("Kontrol ediliyor…")}</> : slugState?.slug === finalSlug && slugState.available ? <><Check size={12} aria-hidden="true" /> {t("Bu adres senin olabilir")}</> : t("Türkçe karakterler otomatik olarak güvenli bağlantıya çevrilir.")) : undefined}>
                  <div className={`${w.affix} ${w.slugAffix}`}>
                    <b>seninrandevun.com/isletme/</b>
                    <input
                      id={ids.slug}
                      aria-describedby={`${ids.slug}-msg`}
                      value={draft.slug ?? ""}
                      onChange={(event) => update({ slug: slugifyBusinessName(event.target.value) })}
                      onBlur={() => update({ slug: finalSlug })}
                      placeholder={t("isletme-adin")}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      aria-invalid={slugError || undefined}
                    />
                  </div>
                </Field>
                <div className={w.row}>
                  <Field id={ids.city} icon={MapPin} label={t("Şehir")} valid={(draft.city?.trim().length ?? 0) >= 2} error={cityError ? t("Şehir seç.") : undefined}>
                    <CitySelect
                      id={ids.city}
                      describedBy={`${ids.city}-msg`}
                      value={draft.city ?? ""}
                      onChange={(city) => update(city === draft.city ? { city } : { city, district: "" })}
                      placeholder={t("Şehir seç veya yaz")}
                      invalid={cityError}
                    />
                  </Field>
                  <Field id={ids.district} icon={Navigation} label={t("İlçe")} valid={(draft.district?.trim().length ?? 0) >= 2} error={districtError ? t("İlçeni seç.") : undefined}>
                    <DistrictSelect
                      id={ids.district}
                      city={draft.city ?? ""}
                      describedBy={`${ids.district}-msg`}
                      value={draft.district ?? ""}
                      onChange={(district) => update({ district })}
                      placeholder={t("İlçe seç veya yaz")}
                      invalid={districtError}
                    />
                  </Field>
                </div>
                <Field id={ids.phone} label={t("İşletme cep telefonu")} valid={isValidMobilePhone(draft.phone ?? "")} error={phoneError ? t("5XX XXX XX XX biçiminde 10 haneli cep numarası gir.") : undefined}>
                  <div className={w.affix}>
                    <b>+90</b>
                    <input
                      id={ids.phone}
                      aria-describedby={`${ids.phone}-msg`}
                      type="tel"
                      inputMode="tel"
                      value={formatPhoneInput(draft.phone ?? "")}
                      onChange={(event) => update({ phone: formatPhoneInput(event.target.value) })}
                      placeholder="5XX XXX XX XX"
                      autoComplete="tel-national"
                      enterKeyHint="done"
                      aria-invalid={phoneError || undefined}
                    />
                  </div>
                </Field>
              </div>
              <StepAction hint={t("Enter ile de devam edebilirsin")}>{t("Devam et")} <ArrowRight size={17} aria-hidden="true" /></StepAction>
            </form>}

            {step === 2 && <form onSubmit={submitPreferences}>
              <StepHeading refEl={headingRef} eyebrow={t("ÇALIŞMA ŞEKLİN")} title={t("Randevuların nasıl işlesin?")} text={t("İki kısa tercih. İkisini de sonradan panelden değiştirebilirsin.")} />
              <fieldset className={w.choiceGroup}>
                <legend>{t("Randevuları kim yönetecek?")}</legend>
                <div className={w.choiceRow}>
                  {MANAGERS.map(({ id, title, text, icon: Icon }) => (
                    <button type="button" key={id} className={`${w.choice} ${draft.appointmentManagers === id ? w.selected : ""}`} aria-pressed={draft.appointmentManagers === id} onClick={() => update({ appointmentManagers: id })}>
                      <i aria-hidden="true"><Icon size={22} /></i><span><b>{t(title)}</b><small>{t(text)}</small></span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className={w.choiceGroup}>
                <legend>{t("Müşteriler online randevu alabilsin mi?")}</legend>
                <div className={w.choiceRow}>
                  <button type="button" className={`${w.choice} ${draft.allowOnlineBooking !== false ? w.selected : ""}`} aria-pressed={draft.allowOnlineBooking !== false} onClick={() => update({ allowOnlineBooking: true })}>
                    <i aria-hidden="true"><CalendarCheck2 size={22} /></i><span><b>{t("Evet, 7/24 alsınlar")} <em>{t("ÖNERİLEN")}</em></b><small>{t("Mağaza sayfandan uygun saati seçerler")}</small></span>
                  </button>
                  <button type="button" className={`${w.choice} ${draft.allowOnlineBooking === false ? w.selected : ""}`} aria-pressed={draft.allowOnlineBooking === false} onClick={() => update({ allowOnlineBooking: false })}>
                    <i aria-hidden="true"><UserRound size={22} /></i><span><b>{t("Şimdilik ben ekleyeyim")}</b><small>{t("Randevuları sadece panelden oluşturursun")}</small></span>
                  </button>
                </div>
              </fieldset>
              <details className={w.optional} open={Boolean(draft.goals?.length || draft.dailyAppointmentVolume) || undefined}>
                <summary><Sparkles size={16} aria-hidden="true" /><span><b>{t("Biraz daha anlat")}</b><small>{t("İsteğe bağlı, atlayabilirsin · Rovi önerilerini buna göre sıralar")}</small></span><ChevronDown size={18} aria-hidden="true" className={w.chevron} /></summary>
                <div className={w.optionalBody}>
                  <p>{t("Öncelikli hedeflerin")}</p>
                  <div className={w.chips}>
                    {GOALS.map(({ id, title, icon: Icon }) => {
                      const selected = draft.goals?.includes(id) ?? false;
                      return <button type="button" key={id} className={selected ? w.chipOn : ""} aria-pressed={selected} onClick={() => update({ goals: selected ? draft.goals?.filter((item) => item !== id) : [...(draft.goals ?? []), id] })}><Icon size={15} aria-hidden="true" />{t(title)}</button>;
                    })}
                  </div>
                  <p>{t("Günde ortalama kaç randevu?")}</p>
                  <div className={w.chips}>
                    {VOLUMES.map(({ id, title }) => {
                      const selected = draft.dailyAppointmentVolume === id;
                      return <button type="button" key={id} className={selected ? w.chipOn : ""} aria-pressed={selected} onClick={() => update({ dailyAppointmentVolume: selected ? undefined : id })}>{title}</button>;
                    })}
                  </div>
                </div>
              </details>
              <StepAction hint={t("Enter ile de devam edebilirsin")}>{t("Hesabımı oluşturmaya geç")} <ArrowRight size={17} aria-hidden="true" /></StepAction>
            </form>}

            {step === 3 && <>
              <StepHeading refEl={headingRef} eyebrow={t("SON ADIM")} title={t("Çalışma alanını güvene al.")} text={t("Hesabını oluştur; e-postanı doğruladıktan sonra hizmetlerini ve saatlerini hazır şablonlarla tek ekranda tamamlayacaksın.")} />
              <div className={`${w.summary} ${w.summaryReady}`}>
                <span className={w.summaryIcon} aria-hidden="true">{selectedCategory?.emoji ?? "🏪"}</span>
                <p><b>{draft.name}</b><small>{categoryLabel} · {[draft.district, draft.city].filter(Boolean).join(", ")}</small><small className={w.summaryUrl}>{storeDisplayUrl(finalSlug)}</small></p>
                <button type="button" onClick={() => goTo(1)}>{t("Düzenle")}</button>
              </div>
              <div className={`${w.register} signup-register-embed`}><RegisterForm accountType="business" embedded /></div>
            </>}
          </div>
        </div>

        <aside className={w.previewPanel} aria-label={t("Canlı mağaza önizlemesi")}>
          <p className={w.previewLabel}><span aria-hidden="true" className={w.liveDot} /> {t("Canlı önizleme")}</p>
          {preview(false)}
          <p className={w.previewNote}>{t("Örnek hizmetler kategorine göre öneridir; bir sonraki ekranda fiyatlarını düzenleyip seçeceksin.")}</p>
        </aside>
      </section>
      <footer className={w.footer}><span><BadgeCheck size={14} aria-hidden="true" /> {t("30 gün tüm özellikler açık")}</span><span><Zap size={14} aria-hidden="true" /> {t("Birkaç dakikada hazır")}</span><Link href="/isletmeler/giris">{t("Zaten hesabın var mı? Giriş yap")}</Link></footer>
    </main>
  );
}

function StepHeading({ eyebrow, title, text, refEl }: { eyebrow: string; title: string; text: string; refEl: RefObject<HTMLDivElement | null> }) {
  return <div className={w.heading} ref={refEl} tabIndex={-1}><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>;
}

function Field({ id, label, error, hint, children, extra, icon: Icon, valid }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode; extra?: ReactNode; icon?: LucideIcon; valid?: boolean }) {
  return (
    <div className={`${w.field} ${valid && !error ? w.fieldValid : ""}`}>
      <label className={w.fieldLabel} htmlFor={id}>{label}{valid && !error ? <span className={w.validTick} aria-hidden="true"><Check size={12} strokeWidth={3} /></span> : null}</label>
      {Icon ? <div className={w.control}><Icon className={w.controlIcon} size={18} aria-hidden="true" />{children}</div> : children}
      {error ? <small id={`${id}-msg`} className={w.fieldError} role="alert">{error}</small> : hint ? <small id={`${id}-msg`} className={w.fieldHint}>{hint}</small> : null}
      {extra}
    </div>
  );
}

function StepAction({ children, secondary, hint }: { children: ReactNode; secondary?: ReactNode; hint?: string }) {
  return (
    <div className={w.actions}>
      {hint ? <small className={w.enterHint}>{hint} <kbd>↵</kbd></small> : null}
      {secondary}
      <button type="submit" className={`${w.primary} ${w.primaryShine}`}>{children}</button>
    </div>
  );
}
