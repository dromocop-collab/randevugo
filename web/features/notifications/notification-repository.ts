import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { mapDoc } from "@/lib/firebase/mapper";
import type { NotificationItem, NotificationType } from "@/types/notification";

export async function listNotifications(businessId: string): Promise<NotificationItem[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "notifications");
  const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
  return snap.docs.map((item) => mapDoc<NotificationItem>(item));
}

export async function createNotification(
  businessId: string,
  payload: { type: NotificationType; title: string; body: string; relatedAppointmentId?: string }
): Promise<void> {
  const db = getDb();
  await addDoc(collection(db, "businesses", businessId, "notifications"), {
    ...payload,
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function markNotificationRead(
  businessId: string,
  notificationId: string
): Promise<void> {
  const db = getDb();
  const all = await getDocs(collection(db, "businesses", businessId, "notifications"));
  const target = all.docs.find((item) => item.id === notificationId);
  if (!target) return;
  await updateDoc(target.ref, {
    isRead: true,
    updatedAt: serverTimestamp(),
  });
}
