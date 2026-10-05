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
  linkWithCredential,
  linkWithPopup,
  unlink,
  type AuthCredential,
  type User,
} from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";

function getAuthInstance() {
  return getAuth(getFirebaseApp());
}

// ── Aynı e-postayla gelen ikinci giriş yöntemini mevcut hesaba bağlama ──
// Firebase "e-posta başına tek hesap" modunda: örn. Google ile kayıtlı adrese Apple ile gelinirse
// account-exists-with-different-credential döner. Apple kimliği bekletilir; kullanıcı eski yöntemiyle
// girince otomatik bağlanır ve bir dahaki sefere Apple ile doğrudan aynı hesaba girer.
type PendingLink = { credential: AuthCredential; email: string; provider: SocialProvider; at: number };
let pendingLink: PendingLink | null = null;

export class AccountExistsError extends Error {
  constructor(public readonly email: string, public readonly provider: SocialProvider) {
    super("account-exists");
  }
}

export function pendingLinkInfo() {
  if (pendingLink && Date.now() - pendingLink.at > 10 * 60 * 1000) pendingLink = null;
  return pendingLink ? { email: pendingLink.email, provider: pendingLink.provider } : null;
}

async function consumePendingLink(user: User): Promise<SocialProvider | null> {
  const pending = pendingLinkInfo() ? pendingLink : null;
  pendingLink = null;
  if (!pending || !user.email || user.email.toLowerCase() !== pending.email.toLowerCase()) return null;
  try {
    await linkWithCredential(user, pending.credential);
    return pending.provider;
  } catch (error) {
    // Zaten bağlıysa ya da kimlik başka hesapta ise giriş yine başarılıdır; bağlama sessizce atlanır.
    console.warn("Pending credential link skipped", (error as { code?: string } | null)?.code);
    return null;
  }
}

export const PROVIDER_LABEL: Record<SocialProvider, string> = { google: "Google", apple: "Apple" };

export async function loginWithEmailPassword(email: string, password: string): Promise<{ linked: SocialProvider | null }> {
  const auth = getAuthInstance();
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, password);
  return { linked: await consumePendingLink(result.user) };
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
function socialAuthProvider(provider: SocialProvider) {
  if (provider === "google") {
    const google = new GoogleAuthProvider();
    google.setCustomParameters({ prompt: "select_account" });
    return google;
  }
  const apple = new OAuthProvider("apple.com");
  apple.addScope("email");
  apple.addScope("name");
  apple.setCustomParameters({ locale: "tr" });
  return apple;
}

function credentialFromError(provider: SocialProvider, error: unknown) {
  const firebaseError = error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0];
  return provider === "google" ? GoogleAuthProvider.credentialFromError(firebaseError) : OAuthProvider.credentialFromError(firebaseError);
}

export async function signInWithSocial(provider: SocialProvider): Promise<{ isNewUser: boolean; redirected: boolean; linked: SocialProvider | null; email: string | null }> {
  const auth = getAuthInstance();
  await setPersistence(auth, browserLocalPersistence);
  const authProvider = socialAuthProvider(provider);
  try {
    const result = await signInWithPopup(auth, authProvider);
    const linked = await consumePendingLink(result.user);
    return { isNewUser: getAdditionalUserInfo(result)?.isNewUser === true, redirected: false, linked, email: result.user.email };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, authProvider);
      return { isNewUser: false, redirected: true, linked: null, email: null };
    }
    if (code === "auth/account-exists-with-different-credential") {
      const credential = credentialFromError(provider, error);
      const email = (error as { customData?: { email?: string } }).customData?.email ?? "";
      if (credential && email) {
        pendingLink = { credential, email, provider, at: Date.now() };
        throw new AccountExistsError(email, provider);
      }
    }
    throw error;
  }
}

/** Oturum açıkken hesaba Google / Apple girişini bağlar (Apple "E-postamı gizle" seçilse bile çalışır). */
export async function linkSocialProvider(provider: SocialProvider): Promise<void> {
  const user = getAuthInstance().currentUser;
  if (!user) throw new Error("Önce giriş yapın.");
  await linkWithPopup(user, socialAuthProvider(provider));
}

export async function unlinkProvider(providerId: string): Promise<void> {
  const user = getAuthInstance().currentUser;
  if (!user) throw new Error("Önce giriş yapın.");
  if (user.providerData.length <= 1) throw new Error("Son giriş yöntemi kaldırılamaz.");
  await unlink(user, providerId);
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
