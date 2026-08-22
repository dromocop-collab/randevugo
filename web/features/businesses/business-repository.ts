import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getDb } from "@/lib/firebase/firestore";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Business, DaySchedule } from "@/types/business";

interface OnboardingInput {
  ownerUid: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  logoUrl?: string;
  coverUrl?: string;
  description?: string;
  slug: string;
  workingHours: DaySchedule[];
}

export async function getBusinessesForUser(uid: string): Promise<Business[]> {
  const db = getDb();
  try {
    const memberQuery = query(
      collectionGroup(db, "members"),
      where("uid", "==", uid)
    );
    const memberSnap = await getDocs(memberQuery);

    const businesses = await Promise.all(
      memberSnap.docs.map(async (member) => {
        const businessRef = member.ref.parent.parent;
        if (!businessRef) return null;
        const businessSnap = await getDoc(businessRef);
        if (!businessSnap.exists()) return null;
        return {
          id: businessSnap.id,
          ...(businessSnap.data() as Omit<Business, "id">),
        };
      })
    );

    const rows = businesses.filter(Boolean) as Business[];
    if (rows.length > 0) return rows;
  } catch {
    // Fallback below covers environments where collectionGroup permissions/indexes are not ready.
  }

  const ownerSnap = await getDocs(
    query(collection(db, "businesses"), where("ownerUid", "==", uid))
  );

  const ownerBusinesses = ownerSnap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<Business, "id">),
  }));

  await Promise.all(
    ownerBusinesses.map(async (business) => {
      const memberRef = doc(db, "businesses", business.id, "members", uid);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) return;

      await setDoc(memberRef, {
        uid,
        role: "owner",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    })
  );

  return ownerBusinesses;
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const db = getDb();
  const slugRef = doc(db, "businessSlugs", slug);
  const slugSnap = await getDoc(slugRef);
  if (!slugSnap.exists()) return null;
  const businessId = String(slugSnap.data().businessId ?? "");
  if (!businessId) return null;

  const businessRef = doc(db, "businesses", businessId);
  const businessSnap = await getDoc(businessRef);
  if (!businessSnap.exists()) return null;

  const data = businessSnap.data() as Omit<Business, "id"> & {
    coverImageUrl?: string;
    coverPhotoUrl?: string;
  };

  return {
    id: businessSnap.id,
    ...data,
    // Preserve older records and ensure a strong storefront visual even when
    // only a gallery image was uploaded before the cover field was introduced.
    coverUrl:
      data.coverUrl ||
      data.coverImageUrl ||
      data.coverPhotoUrl ||
      data.galleryUrls?.[0],
  };
}

export interface CreateBusinessResult {
  businessId: string;
  status: "active" | "pending_review";
  requiresApproval: boolean;
  storePosition: number;
}

export async function createBusinessFromOnboarding(input: OnboardingInput): Promise<CreateBusinessResult> {
  const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "createBusiness");
  const result = await callable(input);
  const data = result.data as Partial<CreateBusinessResult>;
  if (!data.businessId) throw new Error("İşletme oluşturulamadı.");
  return {
    businessId: data.businessId,
    status: data.status === "pending_review" ? "pending_review" : "active",
    requiresApproval: data.requiresApproval === true,
    storePosition: Number(data.storePosition ?? 1),
  };
}

export async function listBusinessWorkingHours(businessId: string) {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "workingHours");
  const snap = await getDocs(ref);
  return snap.docs.map((item) => {
    const row = mapDoc<Record<string, unknown>>(item);
    return {
      day: Number(row.day ?? 0),
      isOpen: Boolean(row.isOpen),
      start: String(row.start ?? "09:00"),
      end: String(row.end ?? "18:00"),
      breakStart: row.breakStart ? String(row.breakStart) : undefined,
      breakEnd: row.breakEnd ? String(row.breakEnd) : undefined,
    };
  });
}

export async function createSpecialDay(
  businessId: string,
  data: { date: string; type: string; start?: string; end?: string; description?: string }
) {
  const db = getDb();
  await addDoc(collection(db, "businesses", businessId, "specialDays"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/* ─── New functions for dashboard upgrade ─── */

export async function getBusinessById(businessId: string): Promise<Business | null> {
  const db = getDb();
  const ref = doc(db, "businesses", businessId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Business, "id">) };
}

export async function updateBusiness(
  businessId: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  // Filter out undefined values — Firestore rejects them
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  await updateDoc(doc(db, "businesses", businessId), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

export async function updateWorkingHours(
  businessId: string,
  hours: DaySchedule[]
): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);

  // Delete existing working hours
  const existingRef = collection(db, "businesses", businessId, "workingHours");
  const existingSnap = await getDocs(existingRef);
  existingSnap.docs.forEach((d) => batch.delete(d.ref));

  // Create new working hours
  hours.forEach((schedule) => {
    const newRef = doc(collection(db, "businesses", businessId, "workingHours"));
    batch.set(newRef, {
      ...schedule,
      staffId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function listSpecialDays(businessId: string) {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "specialDays");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
    id: string;
    date: string;
    type: string;
    description?: string;
    start?: string;
    end?: string;
  }>;
}

export async function deleteSpecialDay(businessId: string, specialDayId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, "businesses", businessId, "specialDays", specialDayId));
}
