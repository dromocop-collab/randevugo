import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions("firebase-admin/app");
const { getAuth: getAdminAuth } = requireFunctions("firebase-admin/auth");
const { getFirestore, Timestamp } = requireFunctions("firebase-admin/firestore");
const projectId = "demo-operations";
const adminApp = initializeAdminApp({ projectId }, "operations-functions-test");
const db = getFirestore(adminApp);
const apps = [];

async function client(name) {
  const app = initializeApp({ projectId, apiKey: "emulator-only", authDomain: `${projectId}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const uid = (await signInAnonymously(auth)).user.uid;
  const functions = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  return { uid, call: (name, data) => httpsCallable(functions, name)(data) };
}

async function emailClient(name, email) {
  const app = initializeApp({ projectId, apiKey: "emulator-only", authDomain: `${projectId}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const user = (await createUserWithEmailAndPassword(auth, email, "Test1234!")).user;
  const functions = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  return { user, call: (functionName, data) => httpsCallable(functions, functionName)(data) };
}

test("checkout atomically updates stock, cash, receipt, CRM and loyalty; packages track sessions", async () => {
  const manager = await client("operations-manager");
  const outsider = await client("operations-outsider");
  const businessId = "business-a";
  await db.doc(`businesses/${businessId}`).set({ ownerUid: manager.uid, name: "Test Salon", isPublished: false });
  await db.doc(`businesses/${businessId}/members/${manager.uid}`).set({ uid: manager.uid, role: "manager" });
  await db.doc(`businesses/${businessId}/products/shampoo`).set({ name: "Şampuan", salePrice: 50, costPrice: 20, stock: 5, criticalStock: 1, isActive: true });
  await db.doc(`businesses/${businessId}/appointments/appointment-1`).set({
    businessId, customerName: "Ayşe Test", customerPhone: "+905551112233", customerId: "guest-a",
    serviceName: "Saç Kesimi", servicePrice: 100, status: "confirmed", paymentStatus: "unpaid",
    startAt: Timestamp.now(), endAt: Timestamp.fromMillis(Date.now() + 30 * 60_000),
  });

  await assert.rejects(outsider.call("finalizeAppointmentCheckout", {
    businessId, appointmentId: "appointment-1", products: [], discount: 0,
    paidAmount: 100, paymentMethod: "cash", loyaltyPointsToUse: 0,
  }), { code: "functions/permission-denied" });

  const first = (await manager.call("finalizeAppointmentCheckout", {
    businessId, appointmentId: "appointment-1", products: [{ productId: "shampoo", quantity: 2 }],
    discount: 10, paidAmount: 190, paymentMethod: "card", loyaltyPointsToUse: 0,
  })).data;
  assert.equal(first.total, 190);
  assert.equal(first.loyaltyPointsEarned, 19);
  assert.equal((await db.doc(`businesses/${businessId}/products/shampoo`).get()).data().stock, 3);
  const appointment = (await db.doc(`businesses/${businessId}/appointments/appointment-1`).get()).data();
  assert.equal(appointment.status, "completed");
  assert.equal(appointment.paymentStatus, "paid");
  const receipt = (await db.doc(`businesses/${businessId}/checkoutReceipts/appointment-1`).get()).data();
  assert.equal(receipt.productTotal, 100);
  assert.equal(receipt.products[0].quantity, 2);
  assert.equal((await db.doc(`businesses/${businessId}/financeTransactions/checkout_appointment-1`).get()).data().amount, 190);
  await assert.rejects(manager.call("finalizeAppointmentCheckout", {
    businessId, appointmentId: "appointment-1", products: [], discount: 0,
    paidAmount: 100, paymentMethod: "cash", loyaltyPointsToUse: 0,
  }), { code: "functions/already-exists" });

  await db.doc(`businesses/${businessId}/appointments/appointment-2`).set({
    businessId, customerName: "Ayşe Test", customerPhone: "+905551112233", customerId: "guest-a",
    serviceName: "Fön", servicePrice: 20, status: "confirmed", paymentStatus: "unpaid",
    startAt: Timestamp.now(), endAt: Timestamp.fromMillis(Date.now() + 20 * 60_000),
  });
  const second = (await manager.call("finalizeAppointmentCheckout", {
    businessId, appointmentId: "appointment-2", products: [], discount: 0,
    paidAmount: 10, paymentMethod: "cash", loyaltyPointsToUse: 10,
  })).data;
  assert.equal(second.total, 10);
  const loyalty = await db.collection(`businesses/${businessId}/loyaltyAccounts`).get();
  assert.equal(loyalty.size, 1);
  assert.equal(loyalty.docs[0].data().points, 10);

  await db.doc(`businesses/${businessId}/servicePackages/package-1`).set({
    name: "5 Seans Bakım", serviceName: "Cilt Bakımı", sessionCount: 5,
    price: 300, validityDays: 90, isActive: true,
  });
  const sale = (await manager.call("sellServicePackage", {
    businessId, packageId: "package-1", customerName: "Ayşe Test",
    customerPhone: "+905551112233", paymentMethod: "card",
  })).data;
  const soldRef = db.doc(`businesses/${businessId}/customerPackages/${sale.customerPackageId}`);
  assert.equal((await soldRef.get()).data().remainingSessions, 5);
  await manager.call("redeemServicePackage", { businessId, customerPackageId: sale.customerPackageId });
  assert.equal((await soldRef.get()).data().remainingSessions, 4);
  assert.equal((await soldRef.collection("usageHistory").get()).size, 1);

  await db.doc(`users/${manager.uid}`).set({ phone: "+905551112233" });
  const benefits = (await manager.call("getMyCustomerBenefits", {})).data;
  assert.equal(benefits.phoneRequired, false);
  assert.equal(benefits.packages.length, 1);
  assert.equal(benefits.packages[0].remainingSessions, 4);
  assert.equal(benefits.packages[0].businessName, "Test Salon");
  assert.equal(benefits.loyalty.length, 1);
  assert.equal(benefits.loyalty[0].points, 40);
});

test("email verification marks the Firebase Auth account as verified", async () => {
  const email = "customer@example.com";
  const customer = await emailClient("verification-customer", email);
  await customer.call("sendEmailVerificationCode", { email });
  const codeRow = (await db.doc(`emailVerificationCodes/${email}`).get()).data();
  assert.equal(typeof codeRow.code, "string");
  await customer.call("verifyEmailCode", { email, code: codeRow.code });
  assert.equal((await getAdminAuth(adminApp).getUser(customer.user.uid)).emailVerified, true);
  assert.equal((await db.doc(`users/${customer.user.uid}`).get()).data().emailVerified, true);
});

test.after(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
});
