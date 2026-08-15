import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

export interface CategoryRequest {
  id: string;
  businessId: string;
  businessName: string;
  requestedCategory: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

/** Submit a new category request from a business */
export async function createCategoryRequest(
  businessId: string,
  businessName: string,
  requestedCategory: string
): Promise<string> {
  const db = getDb();
  const ref = await addDoc(collection(db, "categoryRequests"), {
    businessId,
    businessName,
    requestedCategory: requestedCategory.trim(),
    status: "pending",
    requestedAt: serverTimestamp(),
  });
  return ref.id;
}

/** List category requests (optionally filtered by status) */
export async function listCategoryRequests(
  status?: "pending" | "approved" | "rejected"
): Promise<CategoryRequest[]> {
  const db = getDb();
  const col = collection(db, "categoryRequests");
  // Use simple query to avoid composite index requirement
  const q = status
    ? query(col, where("status", "==", status))
    : query(col);

  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<CategoryRequest, "id">),
    requestedAt: d.data().requestedAt?.toDate?.()?.toISOString() ?? "",
    reviewedAt: d.data().reviewedAt?.toDate?.()?.toISOString() ?? undefined,
  }));

  // Sort client-side (newest first)
  return results.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Approve a category request — also adds to `categories` collection */
export async function approveCategoryRequest(
  requestId: string,
  reviewerUid: string,
  requestedCategory: string
): Promise<void> {
  const db = getDb();

  // 1. Update request status
  await updateDoc(doc(db, "categoryRequests", requestId), {
    status: "approved",
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerUid,
  });

  // 2. Add to categories collection
  const categorySlug = slugify(requestedCategory);
  const categoryRef = doc(db, "categories", categorySlug);
  const existing = await getDoc(categoryRef);
  if (!existing.exists()) {
    await setDoc(categoryRef, {
      label: requestedCategory,
      slug: categorySlug,
      emoji: "📂",
      isCustom: true,
      createdAt: serverTimestamp(),
      approvedBy: reviewerUid,
    });
  }
}

/** Reject a category request */
export async function rejectCategoryRequest(
  requestId: string,
  reviewerUid: string
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "categoryRequests", requestId), {
    status: "rejected",
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerUid,
  });
}

/** List all dynamic (approved) categories from Firestore */
export interface DynamicCategory {
  slug: string;
  label: string;
  emoji: string;
  isCustom: boolean;
}

export async function listDynamicCategories(): Promise<DynamicCategory[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, "categories"));
  return snap.docs.map((d) => ({
    slug: d.id,
    label: d.data().label ?? d.id,
    emoji: d.data().emoji ?? "📂",
    isCustom: d.data().isCustom ?? true,
  }));
}

/** Manually add a category to the categories collection (for fixing legacy approvals) */
export async function addCategoryManually(
  categoryLabel: string,
  reviewerUid: string
): Promise<void> {
  const db = getDb();
  const categorySlug = slugify(categoryLabel);
  const categoryRef = doc(db, "categories", categorySlug);
  const existing = await getDoc(categoryRef);
  if (!existing.exists()) {
    await setDoc(categoryRef, {
      label: categoryLabel,
      slug: categorySlug,
      emoji: "📂",
      isCustom: true,
      createdAt: serverTimestamp(),
      approvedBy: reviewerUid,
    });
  }
}
