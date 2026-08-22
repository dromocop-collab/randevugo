import { collection, doc, getDoc, getDocs, query } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
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
  const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "upsertCustomer");
  const result = await callable({ businessId, ...input });
  return String((result.data as { customerId?: string }).customerId ?? "");
}

export function normalizeCustomerPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  return value.trim();
}
