import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getDb } from "@/lib/firebase/firestore";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Appointment } from "@/types/appointments";
import type {
  CheckoutReceipt,
  CustomerPackage,
  FinanceTransaction,
  LoyaltyAccount,
  PaymentMethod,
  Product,
  RewardProgramSettings,
  ServicePackage,
} from "@/types/operations";

async function listCollection<T>(businessId: string, name: string, sort = "createdAt"): Promise<T[]> {
  const snapshot = await getDocs(query(collection(getDb(), "businesses", businessId, name), orderBy(sort, "desc")));
  return snapshot.docs.map((item) => mapDoc<T>(item));
}

export const listProducts = (businessId: string) => listCollection<Product>(businessId, "products", "name");
export const listServicePackages = (businessId: string) => listCollection<ServicePackage>(businessId, "servicePackages", "name");
export const listCustomerPackages = (businessId: string) => listCollection<CustomerPackage>(businessId, "customerPackages");
export const listFinanceTransactions = (businessId: string) => listCollection<FinanceTransaction>(businessId, "financeTransactions", "occurredAt");
export const listCheckoutReceipts = (businessId: string) => listCollection<CheckoutReceipt>(businessId, "checkoutReceipts");
export const listLoyaltyAccounts = (businessId: string) => listCollection<LoyaltyAccount>(businessId, "loyaltyAccounts", "totalSpent");

export async function getRewardProgramSettings(businessId: string): Promise<RewardProgramSettings> {
  const fn = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "getRewardProgramSettings");
  const result = await fn({ businessId });
  return result.data as RewardProgramSettings;
}

export async function updateRewardProgramSettings(
  businessId: string,
  settings: RewardProgramSettings
): Promise<RewardProgramSettings> {
  const fn = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "updateRewardProgramSettings");
  const result = await fn({ businessId, ...settings });
  return result.data as RewardProgramSettings;
}

export async function saveProduct(
  businessId: string,
  input: Omit<Product, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<void> {
  const ref = input.id
    ? doc(getDb(), "businesses", businessId, "products", input.id)
    : doc(collection(getDb(), "businesses", businessId, "products"));
  const now = Timestamp.now();
  await setDoc(ref, {
    name: input.name.trim(), sku: input.sku?.trim() || "",
    salePrice: Math.max(0, input.salePrice), costPrice: Math.max(0, input.costPrice),
    stock: Math.max(0, Math.floor(input.stock)), criticalStock: Math.max(0, Math.floor(input.criticalStock)),
    isActive: input.isActive, updatedAt: now, ...(!input.id ? { createdAt: now } : {}),
  }, { merge: true });
}

export async function deleteProduct(businessId: string, productId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "businesses", businessId, "products", productId));
}

export async function saveServicePackage(
  businessId: string,
  input: Omit<ServicePackage, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<void> {
  const ref = input.id
    ? doc(getDb(), "businesses", businessId, "servicePackages", input.id)
    : doc(collection(getDb(), "businesses", businessId, "servicePackages"));
  const now = Timestamp.now();
  await setDoc(ref, {
    name: input.name.trim(), serviceName: input.serviceName.trim(),
    sessionCount: Math.max(1, Math.floor(input.sessionCount)), price: Math.max(0, input.price),
    validityDays: Math.max(1, Math.floor(input.validityDays)), isActive: input.isActive,
    updatedAt: now, ...(!input.id ? { createdAt: now } : {}),
  }, { merge: true });
}

export async function deleteServicePackage(businessId: string, packageId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "businesses", businessId, "servicePackages", packageId));
}

export async function createExpense(businessId: string, input: {
  amount: number; category: string; description: string; paymentMethod: PaymentMethod;
}): Promise<void> {
  const now = Timestamp.now();
  await addDoc(collection(getDb(), "businesses", businessId, "financeTransactions"), {
    type: "expense", amount: Math.max(0, input.amount), category: input.category.trim(),
    description: input.description.trim(), paymentMethod: input.paymentMethod,
    occurredAt: now, createdAt: now, updatedAt: now,
  });
}

export async function finalizeCheckout(input: {
  businessId: string;
  appointment: Appointment;
  products: Array<{ productId: string; quantity: number }>;
  discount: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  loyaltyPointsToUse: number;
}): Promise<{ receiptId: string; total: number; loyaltyPointsEarned: number }> {
  const fn = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "finalizeAppointmentCheckout");
  const result = await fn({
    businessId: input.businessId,
    appointmentId: input.appointment.id,
    products: input.products,
    discount: input.discount,
    paidAmount: input.paidAmount,
    paymentMethod: input.paymentMethod,
    loyaltyPointsToUse: input.loyaltyPointsToUse,
  });
  return result.data as { receiptId: string; total: number; loyaltyPointsEarned: number };
}

export async function sellPackage(input: {
  businessId: string; packageId: string; customerId?: string; customerName: string; customerPhone: string; paymentMethod: PaymentMethod;
}): Promise<{ customerPackageId: string }> {
  const fn = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "sellServicePackage");
  const result = await fn(input);
  return result.data as { customerPackageId: string };
}

export async function redeemPackage(businessId: string, customerPackageId: string): Promise<void> {
  const fn = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "redeemServicePackage");
  await fn({ businessId, customerPackageId });
}
