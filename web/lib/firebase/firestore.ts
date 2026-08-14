import { getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

export function getDb() {
	return getFirestore(getFirebaseApp());
}
