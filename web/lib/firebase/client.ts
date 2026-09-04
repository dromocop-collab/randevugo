import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { getFirebaseConfig } from "@/lib/firebase/config";

let app: FirebaseApp | null = null;
const FIREBASE_APP_NAME = "randevugo-web-v2";

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;

  const existingApp = getApps().find((candidate) => candidate.name === FIREBASE_APP_NAME);
  if (existingApp) {
    app = existingApp;
    return app;
  }

  // A named app owns a separate Auth persistence namespace. This prevents
  // obsolete refresh tokens from an earlier Firebase setup being retried on
  // every page load and producing securetoken.googleapis.com 400 responses.
  app = initializeApp(getFirebaseConfig(), FIREBASE_APP_NAME);
  return app;
}
