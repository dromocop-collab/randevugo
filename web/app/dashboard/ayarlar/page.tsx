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
import { LiveQueueSettings } from "@/features/live-queue/live-queue-settings";
import { BusinessAvailabilitySettings } from "@/features/availability/business-availability-settings";
import {
  getBusinessById,
  updateBusiness,
} from "@/features/businesses/business-repository";
import { submitBusinessProfileChange } from "@/features/businesses/business-profile-review-repository";
import { uploadBusinessImage } from "@/lib/firebase/upload";
import { createCategoryRequest, listDynamicCategories } from "@/features/categories/category-request-repository";
import type { Business, BusinessCategory, BusinessType, SmsPreferences, SocialMediaLinks } from "@/types/business";
import { AtSign, Building2, CalendarCog, CheckCircle2, Clock3, Gauge, Globe2, Images, LoaderCircle, MapPin, Save, Search, Share2, ShieldCheck, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import Image from "next/image";

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
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("bilgiler");
  const [settingsSearch, setSettingsSearch] = useState("");
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
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(10);
  const [slotInterval, setSlotInterval] = useState(15);
  const [allowCancel, setAllowCancel] = useState(true);
  const [allowReschedule, setAllowReschedule] = useState(true);
  const [cancelDeadline, setCancelDeadline] = useState(60);
  const [smsPreferences, setSmsPreferences] = useState<SmsPreferences>({ confirmation: true, reminder: true, cancellation: true, reschedule: true });

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
      setBufferBefore(biz.bufferBeforeMinutes ?? 0);
      setBufferAfter(biz.bufferAfterMinutes ?? biz.appointmentBufferMinutes ?? 10);
      setSlotInterval(biz.slotIntervalMinutes ?? 15);
      setAllowCancel(biz.allowCancellation ?? true);
      setAllowReschedule(biz.allowReschedule ?? true);
      setCancelDeadline(biz.cancellationDeadlineMinutes ?? 60);
      setSmsPreferences({
        confirmation: biz.smsPreferences?.confirmation !== false,
        reminder: biz.smsPreferences?.reminder !== false,
        cancellation: biz.smsPreferences?.cancellation !== false,
        reschedule: biz.smsPreferences?.reschedule !== false,
      });
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
      const updateData: Record<string, unknown> = {
        name: name.trim(),
        category,
        businessType: businessType || null,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        district: district.trim(),
        description: description.trim(),
        website: website.trim(),
      };

      await submitBusinessProfileChange(businessId, updateData);
      setBusiness((prev) => prev ? { ...prev, profileReviewStatus: "pending" } : prev);
      toast.success("Değişiklikler süper admin onayına gönderildi. Mevcut profiliniz onaya kadar yayında kalır.");
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
      await submitBusinessProfileChange(businessId, { socialMedia: social });
      setBusiness((prev) => prev ? { ...prev, profileReviewStatus: "pending" } : prev);
      toast.success("Dijital kanallar süper admin onayına gönderildi.");
    } catch {
      toast.error("Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAppointment(e: FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    if (minNotice < 0 || minNotice > 10080) { toast.error("Minimum bildirim süresi 0 ile 10.080 dakika arasında olmalıdır."); return; }
    if (maxDaysAhead < 1 || maxDaysAhead > 365) { toast.error("Randevu penceresi 1 ile 365 gün arasında olmalıdır."); return; }
    if (bufferBefore < 0 || bufferBefore > 180 || bufferAfter < 0 || bufferAfter > 180) { toast.error("Hazırlık süreleri en fazla 180 dakika olabilir."); return; }
    if (cancelDeadline < 0 || cancelDeadline > 10080) { toast.error("İptal süresi 0 ile 10.080 dakika arasında olmalıdır."); return; }
    setSaving(true);
    try {
      await updateBusiness(businessId, {
        minimumBookingNoticeMinutes: minNotice,
        maximumBookingDaysAhead: maxDaysAhead,
        appointmentBufferMinutes: bufferAfter,
        bufferBeforeMinutes: bufferBefore,
        bufferAfterMinutes: bufferAfter,
        slotIntervalMinutes: slotInterval,
        allowCancellation: allowCancel,
        allowReschedule,
        cancellationDeadlineMinutes: cancelDeadline,
        smsPreferences,
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

  const TABS: { id: Tab; label: string; note: string; icon: LucideIcon }[] = [
    { id: "bilgiler", label: "İşletme Bilgileri", note: "Profil, iletişim ve konum", icon: Building2 },
    { id: "gorseller", label: "Marka Stüdyosu", note: "Logo, kapak ve galeri", icon: Images },
    { id: "sosyal", label: "Dijital Kanallar", note: "Sosyal medya ve WhatsApp", icon: Share2 },
    { id: "randevu", label: "Randevu Motoru", note: "Takvim, süre ve müşteri izinleri", icon: CalendarCog },
  ];
  const filteredTabs = settingsSearch.trim()
    ? TABS.filter((tab) => `${tab.label} ${tab.note}`.toLocaleLowerCase("tr-TR").includes(settingsSearch.trim().toLocaleLowerCase("tr-TR")))
    : TABS;
  const profileSignals = [name, category !== "diger" ? category : "", phone, email, address, city, district, description, business?.logoUrl, business?.coverUrl];
  const profileScore = Math.round(profileSignals.filter(Boolean).length / profileSignals.length * 100);
  const socialCount = Object.values(social).filter((value) => value?.trim()).length;

  function applyBookingPreset(preset: "balanced" | "flexible" | "protected") {
    if (preset === "flexible") { setMinNotice(30); setMaxDaysAhead(60); setBufferBefore(0); setBufferAfter(5); setSlotInterval(15); }
    if (preset === "balanced") { setMinNotice(60); setMaxDaysAhead(45); setBufferBefore(5); setBufferAfter(10); setSlotInterval(15); }
    if (preset === "protected") { setMinNotice(180); setMaxDaysAhead(30); setBufferBefore(10); setBufferAfter(15); setSlotInterval(15); }
    toast.success("Randevu profili uygulandı. Kaydederek etkinleştirebilirsiniz.");
  }

  return (
    <div className="settings-page">
      <section className="settings-command-hero">
        <div className="settings-command-copy">
          <span><Sparkles size={15} /> İŞLETME KONTROL MERKEZİ</span>
          <h1>Mağazanı kusursuzlaştır.</h1>
          <p>Profil, marka, iletişim ve randevu kurallarını tek bir akıştan güvenle yönet.</p>
        </div>
        <div className="settings-command-status"><span><ShieldCheck size={25} /></span><div><small>PROFİL SAĞLIĞI</small><b><CheckCircle2 size={15} /> %{profileScore} tamamlandı</b><i><em style={{width:`${profileScore}%`}}/></i></div></div>
      </section>

      <section className="settings-vitals" aria-label="Ayar özeti">
        <button type="button" onClick={() => setActiveTab("bilgiler")}><i><MapPin size={18}/></i><span><small>MAĞAZA PROFİLİ</small><b>{city && district ? `${district}, ${city}` : "Konumu tamamlayın"}</b></span><em>{profileScore}%</em></button>
        <button type="button" onClick={() => setActiveTab("sosyal")}><i><AtSign size={18}/></i><span><small>DİJİTAL ERİŞİM</small><b>{socialCount ? `${socialCount} kanal bağlı` : "Kanallarınızı bağlayın"}</b></span><em>{socialCount}/6</em></button>
        <button type="button" onClick={() => setActiveTab("randevu")}><i><Clock3 size={18}/></i><span><small>RANDEVU PENCERESİ</small><b>{minNotice} dk → {maxDaysAhead} gün</b></span><em>{slotInterval} dk</em></button>
      </section>

      {business?.profileReviewStatus === "pending" && (
        <div className="settings-review-banner" role="status"><ShieldCheck size={18}/><div><b>Yayın öncesi inceleme sürüyor</b><span>Gönderdiğiniz profil değişiklikleri güvenlik ve içerik kontrolünden sonra yayına alınacak. Bu sırada mevcut profiliniz kesintisiz görünür.</span></div></div>
      )}

      {/* Tab Navigation */}
      <div className="settings-navigator"><label><Search size={17}/><input value={settingsSearch} onChange={(event) => setSettingsSearch(event.target.value)} placeholder="Ayarlarda ara…"/></label><div className="settings-tabs">
        {filteredTabs.map((tab) => {
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
              <span>{tab.label}<small>{tab.note}</small></span>
            </button>
          );
        })}
        {!filteredTabs.length && <p className="settings-search-empty">Bu ifadeyle eşleşen ayar bulunamadı.</p>}
      </div></div>

      <div key={activeTab} className="settings-tab-content">
      {/* Tab 1: İşletme Bilgileri */}
      {activeTab === "bilgiler" && (
        <Card title="İşletme Bilgileri" description="İşletmenizin temel bilgilerini düzenleyin.">
          <div className="settings-profile-preview"><div>{business?.logoUrl ? <Image src={business.logoUrl} alt="" width={58} height={58}/> : <Building2 size={24}/>}<span><small>CANLI MAĞAZA KARTI</small><b>{name || "İşletme adınız"}</b><em>{district || "İlçe"}, {city || "Şehir"}</em></span></div><a href={business?.slug ? `/isletme/${business.slug}` : undefined} target="_blank" aria-disabled={!business?.slug}><Globe2 size={15}/> Profili önizle</a></div>
          <form className="settings-form space-y-4" onSubmit={handleSaveInfo}>
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

            <div className="settings-save-row">
              <span><ShieldCheck size={15}/> Değişiklikler onaylanana kadar mevcut profil yayında kalır.</span>
              <Button type="submit" disabled={saving} className="settings-save-button">
                {saving ? <><LoaderCircle className="animate-spin" size={16}/> Gönderiliyor</> : <><Save size={16}/> Onaya Gönder</>}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 2: Görseller */}
      {activeTab === "gorseller" && (
        <Card title="Görsel Yönetimi" description="Logo, kapak fotoğrafı ve galeri görselleri yükleyin.">
          <div className="settings-brand-guide"><Sparkles size={18}/><div><b>Marka kalite rehberi</b><span>Net logo, yatay kapak ve gerçek işletme fotoğrafları keşfet görünümünüzü güçlendirir.</span></div><em>{(business?.galleryUrls?.length ?? 0) + Number(Boolean(business?.logoUrl)) + Number(Boolean(business?.coverUrl))} varlık</em></div>
          <div className="grid gap-6 sm:grid-cols-2">
            <ImageUploader
              label="Logo"
              currentUrl={business?.logoUrl}
              shape="square"
              uploadFn={(file) => uploadBusinessImage(businessId!, "logo", file)}
              onUpload={async (url) => {
                await submitBusinessProfileChange(businessId!, { logoUrl: url });
                setBusiness((prev) => prev ? { ...prev, profileReviewStatus: "pending" } : prev);
                toast.success("Yeni logo onaya gönderildi.");
              }}
            />
            <ImageUploader
              label="Kapak Fotoğrafı"
              currentUrl={business?.coverUrl}
              shape="wide"
              uploadFn={(file) => uploadBusinessImage(businessId!, "cover", file)}
              onUpload={async (url) => {
                await submitBusinessProfileChange(businessId!, { coverUrl: url });
                setBusiness((prev) => prev ? { ...prev, profileReviewStatus: "pending" } : prev);
                toast.success("Yeni kapak görseli onaya gönderildi.");
              }}
            />
          </div>

          {/* Gallery */}
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-[var(--text-1)]">Galeri</h4>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {(business?.galleryUrls ?? []).map((url, i) => (
                <div key={url} className="settings-gallery-item group relative">
                  <Image src={url} alt={`Galeri ${i + 1}`} width={160} height={80} className="h-20 w-full rounded-xl object-cover" />
                  <button type="button" aria-label="Görseli galeriden kaldır" onClick={async () => { if (!businessId) return; const updated = (business?.galleryUrls ?? []).filter((item) => item !== url); try { await submitBusinessProfileChange(businessId, { galleryUrls: updated }); setBusiness((prev) => prev ? { ...prev, profileReviewStatus: "pending" } : prev); toast.success("Galeri değişikliği onaya gönderildi."); } catch { toast.error("Değişiklik gönderilemedi."); } }}><Trash2 size={14}/></button>
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
                  await submitBusinessProfileChange(businessId!, { galleryUrls: updated });
                  setBusiness((prev) => prev ? { ...prev, profileReviewStatus: "pending" } : prev);
                  toast.success("Galeri görseli onaya gönderildi.");
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Sosyal Medya */}
      {activeTab === "sosyal" && (
        <Card title="Sosyal Medya Linkleri" description="Müşterilerinizin sizi sosyal medyada bulmasını sağlayın.">
          <div className="settings-social-health"><Share2 size={18}/><span><small>DİJİTAL AYAK İZİ</small><b>{socialCount ? `${socialCount} kanal müşterilere açık` : "Henüz kanal bağlanmadı"}</b></span><em><i style={{width:`${socialCount / 6 * 100}%`}}/></em></div>
          <form className="settings-form space-y-4" onSubmit={handleSaveSocial}>
            <div className="settings-social-grid grid gap-4 sm:grid-cols-2">
              {([
                { key: "instagram", label: "Instagram", placeholder: "instagram.com/isletmeniz" },
                { key: "facebook", label: "Facebook", placeholder: "facebook.com/isletmeniz" },
                { key: "twitter", label: "Twitter / X", placeholder: "x.com/isletmeniz" },
                { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@isletmeniz" },
                { key: "youtube", label: "YouTube", placeholder: "youtube.com/@isletmeniz" },
                { key: "whatsapp", label: "WhatsApp", placeholder: "05XX XXX XX XX" },
              ] as const).map((item) => (
                <div key={item.key} data-connected={Boolean(social[item.key]?.trim())}><Input
                  label={item.label}
                  value={social[item.key] ?? ""}
                  onChange={(e) => setSocial({ ...social, [item.key]: e.target.value })}
                  placeholder={item.placeholder}
                /><span>{social[item.key]?.trim() ? <><CheckCircle2 size={12}/> Bağlı</> : "Bağlantı bekleniyor"}</span></div>
              ))}
            </div>
            <div className="settings-save-row">
              <span><Globe2 size={15}/> Kanallar kontrol sonrası mağaza profilinde yayınlanır.</span>
              <Button type="submit" disabled={saving} className="settings-save-button">
                {saving ? <><LoaderCircle className="animate-spin" size={16}/> Gönderiliyor</> : <><Save size={16}/> Onaya Gönder</>}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 4: Randevu Ayarları */}
      {activeTab === "randevu" && (
        <Card title="Randevu Ayarları" description="Randevu sisteminizin kurallarını belirleyin.">
          <div className="settings-preset-grid"><button type="button" onClick={() => applyBookingPreset("flexible")}><Sparkles size={16}/><span><b>Esnek</b><small>Daha fazla müsaitlik</small></span></button><button type="button" onClick={() => applyBookingPreset("balanced")}><Gauge size={16}/><span><b>Dengeli</b><small>Önerilen çalışma düzeni</small></span></button><button type="button" onClick={() => applyBookingPreset("protected")}><ShieldCheck size={16}/><span><b>Korumalı</b><small>Daha geniş hazırlık süresi</small></span></button></div>
          <form className="settings-form space-y-4" onSubmit={handleSaveAppointment}>
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
                  label="Randevu Öncesi Hazırlık (dk)"
                  type="number"
                  value={String(bufferBefore)}
                  onChange={(e) => setBufferBefore(Math.max(0, Number(e.target.value)))}
                  min={0}
                  max={180}
                />
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  Hizmet başlamadan önce takvimde ayrılan süre.
                </p>
              </div>
              <div><Input label="Randevu Sonrası Buffer (dk)" type="number" value={String(bufferAfter)} onChange={(e) => setBufferAfter(Math.max(0, Number(e.target.value)))} min={0} max={180}/><p className="mt-1 text-xs text-[var(--text-3)]">Temizlik, hazırlık veya mola için ayrılan süre.</p></div>
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

            <div className="settings-policy-card space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <h4 className="text-sm font-semibold text-[var(--text-1)]">İptal & Yeniden Planlama</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="settings-switch-row">
                  <input
                    type="checkbox"
                    checked={allowCancel}
                    onChange={(e) => setAllowCancel(e.target.checked)}
                  />
                  <i/><span><b>İptal izni</b><small>Müşteri randevuyu iptal edebilir</small></span>
                </label>
                <label className="settings-switch-row">
                  <input
                    type="checkbox"
                    checked={allowReschedule}
                    onChange={(e) => setAllowReschedule(e.target.checked)}
                  />
                  <i/><span><b>Yeniden planlama</b><small>Müşteri uygun başka saate geçebilir</small></span>
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

            <div className="settings-policy-card space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div><h4 className="text-sm font-semibold text-[var(--text-1)]">Müşteri SMS bildirimleri</h4><p className="mt-1 text-xs text-[var(--text-3)]">Müşteriye hangi operasyon mesajlarının gönderileceğini seçin. Doğrulama kodu güvenlik nedeniyle her zaman açıktır.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["confirmation", "Randevu onayı", "Randevu oluştuğunda bilgi verir"],
                  ["reminder", "1 saat önce hatırlatma", "Randevu öncesinde otomatik gönderilir"],
                  ["cancellation", "İptal bildirimi", "İptal edilen randevuyu müşteriye bildirir"],
                  ["reschedule", "Saat değişikliği", "Yeni tarih ve saati müşteriye iletir"],
                ] as const).map(([key, label, note]) => (
                  <label key={key} className="settings-switch-row">
                    <input type="checkbox" checked={smsPreferences[key] !== false} onChange={(event) => setSmsPreferences((current) => ({ ...current, [key]: event.target.checked }))}/>
                    <i/><span><b>{label}</b><small>{note}</small></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-booking-preview"><Clock3 size={18}/><span><small>CANLI KURAL ÖZETİ</small><b>Müşteri en erken {minNotice} dk sonra, en fazla {maxDaysAhead} gün ileriye randevu alabilir.</b><em>{bufferBefore + bufferAfter} dk toplam hazırlık • {slotInterval} dk slot</em></span></div>
            <div className="settings-save-row">
              <span><CheckCircle2 size={15}/> Yeni kurallar uygunluk motoruna anında yansır.</span>
              <Button type="submit" disabled={saving} className="settings-save-button">
                {saving ? <><LoaderCircle className="animate-spin" size={16}/> Kaydediliyor</> : <><Save size={16}/> Randevu Motorunu Kaydet</>}
              </Button>
            </div>
          </form>
        </Card>
      )}
      {activeTab === "randevu" && business &&
        <LiveQueueSettings business={business} onChanged={(liveQueueEnabled) =>
          setBusiness((current) => current ? { ...current, liveQueueEnabled } : current)} />}
      {activeTab === "randevu" && business &&
        <BusinessAvailabilitySettings business={business} onChanged={(setting, value) =>
          setBusiness((current) => current ? { ...current, [setting]: value } : current)} />}
      </div>
    </div>
  );
}
