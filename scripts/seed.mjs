import admin from "firebase-admin";

admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || "demo-randevugo",
});

const db = admin.firestore();

const ownerUid = "REPLACE_WITH_FIREBASE_AUTH_UID";
const businessId = "demo-kuafor";

await db.doc(`businesses/${businessId}`).set({
  name: "Demo Kuaför",
  slug: "demo-kuafor",
  ownerUid,
  isPublished: true,
  timezone: "Europe/Istanbul",
  currency: "TRY",
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

await db.doc(`businesses/${businessId}/members/${ownerUid}`).set({
  uid: ownerUid,
  role: "owner",
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});

await db.doc(`businesses/${businessId}/services/sac-kesimi`).set({
  name: "Saç Kesimi",
  durationMinutes: 45,
  price: 700,
  currency: "TRY",
  isActive: true,
  sortOrder: 10,
});

await db.doc(`businesses/${businessId}/staff/ahmet`).set({
  displayName: "Ahmet",
  isActive: true,
});

console.log("Seed tamamlandı.");
