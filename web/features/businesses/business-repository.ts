import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
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

  return {
    id: businessSnap.id,
    ...(businessSnap.data() as Omit<Business, "id">),
  };
}

export async function createBusinessFromOnboarding(input: OnboardingInput): Promise<string> {
  const db = getDb();
  const businessId = await runTransaction(db, async (tx) => {
    const slugRef = doc(db, "businessSlugs", input.slug);
    const slugSnap = await tx.get(slugRef);
    if (slugSnap.exists()) {
      throw new Error("Bu slug zaten kullaniliyor.");
    }

    const businessRef = doc(collection(db, "businesses"));

    tx.set(businessRef, {
      ownerUid: input.ownerUid,
      name: input.name,
      slug: input.slug,
      category: input.category,
      phone: input.phone,
      email: input.email,
      address: input.address,
      city: input.city,
      district: input.district,
      logoUrl: input.logoUrl ?? null,
      coverUrl: input.coverUrl ?? null,
      isPublished: true,
      minimumBookingNoticeMinutes: 60,
      maximumBookingDaysAhead: 45,
      appointmentBufferMinutes: 10,
      plan: "FREE",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    tx.set(slugRef, {
      businessId: businessRef.id,
      ownerUid: input.ownerUid,
      createdAt: serverTimestamp(),
    });

    const memberRef = doc(db, "businesses", businessRef.id, "members", input.ownerUid);
    tx.set(memberRef, {
      uid: input.ownerUid,
      role: "owner",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    input.workingHours.forEach((schedule) => {
      const scheduleRef = doc(collection(db, "businesses", businessRef.id, "workingHours"));
      tx.set(scheduleRef, {
        ...schedule,
        staffId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return businessRef.id;
  });

  return businessId;
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
