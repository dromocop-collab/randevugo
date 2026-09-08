export function userFacingError(error: unknown, fallback: string): string {
  const value = error as { code?: string; message?: string } | null;
  const code = String(value?.code ?? "").toLocaleLowerCase("tr-TR");
  const message = String(value?.message ?? "").toLocaleLowerCase("tr-TR");
  const source = `${code} ${message}`;

  if (source.includes("permission-denied") || source.includes("insufficient permission")) return "Bu alana erişim izniniz doğrulanamadı. Oturumunuzu yenileyip tekrar deneyin.";
  if (source.includes("unauthenticated") || source.includes("auth/user-token-expired")) return "Oturumunuzun süresi dolmuş olabilir. Yeniden giriş yapıp tekrar deneyin.";
  if (source.includes("unavailable") || source.includes("network") || source.includes("offline")) return "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.";
  if (source.includes("resource-exhausted") || source.includes("too-many-requests")) return "Çok fazla istek gönderildi. Kısa bir süre sonra tekrar deneyin.";
  if (source.includes("deadline-exceeded") || source.includes("timeout")) return "İşlem beklenenden uzun sürdü. Lütfen tekrar deneyin.";
  return fallback;
}
