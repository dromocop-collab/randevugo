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
  sector: string
): Promise<void> {
  const existing = await listServiceCategories(businessId);
  const templates = getCategoryTemplates(sector);

  const db = getDb();
  const batch = writeBatch(db);
  const colRef = collection(
    db,
    "businesses",
    businessId,
    "serviceCategories"
  );

  const normalize = (value: string) =>
    value
      .trim()
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const existingNames = new Set(
    existing.map((category) => normalize(category.name))
  );

  let sortOrder = existing.length;
  let addedCount = 0;

  templates.forEach((tpl) => {
    // Aynı isimde kategori zaten varsa tekrar oluşturma
    if (existingNames.has(normalize(tpl.name))) {
      return;
    }

    const docRef = doc(colRef);

    batch.set(docRef, {
      name: tpl.name,
      icon: tpl.icon,
      color: tpl.color,
      sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    sortOrder++;
    addedCount++;
  });

  if (addedCount === 0) {
    return;
  }

  await batch.commit();
}
