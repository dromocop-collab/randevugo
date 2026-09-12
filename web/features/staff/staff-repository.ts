import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Staff } from "@/types/staff";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

export async function listStaff(businessId: string, activeOnly = false): Promise<Staff[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "staff");
  const q = activeOnly ? query(ref, where("isActive", "==", true)) : query(ref);
  const snap = await getDocs(q);
  return snap.docs.map((item) => mapDoc<Staff>(item));
}

export async function createStaff(
  businessId: string,
  input: Omit<Staff, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const db = getDb();
  await addDoc(collection(db, "businesses", businessId, "staff"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateStaff(
  businessId: string,
  staffId: string,
  input: Partial<Omit<Staff, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "businesses", businessId, "staff", staffId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function removeStaff(businessId: string, staffId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, "businesses", businessId, "staff", staffId));
}

export async function archiveStaff(
  businessId: string,
  staffId: string,
  replacementStaffId?: string
): Promise<{ transferred: number }> {
  const callable = httpsCallable<
    { businessId: string; staffId: string; replacementStaffId?: string },
    { transferred: number }
  >(getFunctions(getFirebaseApp(), "europe-west1"), "archiveStaff");
  const result = await callable({ businessId, staffId, replacementStaffId });
  return result.data;
}

export async function linkStaffAccount(businessId: string, staffId: string, sendInvite = false): Promise<{ email: string; invited?: boolean }> {
  const callable = httpsCallable<
    { businessId: string; staffId: string; sendInvite: boolean },
    { email: string; invited?: boolean }
  >(getFunctions(getFirebaseApp(), "europe-west1"), "linkStaffAccount");
  const result = await callable({ businessId, staffId, sendInvite });
  return result.data;
}
