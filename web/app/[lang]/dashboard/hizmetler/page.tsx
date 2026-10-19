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
import type { Service, ServicePriceType } from "@/types/service";
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
import { CategoryEditorSheet, CategoryManagerSheet, DeleteCategorySheet, type CategoryInput } from "./category-sheets";
import { PRICE_TYPE_OPTIONS, localizedCategoryName, localizedServiceDescription, localizedServiceName } from "@/features/services/service-pricing";
import { TemplateLibrarySheet } from "./template-library-sheet";
import { bySortOrder, reorderPatch, serviceStatus, type ServiceStatusFilter } from "./service-shared";
import styles from "./services.module.css";
import { useLocale, useT } from "@/i18n/client";

const UNCATEGORIZED = "__none__";

export default function ServicesPage() {
  const { businessId } = useBusiness();
  const t = useT();
  const locale = useLocale();
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
      toast.error(t("Hizmetler yüklenemedi."));
    });

    return () => {
      cancelled = true;
    };
  }, [businessId, t]);

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
  const sectorLabel = t(SECTOR_TEMPLATES[canonicalSector]?.label ?? "Genel");
  const businessTypeLabel = businessType === "kadin" ? t("Kadın işletmesi") : businessType === "erkek" ? t("Erkek işletmesi") : t("Unisex işletme");

  async function handleSeedCategories(selectedTemplates: string[]) {
    if (!businessId || selectedTemplates.length === 0) return;
    setTemplateBusy(true);
    try {
      const result = await seedDefaultCategories(businessId, businessSector, selectedTemplates, businessType);
      await reload();
      setShowTemplatePicker(false);
      const counts = { groups: result.categoriesAdded, count: result.servicesAdded, migrated: result.servicesMigrated };
      toast.success(
        result.categoriesAdded > 0 || result.servicesAdded > 0 || result.servicesMigrated > 0
          ? result.servicesMigrated > 0
            ? t("{groups} ana başlık ve {count} hazır hizmet eklendi. {migrated} mevcut hizmet doğru başlığa taşındı. Fiyat girilen hizmetler otomatik yayına alınır.", counts)
            : t("{groups} ana başlık ve {count} hazır hizmet eklendi. Fiyat girilen hizmetler otomatik yayına alınır.", counts)
          : t("Seçtiğiniz hizmet grupları zaten eksiksiz."),
        { duration: 7000 },
      );
      if (result.servicesAdded > 0) setStatusFilter("draft");
    } catch {
      toast.error(t("Şablon yüklenirken hata oluştu."));
    } finally {
      setTemplateBusy(false);
    }
  }

  async function handleRemoveTemplateCategories() {
    if (!businessId || seededCategories.length === 0) return;
    const linkedCount = services.filter((service) => seededCategories.some((category) => category.id === service.category)).length;
    const ok = await confirm({
      title: t("{count} hazır kategori kaldırılsın mı?", { count: seededCategories.length }),
      description: linkedCount
        ? t("Bu kategorilerdeki {count} hizmet silinmeyecek, “Kategorisiz” alanına taşınacak. Özel kategorileriniz korunur.", { count: linkedCount })
        : t("Yalnızca hazır paketten gelen kategoriler kaldırılır; özel kategorileriniz korunur."),
      confirmLabel: t("Kaldır"),
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
      toast.success(t("Hazır kategori paketi kaldırıldı. Özel kategorileriniz korundu."));
    } catch {
      toast.error(t("Hazır kategoriler kaldırılırken hata oluştu."));
    } finally {
      setTemplateBusy(false);
    }
  }

  /* ── Kategori işlemleri ── */
  async function handleSubmitCategory(category: ServiceCategory | null, input: CategoryInput) {
    if (!businessId) return false;
    try {
      if (category) {
        await updateServiceCategory(businessId, category.id, input);
        toast.success(t("Kategori güncellendi."));
      } else {
        await createServiceCategory(businessId, { ...input, sortOrder: categories.length });
        toast.success(t("Kategori oluşturuldu."));
      }
      await reload();
      return true;
    } catch {
      toast.error(category ? t("Kategori güncellenemedi.") : t("Kategori oluşturulamadı."));
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
        toast.error(t("Bağlı çalışanlar için taşınacak branşı seçin."));
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
      toast.success(t("Kategori silindi."));
    } catch {
      toast.error(t("Kategori silinemedi."));
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
      toast.error(t("Sıralama kaydedilemedi."));
      await reload();
    } finally {
      setOrderBusy(false);
    }
  }

  /* ── Hizmet işlemleri ── */
  async function handleQuickPrice(item: Service, nextPrice: number) {
    if (!businessId) return;
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      toast.error(t("Fiyat sıfırdan büyük olmalı."));
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
      ? t("{name} fiyatlandırıldı ve yayına alındı.", { name: localizedServiceName(item, locale) })
      : t("{name} fiyatı güncellendi.", { name: localizedServiceName(item, locale) }));
  }

  /** Satırdan fiyat tipi/tutar: Görüşmede seçilince veya fiyat boş kaydedilince tutar sorulmaz. Taslak hizmet yayına alınır. */
  async function handleQuickPricing(item: Service, next: { priceType: ServicePriceType; price?: number; priceMax?: number }) {
    if (!businessId) return;
    if (next.priceType !== "quote" && !(Number(next.price ?? item.price) > 0)) {
      toast.error(t("Fiyat sıfırdan büyük olmalı."));
      throw new Error("invalid-price");
    }
    if (next.priceType === "range" && !(Number(next.priceMax) > Number(next.price ?? item.price))) {
      toast.error(t("En yüksek fiyat en düşük fiyattan büyük olmalı."));
      throw new Error("invalid-price");
    }
    await updateService(businessId, item.id, {
      priceType: next.priceType,
      ...(next.price !== undefined ? { price: next.price } : {}),
      ...(next.priceType === "range" ? { priceMax: next.priceMax } : {}),
      ...(item.templateDraft ? { isActive: true, isBookableOnline: true, templateDraft: false } : {}),
    });
    await reload();
    const label = t(PRICE_TYPE_OPTIONS.find((option) => option.value === next.priceType)?.label ?? "");
    toast.success(item.templateDraft
      ? t("{name} fiyatlandırıldı ve yayına alındı.", { name: localizedServiceName(item, locale) })
      : t("{name}: {type}", { name: localizedServiceName(item, locale), type: label }));
  }

  async function handleToggleService(item: Service) {
    if (!businessId) return;
    if (!item.isActive && item.templateDraft && item.price <= 0) {
      setEditor({ key: nextKey(), service: item });
      toast.info(t("Hizmeti yayınlamak için önce fiyatını girin."));
      return;
    }
    try {
      await updateService(businessId, item.id, {
        isActive: !item.isActive,
        isBookableOnline: !item.isActive,
        ...(!item.isActive ? { templateDraft: false } : {}),
      });
      await reload();
      toast.success(item.isActive ? t("{name} duraklatıldı.", { name: localizedServiceName(item, locale) }) : t("{name} yayında.", { name: localizedServiceName(item, locale) }));
    } catch {
      toast.error(t("Hizmet durumu değiştirilemedi."));
    }
  }

  async function handleDeleteService(item: Service) {
    if (!businessId) return;
    const ok = await confirm({
      title: t("Hizmet silinsin mi?"),
      description: t("“{name}” kalıcı olarak silinecek. Geçmiş randevular etkilenmez; geçici olarak kaldırmak isterseniz silmek yerine duraklatabilirsiniz.", { name: localizedServiceName(item, locale) }),
      confirmLabel: t("Sil"),
    });
    if (!ok) return;
    try {
      await removeService(businessId, item.id);
      await reload();
      toast.success(t("Hizmet silindi."));
    } catch {
      toast.error(t("Hizmet silinemedi."));
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
      toast.error(t("Sıralama kaydedilemedi."));
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
      matchesSearch(search, service.name, service.description, localizedServiceName(service, locale), localizedServiceDescription(service, locale));
    const list = [
      ...categories.map((category) => ({ id: category.id, category, items: services.filter((s) => s.category === category.id) })),
      { id: UNCATEGORIZED, category: undefined as ServiceCategory | undefined, items: uncategorized },
    ];
    return list
      .filter((group) => activeCategory === "all" || group.id === activeCategory)
      .map((group) => ({ ...group, all: [...group.items].sort(bySortOrder), items: group.items.filter(matches).sort(bySortOrder) }))
      .filter((group) => group.items.length > 0);
  }, [activeCategory, categories, locale, search, services, statusFilter, uncategorized]);
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
        <SkeletonList rows={5} height={96} label={t("Hizmetler yükleniyor")} />
      </DashPage>
    );
  }

  return (
    <DashPage>
      <PageHeader
        eyebrow={t("Hizmet menüsü")}
        icon={Scissors}
        title={t("Hizmetleriniz")}
        description={t("Gruplarınızı, sürelerinizi ve fiyatlarınızı yönetin. Değişiklikler mağaza vitrininize anında yansır.")}
        actions={<>
          <Button variant="bright" icon={Plus} onClick={() => openCreate()}>{t("Hizmet ekle")}</Button>
          <Button variant="glass" icon={Rocket} onClick={() => setShowTemplatePicker(true)}>{t("Hazır kütüphane")}</Button>
          <Button variant="glass" icon={FolderCog} onClick={() => setShowCategories(true)}>{t("Kategoriler")}</Button>
        </>}
        meta={<>
          <Badge tone="accent" icon={Scissors}>{t("{count} yayında", { count: statusCounts.live })}</Badge>
          {statusCounts.draft ? <Badge tone="amber" icon={Tag} pulse>{t("{count} fiyat bekliyor", { count: statusCounts.draft })}</Badge> : null}
          <Badge tone="neutral" icon={Layers3}>{t("{count} kategori", { count: categories.length })}</Badge>
        </>}
      />

      {services.length === 0 ? (
        <EmptyState
          mascot="wave"
          title={categories.length ? t("İlk hizmetinizi ekleyin") : t("Hizmet menünüzü birlikte kuralım")}
          description={categories.length
            ? t("Müşterilerin randevu alacağı hizmetleri ekleyin; süre ve fiyatı belirleyin.")
            : t("{sector} sektörüne uygun hazır başlıkları tek dokunuşla yükleyebilir veya kendi hizmetinizi ekleyebilirsiniz.", { sector: sectorLabel })}
          action={<>
            <Button variant="primary" icon={Rocket} onClick={() => setShowTemplatePicker(true)}>{t("Hazır kütüphaneden başla")}</Button>
            <Button variant="secondary" icon={categories.length ? Plus : FolderOpen} onClick={() => categories.length ? openCreate() : setCategoryEditor({ key: nextKey(), category: null })}>{categories.length ? t("Hizmet ekle") : t("Kategori oluştur")}</Button>
          </>}
        />
      ) : (
        <>
          <div className={ws.stackSm}>
            <Toolbar>
              <SearchField value={search} onChange={setSearch} placeholder={t("Hizmet ara")} />
              <SegmentedControl
                ariaLabel={t("Hizmet durumu")}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: t("Tümü"), count: statusCounts.all },
                  { value: "live", label: t("Yayında"), count: statusCounts.live },
                  { value: "paused", label: t("Pasif"), count: statusCounts.paused },
                  ...(statusCounts.draft ? [{ value: "draft" as const, label: t("Fiyat bekleyen"), count: statusCounts.draft }] : []),
                ]}
              />
            </Toolbar>
            {categories.length > 0 && (
              <div className={ws.chips} role="toolbar" aria-label={t("Kategori filtresi")}>
                <button type="button" className={cx(ws.chip, activeCategory === "all" && ws.chipActive)} aria-pressed={activeCategory === "all"} onClick={() => setActiveCategory("all")}>{t("Tümü")} <span className={ws.chipCount}>{services.length}</span></button>
                {categories.map((cat) => {
                  const count = services.filter((s) => s.category === cat.id).length;
                  const active = activeCategory === cat.id;
                  return (
                    <button key={cat.id} type="button" className={cx(ws.chip, active && ws.chipActive)} aria-pressed={active} onClick={() => setActiveCategory(active ? "all" : cat.id)}>
                      <ServiceCategoryIcon icon={cat.icon} name={cat.name} size={16} />{localizedCategoryName(cat, locale)}<span className={ws.chipCount}>{count}</span>
                    </button>
                  );
                })}
                {uncategorized.length > 0 && <button type="button" className={cx(ws.chip, activeCategory === UNCATEGORIZED && ws.chipActive)} aria-pressed={activeCategory === UNCATEGORIZED} onClick={() => setActiveCategory(activeCategory === UNCATEGORIZED ? "all" : UNCATEGORIZED)}><FolderOpen size={15} /> {t("Kategorisiz")} <span className={ws.chipCount}>{uncategorized.length}</span></button>}
              </div>
            )}
          </div>

          {statusFilter === "draft" && statusCounts.draft > 0 ? (
            <div className={styles.draftHint} role="status"><Sparkles size={16} aria-hidden="true" /> {t("Fiyat bekleyen hizmetlerin fiyatını yazıp ✓ ile kaydedin; hizmet otomatik yayına alınır.")}</div>
          ) : null}

          {visibleCount === 0 ? (
            <EmptyState
              compact
              mascot="thinking"
              title={filtering ? t("Eşleşen hizmet yok") : t("Bu kategoride hizmet yok")}
              description={filtering ? t("Aramayı veya filtreyi değiştirmeyi deneyin.") : t("Bu kategoriye ilk hizmeti ekleyerek müşterilerinize sunmaya başlayın.")}
              action={filtering
                ? <Button variant="soft" onClick={() => { setSearch(""); setStatusFilter("all"); }}>{t("Filtreleri temizle")}</Button>
                : <Button variant="primary" icon={Plus} onClick={() => openCreate(activeCategory)}>{t("Hizmet ekle")}</Button>}
            />
          ) : (
            <div className={styles.groups}>
              {groups.map((group) => (
                <section key={group.id} className={styles.group} aria-labelledby={`group-${group.id}`} style={{ "--cat-color": group.category?.color ?? "var(--dui-faint)" } as React.CSSProperties}>
                  <header className={styles.groupHead}>
                    <span className={styles.catIcon} aria-hidden="true">{group.category ? <ServiceCategoryIcon icon={group.category.icon} name={group.category.name} size={19} /> : <FolderOpen size={18} />}</span>
                    <div className={styles.groupTitle}>
                      <h2 id={`group-${group.id}`}>{group.category ? localizedCategoryName(group.category, locale) : t("Kategorisiz hizmetler")}</h2>
                      <p>{filtering ? t("{count} hizmet · {total} içinden", { count: group.items.length, total: group.all.length }) : t("{count} hizmet", { count: group.items.length })}</p>
                    </div>
                    <Button size="sm" variant="ghost" icon={Plus} onClick={() => openCreate(group.id)} aria-label={t("{name} grubuna hizmet ekle", { name: group.category ? localizedCategoryName(group.category, locale) : t("Kategorisiz") })}>{t("Ekle")}</Button>
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
                        onQuickPricing={(next) => handleQuickPricing(item, next)}
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
