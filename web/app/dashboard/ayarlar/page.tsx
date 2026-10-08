"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  AtSign, Building2, CalendarCog, CheckCircle2, Clock3, Gauge, Globe2, Images, LoaderCircle, MapPin, MessageSquareText,
  Palette, Search, Send, Share2, ShieldAlert, ShieldCheck, Sparkles, Store, Trash2, type LucideIcon,
} from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useBusiness } from "@/hooks/use-business";
import { LiveQueueSettings } from "@/features/live-queue/live-queue-settings";
import { BusinessAvailabilitySettings } from "@/features/availability/business-availability-settings";
import { PushToggleCard } from "@/features/push";
import { setCompanionHidden, useCompanionHidden } from "@/features/business-companion/companion-settings";
import { BusinessBookingFieldsEditor } from "@/features/booking-fields/business-booking-fields-editor";
import { getBusinessById, updateBusiness } from "@/features/businesses/business-repository";
import { submitBusinessProfileChange } from "@/features/businesses/business-profile-review-repository";
import { uploadBusinessImage } from "@/lib/firebase/upload";
import { createCategoryRequest, listDynamicCategories } from "@/features/categories/category-request-repository";
import type { Business, BusinessCategory, BusinessType, SmsPreferences, SocialMediaLinks } from "@/types/business";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { ConfirmSheet, HeroChip, Notice, Panel, SaveBar, Sk, StudioHero, StudioPage, ToggleRow, cx, studio as k } from "../_studio";
import { AppearanceSection } from "./appearance-section";
import { NotificationSoundSection } from "./notification-sound-section";
import st from "./settings.module.css";
import { CitySelect, DistrictSelect } from "@/components/ui/place-combobox";

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


const SOCIAL_FIELDS = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/isletmeniz" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/isletmeniz" },
  { key: "twitter", label: "Twitter / X", placeholder: "x.com/isletmeniz" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@isletmeniz" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@isletmeniz" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "05XX XXX XX XX" },
] as const;

const SMS_FIELDS = [
  ["confirmation", "Randevu onayı", "Randevu oluştuğunda bilgi verir"],
  ["reminder", "1 saat önce hatırlatma", "Randevu öncesinde otomatik gönderilir"],
  ["cancellation", "İptal bildirimi", "İptal edilen randevuyu müşteriye bildirir"],
  ["reschedule", "Saat değişikliği", "Yeni tarih ve saati müşteriye iletir"],
] as const;

type Tab = "bilgiler" | "gorseller" | "sosyal" | "randevu" | "gorunum";

type InfoForm = { name: string; category: BusinessCategory; businessType: BusinessType | ""; description: string; phone: string; email: string; address: string; city: string; district: string; website: string };
type RulesForm = { minNotice: number; maxDaysAhead: number; bufferBefore: number; bufferAfter: number; slotInterval: number; allowCancel: boolean; allowReschedule: boolean; allowOnlineBooking: boolean; cancelDeadline: number; smsPreferences: SmsPreferences };

const EMPTY_INFO: InfoForm = { name: "", category: "diger", businessType: "", description: "", phone: "", email: "", address: "", city: "", district: "", website: "" };
const DEFAULT_RULES: RulesForm = { minNotice: 60, maxDaysAhead: 45, bufferBefore: 0, bufferAfter: 10, slotInterval: 15, allowCancel: true, allowReschedule: true, allowOnlineBooking: true, cancelDeadline: 60, smsPreferences: { confirmation: true, reminder: true, cancellation: true, reschedule: true } };

const TABS: { id: Tab; label: string; short: string; note: string; icon: LucideIcon }[] = [
  { id: "bilgiler", label: "İşletme Bilgileri", short: "Profil", note: "Profil, iletişim ve konum", icon: Building2 },
  { id: "gorseller", label: "Marka Stüdyosu", short: "Görseller", note: "Logo, kapak ve galeri", icon: Images },
  { id: "sosyal", label: "Dijital Kanallar", short: "Kanallar", note: "Sosyal medya ve WhatsApp", icon: Share2 },
  { id: "randevu", label: "Randevu Motoru", short: "Randevu", note: "Takvim, süre, iptal, SMS ve bildirim", icon: CalendarCog },
  { id: "gorunum", label: "Görünüm", short: "Görünüm", note: "Panel renk atmosferi", icon: Palette },
];

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function cleanSocial(value: SocialMediaLinks) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === "string" && v.trim() !== "")) as SocialMediaLinks;
}

