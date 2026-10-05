"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FolderCog, FolderOpen, Layers3, Plus, Rocket, Scissors, Sparkles, Tag } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import {
  listServices,
  removeService,
  updateService,
} from "@/features/services/service-repository";
import {
  listServiceCategories,
  createServiceCategory,
  deleteServiceCategory,
  updateServiceCategory,
  seedDefaultCategories,
  normalizeCategoryName,
} from "@/features/services/service-category-repository";
import { getBusinessById } from "@/features/businesses/business-repository";
import { listStaff, updateStaff } from "@/features/staff/staff-repository";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import { getCategoryTemplates, SECTOR_TEMPLATES } from "@/constants/service-category-templates";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import {
  Badge, Button, DashPage, EmptyState, PageHeader, SearchField, SegmentedControl, Skeleton, SkeletonList, Toolbar,
} from "@/components/dashboard/ui";
import { cx, matchesSearch, useConfirm, ws } from "../_workspace/kit";
import { ServiceRow } from "./service-row";
import { ServiceEditorSheet } from "./service-editor-sheet";
import { CategoryEditorSheet, CategoryManagerSheet, DeleteCategorySheet } from "./category-sheets";
import { TemplateLibrarySheet } from "./template-library-sheet";
import { bySortOrder, reorderPatch, serviceStatus, type ServiceStatusFilter } from "./service-shared";
import styles from "./services.module.css";

const UNCATEGORIZED = "__none__";

