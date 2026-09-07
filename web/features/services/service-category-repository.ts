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
 * Seed default categories from sector templates.
 * Only seeds if no categories exist yet for the business.
 */
export async function seedDefaultCategories(
  businessId: string,
  sector: string,
  selectedNames?: string[]
): Promise<number> {
  const existing = await listServiceCategories(businessId);
  const source = canonicalBusinessCategory(sector);
  const requested = selectedNames ? new Set(selectedNames.map(normalizeCategoryName)) : null;
  const templates = getCategoryTemplates(source).filter((template) => !requested || requested.has(normalizeCategoryName(template.name)));

  const db = getDb();
  const batch = writeBatch(db);
  const colRef = collection(
    db,
    "businesses",
    businessId,
    "serviceCategories"
  );

  const existingNames = new Set(
    existing.map((category) => normalizeCategoryName(category.name))
  );

  let sortOrder = existing.length;
  let addedCount = 0;

  templates.forEach((tpl) => {
    // Aynı isimde kategori zaten varsa tekrar oluşturma
    const templateKey = normalizeCategoryName(tpl.name);
    if (existingNames.has(templateKey)) {
      return;
    }

    const docRef = doc(colRef);

    batch.set(docRef, {
      name: tpl.name,
      icon: tpl.icon,
      color: tpl.color,
      sortOrder,
      templateSource: source,
      templateKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    sortOrder++;
    addedCount++;
  });

  if (addedCount === 0) {
    return 0;
  }

  await batch.commit();
  return addedCount;
}

export function normalizeCategoryName(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