export default function SettingsPage() {
  const { businessId } = useBusiness();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("bilgiler");
  // Derin bağlantı: /dashboard/ayarlar?tab=randevu (ör. sitedeki işletme yardımcısından).
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested && TABS.some((tab) => tab.id === requested)) queueMicrotask(() => setActiveTab(requested as Tab));
  }, []);
  const [settingsSearch, setSettingsSearch] = useState("");
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORY_OPTIONS);

  // Profil formu + kayıtlı (yayındaki / onaya gönderilen) taban
  const [info, setInfo] = useState<InfoForm>(EMPTY_INFO);
  const [infoBase, setInfoBase] = useState<InfoForm>(EMPTY_INFO);
  const [customCategory, setCustomCategory] = useState("");
  const [requestingCategory, setRequestingCategory] = useState(false);
  const [categoryRequested, setCategoryRequested] = useState(false);

  // Dijital kanallar
  const [social, setSocial] = useState<SocialMediaLinks>({});
  const [socialBase, setSocialBase] = useState<SocialMediaLinks>({});

  // Randevu kuralları
  const [rules, setRules] = useState<RulesForm>(DEFAULT_RULES);
  const [rulesBase, setRulesBase] = useState<RulesForm>(DEFAULT_RULES);

  const [galleryToRemove, setGalleryToRemove] = useState<string | null>(null);
  const [removingGallery, setRemovingGallery] = useState(false);

  const setInfoField = <K extends keyof InfoForm>(key: K, value: InfoForm[K]) => setInfo((current) => ({ ...current, [key]: value }));
  const setRule = <K extends keyof RulesForm>(key: K, value: RulesForm[K]) => setRules((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    getBusinessById(businessId).then((biz) => {
      if (cancelled || !biz) return;
      setBusiness(biz);
      const nextInfo: InfoForm = {
        name: biz.name,
        category: canonicalBusinessCategory(biz.category),
        businessType: biz.businessType ?? "",
        description: biz.description ?? "",
        phone: biz.phone,
        email: biz.email,
        address: biz.address,
        city: biz.city,
        district: biz.district,
        website: biz.website ?? "",
      };
      setInfo(nextInfo);
      setInfoBase(nextInfo);
      setSocial(biz.socialMedia ?? {});
      setSocialBase(biz.socialMedia ?? {});
      const nextRules: RulesForm = {
        minNotice: biz.minimumBookingNoticeMinutes,
        maxDaysAhead: biz.maximumBookingDaysAhead,
        bufferBefore: biz.bufferBeforeMinutes ?? 0,
        bufferAfter: biz.bufferAfterMinutes ?? biz.appointmentBufferMinutes ?? 10,
        slotInterval: biz.slotIntervalMinutes ?? 15,
        allowCancel: biz.allowCancellation ?? true,
        allowReschedule: biz.allowReschedule ?? true,
        allowOnlineBooking: biz.allowOnlineBooking !== false,
        cancelDeadline: biz.cancellationDeadlineMinutes ?? 60,
        smsPreferences: {
          confirmation: biz.smsPreferences?.confirmation !== false,
          reminder: biz.smsPreferences?.reminder !== false,
          cancellation: biz.smsPreferences?.cancellation !== false,
          reschedule: biz.smsPreferences?.reschedule !== false,
        },
      };
      setRules(nextRules);
      setRulesBase(nextRules);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [businessId]);

  // Firestore'daki dinamik kategoriler
  useEffect(() => {
    listDynamicCategories().then((dynamic) => {
      const existing = new Set(DEFAULT_CATEGORY_OPTIONS.map((o) => o.value));
      const merged = [...DEFAULT_CATEGORY_OPTIONS.filter((o) => o.value !== "diger")];
      dynamic.forEach((dc) => {
        const canonicalSlug = canonicalBusinessCategory(dc.slug);
        if (!existing.has(canonicalSlug)) {
          existing.add(canonicalSlug);
          merged.push({ value: canonicalSlug, label: dc.label });
        }
      });
      // "Diğer" her zaman sonda
      merged.push({ value: "diger", label: "Diğer" });
      setCategoryOptions(merged);
    }).catch(() => {});
  }, []);

  const infoDirty = !same(info, infoBase);
  const socialDirty = !same(cleanSocial(social), cleanSocial(socialBase));
  const rulesDirty = !same(rules, rulesBase);
  const dirtyByTab: Partial<Record<Tab, boolean>> = { bilgiler: infoDirty, sosyal: socialDirty, randevu: rulesDirty };

  async function handleSaveInfo(e: FormEvent) {
    e.preventDefault();
    if (!businessId) return;

    if (!info.name.trim()) { toast.error("İşletme adı zorunludur."); return; }
    if (!info.phone.trim()) { toast.error("Telefon zorunludur."); return; }
    if (!info.email.trim()) { toast.error("E-posta zorunludur."); return; }
    if (!info.address.trim()) { toast.error("Adres zorunludur."); return; }
    if (!info.city.trim()) { toast.error("Şehir zorunludur."); return; }
    if (!info.district.trim()) { toast.error("İlçe zorunludur."); return; }

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        name: info.name.trim(),
        category: info.category,
        businessType: info.businessType || null,
        phone: info.phone.trim(),
        email: info.email.trim(),
        address: info.address.trim(),
        city: info.city.trim(),
        district: info.district.trim(),
        description: info.description.trim(),
        website: info.website.trim(),
      };

      await submitBusinessProfileChange(businessId, updateData);
      setBusiness((prev) => prev ? { ...prev, profileReviewStatus: "pending" } : prev);
      setInfoBase(info);
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
      setSocialBase(social);
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
    const { minNotice, maxDaysAhead, bufferBefore, bufferAfter, cancelDeadline } = rules;
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
        slotIntervalMinutes: rules.slotInterval,
        allowCancellation: rules.allowCancel,
        allowReschedule: rules.allowReschedule,
        allowOnlineBooking: rules.allowOnlineBooking,
        cancellationDeadlineMinutes: cancelDeadline,
        smsPreferences: rules.smsPreferences,
      });
      setRulesBase(rules);
      toast.success("Randevu ayarları güncellendi.");
    } catch {
      toast.error("Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function requestCategory() {
    if (!businessId || !customCategory.trim()) return;
    setRequestingCategory(true);
    try {
      await createCategoryRequest(businessId, info.name, customCategory.trim());
      setCategoryRequested(true);
      toast.success("Kategori isteğiniz Super Admin onayına gönderildi.");
    } catch {
      toast.error("Kategori isteği gönderilemedi.");
    } finally {
      setRequestingCategory(false);
    }
  }

  async function removeGalleryImage() {
    if (!businessId || !galleryToRemove) return;
    const updated = (business?.galleryUrls ?? []).filter((item) => item !== galleryToRemove);
    setRemovingGallery(true);
    try {
      await submitBusinessProfileChange(businessId, { galleryUrls: updated });
      setBusiness((prev) => prev ? { ...prev, profileReviewStatus: "pending" } : prev);
      toast.success("Galeri değişikliği onaya gönderildi.");
      setGalleryToRemove(null);
    } catch {
      toast.error("Değişiklik gönderilemedi.");
    } finally {
      setRemovingGallery(false);
    }
  }

  function applyBookingPreset(preset: "balanced" | "flexible" | "protected") {
    if (preset === "flexible") setRules((r) => ({ ...r, minNotice: 30, maxDaysAhead: 60, bufferBefore: 0, bufferAfter: 5, slotInterval: 15 }));
    if (preset === "balanced") setRules((r) => ({ ...r, minNotice: 60, maxDaysAhead: 45, bufferBefore: 5, bufferAfter: 10, slotInterval: 15 }));
    if (preset === "protected") setRules((r) => ({ ...r, minNotice: 180, maxDaysAhead: 30, bufferBefore: 10, bufferAfter: 15, slotInterval: 15 }));
    toast.success("Randevu profili uygulandı. Kaydederek etkinleştirebilirsiniz.");
  }

  const filteredTabs = useMemo(() => {
    const term = settingsSearch.trim().toLocaleLowerCase("tr-TR");
    return term ? TABS.filter((tab) => `${tab.label} ${tab.note}`.toLocaleLowerCase("tr-TR").includes(term)) : TABS;
  }, [settingsSearch]);

  if (loading) {
    return (
      <StudioPage label="Ayarlar yükleniyor">
        <div role="status" aria-live="polite" className={st.skeleton}>
          <Sk h={170} r={26} />
          <div className={st.layout}>
            <div className={st.skeletonNav}>{TABS.map((tab) => <Sk key={tab.id} h={56} r={16} />)}</div>
            <div className={k.panel} style={{ display: "grid", gap: 14 }}>
              <Sk h={22} w="45%" />
              {Array.from({ length: 5 }, (_, i) => <Sk key={i} h={50} r={14} />)}
            </div>
          </div>
          <span className={k.srOnly}>Ayarlar yükleniyor</span>
        </div>
      </StudioPage>
    );
  }

  const profileSignals = [info.name, info.category !== "diger" ? info.category : "", info.phone, info.email, info.address, info.city, info.district, info.description, business?.logoUrl, business?.coverUrl];
  const profileScore = Math.round(profileSignals.filter(Boolean).length / profileSignals.length * 100);
  const socialCount = Object.values(social).filter((value) => value?.trim()).length;
  const assetCount = (business?.galleryUrls?.length ?? 0) + Number(Boolean(business?.logoUrl)) + Number(Boolean(business?.coverUrl));
  const activeMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  const saveBar = activeTab === "bilgiler"
    ? <SaveBar visible={infoDirty} saving={saving} form="settings-info-form" saveLabel="Onaya gönder" note="Onaya kadar mevcut profil yayında" onReset={() => { setInfo(infoBase); setCategoryRequested(false); }} />
    : activeTab === "sosyal"
      ? <SaveBar visible={socialDirty} saving={saving} form="settings-social-form" saveLabel="Onaya gönder" note="Kontrol sonrası yayınlanır" onReset={() => setSocial(socialBase)} />
      : activeTab === "randevu"
        ? <SaveBar visible={rulesDirty} saving={saving} form="settings-rules-form" saveLabel="Kaydet" note="Uygunluk motoruna anında yansır" onReset={() => setRules(rulesBase)} />
        : null;

  return (
    <StudioPage className={st.page}>
      <StudioHero
        eyebrow="İşletme kontrol merkezi"
        icon={Sparkles}
        title="Ayarlar"
        description="Profil, marka, kanallar ve randevu kurallarını tek yerden, güvenle yönet."
        actions={business?.slug
          ? <a className={cx(k.btn, k.btnGlass)} href={`/isletme/${business.slug}`} target="_blank" rel="noreferrer"><Globe2 size={16} aria-hidden /> Profili önizle</a>
          : null}
      >
        <HeroChip icon={ShieldCheck} value={`%${profileScore}`} label="profil" />
        <HeroChip icon={AtSign} value={`${socialCount}/6`} label="kanal" />
        <HeroChip icon={Clock3} value={`${rules.slotInterval} dk`} label="slot" />
      </StudioHero>

      {business?.profileReviewStatus === "pending" && (
        <Notice tone="warn" icon={ShieldCheck} title="Yayın öncesi inceleme sürüyor">
          Gönderdiğiniz profil değişiklikleri güvenlik ve içerik kontrolünden sonra yayına alınacak. Bu sırada mevcut profiliniz kesintisiz görünür.
        </Notice>
      )}
      {business?.profileReviewStatus === "rejected" && (
        <Notice tone="bad" icon={ShieldAlert} title="Son profil değişikliği onaylanmadı">
          {business.profileReviewNote || "Bilgileri gözden geçirip yeniden gönderebilirsiniz."}
        </Notice>
      )}

      <div className={st.layout}>
        <nav className={st.nav} aria-label="Ayar bölümleri">
          <label className={st.navSearch}>
            <Search size={16} aria-hidden />
            <span className={k.srOnly}>Ayarlarda ara</span>
            <input type="search" value={settingsSearch} onChange={(event) => setSettingsSearch(event.target.value)} placeholder="Ayarlarda ara…" />
          </label>
          <div className={st.navList} role="tablist" aria-orientation="vertical">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" role="tab" aria-selected={selected} aria-controls="settings-panel" className={st.navItem} onClick={() => setActiveTab(tab.id)}>
                  <i aria-hidden><Icon size={17} strokeWidth={1.9} /></i>
                  <span><b><em className={st.long}>{tab.label}</em><em className={st.short}>{tab.short}</em></b><small>{tab.note}</small></span>
                  {dirtyByTab[tab.id] ? <span className={st.dirtyDot} aria-label="Kaydedilmemiş değişiklik" /> : null}
                </button>
              );
            })}
            {!filteredTabs.length && <p className={st.navEmpty}>Bu ifadeyle eşleşen ayar bulunamadı.</p>}
          </div>
        </nav>

        <div id="settings-panel" role="tabpanel" aria-label={activeMeta.label} className={st.content} key={activeTab}>
          {activeTab === "bilgiler" && (
            <>
              <div className={st.storeCard}>
                <span className={st.storeLogo}>{business?.logoUrl ? <Image src={business.logoUrl} alt="" width={56} height={56} /> : <Store size={24} aria-hidden />}</span>
                <span className={st.storeText}><small>Canlı mağaza kartı</small><b>{info.name || "İşletme adınız"}</b><em><MapPin size={13} aria-hidden /> {info.district || "İlçe"}, {info.city || "Şehir"}</em></span>
                <span className={st.scoreRing} style={{ ["--score" as string]: `${profileScore}` }} aria-label={`Profil %${profileScore} tamamlandı`}><b>%{profileScore}</b></span>
              </div>

              <form id="settings-info-form" className={st.form} onSubmit={handleSaveInfo}>
                <p className={k.sectionLabel}>Kimlik</p>
                <div className={st.card}>
                  <div className={cx(k.fields, k.fields2)}>
                    <label className={k.field}><span className={k.label}>İşletme adı *</span><input className={k.input} value={info.name} onChange={(e) => setInfoField("name", e.target.value)} required placeholder="Örn: Güzel Saçlar Kuaförü" /></label>
                    <label className={k.field}><span className={k.label}>Kategori *</span>
                      <select className={k.select} value={info.category} onChange={(e) => { setInfoField("category", e.target.value as BusinessCategory); setCategoryRequested(false); }}>
                        {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    {info.category === "diger" && (
                      <div className={cx(k.span2, st.categoryRequest)}>
                        <b>Kategorin listede yok mu?</b>
                        <span>İstediğin kategoriyi yaz; onay sonrası listeye eklenir ve profilin otomatik güncellenir.</span>
                        <div className={st.inline}>
                          <input className={k.input} value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Örn: Diş Kliniği, Müzik Stüdyosu..." aria-label="Yeni kategori adı" />
                          <button type="button" className={cx(k.btn, categoryRequested ? k.btnSoft : k.btnPrimary)} disabled={requestingCategory || !customCategory.trim() || categoryRequested} onClick={requestCategory}>
                            {requestingCategory ? <><LoaderCircle size={16} className={k.spin} aria-hidden /> Gönderiliyor</> : categoryRequested ? <><CheckCircle2 size={16} aria-hidden /> Gönderildi</> : <><Send size={16} aria-hidden /> Onay iste</>}
                          </button>
                        </div>
                        {categoryRequested && <small>İsteğiniz inceleniyor. Onaylanma sonrası kategoriniz otomatik olarak güncellenecektir.</small>}
                      </div>
                    )}
                    <label className={k.field}><span className={k.label}>İşletme tipi</span>
                      <select className={k.select} value={info.businessType} onChange={(e) => setInfoField("businessType", e.target.value as BusinessType | "")}>
                        {BIZ_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className={k.field}><span className={k.label}>Website</span><input className={k.input} type="url" inputMode="url" value={info.website} onChange={(e) => setInfoField("website", e.target.value)} placeholder="https://" /></label>
                    <label className={cx(k.field, k.span2)}><span className={k.label}>Açıklama</span><textarea className={k.textarea} rows={3} value={info.description} onChange={(e) => setInfoField("description", e.target.value)} placeholder="İşletmenizi kısaca tanıtın..." /><span className={k.help}>{info.description.length} karakter · Keşfet ve mağaza sayfasında görünür.</span></label>
                  </div>
                </div>

                <p className={k.sectionLabel}>İletişim</p>
                <div className={st.card}>
                  <div className={cx(k.fields, k.fields2)}>
                    <label className={k.field}><span className={k.label}>Telefon *</span><input className={k.input} type="tel" inputMode="tel" autoComplete="tel" value={info.phone} onChange={(e) => setInfoField("phone", e.target.value)} required placeholder="05XX XXX XX XX" /></label>
                    <label className={k.field}><span className={k.label}>E-posta *</span><input className={k.input} type="email" inputMode="email" autoComplete="email" value={info.email} onChange={(e) => setInfoField("email", e.target.value)} required /></label>
                  </div>
                </div>

                <p className={k.sectionLabel}>Konum</p>
                <div className={st.card}>
                  <div className={cx(k.fields, k.fields3)}>
                    <label className={k.field}><span className={k.label}>Adres *</span><input className={k.input} value={info.address} onChange={(e) => setInfoField("address", e.target.value)} required placeholder="Cadde / Sokak / No" /></label>
                    <div className={k.field}><label htmlFor="settings-city" className={k.label}>Şehir *</label>
                      <CitySelect id="settings-city" value={info.city} onChange={(city) => { if (city !== info.city) setInfoField("district", ""); setInfoField("city", city); }} placeholder="Şehir seç veya yaz" inputClassName={k.input} />
                    </div>
                    <div className={k.field}><label htmlFor="settings-district" className={k.label}>İlçe *</label>
                      <DistrictSelect id="settings-district" city={info.city} value={info.district} onChange={(district) => setInfoField("district", district)} placeholder="İlçe seç veya yaz" inputClassName={k.input} />
                    </div>
                  </div>
                </div>
                <p className={st.footnote}><ShieldCheck size={14} aria-hidden /> Profil değişiklikleri süper admin onayından sonra yayınlanır; o zamana kadar mevcut profil yayında kalır.</p>
              </form>
            </>
          )}

          {activeTab === "gorseller" && (
            <>
              <Notice tone="accent" icon={Sparkles} title={`Marka kalite rehberi · ${assetCount} varlık`}>
                Net logo, yatay kapak ve gerçek işletme fotoğrafları keşfet görünümünüzü güçlendirir. Yüklenen görseller onaydan sonra yayınlanır.
              </Notice>
              <Panel title="Logo ve kapak" icon={Images} description="Kare logo ve yatay (16:9) kapak önerilir.">
                <div className={st.uploadGrid}>
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
              </Panel>
              <Panel title="Galeri" icon={Images} description={`${business?.galleryUrls?.length ?? 0} fotoğraf · İşletmenizin içinden gerçek kareler ekleyin.`}>
                <div className={st.gallery}>
                  {(business?.galleryUrls ?? []).map((url, i) => (
                    <figure key={url} className={st.galleryItem}>
                      <Image src={url} alt={`Galeri ${i + 1}`} width={240} height={180} />
                      <button type="button" aria-label={`Galeri ${i + 1} görselini kaldır`} onClick={() => setGalleryToRemove(url)}><Trash2 size={15} aria-hidden /></button>
                    </figure>
                  ))}
                  <div className={st.galleryAdd}>
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
              </Panel>
            </>
          )}

          {activeTab === "sosyal" && (
            <form id="settings-social-form" className={st.form} onSubmit={handleSaveSocial}>
              <div className={st.socialHealth}>
                <span className={k.panelIcon}><Share2 size={19} aria-hidden /></span>
                <span><small>Dijital ayak izi</small><b>{socialCount ? `${socialCount} kanal müşterilere açık` : "Henüz kanal bağlanmadı"}</b></span>
                <i aria-hidden><em style={{ width: `${socialCount / 6 * 100}%` }} /></i>
              </div>
              <div className={st.card}>
                <div className={cx(k.fields, k.fields2)}>
                  {SOCIAL_FIELDS.map((item) => {
                    const connected = Boolean(social[item.key]?.trim());
                    return (
                      <label key={item.key} className={k.field}>
                        <span className={st.socialLabel}><span className={k.label}>{item.label}</span><span className={cx(k.pill, connected ? k.pillOk : undefined)}>{connected ? <><CheckCircle2 size={12} aria-hidden /> Bağlı</> : "Bekleniyor"}</span></span>
                        <input className={k.input} value={social[item.key] ?? ""} onChange={(e) => setSocial({ ...social, [item.key]: e.target.value })} placeholder={item.placeholder} inputMode={item.key === "whatsapp" ? "tel" : "url"} />
                      </label>
                    );
                  })}
                </div>
              </div>
              <p className={st.footnote}><Globe2 size={14} aria-hidden /> Kanallar kontrol sonrası mağaza profilinde yayınlanır.</p>
            </form>
          )}

          {activeTab === "randevu" && (
            <>
              <form id="settings-rules-form" className={st.form} onSubmit={handleSaveAppointment}>
                <p className={k.sectionLabel}>Hazır profiller</p>
                <div className={st.presets}>
                  <button type="button" onClick={() => applyBookingPreset("flexible")}><Sparkles size={17} aria-hidden /><span><b>Esnek</b><small>Daha fazla müsaitlik</small></span></button>
                  <button type="button" onClick={() => applyBookingPreset("balanced")}><Gauge size={17} aria-hidden /><span><b>Dengeli</b><small>Önerilen düzen</small></span></button>
                  <button type="button" onClick={() => applyBookingPreset("protected")}><ShieldCheck size={17} aria-hidden /><span><b>Korumalı</b><small>Geniş hazırlık süresi</small></span></button>
                </div>

                <p className={k.sectionLabel}>Online randevu</p>
                <div className={k.group}>
                  <ToggleRow title="Müşteri online randevusu" note="Açıkken müşteriler mağaza sayfandan kendi randevularını oluşturabilir." checked={rules.allowOnlineBooking} onChange={(v) => setRule("allowOnlineBooking", v)} />
                </div>

                <p className={k.sectionLabel}>Takvim penceresi</p>
                <div className={st.card}>
                  <div className={cx(k.fields, k.fields2)}>
                    <NumberField label="Minimum bildirim süresi" unit="dk" value={rules.minNotice} min={0} max={10080} onChange={(v) => setRule("minNotice", v)} help="Müşteri en az bu süre öncesinden randevu alabilir." />
                    <NumberField label="Maksimum ileri gün" unit="gün" value={rules.maxDaysAhead} min={1} max={365} onChange={(v) => setRule("maxDaysAhead", v)} help="Müşteri en fazla bu kadar gün sonrası için randevu alabilir." />
                    <label className={cx(k.field, k.span2)}><span className={k.label}>Slot aralığı</span>
                      <div className={k.seg} role="group" aria-label="Slot aralığı">
                        {[10, 15, 20, 30, 60].map((value) => <button key={value} type="button" className={k.segBtn} aria-pressed={rules.slotInterval === value} onClick={() => setRule("slotInterval", value)}>{value} dk</button>)}
                      </div>
                    </label>
                  </div>
                </div>

                <p className={k.sectionLabel}>Hazırlık süreleri (buffer)</p>
                <div className={st.card}>
                  <div className={cx(k.fields, k.fields2)}>
                    <NumberField label="Randevu öncesi hazırlık" unit="dk" value={rules.bufferBefore} min={0} max={180} onChange={(v) => setRule("bufferBefore", Math.max(0, v))} help="Hizmet başlamadan önce takvimde ayrılan süre." />
                    <NumberField label="Randevu sonrası buffer" unit="dk" value={rules.bufferAfter} min={0} max={180} onChange={(v) => setRule("bufferAfter", Math.max(0, v))} help="Temizlik, hazırlık veya mola için ayrılan süre." />
                  </div>
                </div>

                <p className={k.sectionLabel}>İptal ve yeniden planlama</p>
                <div className={k.group}>
                  <ToggleRow title="İptal izni" note="Müşteri randevuyu iptal edebilir" checked={rules.allowCancel} onChange={(v) => setRule("allowCancel", v)} />
                  <ToggleRow title="Yeniden planlama" note="Müşteri uygun başka saate geçebilir" checked={rules.allowReschedule} onChange={(v) => setRule("allowReschedule", v)} />
                  <div className={cx(k.row, st.rowField)}>
                    <span className={k.rowText}><b>İptal son tarihi</b><small>Randevuya bu süreden az kala iptal kapanır.</small></span>
                    <span className={cx(k.inputAffix, st.rowInput)}><input className={k.input} type="number" inputMode="numeric" min={0} value={String(rules.cancelDeadline)} onChange={(e) => setRule("cancelDeadline", Number(e.target.value))} aria-label="İptal son tarihi (dakika)" /><span>dk</span></span>
                  </div>
                </div>

                <p className={k.sectionLabel}>Müşteri SMS bildirimleri</p>
                <div className={k.group}>
                  {SMS_FIELDS.map(([key, label, note]) => (
                    <ToggleRow key={key} icon={MessageSquareText} title={label} note={note} checked={rules.smsPreferences[key] !== false} onChange={(checked) => setRule("smsPreferences", { ...rules.smsPreferences, [key]: checked })} />
                  ))}
                </div>
                <p className={st.footnote}><ShieldCheck size={14} aria-hidden /> Doğrulama kodu SMS’i güvenlik nedeniyle her zaman açıktır.</p>

                <div className={st.rulePreview}>
                  <Clock3 size={20} aria-hidden />
                  <span><small>Canlı kural özeti</small><b>Müşteri en erken {rules.minNotice} dk sonra, en fazla {rules.maxDaysAhead} gün ileriye randevu alabilir.</b><em>{rules.bufferBefore + rules.bufferAfter} dk toplam hazırlık · {rules.slotInterval} dk slot · iptal {rules.allowCancel ? `${rules.cancelDeadline} dk öncesine kadar` : "kapalı"}</em></span>
                </div>
              </form>

              {business && (
                <div className={st.mounted}>
                  <p className={k.sectionLabel}>Canlı sıra ve müsaitlik</p>
                  <LiveQueueSettings business={business} onChanged={(liveQueueEnabled) =>
                    setBusiness((current) => current ? { ...current, liveQueueEnabled } : current)} />
                  <BusinessAvailabilitySettings business={business} onChanged={(setting, value) =>
                    setBusiness((current) => current ? { ...current, [setting]: value } : current)} />
                  <p className={k.sectionLabel}>Randevu formu</p>
                  <BusinessBookingFieldsEditor business={business} />
                </div>
              )}
              <div className={st.mounted}>
                <p className={k.sectionLabel}>Bildirimler</p>
                <PushToggleCard audience="business" />
                <NotificationSoundSection />
                <div className={k.group}><CompanionToggleRow /></div>
              </div>
            </>
          )}

          {activeTab === "gorunum" && <AppearanceSection />}

          {saveBar}
        </div>
      </div>

      <ConfirmSheet
        open={Boolean(galleryToRemove)}
        title="Görsel galeriden kaldırılsın mı?"
        description="Değişiklik onaya gönderilir; onaylandığında görsel mağaza profilinizden kalkar."
        confirmLabel="Kaldır"
        busy={removingGallery}
        onConfirm={removeGalleryImage}
        onClose={() => setGalleryToRemove(null)}
      >
        {galleryToRemove ? <Image className={st.confirmPreview} src={galleryToRemove} alt="" width={320} height={200} /> : null}
      </ConfirmSheet>
    </StudioPage>
  );
}

/** Herkese açık sayfalardaki işletme yardımcısı (canlı randevu zili + mini panel); cihaz başına tercih. */
function CompanionToggleRow() {
  const hidden = useCompanionHidden();
  return (
    <ToggleRow
      icon={Store}
      title="Sitede işletme yardımcısı"
      note="Giriş yapmışken ana sayfa, keşfet ve mağaza sayfalarında yeni randevu zili, bildirim kartı ve mini panel (bu cihaz)."
      checked={!hidden}
      onChange={(checked) => setCompanionHidden(!checked)}
    />
  );
}

function NumberField({ label, unit, value, min, max, onChange, help }: { label: string; unit: string; value: number; min?: number; max?: number; onChange: (value: number) => void; help?: string }) {
  return (
    <label className={k.field}>
      <span className={k.label}>{label}</span>
      <span className={k.inputAffix}>
        <input className={k.input} type="number" inputMode="numeric" value={String(value)} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} />
        <span>{unit}</span>
      </span>
      {help ? <span className={k.help}>{help}</span> : null}
    </label>
  );
}
