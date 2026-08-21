"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import {
  createService,
  listServices,
  removeService,
  updateService,
} from "@/features/services/service-repository";
import {
  listServiceCategories,
  createServiceCategory,
  deleteServiceCategory,
  seedDefaultCategories,
} from "@/features/services/service-category-repository";
import { getBusinessById } from "@/features/businesses/business-repository";
import { firstErrorMessage, serviceCreateSchema } from "@/lib/validation/schemas";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import { SECTOR_TEMPLATES } from "@/constants/service-category-templates";
import {
  FolderOpen,
  Plus,
  Rocket,
  Pencil,
  Trash2,
  Pause,
  Play,
  Clock,
  Sparkles,
  Scissors,
  X,
  Check,
  ChevronDown,
  Info
} from "lucide-react";

/* ── Colours for category picker ─────────────────── */
const CATEGORY_COLORS = [
  "#0ea5e9", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#d946ef", "#6366f1", "#64748b",
];

const CATEGORY_ICONS = [
  "✂️", "🎨", "💆", "💅", "🏋️", "🩺", "📋", "🐾",
  "📚", "🔧", "💄", "🧴", "👁️", "🦷", "💉", "🧘",
  "🪒", "🧔", "💨", "🌈", "✨", "🔗", "👰", "🥊",
  "💪", "🧠", "💼", "⚖️", "📊", "🌍", "💻", "📝",
];

