import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch, type Unsubscribe } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { mapDoc } from "@/lib/firebase/mapper";
import type { NotificationItem, NotificationType } from "@/types/notification";

export async function listNotifications(businessId: string): Promise<NotificationItem[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "notifications");
  const snap = await getDocs(query(ref, orderBy("createdAt", "desc"), limit(50)));
  return snap.docs.map((item) => mapDoc<NotificationItem>(item));
}

export function subscribeNotifications(
  businessId: string,
  onItems: (items: NotificationItem[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const ref = collection(getDb(), "businesses", businessId, "notifications");
  return onSnapshot(
    query(ref, orderBy("createdAt", "desc"), limit(50)),
    (snapshot) => onItems(snapshot.docs.map((item) => mapDoc<NotificationItem>(item))),
    (error) => onError(error)
  );
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
  await updateDoc(doc(getDb(), "businesses", businessId, "notifications", notificationId), {
    isRead: true,
    updatedAt: serverTimestamp(),
  });
}

export async function markAllNotificationsRead(businessId: string): Promise<void> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "notifications");
  const snapshot = await getDocs(query(ref, orderBy("createdAt", "desc"), limit(50)));
  const unread = snapshot.docs.filter((item) => item.data().isRead !== true);
  if (unread.length === 0) return;
  const batch = writeBatch(db);
  unread.forEach((item) => batch.update(item.ref, { isRead: true, updatedAt: serverTimestamp() }));
  await batch.commit();
}