export default function ServicesPage() {
  const { businessId } = useBusiness();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<ServiceStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [businessSector, setBusinessSector] = useState<string>("diger");
  const [businessType, setBusinessType] = useState<"kadin" | "erkek" | "unisex">("unisex");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const { confirm, dialog } = useConfirm();
  const layerKey = useRef(0);
  const nextKey = () => ++layerKey.current;

  // Katmanlar
  const [editor, setEditor] = useState<{ key: number; service: Service | null; categoryId?: string } | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [categoryEditor, setCategoryEditor] = useState<{ key: number; category: ServiceCategory | null } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ServiceCategory | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    Promise.all([
      listServices(businessId),
      listServiceCategories(businessId),
      getBusinessById(businessId),
      listStaff(businessId).catch(() => [] as Staff[]),
    ]).then(([svc, cats, biz, team]) => {
      if (cancelled) return;
      setServices(svc);
      setCategories(cats);
      setStaff(team);
      if (biz?.category) setBusinessSector(biz.category);
      if (biz?.businessType) setBusinessType(biz.businessType);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
      toast.error("Hizmetler yüklenemedi.");
    });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const reload = useCallback(async () => {
    if (!businessId) return;
    const [svc, cats, team] = await Promise.all([
      listServices(businessId),
      listServiceCategories(businessId),
      listStaff(businessId).catch(() => null),
    ]);
    setServices(svc);
    setCategories(cats);
    if (team) setStaff(team);
  }, [businessId]);

  /* ── Hazır kütüphane ── */
  const canonicalSector = canonicalBusinessCategory(businessSector);
  const sectorTemplates = getCategoryTemplates(canonicalSector, businessType);
  const existingCategoryNames = new Set(categories.map((category) => normalizeCategoryName(category.name)));
  const missingServiceCountForTemplate = (template: (typeof sectorTemplates)[number]) => {
    const templateKey = normalizeCategoryName(template.name);
    if (!existingCategoryNames.has(templateKey)) return template.services.length;
    const category = categories.find((item) => normalizeCategoryName(item.name) === templateKey);
    if (!category) return template.services.length;
    const serviceNames = new Set(
      services.filter((item) => item.category === category.id).map((item) => normalizeCategoryName(item.name)),
    );
    return template.services.filter((item) => !serviceNames.has(normalizeCategoryName(item.name))).length;
  };
  const missingTemplates = sectorTemplates.filter((template) => missingServiceCountForTemplate(template) > 0);
  const seededCategories = categories.filter((category) => category.templateSource === canonicalSector);
  const sectorLabel = SECTOR_TEMPLATES[canonicalSector]?.label ?? "Genel";
  const businessTypeLabel = businessType === "kadin" ? "Kadın işletmesi" : businessType === "erkek" ? "Erkek işletmesi" : "Unisex işletme";

  async function handleSeedCategories(selectedTemplates: string[]) {
    if (!businessId || selectedTemplates.length === 0) return;
    setTemplateBusy(true);
    try {
      const result = await seedDefaultCategories(businessId, businessSector, selectedTemplates, businessType);
      await reload();
      setShowTemplatePicker(false);
      const migratedText = result.servicesMigrated > 0 ? ` ${result.servicesMigrated} mevcut hizmet doğru başlığa taşındı.` : "";
      toast.success(
        result.categoriesAdded > 0 || result.servicesAdded > 0 || result.servicesMigrated > 0
          ? `${result.categoriesAdded} ana başlık ve ${result.servicesAdded} hazır hizmet eklendi.${migratedText} Fiyat girilen hizmetler otomatik yayına alınır.`
          : "Seçtiğiniz hizmet grupları zaten eksiksiz.",
        { duration: 7000 },
      );
      if (result.servicesAdded > 0) setStatusFilter("draft");
    } catch {
      toast.error("Şablon yüklenirken hata oluştu.");
    } finally {
      setTemplateBusy(false);
    }
  }

  async function handleRemoveTemplateCategories() {
    if (!businessId || seededCategories.length === 0) return;
    const linkedCount = services.filter((service) => seededCategories.some((category) => category.id === service.category)).length;
    const ok = await confirm({
      title: `${seededCategories.length} hazır kategori kaldırılsın mı?`,
      description: linkedCount
        ? `Bu kategorilerdeki ${linkedCount} hizmet silinmeyecek, “Kategorisiz” alanına taşınacak. Özel kategorileriniz korunur.`
        : "Yalnızca hazır paketten gelen kategoriler kaldırılır; özel kategorileriniz korunur.",
      confirmLabel: "Kaldır",
    });
    if (!ok) return;
    setTemplateBusy(true);
    try {
      const categoryIds = new Set(seededCategories.map((category) => category.id));
      await Promise.all([
        ...services.filter((service) => categoryIds.has(service.category)).map((service) => updateService(businessId, service.id, { category: "" })),
        ...seededCategories.map((category) => deleteServiceCategory(businessId, category.id)),
      ]);
      if (categoryIds.has(activeCategory)) setActiveCategory("all");
      await reload();
      toast.success("Hazır kategori paketi kaldırıldı. Özel kategorileriniz korundu.");
    } catch {
      toast.error("Hazır kategoriler kaldırılırken hata oluştu.");
    } finally {
      setTemplateBusy(false);
    }
  }

  /* ── Kategori işlemleri ── */
  async function handleSubmitCategory(category: ServiceCategory | null, input: { name: string; icon: string; color: string }) {
    if (!businessId) return false;
    try {
      if (category) {
        await updateServiceCategory(businessId, category.id, input);
        toast.success("Kategori güncellendi.");
      } else {
        await createServiceCategory(businessId, { ...input, sortOrder: categories.length });
        toast.success("Kategori oluşturuldu.");
      }
      await reload();
      return true;
    } catch {
      toast.error(category ? "Kategori güncellenemedi." : "Kategori oluşturulamadı.");
      return false;
    }
  }

  async function handleDeleteCategory(catId: string, replacementCategoryId: string) {
    if (!businessId) return;
    try {
      const linkedServices = services.filter((service) => service.category === catId);
      const allStaff = await listStaff(businessId);
      const linkedStaff = allStaff.filter((member) => member.specialtyCategoryIds?.includes(catId));
      if (linkedStaff.length > 0 && !replacementCategoryId) {
        toast.error("Bağlı çalışanlar için taşınacak branşı seçin.");
        return;
      }
      const replacementServiceIds = services.filter((service) => service.category === replacementCategoryId).map((service) => service.id);
      await Promise.all(
        [
          ...linkedServices.map((service) => updateService(businessId, service.id, { category: "" })),
          ...linkedStaff.map((member) => updateStaff(businessId, member.id, {
            specialtyCategoryIds: Array.from(new Set((member.specialtyCategoryIds ?? []).map((id) => id === catId ? replacementCategoryId : id))),
            serviceIds: Array.from(new Set([
              ...member.serviceIds.filter((id) => !linkedServices.some((service) => service.id === id)),
              ...replacementServiceIds,
            ])),
          })),
        ],
      );
      await deleteServiceCategory(businessId, catId);
      if (activeCategory === catId) setActiveCategory("all");
      setDeletingCategory(null);
      await reload();
      toast.success("Kategori silindi.");
    } catch {
      toast.error("Kategori silinemedi.");
    }
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    if (!businessId) return;
    const patch = reorderPatch(categories, index, direction);
    if (!patch.length) return;
    setOrderBusy(true);
    const byId = new Map(patch.map((item) => [item.id, item.sortOrder]));
    setCategories((current) => current.map((item) => byId.has(item.id) ? { ...item, sortOrder: byId.get(item.id)! } : item).sort(bySortOrder));
    try {
      await Promise.all(patch.map((item) => updateServiceCategory(businessId, item.id, { sortOrder: item.sortOrder })));
    } catch {
      toast.error("Sıralama kaydedilemedi.");
      await reload();
    } finally {
      setOrderBusy(false);
    }
  }

  /* ── Hizmet işlemleri ── */
  async function handleQuickPrice(item: Service, nextPrice: number) {
    if (!businessId) return;
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      toast.error("Fiyat sıfırdan büyük olmalı.");
      throw new Error("invalid-price");
    }
    await updateService(businessId, item.id, {
      price: nextPrice,
      ...(item.templateDraft
        ? { isActive: true, isBookableOnline: true, templateDraft: false }
        : {}),
    });
    await reload();
    toast.success(item.templateDraft
      ? `${item.name} fiyatlandırıldı ve yayına alındı.`
      : `${item.name} fiyatı güncellendi.`);
  }

  async function handleToggleService(item: Service) {
    if (!businessId) return;
    if (!item.isActive && item.templateDraft && item.price <= 0) {
      setEditor({ key: nextKey(), service: item });
      toast.info("Hizmeti yayınlamak için önce fiyatını girin.");
      return;
    }
    try {
      await updateService(businessId, item.id, {
        isActive: !item.isActive,
        isBookableOnline: !item.isActive,
        ...(!item.isActive ? { templateDraft: false } : {}),
      });
      await reload();
      toast.success(item.isActive ? `${item.name} duraklatıldı.` : `${item.name} yayında.`);
    } catch {
      toast.error("Hizmet durumu değiştirilemedi.");
    }
  }

  async function handleDeleteService(item: Service) {
    if (!businessId) return;
    const ok = await confirm({
      title: "Hizmet silinsin mi?",
      description: `“${item.name}” kalıcı olarak silinecek. Geçmiş randevular etkilenmez; geçici olarak kaldırmak isterseniz silmek yerine duraklatabilirsiniz.`,
      confirmLabel: "Sil",
    });
    if (!ok) return;
    try {
      await removeService(businessId, item.id);
      await reload();
      toast.success("Hizmet silindi.");
    } catch {
      toast.error("Hizmet silinemedi.");
    }
  }

  async function moveService(group: Service[], index: number, direction: -1 | 1) {
    if (!businessId) return;
    const patch = reorderPatch(group, index, direction);
    if (!patch.length) return;
    setOrderBusy(true);
    const byId = new Map(patch.map((item) => [item.id, item.sortOrder]));
    setServices((current) => current.map((item) => byId.has(item.id) ? { ...item, sortOrder: byId.get(item.id)! } : item));
    try {
      await Promise.all(patch.map((item) => updateService(businessId, item.id, { sortOrder: item.sortOrder })));
    } catch {
      toast.error("Sıralama kaydedilemedi.");
      await reload();
    } finally {
      setOrderBusy(false);
    }
  }

  /* ── Görünüm ── */
  const staffCountByService = useMemo(() => {
    const counts: Record<string, number> = {};
    staff.filter((member) => !member.archivedAt && member.isActive).forEach((member) => member.serviceIds.forEach((id) => { counts[id] = (counts[id] ?? 0) + 1; }));
    return counts;
  }, [staff]);
  const statusCounts = useMemo(() => ({
    all: services.length,
    live: services.filter((item) => serviceStatus(item) === "live").length,
    paused: services.filter((item) => serviceStatus(item) === "paused").length,
    draft: services.filter((item) => serviceStatus(item) === "draft").length,
  }), [services]);
  const uncategorized = services.filter((s) => !s.category || !categories.some((c) => c.id === s.category));
  const filtering = Boolean(search.trim()) || statusFilter !== "all";
  const groups = useMemo(() => {
    const matches = (service: Service) =>
      (statusFilter === "all" || serviceStatus(service) === statusFilter) &&
      matchesSearch(search, service.name, service.description);
    const list = [
      ...categories.map((category) => ({ id: category.id, category, items: services.filter((s) => s.category === category.id) })),
      { id: UNCATEGORIZED, category: undefined as ServiceCategory | undefined, items: uncategorized },
    ];
    return list
      .filter((group) => activeCategory === "all" || group.id === activeCategory)
      .map((group) => ({ ...group, all: [...group.items].sort(bySortOrder), items: group.items.filter(matches).sort(bySortOrder) }))
      .filter((group) => group.items.length > 0);
  }, [activeCategory, categories, search, services, statusFilter, uncategorized]);
  const visibleCount = groups.reduce((total, group) => total + group.items.length, 0);

  const openCreate = (categoryId?: string) => setEditor({
    key: nextKey(),
    service: null,
    categoryId: categoryId && categoryId !== UNCATEGORIZED ? categoryId : activeCategory !== "all" && activeCategory !== UNCATEGORIZED ? activeCategory : undefined,
  });

  if (loading) {
    return (
      <DashPage>
        <Skeleton height={150} radius={24} />
        <Skeleton height={48} radius={16} />
        <SkeletonList rows={5} height={96} label="Hizmetler yükleniyor" />
      </DashPage>
    );
  }

  return (
    <DashPage>
      <PageHeader
        eyebrow="Hizmet menüsü"
        icon={Scissors}
        title="Hizmetleriniz"
        description="Gruplarınızı, sürelerinizi ve fiyatlarınızı yönetin. Değişiklikler mağaza vitrininize anında yansır."
        actions={<>
          <Button variant="bright" icon={Plus} onClick={() => openCreate()}>Hizmet ekle</Button>
          <Button variant="glass" icon={Rocket} onClick={() => setShowTemplatePicker(true)}>Hazır kütüphane</Button>
          <Button variant="glass" icon={FolderCog} onClick={() => setShowCategories(true)}>Kategoriler</Button>
        </>}
        meta={<>
          <Badge tone="accent" icon={Scissors}>{statusCounts.live} yayında</Badge>
          {statusCounts.draft ? <Badge tone="amber" icon={Tag} pulse>{statusCounts.draft} fiyat bekliyor</Badge> : null}
          <Badge tone="neutral" icon={Layers3}>{categories.length} kategori</Badge>
        </>}
      />

      {services.length === 0 ? (
        <EmptyState
          mascot="wave"
          title={categories.length ? "İlk hizmetinizi ekleyin" : "Hizmet menünüzü birlikte kuralım"}
          description={categories.length
            ? "Müşterilerin randevu alacağı hizmetleri ekleyin; süre ve fiyatı belirleyin."
            : `${sectorLabel} sektörüne uygun hazır başlıkları tek dokunuşla yükleyebilir veya kendi hizmetinizi ekleyebilirsiniz.`}
          action={<>
            <Button variant="primary" icon={Rocket} onClick={() => setShowTemplatePicker(true)}>Hazır kütüphaneden başla</Button>
            <Button variant="secondary" icon={categories.length ? Plus : FolderOpen} onClick={() => categories.length ? openCreate() : setCategoryEditor({ key: nextKey(), category: null })}>{categories.length ? "Hizmet ekle" : "Kategori oluştur"}</Button>
          </>}
        />
      ) : (
        <>
          <div className={ws.stackSm}>
            <Toolbar>
              <SearchField value={search} onChange={setSearch} placeholder="Hizmet ara" />
              <SegmentedControl
                ariaLabel="Hizmet durumu"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "Tümü", count: statusCounts.all },
                  { value: "live", label: "Yayında", count: statusCounts.live },
                  { value: "paused", label: "Pasif", count: statusCounts.paused },
                  ...(statusCounts.draft ? [{ value: "draft" as const, label: "Fiyat bekleyen", count: statusCounts.draft }] : []),
                ]}
              />
            </Toolbar>
            {categories.length > 0 && (
              <div className={ws.chips} role="toolbar" aria-label="Kategori filtresi">
                <button type="button" className={cx(ws.chip, activeCategory === "all" && ws.chipActive)} aria-pressed={activeCategory === "all"} onClick={() => setActiveCategory("all")}>Tümü <span className={ws.chipCount}>{services.length}</span></button>
                {categories.map((cat) => {
                  const count = services.filter((s) => s.category === cat.id).length;
                  const active = activeCategory === cat.id;
                  return (
                    <button key={cat.id} type="button" className={cx(ws.chip, active && ws.chipActive)} aria-pressed={active} onClick={() => setActiveCategory(active ? "all" : cat.id)}>
                      <ServiceCategoryIcon icon={cat.icon} name={cat.name} size={16} />{cat.name}<span className={ws.chipCount}>{count}</span>
                    </button>
                  );
                })}
                {uncategorized.length > 0 && <button type="button" className={cx(ws.chip, activeCategory === UNCATEGORIZED && ws.chipActive)} aria-pressed={activeCategory === UNCATEGORIZED} onClick={() => setActiveCategory(activeCategory === UNCATEGORIZED ? "all" : UNCATEGORIZED)}><FolderOpen size={15} /> Kategorisiz <span className={ws.chipCount}>{uncategorized.length}</span></button>}
              </div>
            )}
          </div>

          {statusFilter === "draft" && statusCounts.draft > 0 ? (
            <div className={styles.draftHint} role="status"><Sparkles size={16} aria-hidden="true" /> Fiyat bekleyen hizmetlerin fiyatını yazıp ✓ ile kaydedin; hizmet otomatik yayına alınır.</div>
          ) : null}

          {visibleCount === 0 ? (
            <EmptyState
              compact
              mascot="thinking"
              title={filtering ? "Eşleşen hizmet yok" : "Bu kategoride hizmet yok"}
              description={filtering ? "Aramayı veya filtreyi değiştirmeyi deneyin." : "Bu kategoriye ilk hizmeti ekleyerek müşterilerinize sunmaya başlayın."}
              action={filtering
                ? <Button variant="soft" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Filtreleri temizle</Button>
                : <Button variant="primary" icon={Plus} onClick={() => openCreate(activeCategory)}>Hizmet ekle</Button>}
            />
          ) : (
            <div className={styles.groups}>
              {groups.map((group) => (
                <section key={group.id} className={styles.group} aria-labelledby={`group-${group.id}`} style={{ "--cat-color": group.category?.color ?? "var(--dui-faint)" } as React.CSSProperties}>
                  <header className={styles.groupHead}>
                    <span className={styles.catIcon} aria-hidden="true">{group.category ? <ServiceCategoryIcon icon={group.category.icon} name={group.category.name} size={19} /> : <FolderOpen size={18} />}</span>
                    <div className={styles.groupTitle}>
                      <h2 id={`group-${group.id}`}>{group.category?.name ?? "Kategorisiz hizmetler"}</h2>
                      <p>{group.items.length} hizmet{filtering ? ` · ${group.all.length} içinden` : ""}</p>
                    </div>
                    <Button size="sm" variant="ghost" icon={Plus} onClick={() => openCreate(group.id)} aria-label={`${group.category?.name ?? "Kategorisiz"} grubuna hizmet ekle`}>Ekle</Button>
                  </header>
                  <div className={styles.groupList}>
                    {group.items.map((item, index) => (
                      <ServiceRow
                        key={`${item.id}:${item.price}`}
                        service={item}
                        category={group.category}
                        staffCount={staffCountByService[item.id] ?? 0}
                        order={filtering ? undefined : { canUp: index > 0, canDown: index < group.items.length - 1, onUp: () => void moveService(group.all, index, -1), onDown: () => void moveService(group.all, index, 1), busy: orderBusy }}
                        onEdit={() => setEditor({ key: nextKey(), service: item })}
                        onToggle={() => handleToggleService(item)}
                        onDelete={() => void handleDeleteService(item)}
                        onQuickPrice={(nextPrice) => handleQuickPrice(item, nextPrice)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {businessId && editor ? (
        <ServiceEditorSheet
          key={editor.key}
          open
          businessId={businessId}
          service={editor.service}
          categories={categories}
          staff={staff}
          defaultCategoryId={editor.categoryId}
          nextSortOrder={services.length}
          onClose={() => setEditor(null)}
          onSaved={reload}
        />
      ) : null}

      <TemplateLibrarySheet
        key={showTemplatePicker ? "library-open" : "library-closed"}
        open={showTemplatePicker}
        sectorLabel={sectorLabel}
        businessTypeLabel={businessTypeLabel}
        templates={missingTemplates}
        missingCount={missingServiceCountForTemplate}
        busy={templateBusy}
        onClose={() => setShowTemplatePicker(false)}
        onSubmit={handleSeedCategories}
      />

      <CategoryManagerSheet
        open={showCategories && !categoryEditor && !deletingCategory}
        categories={categories}
        services={services}
        seededCount={seededCategories.length}
        busy={orderBusy || templateBusy}
        onClose={() => setShowCategories(false)}
        onCreate={() => setCategoryEditor({ key: nextKey(), category: null })}
        onEdit={(category) => setCategoryEditor({ key: nextKey(), category })}
        onDelete={(category) => setDeletingCategory(category)}
        onMove={(index, direction) => void moveCategory(index, direction)}
        onRemoveTemplates={() => void handleRemoveTemplateCategories()}
      />

      {categoryEditor ? (
        <CategoryEditorSheet
          key={categoryEditor.key}
          open
          category={categoryEditor.category}
          categories={categories}
          onClose={() => setCategoryEditor(null)}
          onSubmit={(input) => handleSubmitCategory(categoryEditor.category, input)}
        />
      ) : null}

      <DeleteCategorySheet
        key={deletingCategory?.id ?? "none"}
        open={Boolean(deletingCategory)}
        category={deletingCategory}
        categories={categories}
        services={services}
        staff={staff}
        onClose={() => setDeletingCategory(null)}
        onConfirm={(replacementId) => handleDeleteCategory(deletingCategory!.id, replacementId)}
      />
      {dialog}
    </DashPage>
  );
}
