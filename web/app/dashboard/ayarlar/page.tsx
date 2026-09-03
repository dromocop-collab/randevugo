"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useBusiness } from "@/hooks/use-business";
import {
  getBusinessById,
  updateBusiness,
} from "@/features/businesses/business-repository";
import { uploadBusinessImage } from "@/lib/firebase/upload";
import { createCategoryRequest, listDynamicCategories } from "@/features/categories/category-request-repository";
import type { Business, BusinessCategory, BusinessType, SocialMediaLinks } from "@/types/business";
import { Building2, CalendarCog, CheckCircle2, Images, Share2, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { canonicalBusinessCategory } from "@/lib/business-categories";

const DEFAULT_CATEGORY_OPTIONS = [
  { value: "kuafor", label: "Kuaför" },
  { value: "berber", label: "Berber" },
  { value: "guzellik", label: "Güzellik Merkezi" },
  { value: "nail", label: "Nail Studio" },
  { value: "spor", label: "Spor / Personal Training" },
  { value: "danismanlik", label: "Danışmanlık" },
  { value: "veteriner", label: "Veteriner" },
  { value: "servis", label: "Servis / Teknik" },
  { value: "saglik", label: "Sağlık" },
  { value: "egitim", label: "Eğitim" },
  { value: "yazilim", label: "Yazılım / Web / Video" },
  { value: "diger", label: "Diğer" },
];

const BIZ_TYPE_OPTIONS = [
  { value: "", label: "Belirtilmemiş" },
  { value: "kadin", label: "Kadın" },
  { value: "erkek", label: "Erkek" },
  { value: "unisex", label: "Unisex" },
];

type Tab = "bilgiler" | "gorseller" | "sosyal" | "randevu";

export default function SettingsPage() {
  const { businessId } = useBusiness();
  const { refreshBusinesses } = useBusinessContext();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("bilgiler");
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORY_OPTIONS);

  // Form states — Tab 1
  const [name, setName] = useState("");
  const [category, setCategory] = useState<BusinessCategory>("diger");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [website, setWebsite] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [requestingCategory, setRequestingCategory] = useState(false);
  const [categoryRequested, setCategoryRequested] = useState(false);

  // Tab 3 — Social
  const [social, setSocial] = useState<SocialMediaLinks>({});

  // Tab 4 — Appointment settings
  const [minNotice, setMinNotice] = useState(60);
  const [maxDaysAhead, setMaxDaysAhead] = useState(45);
  const [bufferMin, setBufferMin] = useState(10);
  const [slotInterval, setSlotInterval] = useState(15);
  const [allowCancel, setAllowCancel] = useState(true);
  const [allowReschedule, setAllowReschedule] = useState(true);
  const [cancelDeadline, setCancelDeadline] = useState(60);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    getBusinessById(businessId).then((biz) => {
      if (cancelled || !biz) return;
      setBusiness(biz);
      setName(biz.name);
      setCategory(canonicalBusinessCategory(biz.category));
      setBusinessType(biz.businessType ?? "");
      setDescription(biz.description ?? "");
      setPhone(biz.phone);
      setEmail(biz.email);
      setAddress(biz.address);
      setCity(biz.city);
      setDistrict(biz.district);
      setWebsite(biz.website ?? "");
      setSocial(biz.socialMedia ?? {});
      setMinNotice(biz.minimumBookingNoticeMinutes);
      setMaxDaysAhead(biz.maximumBookingDaysAhead);
      setBufferMin(biz.appointmentBufferMinutes);
      setSlotInterval(biz.slotIntervalMinutes ?? 15);
      setAllowCancel(biz.allowCancellation ?? true);
      setAllowReschedule(biz.allowReschedule ?? true);
      setCancelDeadline(biz.cancellationDeadlineMinutes ?? 60);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [businessId]);

  // Fetch dynamic categories from Firestore
  useEffect(() => {
    listDynamicCategories().then((dynamic) => {
      const existing = new Set(DEFAULT_CATEGORY_OPTIONS.map((o) => o.value));
      const merged = [...DEFAULT_CATEGORY_OPTIONS.filter(o => o.value !== "diger")];
      dynamic.forEach((dc) => {
        const canonicalSlug = canonicalBusinessCategory(dc.slug);
        if (!existing.has(canonicalSlug)) {
          existing.add(canonicalSlug);
          merged.push({ value: canonicalSlug, label: dc.label });
        }
      });
      // Always keep "Diğer" at the end
      merged.push({ value: "diger", label: "Diğer" });
      setCategoryOptions(merged);
    }).catch(() => {});
  }, []);

  async function handleSaveInfo(e: FormEvent) {
    e.preventDefault();
    if (!businessId) return;

    if (!name.trim()) { toast.error("İşletme adı zorunludur."); return; }
    if (!phone.trim()) { toast.error("Telefon zorunludur."); return; }
    if (!email.trim()) { toast.error("E-posta zorunludur."); return; }
    if (!address.trim()) { toast.error("Adres zorunludur."); return; }
    if (!city.trim()) { toast.error("Şehir zorunludur."); return; }
    if (!district.trim()) { toast.error("İlçe zorunludur."); return; }

    setSaving(true);
    try {
      const updateData: Record<string, string | undefined> = {
        name: name.trim(),
        category,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        district: district.trim(),
      };
      if (businessType) updateData.businessType = businessType;
      if (description.trim()) updateData.description = description.trim();
      if (website.trim()) updateData.website = website.trim();

      await updateBusiness(businessId, updateData);
      toast.success("İşletme bilgileri güncellendi.");
    } catch (err) {
      console.error("updateBusiness error:", err);
      const msg = (err as Error)?.message ?? "";
      if (msg.includes("permission-denied")) {
        toast.error("Yetki hatası: Bu işletmeyi güncelleme yetkiniz yok.");
      } else {
        toast.error("Güncelleme başarısız: " + msg);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSocial(e: FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    try {
      await updateBusiness(businessId, { socialMedia: social });
      toast.success("Sosyal medya linkleri güncellendi.");
    } catch {
      toast.error("Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAppointment(e: FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    try {
      await updateBusiness(businessId, {
        minimumBookingNoticeMinutes: minNotice,
        maximumBookingDaysAhead: maxDaysAhead,
        appointmentBufferMinutes: bufferMin,
        slotIntervalMinutes: slotInterval,
        allowCancellation: allowCancel,
        allowReschedule,
        cancellationDeadlineMinutes: cancelDeadline,
      });
      toast.success("Randevu ayarları güncellendi.");
    } catch {
      toast.error("Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState title="Ayarlar yükleniyor" description="İşletme bilgileri getiriliyor..." />;
  }

  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "bilgiler", label: "İşletme Bilgileri", icon: Building2 },
    { id: "gorseller", label: "Görseller", icon: Images },
    { id: "sosyal", label: "Sosyal Medya", icon: Share2 },
    { id: "randevu", label: "Randevu Ayarları", icon: CalendarCog },
  ];

  return (
    <div className="settings-page">
      <section className="settings-command-hero">
        <div className="settings-command-copy">
          <span><Sparkles size={15} /> İŞLETME KONTROL MERKEZİ</span>
          <h1>Mağazanı kusursuzlaştır.</h1>
          <p>Profil, marka, iletişim ve randevu kurallarını tek bir akıştan güvenle yönet.</p>
        </div>
        <div className="settings-command-status">
          <span><ShieldCheck size={25} /></span>
          <div><small>AYAR DURUMU</small><b><CheckCircle2 size={15} /> Güvenli ve senkron</b></div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`settings-tab ${
                activeTab === tab.id
                  ? "is-active"
                  : ""
              }`}
            >
              <Icon aria-hidden="true" size={17} strokeWidth={1.9} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div key={activeTab} className="settings-tab-content">
      {/* Tab 1: İşletme Bilgileri */}
      {activeTab === "bilgiler" && (
        <Card title="İşletme Bilgileri" description="İşletmenizin temel bilgilerini düzenleyin.">
          <form className="space-y-4" onSubmit={handleSaveInfo}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="İşletme Adı *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Örn: Güzel Saçlar Kuaförü"
              />
              <Select
                label="Kategori *"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as BusinessCategory);
                  setCategoryRequested(false);
                }}
                options={categoryOptions}
              />
              {category === "diger" && (
                <div className="sm:col-span-2">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="mb-2 text-sm font-medium text-amber-700">
                      📝 İstediğiniz kategoriyi yazın, onay sonrası listeye eklenecektir.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Örn: Diş Kliniği, Müzik Stüdyosu..."
                        className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                      />
                      <button
                        type="button"
                        disabled={requestingCategory || !customCategory.trim() || categoryRequested}
                        onClick={async () => {
                          if (!businessId || !customCategory.trim()) return;
                          setRequestingCategory(true);
                          try {
                            await createCategoryRequest(businessId, name, customCategory.trim());
                            setCategoryRequested(true);
                            toast.success("Kategori isteğiniz Super Admin onayına gönderildi.");
                          } catch {
                            toast.error("Kategori isteği gönderilemedi.");
                          } finally {
                            setRequestingCategory(false);
                          }
                        }}
                        className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                          categoryRequested
                            ? "bg-emerald-500/10 text-emerald-600 cursor-default"
                            : "bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
                        }`}
                      >
                        {requestingCategory
                          ? "Gönderiliyor..."
                          : categoryRequested
                            ? "✅ Gönderildi"
                            : "📨 Onay İste"}
                      </button>
                    </div>
                    {categoryRequested && (
                      <p className="mt-2 text-xs text-emerald-600">
                        İsteğiniz inceleniyor. Onaylanma sonrası kategoriniz otomatik olarak güncellenecektir.
                      </p>
                    )}
                  </div>
                </div>
              )}
              <Select
                label="İşletme Tipi"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType | "")}
                options={BIZ_TYPE_OPTIONS}
              />
              <Input
                label="Telefon *"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="05XX XXX XX XX"
              />
              <Input
                label="E-posta *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-1)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="İşletmenizi kısaca tanıtın..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Adres *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="Cadde / Sokak / No"
              />
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
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Kaydediliyor..." : "💾 Bilgileri Kaydet"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 2: Görseller */}
      {activeTab === "gorseller" && (
        <Card title="Görsel Yönetimi" description="Logo, kapak fotoğrafı ve galeri görselleri yükleyin.">
          <div className="grid gap-6 sm:grid-cols-2">
            <ImageUploader
              label="Logo"
              currentUrl={business?.logoUrl}
              shape="square"
              uploadFn={(file) => uploadBusinessImage(businessId!, "logo", file)}
              onUpload={async (url) => {
                await updateBusiness(businessId!, { logoUrl: url });
                setBusiness((prev) => prev ? { ...prev, logoUrl: url } : prev);
                refreshBusinesses();
              }}
            />
            <ImageUploader
              label="Kapak Fotoğrafı"
              currentUrl={business?.coverUrl}
              shape="wide"
              uploadFn={(file) => uploadBusinessImage(businessId!, "cover", file)}
              onUpload={async (url) => {
                await updateBusiness(businessId!, { coverUrl: url });
                setBusiness((prev) => prev ? { ...prev, coverUrl: url } : prev);
                refreshBusinesses();
              }}
            />
          </div>

          {/* Gallery */}
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-[var(--text-1)]">Galeri</h4>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {(business?.galleryUrls ?? []).map((url, i) => (
                <div key={i} className="group relative">
                  <img src={url} alt={`Galeri ${i + 1}`} className="h-20 w-full rounded-xl object-cover" />
                </div>
              ))}
              {/* Add Gallery Image */}
              <ImageUploader
                label=""
                shape="square"
                uploadFn={(file) => uploadBusinessImage(businessId!, "gallery", file)}
                onUpload={async (url) => {
                  const current = business?.galleryUrls ?? [];
                  const updated = [...current, url];
                  await updateBusiness(businessId!, { galleryUrls: updated });
                  setBusiness((prev) => prev ? { ...prev, galleryUrls: updated } : prev);
                  refreshBusinesses();
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Sosyal Medya */}
      {activeTab === "sosyal" && (
        <Card title="Sosyal Medya Linkleri" description="Müşterilerinizin sizi sosyal medyada bulmasını sağlayın.">
          <form className="space-y-4" onSubmit={handleSaveSocial}>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                { key: "instagram", label: "Instagram", placeholder: "instagram.com/isletmeniz" },
                { key: "facebook", label: "Facebook", placeholder: "facebook.com/isletmeniz" },
                { key: "twitter", label: "Twitter / X", placeholder: "x.com/isletmeniz" },
                { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@isletmeniz" },
                { key: "youtube", label: "YouTube", placeholder: "youtube.com/@isletmeniz" },
                { key: "whatsapp", label: "WhatsApp", placeholder: "05XX XXX XX XX" },
              ] as const).map((item) => (
                <Input
                  key={item.key}
                  label={item.label}
                  value={social[item.key] ?? ""}
                  onChange={(e) => setSocial({ ...social, [item.key]: e.target.value })}
                  placeholder={item.placeholder}
                />
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Kaydediliyor..." : "💾 Sosyal Medya Kaydet"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 4: Randevu Ayarları */}
      {activeTab === "randevu" && (
        <Card title="Randevu Ayarları" description="Randevu sisteminizin kurallarını belirleyin.">
          <form className="space-y-4" onSubmit={handleSaveAppointment}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label="Minimum Bildirim Süresi (dakika)"
                  type="number"
                  value={String(minNotice)}
                  onChange={(e) => setMinNotice(Number(e.target.value))}
                  min={0}
                />
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  Müşteri en az bu süre öncesinden randevu alabilir.
                </p>
              </div>
              <div>
                <Input
                  label="Maksimum İleri Gün"
                  type="number"
                  value={String(maxDaysAhead)}
                  onChange={(e) => setMaxDaysAhead(Number(e.target.value))}
                  min={1}
                  max={365}
                />
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  Müşteri en fazla bu kadar gün sonrası için randevu alabilir.
                </p>
              </div>
              <div>
                <Input
                  label="Randevu Arası Buffer (dakika)"
                  type="number"
                  value={String(bufferMin)}
                  onChange={(e) => setBufferMin(Number(e.target.value))}
                  min={0}
                />
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  İki randevu arasındaki minimum boşluk.
                </p>
              </div>
              <Select
                label="Slot Aralığı"
                value={String(slotInterval)}
                onChange={(e) => setSlotInterval(Number(e.target.value))}
                options={[
                  { value: "10", label: "10 Dakika" },
                  { value: "15", label: "15 Dakika" },
                  { value: "20", label: "20 Dakika" },
                  { value: "30", label: "30 Dakika" },
                  { value: "60", label: "60 Dakika" },
                ]}
              />
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <h4 className="text-sm font-semibold text-[var(--text-1)]">İptal & Yeniden Planlama</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex items-center gap-3 text-sm text-[var(--text-1)]">
                  <input
                    type="checkbox"
                    checked={allowCancel}
                    onChange={(e) => setAllowCancel(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                  />
                  İptal izni ver
                </label>
                <label className="flex items-center gap-3 text-sm text-[var(--text-1)]">
                  <input
                    type="checkbox"
                    checked={allowReschedule}
                    onChange={(e) => setAllowReschedule(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                  />
                  Yeniden planlama izni
                </label>
                <div>
                  <Input
                    label="İptal Son Tarihi (dk)"
                    type="number"
                    value={String(cancelDeadline)}
                    onChange={(e) => setCancelDeadline(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Kaydediliyor..." : "💾 Randevu Ayarlarını Kaydet"}
              </Button>
            </div>
          </form>
        </Card>
      )}
      </div>
    </div>
  );
}
