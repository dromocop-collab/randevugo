import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { getFirebaseConfig } from "@/lib/firebase/config";

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;

  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0]!;
    return app;
  }

  app = initializeApp(getFirebaseConfig());
  return app;
}
