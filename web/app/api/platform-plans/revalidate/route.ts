import { revalidatePath, revalidateTag } from "next/cache";
import { getFirebaseConfig } from "@/lib/firebase/config";
import { PLATFORM_PLANS_CACHE_TAG } from "@/features/subscriptions/platform-plan-domain";

export const dynamic = "force-dynamic";

/** Paket listesini gösteren herkese açık sayfalar. */
const PRICING_PATHS = ["/fiyatlar", "/isletmeler"];

/**
 * Çağıranın platform yöneticisi olduğunu Firebase Admin SDK olmadan doğrular:
 * kullanıcının ID token'ı ile platformAdmins altındaki (olmayan) bir belge okunur.
 * Kurallar bu okumayı yalnızca isPlatformAdmin() için izin verir → 404/200 = yönetici, 403 = değil, 401 = geçersiz token.
 */
async function isPlatformAdmin(idToken: string): Promise<boolean> {
  const { projectId } = getFirebaseConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/platformAdmins/revalidate-probe`;
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store", signal: AbortSignal.timeout(5_000) });
    return response.status === 200 || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * POST /api/platform-plans/revalidate  (Authorization: Bearer <Firebase ID token, platform yöneticisi>)
 * Süper admin paket kaydettiğinde/sildiğinde /fiyatlar ve /isletmeler önbelleğini hemen geçersiz kılar.
 * (Çağrılmasa da sayfalar 60 sn ISR ile kendiliğinden yenilenir — örn. iOS süper admin değişiklikleri.)
 */
export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 4_096) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isPlatformAdmin(token))) return Response.json({ error: "forbidden" }, { status: 403 });

  // expire: 0 → bir sonraki istek bayat veri yerine taze paket listesini bekler.
  revalidateTag(PLATFORM_PLANS_CACHE_TAG, { expire: 0 });
  PRICING_PATHS.forEach((path) => revalidatePath(path));
  return Response.json({ revalidated: true, paths: PRICING_PATHS, now: Date.now() });
}
