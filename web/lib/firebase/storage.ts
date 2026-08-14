import { getStorage } from "firebase/storage";
import { getFirebaseApp } from "@/lib/firebase/client";

export const storage = getStorage(getFirebaseApp());
