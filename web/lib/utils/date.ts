import { format } from "date-fns";

export function formatDateTime(value: string | Date): string {
  return format(new Date(value), "dd.MM.yyyy HH:mm");
}

export function formatMoney(amount: number, currency: "TRY" | "USD" | "EUR" = "TRY"): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
