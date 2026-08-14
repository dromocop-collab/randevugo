import { initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

const db = getFirestore();

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `${name} alanı zorunludur.`);
  }
  return value.trim();
}

export const createAppointment = onCall(
  { region: "europe-west1" },
  async (request) => {
    const data = request.data ?? {};

    const businessId = requireString(data.businessId, "businessId");
    const staffId = requireString(data.staffId, "staffId");
    const serviceId = requireString(data.serviceId, "serviceId");
    const customerName = requireString(data.customerName, "customerName");

    if (typeof data.startAtMillis !== "number") {
      throw new HttpsError("invalid-argument", "startAtMillis zorunludur.");
    }

    const businessRef = db.doc(`businesses/${businessId}`);
    const businessSnap = await businessRef.get();

    if (!businessSnap.exists || businessSnap.data()?.isPublished !== true) {
      throw new HttpsError("not-found", "İşletme bulunamadı veya randevuya kapalı.");
    }

    const serviceRef = db.doc(
      `businesses/${businessId}/services/${serviceId}`
    );
    const serviceSnap = await serviceRef.get();

    if (!serviceSnap.exists || serviceSnap.data()?.isActive !== true) {
      throw new HttpsError("failed-precondition", "Hizmet aktif değil.");
    }

    const durationMinutes = Number(serviceSnap.data()?.durationMinutes ?? 0);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new HttpsError("failed-precondition", "Hizmet süresi geçersiz.");
    }

    const startAt = Timestamp.fromMillis(data.startAtMillis);
    const endAt = Timestamp.fromMillis(
      data.startAtMillis + durationMinutes * 60_000
    );

    const appointments = db.collection(
      `businesses/${businessId}/appointments`
    );

    const conflictQuery = appointments
      .where("staffId", "==", staffId)
      .where("startAt", "<", endAt);

    const result = await db.runTransaction(async (tx) => {
      const conflictSnap = await tx.get(conflictQuery);

      const hasConflict = conflictSnap.docs.some((doc) => {
        const item = doc.data();
        const existingEnd = item.endAt as Timestamp | undefined;
        const status = String(item.status ?? "");

        if (!existingEnd) return false;
        if (status === "cancelled") return false;

        return existingEnd.toMillis() > startAt.toMillis();
      });

      if (hasConflict) {
        throw new HttpsError(
          "already-exists",
          "Seçilen saat artık müsait değil."
        );
      }

      const appointmentRef = appointments.doc();

      tx.set(appointmentRef, {
        businessId,
        staffId,
        serviceId,
        customerId:
          request.auth?.uid ??
          `guest_${appointmentRef.id}`,
        customerName,
        customerPhone:
          typeof data.customerPhone === "string"
            ? data.customerPhone.trim()
            : null,
        customerEmail:
          typeof data.customerEmail === "string"
            ? data.customerEmail.trim().toLowerCase()
            : null,
        startAt,
        endAt,
        status: "confirmed",
        notes:
          typeof data.notes === "string"
            ? data.notes.trim()
            : null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return appointmentRef.id;
    });

    return {
      success: true,
      appointmentId: result,
    };
  }
);

export const appointmentCreated = onDocumentCreated(
  {
    region: "europe-west1",
    document: "businesses/{businessId}/appointments/{appointmentId}",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const { businessId, appointmentId } = event.params;
    const appointment = snapshot.data();

    await db
      .collection(`businesses/${businessId}/notifications`)
      .add({
        type: "appointment_created",
        appointmentId,
        title: "Yeni randevu",
        body: `${appointment.customerName ?? "Müşteri"} için yeni randevu oluşturuldu.`,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

    await db
      .collection(`businesses/${businessId}/auditLogs`)
      .add({
        action: "appointment.created",
        appointmentId,
        source: "cloud_function",
        createdAt: FieldValue.serverTimestamp(),
      });
  }
);