export default function ServicesPage() {
  const { businessId } = useBusiness();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [businessSector, setBusinessSector] = useState<string>("diger");

  /* ── New Service Form ─────────────────────────── */
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [duration, setDuration] = useState("30");
  const [serviceCategory, setServiceCategory] = useState("");

  /* ── New Category Form ────────────────────────── */
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("✂️");
  const [catColor, setCatColor] = useState("#0ea5e9");

  /* ── Edit Service ─────────────────────────────── */
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editCategory, setEditCategory] = useState("");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    Promise.all([
      listServices(businessId),
      listServiceCategories(businessId),
      getBusinessById(businessId),
    ]).then(([svc, cats, biz]) => {
      if (cancelled) return;
      setServices(svc);
      setCategories(cats);
      if (biz?.category) setBusinessSector(biz.category);
    });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  async function reload() {
    if (!businessId) return;
    const [svc, cats] = await Promise.all([
      listServices(businessId),
      listServiceCategories(businessId),
    ]);
    setServices(svc);
    setCategories(cats);
  }

  /* ── Seed default categories from sector template ── */
  async function handleSeedCategories() {
    if (!businessId) return;
    try {
      await seedDefaultCategories(businessId, businessSector);
      await reload();
      toast.success("Sektör şablonu yüklendi! 🎉");
    } catch {
      toast.error("Şablon yüklenirken hata oluştu.");
    }
  }

  /* ── Create Category ─────────────────────────────── */
  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    if (!businessId || !catName.trim()) return;
    try {
      await createServiceCategory(businessId, {
        name: catName.trim(),
        icon: catIcon,
        color: catColor,
        sortOrder: categories.length,
      });
      setCatName("");
      setCatIcon("✂️");
      setCatColor("#0ea5e9");
      setShowCategoryForm(false);
      await reload();
      toast.success("Kategori oluşturuldu!");
    } catch {
      toast.error("Kategori oluşturulamadı.");
    }
  }

  /* ── Delete Category ─────────────────────────────── */
  async function handleDeleteCategory(catId: string) {
    if (!businessId) return;
    const hasServices = services.some((s) => s.category === catId);
    if (hasServices) {
      toast.error("Bu kategoride hizmetler var. Önce hizmetleri taşıyın.");
      return;
    }
    try {
      await deleteServiceCategory(businessId, catId);
      if (activeCategory === catId) setActiveCategory("all");
      await reload();
      toast.success("Kategori silindi.");
    } catch {
      toast.error("Kategori silinemedi.");
    }
  }

  /* ── Create Service ──────────────────────────────── */
  async function handleCreateService(e: FormEvent) {
    e.preventDefault();
    if (!businessId) return;

    const validated = serviceCreateSchema.safeParse({
      name,
      category: serviceCategory,
      description,
      price,
      duration,
    });
    if (!validated.success) {
      toast.error(firstErrorMessage(validated.error));
      return;
    }

    const { name: n, category: c, description: d, price: p, duration: dur } = validated.data;

    await createService(businessId, {
      name: n,
      description: d ?? "",
      category: c,
      price: p,
      durationMinutes: dur,
      currency: "TRY",
      isActive: true,
      isBookableOnline: true,
      requiresDeposit: false,
      depositAmount: 0,
      assignableStaffIds: [],
      imageUrl: "",
      sortOrder: services.length,
    });

    toast.success("Hizmet başarıyla eklendi! ✨");
    setName("");
    setDescription("");
    setPrice("0");
    setDuration("30");
    setServiceCategory("");
    setShowForm(false);
    await reload();
  }

  /* ── Update Service ──────────────────────────────── */
  async function handleUpdateService() {
    if (!businessId || !editingService) return;
    try {
      await updateService(businessId, editingService.id, {
        name: editName,
        description: editDescription,
        category: editCategory,
        price: Number(editPrice),
        durationMinutes: Number(editDuration),
      });
      setEditingService(null);
      await reload();
      toast.success("Hizmet güncellendi.");
    } catch {
      toast.error("Güncelleme başarısız.");
    }
  }

  function startEdit(s: Service) {
    setEditingService(s);
    setEditName(s.name);
    setEditDescription(s.description || "");
    setEditPrice(String(s.price));
    setEditDuration(String(s.durationMinutes));
    setEditCategory(s.category || "");
  }

  /* ── Filtered & grouped ──────────────────────────── */
  const filteredServices = activeCategory === "all"
    ? services
    : services.filter((s) => s.category === activeCategory);

  const getCategoryMeta = (catId: string) =>
    categories.find((c) => c.id === catId);

  // Group services by category
  const grouped = categories.reduce<Record<string, Service[]>>((acc, cat) => {
    acc[cat.id] = services.filter((s) => s.category === cat.id);
    return acc;
  }, {});
  // Uncategorized
  const uncategorized = services.filter(
    (s) => !s.category || !categories.some((c) => c.id === s.category)
  );

  const sectorLabel =
    SECTOR_TEMPLATES[businessSector]?.label ?? "Genel";

  return (
    <div className="space-y-6">
      {/* ━━━ HEADER ━━━ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-1)]">Hizmet Yönetimi</h1>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Kategorilerinizi ve sunduğunuz hizmetleri buradan yönetebilirsiniz.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleSeedCategories}
            className="gap-2 font-semibold"
          >
            <Rocket size={16} className="text-[var(--accent)]" /> Eksik Kategorileri Yükle
          </Button>

          <Button
            variant="secondary"
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="gap-2 font-semibold"
          >
            {showCategoryForm ? <X size={16} /> : <FolderOpen size={16} />} 
            {showCategoryForm ? "İptal Et" : "Kategori Ekle"}
          </Button>

          <Button 
            onClick={() => setShowForm(!showForm)}
            className="gap-2 bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white hover:brightness-110 shadow-lg shadow-sky-500/20 font-bold border-0"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "İptal Et" : "Hizmet Ekle"}
          </Button>
        </div>
      </div>

      {/* ━━━ CATEGORY MANAGEMENT ━━━ */}
      {categories.length === 0 && !showCategoryForm && (
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-8 shadow-xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[var(--accent-3)]/10 blur-3xl" />
          
          <div className="relative z-10 flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/25">
              <Sparkles size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-[var(--text-1)]">Kategorilerinizi Oluşturun</h3>
              <p className="mt-1.5 text-sm text-[var(--text-3)] max-w-xl">
                Sistem <strong>{sectorLabel}</strong> sektörü için hazır şablon kategoriler oluşturabilir, veya kendi özel kategorilerinizi ekleyebilirsiniz.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleSeedCategories} className="gap-2 font-bold bg-[var(--text-1)] text-[var(--bg-1)] hover:bg-[var(--text-2)] border-0">
                <Rocket size={16} /> Şablonu Yükle
              </Button>
              <Button variant="secondary" onClick={() => setShowCategoryForm(true)} className="gap-2 font-semibold">
                <Pencil size={16} /> Özel Ekle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Create Form ── */}
      {showCategoryForm && (
        <Card title="Yeni Kategori Oluştur" description="Hizmetlerinizi gruplamak için yeni bir kategori ekleyin">
          <form onSubmit={handleCreateCategory} className="space-y-6">
            <Input
              label="Kategori Adı"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Örn: Saç Kesim, Cilt Bakımı..."
              required
            />
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">İkon Seçin</p>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-2 scrollbar-thin">
                  {CATEGORY_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCatIcon(icon)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all duration-200 ${catIcon === icon
                        ? "bg-[var(--text-1)] text-[var(--bg-1)] shadow-md scale-110"
                        : "bg-[var(--field-bg)] hover:bg-[var(--surface-3)]"
                        }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Renk Seçin</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatColor(color)}
                      className={`relative h-10 w-10 rounded-full border-2 transition-all duration-200 hover:scale-110 ${catColor === color
                        ? "scale-110 shadow-lg border-[var(--text-1)]"
                        : "border-transparent"
                        }`}
                      style={{ backgroundColor: color }}
                    >
                      {catColor === color && <Check size={16} className="absolute inset-0 m-auto text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <div className="flex flex-1 items-center gap-3">
                <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">Önizleme:</span>
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-2 shadow-sm"
                  style={{ backgroundColor: catColor + "15", border: `1px solid ${catColor}30` }}
                >
                  <span className="text-xl">{catIcon}</span>
                  <span className="text-sm font-bold tracking-tight" style={{ color: catColor }}>
                    {catName || "Kategori Adı"}
                  </span>
                </div>
              </div>
              <Button type="submit" className="gap-2 font-bold px-6 border-0" style={{ background: catColor, color: '#fff' }}>
                Oluştur
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Category Chips ── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:scale-[1.02] ${activeCategory === "all"
              ? "bg-[var(--text-1)] text-[var(--bg-1)] shadow-lg"
              : "border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:shadow-md"
              }`}
          >
            Tümü
            <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] ${activeCategory === "all" ? "bg-[var(--bg-1)] text-[var(--text-1)]" : "bg-[var(--surface-3)] text-[var(--text-3)]"
              }`}>
              {services.length}
            </span>
          </button>
          {categories.map((cat) => {
            const count = services.filter((s) => s.category === cat.id).length;
            const isActive = activeCategory === cat.id;
            return (
              <div key={cat.id} className="group relative">
                <button
                  onClick={() => setActiveCategory(isActive ? "all" : cat.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:scale-[1.02] ${isActive
                    ? "text-white shadow-lg"
                    : "border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)] hover:shadow-md"
                    }`}
                  style={isActive ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                  {count > 0 && (
                    <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] ${isActive ? "bg-black/20 text-white" : "bg-[var(--surface-3)] text-[var(--text-3)]"
                      }`}>
                      {count}
                    </span>
                  )}
                </button>
                {/* Delete on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat.id);
                  }}
                  className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg group-hover:flex transition hover:bg-rose-600 hover:scale-110 z-10"
                  title="Kategoriyi Sil"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            );
          })}
          {!showCategoryForm && (
            <button
              onClick={() => setShowCategoryForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-3)] transition-all hover:border-[var(--text-1)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]"
            >
              <Plus size={16} /> Yeni
            </button>
          )}
        </div>
      )}

      {/* ━━━ SERVICE CREATE FORM ━━━ */}
      {showForm && (
        <Card title="Yeni Hizmet Ekle" description="Hizmet detaylarını ve fiyatlandırmasını belirleyin">
          <form onSubmit={handleCreateService} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Hizmet Adı *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Klasik Cilt Bakımı"
                required
              />
              <div className="relative">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">
                  Kategori *
                </label>
                <div className="relative">
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    required
                    className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm font-medium text-[var(--text-1)] transition hover:border-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    <option value="" disabled>Kategori seçin...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-3.5 text-[var(--text-3)] pointer-events-none" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder:text-[var(--text-3)]/60 transition hover:bg-[var(--field-bg-hover)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Hizmetin içeriği hakkında müşterilerinize kısa bir bilgi verin..."
              />
            </div>
            
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Fiyat (₺) *"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <Input
                label="Süre (dk) *"
                type="number"
                step="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 mt-2">
              <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-3)]">
                <Info size={14} className="text-[var(--accent)]" /> Zorunlu alanları (*) doldurduğunuzdan emin olun.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={() => setShowForm(false)} className="px-5 font-semibold">
                  İptal
                </Button>
                <Button type="submit" className="gap-2 bg-[var(--text-1)] text-[var(--bg-1)] hover:bg-[var(--text-2)] font-bold px-6 border-0">
                  <Scissors size={16} /> Hizmet Ekle
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* ━━━ SERVICE LIST ━━━ */}
      {services.length === 0 ? (
        <EmptyState
          title="Müşterilerinize sunacağınız hizmetleri ekleyin"
          description="Randevu alabilecekleri hizmetler oluşturarak hemen kazanmaya başlayın."
        />
      ) : activeCategory === "all" ? (
        /* ── Grouped by category ── */
        <div className="space-y-8 mt-4">
          {categories.map((cat) => {
            const catServices = grouped[cat.id] ?? [];
            if (catServices.length === 0) return null;
            return (
              <div key={cat.id} className="animate-[fadeSlideIn_0.4s_ease]">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
                    style={{ backgroundColor: cat.color + "20", border: `1px solid ${cat.color}40` }}
                  >
                    <span className="text-xl drop-shadow-sm">{cat.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-1)]">{cat.name}</h3>
                    <p className="text-xs font-medium text-[var(--text-3)]">{catServices.length} Aktif Hizmet</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {catServices.map((item) => (
                    <ServiceCard
                      key={item.id}
                      service={item}
                      categoryMeta={getCategoryMeta(item.category)}
                      onToggle={async () => {
                        await updateService(businessId!, item.id, { isActive: !item.isActive });
                        await reload();
                      }}
                      onDelete={async () => {
                        await removeService(businessId!, item.id);
                        await reload();
                        toast.success("Hizmet silindi.");
                      }}
                      onEdit={() => startEdit(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {/* Uncategorized */}
          {uncategorized.length > 0 && (
            <div className="animate-[fadeSlideIn_0.5s_ease]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-3)]">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[var(--text-2)]">Kategorisiz Hizmetler</h3>
                  <p className="text-xs font-medium text-[var(--text-3)]">{uncategorized.length} Hizmet</p>
                </div>
              </div>
              <div className="grid gap-3">
                {uncategorized.map((item) => (
                  <ServiceCard
                    key={item.id}
                    service={item}
                    categoryMeta={undefined}
                    onToggle={async () => {
                      await updateService(businessId!, item.id, { isActive: !item.isActive });
                      await reload();
                    }}
                    onDelete={async () => {
                      await removeService(businessId!, item.id);
                      await reload();
                      toast.success("Hizmet silindi.");
                    }}
                    onEdit={() => startEdit(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Filtered view ── */
        <div className="grid gap-3 mt-4">
          {filteredServices.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-12 text-center shadow-sm">
              <FolderOpen size={48} className="mx-auto text-[var(--text-3)] opacity-50" strokeWidth={1} />
              <h3 className="mt-4 text-lg font-bold text-[var(--text-1)]">Bu kategoride hizmet yok</h3>
              <p className="mt-2 text-sm text-[var(--text-3)] max-w-md mx-auto">
                Bu kategori için yeni bir hizmet ekleyerek müşterilerinize sunmaya başlayın.
              </p>
              <Button onClick={() => setShowForm(true)} className="mt-6 gap-2 bg-[var(--text-1)] text-[var(--bg-1)]">
                <Plus size={16} /> Yeni Hizmet Ekle
              </Button>
            </div>
          ) : (
            filteredServices.map((item) => (
              <ServiceCard
                key={item.id}
                service={item}
                categoryMeta={getCategoryMeta(item.category)}
                onToggle={async () => {
                  await updateService(businessId!, item.id, { isActive: !item.isActive });
                  await reload();
                }}
                onDelete={async () => {
                  await removeService(businessId!, item.id);
                  await reload();
                  toast.success("Hizmet silindi.");
                }}
                onEdit={() => startEdit(item)}
              />
            ))
          )}
        </div>
      )}

      {/* ━━━ EDIT MODAL ━━━ */}
      {editingService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease]">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-1)] shadow-2xl animate-[scaleIn_0.3s_ease]">
            <div className="border-b border-[var(--border)] bg-[var(--surface-2)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-[var(--text-1)]">Hizmeti Düzenle</h3>
                  <p className="text-xs font-medium text-[var(--text-3)] mt-1">
                    {editingService.name} bilgilerini güncelliyorsunuz
                  </p>
                </div>
                <button
                  onClick={() => setEditingService(null)}
                  className="rounded-full bg-[var(--surface-3)] p-2 text-[var(--text-2)] hover:bg-[var(--text-1)] hover:text-[var(--bg-1)] transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Hizmet Adı" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <div className="relative">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">Kategori</label>
                  <div className="relative">
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm font-medium text-[var(--text-1)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    >
                      <option value="">Kategorisiz</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-3.5 text-[var(--text-3)] pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">Açıklama</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm font-medium text-[var(--text-1)] outline-none transition hover:bg-[var(--field-bg-hover)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Fiyat (₺)" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                <Input label="Süre (dk)" type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
              </div>
            </div>
            
            <div className="border-t border-[var(--border)] bg-[var(--surface-2)] p-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditingService(null)} className="px-6 font-semibold">
                İptal Et
              </Button>
              <Button onClick={handleUpdateService} className="gap-2 px-8 font-bold bg-[var(--text-1)] text-[var(--bg-1)] border-0 hover:bg-[var(--text-2)]">
                <Check size={16} /> Değişiklikleri Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Service Card Component ─────────────────────── */
function ServiceCard({
  service,
  categoryMeta,
  onToggle,
  onDelete,
  onEdit,
}: {
  service: Service;
  categoryMeta?: ServiceCategory;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl sm:p-5 p-4 ${service.isActive
        ? "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--accent)]/40 hover:-translate-y-1"
        : "border-rose-500/20 bg-rose-500/5 opacity-75 hover:opacity-100"
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h4 className="text-lg font-bold tracking-tight text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">
              {service.name}
            </h4>
            
            {!service.isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-500 border border-rose-500/20">
                <Pause size={10} strokeWidth={3} /> Pasif
              </span>
            )}
            
            {categoryMeta && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
                style={{
                  backgroundColor: categoryMeta.color + "10",
                  color: categoryMeta.color,
                  borderColor: categoryMeta.color + "25"
                }}
              >
                {categoryMeta.icon} {categoryMeta.name}
              </span>
            )}
          </div>
          
          {service.description ? (
            <p className="mt-1.5 text-xs font-medium leading-relaxed text-[var(--text-3)] line-clamp-2 max-w-2xl">
              {service.description}
            </p>
          ) : (
            <p className="mt-1 text-xs italic text-[var(--text-3)]/50">
              Açıklama bulunmuyor
            </p>
          )}
          
          <div className="mt-3.5 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-2)] bg-[var(--surface-3)] px-2.5 py-1 rounded-lg">
              <Clock size={14} className="text-[var(--text-3)]" /> 
              {service.durationMinutes} dakika
            </div>
            <div className="flex items-center gap-1.5 text-lg font-black tracking-tight bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent drop-shadow-sm">
              {service.price.toLocaleString("tr-TR")} ₺
            </div>
          </div>
        </div>
        
        <div className="flex shrink-0 items-center gap-2 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-4 sm:pt-0 sm:pl-5">
          <button
            onClick={onEdit}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] shadow-sm transition-all hover:scale-105 hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
            title="Hizmeti Düzenle"
          >
            <Pencil size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={onToggle}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all hover:scale-105 ${service.isActive
              ? "border-amber-500/20 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white"
              }`}
            title={service.isActive ? "Hizmeti Duraklat" : "Hizmeti Aktifleştir"}
          >
            {service.isActive ? <Pause size={18} strokeWidth={2.5} /> : <Play size={18} strokeWidth={2.5} />}
          </button>
          <button
            onClick={onDelete}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 shadow-sm transition-all hover:scale-105 hover:bg-rose-500 hover:text-white"
            title="Hizmeti Sil"
          >
            <Trash2 size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
