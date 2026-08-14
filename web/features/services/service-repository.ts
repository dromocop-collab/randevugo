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
import type { Service } from "@/types/service";

export async function listServices(businessId: string, activeOnly = false): Promise<Service[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "services");
  const q = activeOnly ? query(ref, where("isActive", "==", true)) : query(ref);
  const snap = await getDocs(q);
  return snap.docs.map((item) => mapDoc<Service>(item));
}

export async function createService(
  businessId: string,
  input: Omit<Service, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const db = getDb();
  await addDoc(collection(db, "businesses", businessId, "services"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateService(
  businessId: string,
  serviceId: string,
  input: Partial<Omit<Service, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "businesses", businessId, "services", serviceId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function removeService(businessId: string, serviceId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, "businesses", businessId, "services", serviceId));
}
