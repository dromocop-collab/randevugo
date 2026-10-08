import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { parseSoundPreference, preferenceTimestamp, type SoundPreference } from "@/features/push/notification-sound-presets";

/** users/{uid}/preferences/notificationSound — dashboardAppearance ile aynı desen (kural: kullanıcı kendi tercihlerini okur/yazar). */
const SOUND_DOC_ID = "notificationSound";

export async function getNotificationSoundPreference(userId: string): Promise<{ preference: SoundPreference; updatedAtMs: number } | null> {
  const snapshot = await getDoc(doc(getDb(), "users", userId, "preferences", SOUND_DOC_ID));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return { preference: parseSoundPreference(data), updatedAtMs: preferenceTimestamp(data) };
}

export async function saveNotificationSoundPreference(userId: string, preference: SoundPreference): Promise<void> {
  await setDoc(
    doc(getDb(), "users", userId, "preferences", SOUND_DOC_ID),
    { soundId: preference.soundId, volume: preference.volume, muted: preference.muted, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
