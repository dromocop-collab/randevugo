import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { createService, listServices } from "@/features/services/service-repository";
import {
  createServiceCategory,
  listServiceCategories,
  normalizeCategoryName,
} from "@/features/services/service-category-repository";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { missingPlanItems, type StarterServicePlanItem } from "@/features/businesses/service-templates";

/** businessSlugs herkese açık okunur; mağaza adresi boşta mı? Ağ hatasında null döner. */
export async function isBusinessSlugAvailable(slug: string): Promise<boolean | null> {
  try {
    const snapshot = await getDoc(doc(getDb(), "businessSlugs", slug));
    return !snapshot.exists();
  } catch {
    return null;
  }
}

export interface StarterServicesResult {
  created: number;
  skipped: number;
  categoriesCreated: number;
}

/**
 * Seçilen başlangıç hizmetlerini paneldeki hizmet ekranıyla aynı veri biçiminde oluşturur
 * (serviceCategories + services; isActive/isBookableOnline true, TRY fiyat, templateKey).
 *
 * İdempotent: aynı templateKey veya aynı adlı hizmet varsa atlanır, aynı adlı kategori yeniden
 * kullanılır — sihirbaz yeniden çalışırsa (ör. ağ hatası sonrası "tekrar dene") kopya oluşmaz.
 */
export async function applyStarterServices(
  businessId: string,
  businessCategory: string,
  plan: readonly StarterServicePlanItem[],
): Promise<StarterServicesResult> {
  if (!plan.length) return { created: 0, skipped: 0, categoriesCreated: 0 };
  const [existingCategories, existingServices] = await Promise.all([
    listServiceCategories(businessId),
    listServices(businessId),
  ]);
  const todo = missingPlanItems(plan, existingServices);
  const source = canonicalBusinessCategory(businessCategory);
  const categoryIds = new Map(existingCategories.map((category) => [normalizeCategoryName(category.name), category.id]));
  let categorySortOrder = existingCategories.length;
  let serviceSortOrder = existingServices.length;
  let categoriesCreated = 0;
  let created = 0;

  for (const item of todo) {
    let categoryId = categoryIds.get(item.groupKey);
    if (!categoryId) {
      categoryId = await createServiceCategory(businessId, {
        name: item.groupName,
        icon: item.groupIcon,
        color: item.groupColor,
        sortOrder: categorySortOrder++,
        templateSource: source,
        templateKey: item.groupKey,
      });
      categoryIds.set(item.groupKey, categoryId);
      categoriesCreated++;
    }
    await createService(businessId, {
      name: item.name,
      description: "",
      category: categoryId,
      price: item.price,
      durationMinutes: item.durationMinutes,
      currency: "TRY",
      isActive: true,
      isBookableOnline: true,
      requiresDeposit: false,
      depositAmount: 0,
      assignableStaffIds: [],
      imageUrl: "",
      sortOrder: serviceSortOrder++,
      templateSource: source,
      templateKey: item.templateKey,
      templateDraft: false,
    });
    created++;
  }

  return { created, skipped: plan.length - todo.length, categoriesCreated };
}
