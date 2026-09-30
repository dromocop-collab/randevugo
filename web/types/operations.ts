import type { EntityBase } from "@/types/common";

export type PaymentMethod = "cash" | "card" | "transfer" | "other";

export interface Product extends EntityBase {
  name: string;
  sku?: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  criticalStock: number;
  isActive: boolean;
}

export interface ServicePackage extends EntityBase {
  name: string;
  serviceName: string;
  sessionCount: number;
  price: number;
  validityDays: number;
  isActive: boolean;
}

export interface CustomerPackage extends EntityBase {
  packageId: string;
  packageName: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  totalSessions: number;
  remainingSessions: number;
  price: number;
  paymentMethod: PaymentMethod;
  status: "active" | "used" | "expired" | "cancelled";
  expiresAt: string;
  lastUsedAt?: string;
}

export interface FinanceTransaction extends EntityBase {
  type: "income" | "expense";
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  appointmentId?: string;
  customerPackageId?: string;
  receiptId?: string;
  occurredAt: string;
}

export interface CheckoutReceipt extends EntityBase {
  appointmentId: string;
  customerName: string;
  customerPhone?: string;
  serviceTotal: number;
  productTotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  loyaltyPointsEarned: number;
  loyaltyPointsUsed: number;
  products: Array<{ productId: string; name: string; quantity: number; unitPrice: number; total: number }>;
}

export interface LoyaltyAccount extends EntityBase {
  customerName: string;
  customerPhone: string;
  points: number;
  lifetimePoints: number;
  totalSpent: number;
  lastEarnedAt?: string;
}
