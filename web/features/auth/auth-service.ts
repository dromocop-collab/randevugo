import {
  browserLocalPersistence,
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

export async function forgotPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuthInstance(), email);
}

export async function logout(): Promise<void> {
  await signOut(getAuthInstance());
}

export function getFirebaseAuth() {
  return getAuthInstance();
}
