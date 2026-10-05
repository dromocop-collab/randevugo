import {
  GoogleAuthProvider,
  OAuthProvider,
  browserLocalPersistence,
  getAdditionalUserInfo,
  signInWithPopup,
  signInWithRedirect,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  updateProfile,
} from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";

function getAuthInstance() {
  return getAuth(getFirebaseApp());
}

export async function loginWithEmailPassword(email: string, password: string): Promise<void> {
  const auth = getAuthInstance();
  await setPersistence(auth, browserLocalPersistence);
  await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmailPassword(
  fullName: string,
  email: string,
  password: string
): Promise<void> {
  const auth = getAuthInstance();
  await setPersistence(auth, browserLocalPersistence);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: fullName });
}

export type SocialProvider = "google" | "apple";

/**
 * Google / Apple ile giriş (yoksa hesap otomatik oluşur). Açılır pencere engellenirse yönlendirme akışına düşer.
 * Dönüş: yeni kullanıcı mı, yoksa yönlendirmeye mi geçildi.
 */
export async function signInWithSocial(provider: SocialProvider): Promise<{ isNewUser: boolean; redirected: boolean }> {
  const auth = getAuthInstance();
  await setPersistence(auth, browserLocalPersistence);
  const authProvider = provider === "google" ? new GoogleAuthProvider() : new OAuthProvider("apple.com");
  if (authProvider instanceof GoogleAuthProvider) {
    authProvider.setCustomParameters({ prompt: "select_account" });
  } else {
    authProvider.addScope("email");
    authProvider.addScope("name");
    authProvider.setCustomParameters({ locale: "tr" });
  }
  try {
    const result = await signInWithPopup(auth, authProvider);
    return { isNewUser: getAdditionalUserInfo(result)?.isNewUser === true, redirected: false };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, authProvider);
      return { isNewUser: false, redirected: true };
    }
    throw error;
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuthInstance(), email);
}

export async function logout(): Promise<void> {
  await signOut(getAuthInstance());
}

export function getFirebaseAuth() {
  return getAuthInstance();
}
