"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

/**
 * Oturum yokken alınan randevular: gizli publicToken randevuya erişim ve hesaba aktarım anahtarıdır.
 * Kullanıcı giriş yapınca claimGuestAppointments ile hesaba aktarılır ve buradan silinir.
 * (Android: GuestBookingStore.kt ile aynı mantık.)
 */
export interface GuestBooking {
  publicToken: string;
  businessId: string;
  appointmentId: string;
  createdAt: number;
}

const STORAGE_KEY = "seninrandevun.guestBookings";
const MAX_ENTRIES = 20;

export function listGuestBookings(): GuestBooking[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const publicToken = typeof row.publicToken === "string" ? row.publicToken.trim() : "";
      if (!publicToken) return [];
      return [{
        publicToken,
        businessId: typeof row.businessId === "string" ? row.businessId : "",
        appointmentId: typeof row.appointmentId === "string" ? row.appointmentId : "",
        createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
      }];
    });
  } catch {
    return [];
  }
}

function saveGuestBookings(items: GuestBooking[]) {
  try {
    if (items.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ENTRIES)));
  } catch {
    // Gizli sekme / engellenmiş depolama: sessizce geç.
  }
}

export function addGuestBooking(booking: Omit<GuestBooking, "createdAt"> & { createdAt?: number }) {
  if (!booking.publicToken) return;
  const items = listGuestBookings().filter((item) => item.publicToken !== booking.publicToken);
  items.push({ ...booking, createdAt: booking.createdAt ?? Date.now() });
  saveGuestBookings(items);
}

export function hasGuestBooking(publicToken: string) {
  return listGuestBookings().some((item) => item.publicToken === publicToken);
}

export function removeGuestBookings(tokens: Iterable<string>) {
  const remove = new Set(tokens);
  if (remove.size === 0) return;
  saveGuestBookings(listGuestBookings().filter((item) => !remove.has(item.publicToken)));
}

let claimInFlight: Promise<number> | null = null;

/**
 * Cihazdaki misafir randevularını giriş yapmış kullanıcının hesabına aktarır.
 * Dönen değer: hesaba yeni aktarılan randevu sayısı. Başarılı çağrıdan sonra gönderilen tüm
 * tokenlar silinir (aktarılamayanlar — başka hesaba ait, silinmiş — bir daha da aktarılamaz).
 */
export function claimStoredGuestBookings(): Promise<number> {
  if (claimInFlight) return claimInFlight;
  const tokens = listGuestBookings().map((item) => item.publicToken);
  if (tokens.length === 0) return Promise.resolve(0);
  claimInFlight = (async () => {
    try {
      const claim = httpsCallable<{ publicTokens: string[] }, { claimed?: string[]; alreadyOwned?: string[]; count?: number }>(
        getFunctions(getFirebaseApp(), "europe-west1"),
        "claimGuestAppointments",
      );
      const result = await claim({ publicTokens: tokens });
      removeGuestBookings(tokens);
      return Array.isArray(result.data?.claimed) ? result.data.claimed.length : Number(result.data?.count ?? 0);
    } finally {
      claimInFlight = null;
    }
  })();
  return claimInFlight;
}
