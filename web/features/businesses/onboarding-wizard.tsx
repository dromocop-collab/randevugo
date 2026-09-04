"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { createBusinessFromOnboarding, updateBusiness } from "@/features/businesses/business-repository";
import { uploadBusinessImage } from "@/lib/firebase/upload";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { firstErrorMessage, onboardingSchema } from "@/lib/validation/schemas";
import { listDynamicCategories } from "@/features/categories/category-request-repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const DEFAULT_CATEGORIES = [
  { value: "kuafor", label: "Kuaför" },
  { value: "berber", label: "Berber" },
  { value: "guzellik", label: "Güzellik Merkezi" },
  { value: "nail", label: "Nail Studio" },
  { value: "spor", label: "Spor / Personal Training" },
  { value: "danismanlik", label: "Danışmanlık" },
  { value: "veteriner", label: "Veteriner" },
  { value: "yazilim", label: "Yazılım" },
  { value: "servis", label: "Servis İşletmesi" },
  { value: "saglik", label: "Sağlık" },
  { value: "egitim", label: "Eğitim" },
  { value: "diger", label: "Diğer" },
];

const businessTypes = [
  { value: "", label: "Seçiniz" },
  { value: "kadin", label: "Kadın" },
  { value: "erkek", label: "Erkek" },
  { value: "unisex", label: "Unisex" },
];

const STEP_GUIDANCE = [
  { title: "Markanı doğru konumlandır", text: "Adın ve ana kategorin keşfet ekranındaki ilk izlenimi oluşturur.", items: ["Benzersiz mağaza adresi", "Doğru müşteri segmenti", "SEO uyumlu profil başlangıcı"] },
  { title: "Müşterilerin sana ulaşsın", text: "İletişim ve konum bilgileri randevu güvenini yükseltir.", items: ["Türkiye telefon doğrulaması", "Şehir ve ilçe eşleşmesi", "Harita için hazır adres"] },
  { title: "Vitrinini güçlendir", text: "Net logo, kapak ve açıklama mağazanı profesyonel gösterir.", items: ["Mobil uyumlu görseller", "Akılda kalan profil adresi", "600 karakterlik marka hikâyesi"] },
  { title: "Yayına hazırsın", text: "Bilgilerini son kez kontrol et; kurulum güvenli şekilde tamamlanacak.", items: ["İlk 12 ay ücretsiz kullanım", "Online randevu altyapısı", "Çoklu mağaza onay güvencesi"] },
] as const;

const defaultWorkingHours = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
  day,
  isOpen: day !== 0,
  start: "09:00",
  end: "19:00",
  breakStart: "13:00",
  breakEnd: "14:00",
}));

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function mapOnboardingError(error: unknown): string {
  const code = (error as FirebaseError | undefined)?.code;
  if (code === "permission-denied") {
    return "Firestore yetkisi reddedildi. Sayfayı yenileyip tekrar deneyin.";
  }
  return (error as Error | undefined)?.message ?? "Kurulum sırasında beklenmeyen bir hata oluştu.";
}

interface StepConfig {
  title: string;
  subtitle: string;
  icon: string;
}

const STEPS: StepConfig[] = [
  { title: "İşletme Bilgileri", subtitle: "Temel bilgilerinizi girin", icon: "🏢" },
  { title: "Konum & İletişim", subtitle: "Müşterileriniz sizi bulsun", icon: "📍" },
  { title: "Profil Detayları", subtitle: "İşletmenizi öne çıkarın", icon: "✨" },
  { title: "Son Adım", subtitle: "Kontrol edin ve başlayın", icon: "🚀" },
];

