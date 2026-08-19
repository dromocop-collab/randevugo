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

    toast.success("Hizmet eklendi! ✂️");
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
    <div className="space-y-5">
      {/* ━━━ HEADER ━━━ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">Hizmet Yönetimi</h1>
          <p className="text-sm text-[var(--text-3)]">
            Kategorilerinizi ve hizmetlerinizi yönetin
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowCategoryForm(!showCategoryForm)}
          >
            {showCategoryForm ? "İptal" : "➕ Kategori"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "İptal" : "➕ Hizmet Ekle"}
          </Button>
        </div>
      </div>

      {/* ━━━ CATEGORY MANAGEMENT ━━━ */}
      {categories.length === 0 && !showCategoryForm && (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-[linear-gradient(135deg,var(--accent)/5,var(--accent)/2)] p-6">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--accent)]/10 blur-2xl" />
          <div className="relative flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/10">
              <span className="text-2xl">📂</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[var(--text-1)]">Kategorilerinizi Oluşturun</h3>
              <p className="mt-1 text-sm text-[var(--text-3)]">
                <strong>{sectorLabel}</strong> sektörü için hazır şablon yükleyebilir veya
                özel kategoriler oluşturabilirsiniz.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSeedCategories}>
                🚀 {sectorLabel} Şablonu Yükle
              </Button>
              <Button variant="secondary" onClick={() => setShowCategoryForm(true)}>
                ✏️ Özel Ekle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Create Form ── */}
      {showCategoryForm && (
        <Card title="Yeni Kategori" description="Hizmetleriniz için özel kategori oluşturun">
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <Input
              label="Kategori Adı"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Saç Kesim, Cilt Bakımı..."
              required
            />
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--text-2)]">İkon</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setCatIcon(icon)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition ${
                      catIcon === icon
                        ? "bg-[var(--accent)] text-white shadow-lg scale-110"
                        : "bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--text-2)]">Renk</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCatColor(color)}
                    className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 ${
                      catColor === color
                        ? "border-[var(--text-1)] scale-110 shadow-lg"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ backgroundColor: catColor + "15" }}
              >
                <span className="text-lg">{catIcon}</span>
                <span className="text-sm font-medium" style={{ color: catColor }}>
                  {catName || "Önizleme"}
                </span>
              </div>
              <div className="flex-1" />
              <Button type="submit">Kategori Oluştur</Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Category Chips ── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeCategory === "all"
                ? "bg-[var(--accent)] text-white shadow-lg shadow-sky-500/20"
                : "border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            }`}
          >
            📋 Tümü
            <span className={`ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
              activeCategory === "all" ? "bg-white/20 text-white" : "bg-[var(--surface-3)] text-[var(--text-3)]"
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
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "text-white shadow-lg"
                      : "border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)] hover:shadow-md"
                  }`}
                  style={isActive ? { backgroundColor: cat.color } : undefined}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                  {count > 0 && (
                    <span className={`ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-[var(--surface-3)] text-[var(--text-3)]"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
                {/* Delete on hover */}
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white shadow-lg group-hover:flex transition hover:bg-rose-600"
                  title="Kategoriyi Sil"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {!showCategoryForm && (
            <button
              onClick={() => setShowCategoryForm(true)}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text-3)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              + Yeni
            </button>
          )}
        </div>
      )}

      {/* ━━━ SERVICE CREATE FORM ━━━ */}
      {showForm && (
        <Card title="Yeni Hizmet Ekle" description="Hizmet bilgilerini girin">
          <form onSubmit={handleCreateService} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Hizmet Adı *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Saç Kesim, Ombre..."
                required
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-1)]">
                  Kategori *
                </label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text-1)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">Kategori seçin...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-1)]">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none transition hover:bg-[var(--field-bg-hover)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Hizmet hakkında kısa açıklama..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
                İptal
              </Button>
              <Button type="submit">✂️ Hizmet Ekle</Button>
            </div>
          </form>
        </Card>
      )}

      {/* ━━━ SERVICE LIST ━━━ */}
      {services.length === 0 ? (
        <EmptyState
          title="Henüz hizmet yok"
          description="İlk hizmetinizi eklemek için yukarıdaki butonu kullanın."
        />
      ) : activeCategory === "all" ? (
        /* ── Grouped by category ── */
        <div className="space-y-6">
          {categories.map((cat) => {
            const catServices = grouped[cat.id] ?? [];
            if (catServices.length === 0) return null;
            return (
              <div key={cat.id}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold"
                    style={{ backgroundColor: cat.color + "15", color: cat.color }}
                  >
                    {cat.icon} {cat.name}
                  </span>
                  <span className="text-xs text-[var(--text-3)]">
                    {catServices.length} hizmet
                  </span>
                </div>
                <div className="space-y-2">
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
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-3)]/50 px-3 py-1.5 text-sm font-semibold text-[var(--text-3)]">
                  📋 Kategorisiz
                </span>
                <span className="text-xs text-[var(--text-3)]">{uncategorized.length} hizmet</span>
              </div>
              <div className="space-y-2">
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
        <div className="space-y-2">
          {filteredServices.length === 0 ? (
            <EmptyState
              title="Bu kategoride hizmet yok"
              description="Yeni hizmet ekleyerek bu kategoriyi doldurun."
            />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-1)]">Hizmet Düzenle</h3>
            <div className="mt-4 space-y-3">
              <Input label="Hizmet Adı" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-1)]">Açıklama</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text-1)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-1)]">Kategori</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text-1)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">Kategorisiz</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Fiyat (₺)" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                <Input label="Süre (dk)" type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingService(null)}>İptal</Button>
              <Button onClick={handleUpdateService}>💾 Kaydet</Button>
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
      className={`group relative overflow-hidden rounded-2xl border bg-[var(--surface-1)] p-4 transition-all duration-200 hover:shadow-lg sm:p-5 ${
        service.isActive
          ? "border-[var(--border)] hover:border-[var(--accent)]/30"
          : "border-rose-200/40 bg-rose-50/20 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[var(--text-1)] group-hover:text-[var(--accent)] transition">
              {service.name}
            </p>
            {categoryMeta && (
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: categoryMeta.color + "15",
                  color: categoryMeta.color,
                }}
              >
                {categoryMeta.icon} {categoryMeta.name}
              </span>
            )}
            {!service.isActive && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                Pasif
              </span>
            )}
          </div>
          {service.description && (
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-3)] line-clamp-2">
              {service.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium text-[var(--text-2)]">
              🕐 {service.durationMinutes} dk
            </span>
            <span className="text-lg font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">
              {service.price.toLocaleString("tr-TR")} ₺
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            title="Düzenle"
          >
            ✏️
          </button>
          <button
            onClick={onToggle}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm transition ${
              service.isActive
                ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
            }`}
            title={service.isActive ? "Pasif Yap" : "Aktif Yap"}
          >
            {service.isActive ? "⏸" : "▶️"}
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-sm transition hover:bg-rose-100"
            title="Sil"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
