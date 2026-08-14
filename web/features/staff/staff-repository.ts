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