export function OnboardingWizard() {
  const { user } = useAuth();
  const { setBusinessId } = useBusiness();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Fetch dynamic categories from Firestore
  useEffect(() => {
    listDynamicCategories()
      .then((dynamic) => {
        const existing = new Set(DEFAULT_CATEGORIES.map((c) => c.value));
        const merged = [...DEFAULT_CATEGORIES.filter((c) => c.value !== "diger")];
        dynamic.forEach((dc) => {
          if (!existing.has(dc.slug)) {
            merged.push({ value: dc.slug, label: dc.label });
          }
        });
        merged.push({ value: "diger", label: "Diğer" });
        setCategories(merged);
      })
      .catch(() => {});
  }, []);

  // Step 1
  const [name, setName] = useState("");
  const [category, setCategory] = useState("kuafor");
  const [businessType, setBusinessType] = useState("");

  // Step 2
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  // Step 3
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const computedSlug = useMemo(() => slugify(name), [name]);
  const finalSlug = slug || computedSlug;

  function validateStep(s: number): boolean {
    if (s === 0) {
      if (!name.trim()) { toast.error("İşletme adı zorunludur."); return false; }
      return true;
    }
    if (s === 1) {
      if (!phone.trim()) { toast.error("Telefon zorunludur."); return false; }
      if (!email.trim()) { toast.error("E-posta zorunludur."); return false; }
      if (!address.trim()) { toast.error("Adres zorunludur."); return false; }
      if (!city.trim()) { toast.error("Şehir zorunludur."); return false; }
      if (!district.trim()) { toast.error("İlçe zorunludur."); return false; }
      return true;
    }
    return true;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((prev) => Math.max(prev - 1, 0));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    const validated = onboardingSchema.safeParse({
      name,
      category,
      phone,
      email,
      address,
      city,
      district,
      logoUrl,
      coverUrl,
      slug: finalSlug,
    });

    if (!validated.success) {
      toast.error(firstErrorMessage(validated.error));
      return;
    }

    setLoading(true);

    try {
      const payload = validated.data;

      const creation = await createBusinessFromOnboarding({
        ownerUid: user.uid,
        name: payload.name,
        category: payload.category,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        city: payload.city,
        district: payload.district,
        logoUrl: payload.logoUrl && payload.logoUrl !== "pending-upload" ? payload.logoUrl : undefined,
        coverUrl: payload.coverUrl && payload.coverUrl !== "pending-upload" ? payload.coverUrl : undefined,
        description,
        slug: payload.slug,
        workingHours: defaultWorkingHours,
      });
      const businessId = creation.businessId;

      // Upload images after business is created
      const imageUpdates: Record<string, string> = {};
      if (logoFile) {
        try {
          imageUpdates.logoUrl = await uploadBusinessImage(businessId, "logo", logoFile);
        } catch { /* ignore upload fail */ }
      }
      if (coverFile) {
        try {
          imageUpdates.coverUrl = await uploadBusinessImage(businessId, "cover", coverFile);
        } catch { /* ignore upload fail */ }
      }
      if (Object.keys(imageUpdates).length > 0) {
        try {
          await updateBusiness(businessId, imageUpdates);
        } catch { /* non-critical */ }
      }

      setBusinessId(businessId);
      toast.success(`🏪 ${creation.storePosition}. mağazan oluşturuldu ve süper admin onayına gönderildi.`);
      router.push("/dashboard");
    } catch (error) {
      toast.error(mapOnboardingError(error));
    } finally {
      setLoading(false);
    }
  }

  const categoryLabel = categories.find((c) => c.value === category)?.label ?? category;

  return (
    <div className="onboarding-wizard mx-auto max-w-4xl">
      {/* Header */}
      <div className="onboarding-heading mb-8 text-center">
        <div className="onboarding-logo mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl">
          🚀
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">İşletme Kurulumu</h1>
        <p className="mt-1 text-sm text-[var(--text-3)]">
          Birkaç adımda online randevuya hazır olun
        </p>
      </div>

      {/* Step Indicator */}
      <div className="onboarding-progress mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => (
            <div key={s.title} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (idx < step) setStep(idx);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    idx < step
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 cursor-pointer"
                      : idx === step
                        ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 scale-110"
                        : "bg-[var(--surface-3)] text-[var(--text-3)]"
                  }`}
                >
                  {idx < step ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{s.icon}</span>
                  )}
                </button>
                <span className={`mt-2 hidden text-[10px] font-medium sm:block ${
                  idx <= step ? "text-[var(--text-1)]" : "text-[var(--text-3)]"
                }`}>
                  {s.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx < step ? "bg-emerald-500" : "bg-[var(--surface-3)]"
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Card */}
      <form onSubmit={submit}>
        <div className="onboarding-card overflow-hidden rounded-[28px] border border-[var(--border)] bg-white/90 shadow-xl">
          {/* Step Header */}
          <div className="onboarding-card-head border-b border-[var(--border)] px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{STEPS[step]!.icon}</span>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">{STEPS[step]!.title}</h2>
                <p className="text-sm text-[var(--text-3)]">{STEPS[step]!.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="onboarding-layout">
          {/* Step Content */}
          <div key={step} className="onboarding-step-content p-6 sm:p-8">
            {/* Step 1: İşletme Bilgileri */}
            {step === 0 && (
              <div className="space-y-5">
                <Input
                  label="İşletme Adı *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Güzel Saçlar Kuaförü"
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Kategori *"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={categories}
                  />
                  <Select
                    label="İşletme Tipi"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    options={businessTypes}
                  />
                </div>
                {name && (
                  <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
                    <p className="text-xs text-[var(--text-3)]">Profil URL&apos;niz:</p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--accent)]">
                      seninrandevun.com/isletme/<span className="font-bold">{computedSlug || "..."}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Konum & İletişim */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Telefon *"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    required
                  />
                  <Input
                    label="E-posta *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@isletmeniz.com"
                    required
                  />
                </div>
                <Input
                  label="Adres *"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Cadde / Sokak / No"
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--text-1)]">Şehir *</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text-1)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    >
                      <option value="">Şehir seçiniz...</option>
                      {[
                        "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara",
                        "Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman",
                        "Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa",
                        "Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne",
                        "Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun",
                        "Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir",
                        "Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri",
                        "Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya",
                        "Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde",
                        "Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt",
                        "Sinop","Sivas","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli",
                        "Uşak","Van","Yalova","Yozgat","Zonguldak",
                      ].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="İlçe *"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Kadıköy"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 3: Profil Detayları */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-2)]">
                    İşletme Açıklaması
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none transition hover:bg-[var(--field-bg-hover)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                    placeholder="İşletmenizi kısaca tanıtın — müşterileriniz bu açıklamayı görecek."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Logo Upload */}
                  <div>
                    <p className="mb-2 text-sm font-medium text-[var(--text-2)]">Logo</p>
                    <label
                      className={`group flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 ${
                        logoPreview
                          ? "border-[var(--accent)]/30"
                          : "border-[var(--border)] bg-[var(--surface-2)]"
                      }`}
                    >
                      {logoPreview ? (
                        <Image src={logoPreview} alt="Logo önizlemesi" width={320} height={160} unoptimized className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-center">
                          <svg className="h-6 w-6 text-[var(--text-3)] group-hover:text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          <span className="text-[10px] text-[var(--text-3)] group-hover:text-[var(--accent)]">Logo Yükle</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            setLogoPreview(URL.createObjectURL(file));
                            setLogoUrl("pending-upload");
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <p className="mt-1 text-[10px] text-[var(--text-3)]">PNG, JPEG · Maks. 5MB</p>
                  </div>

                  {/* Cover Upload */}
                  <div>
                    <p className="mb-2 text-sm font-medium text-[var(--text-2)]">Kapak Görseli</p>
                    <label
                      className={`group flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 ${
                        coverPreview
                          ? "border-[var(--accent)]/30"
                          : "border-[var(--border)] bg-[var(--surface-2)]"
                      }`}
                    >
                      {coverPreview ? (
                        <Image src={coverPreview} alt="Kapak görseli önizlemesi" width={640} height={320} unoptimized className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-center">
                          <svg className="h-6 w-6 text-[var(--text-3)] group-hover:text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          <span className="text-[10px] text-[var(--text-3)] group-hover:text-[var(--accent)]">Kapak Yükle</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCoverFile(file);
                            setCoverPreview(URL.createObjectURL(file));
                            setCoverUrl("pending-upload");
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <p className="mt-1 text-[10px] text-[var(--text-3)]">PNG, JPEG · Maks. 5MB</p>
                  </div>
                </div>
                <div>
                  <Input
                    label="Profil URL Slug"
                    value={slug || computedSlug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="isletmeniz"
                  />
                  <p className="mt-1 text-xs text-[var(--text-3)]">
                    seninrandevun.com/isletme/<strong>{finalSlug || "..."}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Özet & Onay */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-2)]">
                  Aşağıdaki bilgileri kontrol edin. Her şey doğruysa kurulumu tamamlayabilirsiniz.
                </p>

                <div className="space-y-3">
                  {/* Business Info Summary */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[var(--text-1)]">🏢 İşletme Bilgileri</h4>
                      <button type="button" onClick={() => setStep(0)} className="text-xs text-[var(--accent)] hover:underline">Düzenle</button>
                    </div>
                    <div className="grid gap-1 text-sm">
                      <SummaryRow label="İşletme Adı" value={name} />
                      <SummaryRow label="Kategori" value={categoryLabel} />
                      <SummaryRow label="Tip" value={businessType ? (businessType === "kadin" ? "Kadın" : businessType === "erkek" ? "Erkek" : "Unisex") : "Belirtilmemiş"} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[var(--text-1)]">📍 Konum & İletişim</h4>
                      <button type="button" onClick={() => setStep(1)} className="text-xs text-[var(--accent)] hover:underline">Düzenle</button>
                    </div>
                    <div className="grid gap-1 text-sm">
                      <SummaryRow label="Telefon" value={phone} />
                      <SummaryRow label="E-posta" value={email} />
                      <SummaryRow label="Adres" value={`${address}, ${district}, ${city}`} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[var(--text-1)]">✨ Profil</h4>
                      <button type="button" onClick={() => setStep(2)} className="text-xs text-[var(--accent)] hover:underline">Düzenle</button>
                    </div>
                    <div className="grid gap-1 text-sm">
                      <SummaryRow label="URL" value={`/isletme/${finalSlug}`} />
                      <SummaryRow label="Açıklama" value={description || "—"} />
                      <SummaryRow label="Logo" value={logoFile ? "✅ Seçildi" : "Yok"} />
                      <SummaryRow label="Kapak" value={coverFile ? "✅ Seçildi" : "Yok"} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">💡</span>
                    <div className="text-sm text-[var(--text-2)]">
                      <p className="font-medium text-emerald-600">Kurulumdan sonra neler olacak?</p>
                      <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-3)]">
                        <li>• Çalışma saatleriniz varsayılan olarak ayarlanacak (daha sonra değiştirebilirsiniz)</li>
                        <li>• Dashboard&apos;dan hizmetlerinizi ve çalışanlarınızı ekleyebilirsiniz</li>
                        <li>• İlk mağaza hemen açılır; 2. ve 3. mağaza süper admin onayından sonra yayınlanır</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <aside className="onboarding-sidecar" aria-label="Kurulum rehberi">
            <div>
              <small>ADIM {step + 1} · AKILLI REHBER</small>
              <h3>{STEP_GUIDANCE[step]!.title}</h3>
              <p>{STEP_GUIDANCE[step]!.text}</p>
              <ul>{STEP_GUIDANCE[step]!.items.map((item, index) => <li key={item}><b>{index + 1}</b><span>{item}</span></li>)}</ul>
              <div className="onboarding-completion" style={{ "--onboarding-progress": `${((step + 1) / STEPS.length) * 100}%` } as CSSProperties}>
                <span><b>Kurulum ilerlemesi</b><strong>%{Math.round(((step + 1) / STEPS.length) * 100)}</strong></span><i />
              </div>
            </div>
          </aside>
          </div>

          {/* Step Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-[#f8fbf8] px-6 py-4 sm:px-8">
            <div>
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--text-1)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Geri
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-3)]">
                {step + 1} / {STEPS.length}
              </span>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Devam Et →
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Oluşturuluyor...
                    </span>
                  ) : (
                    "🚀 Kurulumu Tamamla"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Trust Badges */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--text-3)]">
        <span className="flex items-center gap-1">🔒 SSL Korumalı</span>
        <span className="flex items-center gap-1">⚡ 2 Dakikada Kurulum</span>
        <span className="flex items-center gap-1">💳 Kredi Kartı Gerekmez</span>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-[var(--text-3)]">{label}</span>
      <span className="font-medium text-[var(--text-1)]">{value || "—"}</span>
    </div>
  );
}
