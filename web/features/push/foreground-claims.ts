"use client";

/**
 * Ön plan push mesajlarını başka bir bileşenin "üstlenmesi" için küçük kayıt.
 * İşletme yardımcısı yeni randevuyu Firestore'dan zaten duyuruyorsa, aynı olay için
 * push'un ikinci zil + toast'ı gösterilmez.
 */
export type ForegroundPushData = Record<string, string | undefined>;
type Claim = (data: ForegroundPushData) => boolean;

const claims = new Set<Claim>();

export function registerForegroundClaim(claim: Claim): () => void {
  claims.add(claim);
  return () => {
    claims.delete(claim);
  };
}

export function isForegroundMessageClaimed(data: ForegroundPushData): boolean {
  for (const claim of claims) {
    try {
      if (claim(data)) return true;
    } catch {
      // Hatalı bir üstlenici varsayılan davranışı engellemez.
    }
  }
  return false;
}
