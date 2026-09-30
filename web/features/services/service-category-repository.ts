import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { mapDoc } from "@/lib/firebase/mapper";
import type { ServiceCategory } from "@/types/service-category";
import { getCategoryTemplates } from "@/constants/service-category-templates";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { listServices } from "@/features/services/service-repository";

export interface SeedServiceLibraryResult {
  categoriesAdded: number;
  servicesAdded: number;
  servicesMigrated: number;
  legacyCategoriesRemoved: number;
}

/**
 * List all service categories for a business, ordered by sortOrder.
 */
export async function listServiceCategories(
  businessId: string
): Promise<ServiceCategory[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "serviceCategories");
  const snap = await getDocs(query(ref, orderBy("sortOrder", "asc")));
  return snap.docs.map((d) => mapDoc<ServiceCategory>(d));
}

/**
 * Create a new service category.
 */
export async function createServiceCategory(
  businessId: string,
  input: Omit<ServiceCategory, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const db = getDb();
  const docRef = await addDoc(
    collection(db, "businesses", businessId, "serviceCategories"),
    {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  return docRef.id;
}

/**
 * Update a service category.
 */
export async function updateServiceCategory(
  businessId: string,
  categoryId: string,
  input: Partial<Omit<ServiceCategory, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const db = getDb();
  await updateDoc(
    doc(db, "businesses", businessId, "serviceCategories", categoryId),
    { ...input, updatedAt: serverTimestamp() }
  );
}

/**
 * Delete a service category.
 */
export async function deleteServiceCategory(
  businessId: string,
  categoryId: string
): Promise<void> {
  const db = getDb();
  await deleteDoc(
    doc(db, "businesses", businessId, "serviceCategories", categoryId)
  );
}

/**
 * Seed selected main categories together with their nested service drafts.
 * Existing names are reused, legacy flat template categories are migrated,
 * and new services stay unpublished until the business adds a price.
 */
export async function seedDefaultCategories(
  businessId: string,
  sector: string,
  selectedNames?: string[],
  businessType: "kadin" | "erkek" | "unisex" | "" = "unisex",
): Promise<SeedServiceLibraryResult> {
  const [existing, existingServices] = await Promise.all([
    listServiceCategories(businessId),
    listServices(businessId),
  ]);
  const source = canonicalBusinessCategory(sector);
  const requested = selectedNames ? new Set(selectedNames.map(normalizeCategoryName)) : null;
  const templates = getCategoryTemplates(source, businessType).filter((template) => !requested || requested.has(normalizeCategoryName(template.name)));
  const currentTemplateKeys = new Set(getCategoryTemplates(source, "unisex").map((template) => normalizeCategoryName(template.name)));

  const db = getDb();
  const batch = writeBatch(db);
  const colRef = collection(
    db,
    "businesses",
    businessId,
    "serviceCategories"
  );
  const serviceColRef = collection(db, "businesses", businessId, "services");

  const existingNames = new Set(
    existing.map((category) => normalizeCategoryName(category.name))
  );

  const legacyCategories = existing.filter((category) =>
    category.templateSource === source && !currentTemplateKeys.has(category.templateKey ?? normalizeCategoryName(category.name))
  );
  const legacyCategoryIds = new Set(legacyCategories.map((category) => category.id));
  const migratedServiceIds = new Set<string>();
  let categorySortOrder = existing.length;
  let serviceSortOrder = existingServices.length;
  let categoriesAdded = 0;
  let servicesAdded = 0;
  let servicesMigrated = 0;

  templates.forEach((tpl) => {
    // Aynı isimde kategori zaten varsa tekrar oluşturma
    const templateKey = normalizeCategoryName(tpl.name);
    const existingCategory = existing.find((category) => normalizeCategoryName(category.name) === templateKey);
    const categoryRef = existingCategory
      ? doc(db, "businesses", businessId, "serviceCategories", existingCategory.id)
      : doc(colRef);

    if (!existingCategory) {
      batch.set(categoryRef, {
        name: tpl.name,
        icon: tpl.icon,
        color: tpl.color,
        sortOrder: categorySortOrder++,
        templateSource: source,
        templateKey,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      existingNames.add(templateKey);
      categoriesAdded++;
    }

    tpl.services.forEach((serviceTemplate) => {
      const serviceNameKey = normalizeCategoryName(serviceTemplate.name);
      const serviceTemplateKey = `${templateKey}:${serviceNameKey}`;
      const existingService = existingServices.find((item) =>
        item.templateKey === serviceTemplateKey ||
        (normalizeCategoryName(item.name) === serviceNameKey &&
          (item.category === categoryRef.id || legacyCategoryIds.has(item.category)))
      );

      if (existingService) {
        if (legacyCategoryIds.has(existingService.category)) {
          batch.update(doc(db, "businesses", businessId, "services", existingService.id), {
            category: categoryRef.id,
            templateSource: source,
            templateKey: serviceTemplateKey,
            updatedAt: serverTimestamp(),
          });
          migratedServiceIds.add(existingService.id);
          servicesMigrated++;
        }
        return;
      }

      batch.set(doc(serviceColRef), {
        name: serviceTemplate.name,
        description: serviceTemplate.description ?? tpl.description,
        category: categoryRef.id,
        price: 0,
        durationMinutes: serviceTemplate.durationMinutes,
        currency: "TRY",
        isActive: false,
        isBookableOnline: false,
        requiresDeposit: false,
        depositAmount: 0,
        assignableStaffIds: [],
        imageUrl: "",
        sortOrder: serviceSortOrder++,
        templateSource: source,
        templateKey: serviceTemplateKey,
        templateDraft: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      servicesAdded++;
    });
  });

  let legacyCategoriesRemoved = 0;
  legacyCategories.forEach((category) => {
    const hasRemainingServices = existingServices.some((item) =>
      item.category === category.id && !migratedServiceIds.has(item.id)
    );
    if (hasRemainingServices) return;
    batch.delete(doc(db, "businesses", businessId, "serviceCategories", category.id));
    legacyCategoriesRemoved++;
  });

  await batch.commit();
  return { categoriesAdded, servicesAdded, servicesMigrated, legacyCategoriesRemoved };
}

export function normalizeCategoryName(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
