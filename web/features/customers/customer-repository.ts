import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Customer } from "@/types/customer";

export async function listCustomers(businessId: string): Promise<Customer[]> {
  const db = getDb();
  const snap = await getDocs(query(collection(db, "businesses", businessId, "customers")));
  return snap.docs.map((item) => mapDoc<Customer>(item));
}

export async function getCustomer(businessId: string, customerId: string): Promise<Customer | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, "businesses", businessId, "customers", customerId));
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...(snap.data() as Omit<Customer, "id">),
  };
}

export async function createOrUpdateCustomer(
  businessId: string,
  input: Pick<Customer, "fullName" | "phone" | "email">
): Promise<string> {
  const db = getDb();
  const match = await getDocs(query(collection(db, "businesses", businessId, "customers")));
  const existing = match.docs.find((item) => {
    const row = item.data();
    return String(row.phone ?? "") === input.phone;
  });

  if (existing) {
    await updateDoc(existing.ref, {
      fullName: input.fullName,
      email: input.email ?? null,
      updatedAt: serverTimestamp(),
    });
    return existing.id;
  }

  const ref = await addDoc(collection(db, "businesses", businessId, "customers"), {
    fullName: input.fullName,
    phone: input.phone,
    email: input.email ?? null,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    noShowAppointments: 0,
    totalSpent: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}
