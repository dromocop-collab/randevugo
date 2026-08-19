"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordWithCode = exports.sendPasswordResetCode = exports.verifyEmailCode = exports.sendEmailVerificationCode = exports.verifyPhoneCode = exports.sendVerificationCode = exports.submitReview = exports.appointmentCreated = exports.createAppointment = exports.cancelCustomerAppointment = exports.submitPublicSupportRequest = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const crypto_1 = require("crypto");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
function requireString(value, name) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new https_1.HttpsError("invalid-argument", `${name} alanı zorunludur.`);
    }
    return value.trim();
}
exports.submitPublicSupportRequest = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const data = request.data ?? {};
    const name = requireString(data.name, "İsim");
    const phone = requireString(data.phone, "Telefon").replace(/\s+/g, " ");
    const message = requireString(data.message, "Mesaj");
    const audience = ["customer", "business", "storefront"].includes(String(data.audience))
        ? String(data.audience)
        : "customer";
    const businessId = typeof data.businessId === "string" && data.businessId.trim()
        ? data.businessId.trim()
        : null;
    if (typeof data.website === "string" && data.website.trim()) {
        throw new https_1.HttpsError("invalid-argument", "Form doğrulanamadı.");
    }
    if (name.length < 2 || name.length > 80) {
        throw new https_1.HttpsError("invalid-argument", "İsim 2–80 karakter olmalıdır.");
    }
    if (!/^\+?[0-9()\s-]{10,22}$/.test(phone)) {
        throw new https_1.HttpsError("invalid-argument", "Geçerli bir telefon numarası girin.");
    }
    if (message.length < 10 || message.length > 2000) {
        throw new https_1.HttpsError("invalid-argument", "Mesaj 10–2000 karakter olmalıdır.");
    }
    if (audience === "storefront" && !businessId) {
        throw new https_1.HttpsError("invalid-argument", "İşletme bilgisi eksik.");
    }
    let businessName = null;
    if (businessId) {
        const businessSnap = await db.doc(`businesses/${businessId}`).get();
        if (!businessSnap.exists || businessSnap.data()?.isPublished !== true) {
            throw new https_1.HttpsError("not-found", "İşletme bulunamadı veya mesaj kabul etmiyor.");
        }
        businessName = String(businessSnap.data()?.name ?? "İşletme");
    }
    const ip = request.rawRequest.ip || "unknown";
    const rateKey = (0, crypto_1.createHash)("sha256").update(`${ip}|${phone}`).digest("hex").slice(0, 32);
    const rateRef = db.doc(`publicSupportRateLimits/${rateKey}`);
    await db.runTransaction(async (tx) => {
        const previous = await tx.get(rateRef);
        const lastAt = previous.data()?.lastAt;
        if (lastAt && Date.now() - lastAt.toMillis() < 60_000) {
            throw new https_1.HttpsError("resource-exhausted", "Yeni mesaj göndermek için lütfen bir dakika bekleyin.");
        }
        tx.set(rateRef, { lastAt: firestore_1.Timestamp.now() }, { merge: true });
    });
    const ticketRef = db.collection("supportTickets").doc();
    const target = businessId ? "business" : "platform";
    const title = businessId
        ? `${businessName} için müşteri mesajı`
        : audience === "business" ? "İşletme destek mesajı" : "Müşteri destek mesajı";
    const batch = db.batch();
    batch.set(ticketRef, {
        title,
        category: businessId ? "customer_message" : "public_support",
        source: audience,
        target,
        requesterName: name,
        requesterPhone: phone,
        message,
        businessId,
        businessName,
        userId: request.auth?.uid ?? null,
        status: "open",
        priority: "medium",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    if (businessId) {
        const notificationRef = db.collection(`businesses/${businessId}/notifications`).doc();
        batch.set(notificationRef, {
            type: "customer_message",
            title: "Yeni müşteri mesajı",
            body: `${name} mağaza profilinizden bir mesaj gönderdi.`,
            ticketId: ticketRef.id,
            isRead: false,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    return { success: true, ticketId: ticketRef.id };
});
exports.cancelCustomerAppointment = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Randevuyu iptal etmek için giriş yapmalısınız.");
    }
    const data = request.data ?? {};
    const businessId = requireString(data.businessId, "businessId");
    const appointmentId = requireString(data.appointmentId, "appointmentId");
    const appointmentRef = db.doc(`businesses/${businessId}/appointments/${appointmentId}`);
    const businessRef = db.doc(`businesses/${businessId}`);
    await db.runTransaction(async (tx) => {
        const [appointmentSnap, businessSnap] = await Promise.all([tx.get(appointmentRef), tx.get(businessRef)]);
        if (!appointmentSnap.exists || !businessSnap.exists) {
            throw new https_1.HttpsError("not-found", "Randevu bulunamadı.");
        }
        const appointment = appointmentSnap.data();
        const business = businessSnap.data();
        if (appointment.customerId !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "Bu randevu üzerinde işlem yetkiniz yok.");
        }
        if (!["pending", "confirmed"].includes(String(appointment.status))) {
            throw new https_1.HttpsError("failed-precondition", "Bu randevu artık iptal edilemez.");
        }
        if (business.allowCancellation === false) {
            throw new https_1.HttpsError("failed-precondition", "İşletme online iptal kabul etmiyor. Lütfen işletmeyle iletişime geçin.");
        }
        const startAt = appointment.startAt;
        if (!startAt || startAt.toMillis() <= Date.now()) {
            throw new https_1.HttpsError("failed-precondition", "Geçmiş randevu iptal edilemez.");
        }
        const deadlineMinutes = Number(business.cancellationDeadlineMinutes ?? 120);
        if (startAt.toMillis() - Date.now() < deadlineMinutes * 60_000) {
            throw new https_1.HttpsError("failed-precondition", `Randevuya ${deadlineMinutes} dakikadan az kaldığı için online iptal yapılamaz.`);
        }
        tx.update(appointmentRef, {
            status: "cancelled",
            cancelledBy: "customer",
            cancelledAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const notificationRef = db.collection(`businesses/${businessId}/notifications`).doc();
        tx.set(notificationRef, {
            type: "appointment_cancelled",
            title: "Randevu müşteri tarafından iptal edildi",
            body: `${String(appointment.customerName ?? "Müşteri")} randevusunu iptal etti.`,
            appointmentId,
            isRead: false,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return { success: true };
});
exports.createAppointment = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const data = request.data ?? {};
    const businessId = requireString(data.businessId, "businessId");
    const staffId = typeof data.staffId === "string" && data.staffId.trim().length > 0
        ? data.staffId.trim()
        : null;
    const serviceId = requireString(data.serviceId, "serviceId");
    const customerName = requireString(data.customerName, "customerName");
    if (typeof data.startAtMillis !== "number") {
        throw new https_1.HttpsError("invalid-argument", "startAtMillis zorunludur.");
    }
    const businessRef = db.doc(`businesses/${businessId}`);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
        throw new https_1.HttpsError("not-found", "İşletme bulunamadı.");
    }
    const serviceRef = db.doc(`businesses/${businessId}/services/${serviceId}`);
    const serviceSnap = await serviceRef.get();
    if (!serviceSnap.exists || serviceSnap.data()?.isActive !== true) {
        throw new https_1.HttpsError("failed-precondition", "Hizmet aktif değil.");
    }
    const serviceData = serviceSnap.data();
    const durationMinutes = Number(serviceData.durationMinutes ?? 0);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        throw new https_1.HttpsError("failed-precondition", "Hizmet süresi geçersiz.");
    }
    let staffData = null;
    if (staffId) {
        const staffRef = db.doc(`businesses/${businessId}/staff/${staffId}`);
        const staffSnap = await staffRef.get();
        if (!staffSnap.exists || staffSnap.data()?.isActive !== true) {
            throw new https_1.HttpsError("failed-precondition", "Çalışan aktif değil.");
        }
        staffData = staffSnap.data();
    }
    const startAt = firestore_1.Timestamp.fromMillis(data.startAtMillis);
    const endAt = firestore_1.Timestamp.fromMillis(data.startAtMillis + durationMinutes * 60_000);
    const appointments = db.collection(`businesses/${businessId}/appointments`);
    // Use existing staffId+startAt index — only fetch appointments on the same day
    // to minimize reads, then filter in-memory for true overlap
    const dayStartMs = startAt.toMillis() - 24 * 60 * 60 * 1000; // 1 day before
    const dayStart = firestore_1.Timestamp.fromMillis(dayStartMs);
    const conflictQuery = staffId
        ? appointments
            .where("staffId", "==", staffId)
            .where("startAt", ">=", dayStart)
        : null;
    const publicToken = (0, crypto_1.randomUUID)();
    const result = await db.runTransaction(async (tx) => {
        if (conflictQuery) {
            const conflictSnap = await tx.get(conflictQuery);
            const activeStatuses = new Set(["pending", "confirmed"]);
            const hasConflict = conflictSnap.docs.some((doc) => {
                const item = doc.data();
                const existingStart = item.startAt;
                const existingEnd = item.endAt;
                const status = String(item.status ?? "");
                if (!existingEnd || !existingStart)
                    return false;
                // Only block on active (non-finished) appointments
                if (!activeStatuses.has(status))
                    return false;
                // True overlap: existing.start < new.end AND existing.end > new.start
                return (existingStart.toMillis() < endAt.toMillis() &&
                    existingEnd.toMillis() > startAt.toMillis());
            });
            if (hasConflict) {
                throw new https_1.HttpsError("already-exists", "Seçilen saat artık müsait değil.");
            }
        }
        const appointmentRef = appointments.doc();
        tx.set(appointmentRef, {
            businessId,
            staffId,
            serviceId,
            customerId: request.auth?.uid ??
                `guest_${appointmentRef.id}`,
            customerName,
            customerPhone: typeof data.customerPhone === "string"
                ? data.customerPhone.trim()
                : null,
            customerEmail: typeof data.customerEmail === "string"
                ? data.customerEmail.trim().toLowerCase()
                : null,
            startAt,
            endAt,
            status: "confirmed",
            paymentStatus: "unpaid",
            notes: typeof data.notes === "string"
                ? data.notes.trim()
                : null,
            publicToken,
            serviceName: String(serviceData.name ?? ""),
            staffName: staffData ? String(staffData.fullName ?? "") : String(businessSnap.data()?.name ?? "İşletme"),
            servicePrice: Number(serviceData.price ?? 0),
            serviceDurationMinutes: durationMinutes,
            source: "online",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Create public token mapping for /randevu/[token] access
        const tokenRef = db.doc(`appointmentTokens/${publicToken}`);
        tx.set(tokenRef, {
            businessId,
            appointmentId: appointmentRef.id,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return appointmentRef.id;
    });
    return {
        success: true,
        appointmentId: result,
        publicToken,
    };
});
exports.appointmentCreated = (0, firestore_2.onDocumentCreated)({
    region: "europe-west1",
    document: "businesses/{businessId}/appointments/{appointmentId}",
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await db
        .collection(`businesses/${businessId}/auditLogs`)
        .add({
        action: "appointment.created",
        appointmentId,
        source: "cloud_function",
        customerName: appointment.customerName ?? null,
        serviceName: appointment.serviceName ?? null,
        staffName: appointment.staffName ?? null,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // ── CRM: Auto-upsert customer ──
    const phone = typeof appointment.customerPhone === "string"
        ? appointment.customerPhone.trim()
        : null;
    const customerName = typeof appointment.customerName === "string"
        ? appointment.customerName.trim()
        : "Müşteri";
    const customerEmail = typeof appointment.customerEmail === "string"
        ? appointment.customerEmail.trim().toLowerCase()
        : null;
    if (phone) {
        const customersRef = db.collection(`businesses/${businessId}/customers`);
        const existing = await customersRef.where("phone", "==", phone).limit(1).get();
        if (!existing.empty) {
            // Update existing customer
            const customerDoc = existing.docs[0];
            await customerDoc.ref.update({
                fullName: customerName,
                ...(customerEmail ? { email: customerEmail } : {}),
                totalAppointments: firestore_1.FieldValue.increment(1),
                lastVisitAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        else {
            // Create new customer
            await customersRef.add({
                fullName: customerName,
                phone,
                email: customerEmail,
                totalAppointments: 1,
                completedAppointments: 0,
                cancelledAppointments: 0,
                noShowAppointments: 0,
                totalSpent: 0,
                lastVisitAt: firestore_1.FieldValue.serverTimestamp(),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
    }
});
exports.submitReview = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const data = request.data ?? {};
    const businessId = requireString(data.businessId, "businessId");
    const appointmentId = requireString(data.appointmentId, "appointmentId");
    const customerName = requireString(data.customerName, "customerName");
    const rating = Number(data.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new https_1.HttpsError("invalid-argument", "Rating 1-5 arası olmalıdır.");
    }
    // Verify the appointment exists and is completed
    const appointmentRef = db.doc(`businesses/${businessId}/appointments/${appointmentId}`);
    const appointmentSnap = await appointmentRef.get();
    if (!appointmentSnap.exists) {
        throw new https_1.HttpsError("not-found", "Randevu bulunamadı.");
    }
    const appointmentData = appointmentSnap.data();
    if (appointmentData.status !== "completed") {
        throw new https_1.HttpsError("failed-precondition", "Sadece tamamlanmış randevular değerlendirilebilir.");
    }
    // Check for duplicate review
    const existingReviews = await db
        .collection(`businesses/${businessId}/reviews`)
        .where("appointmentId", "==", appointmentId)
        .get();
    if (!existingReviews.empty) {
        throw new https_1.HttpsError("already-exists", "Bu randevu için zaten değerlendirme yapılmış.");
    }
    const comment = typeof data.comment === "string" ? data.comment.trim() : null;
    const reviewRef = db.collection(`businesses/${businessId}/reviews`).doc();
    await db.runTransaction(async (tx) => {
        tx.set(reviewRef, {
            businessId,
            customerId: appointmentData.customerId ?? `guest_review`,
            customerName,
            appointmentId,
            serviceId: appointmentData.serviceId ?? null,
            staffId: appointmentData.staffId ?? null,
            rating,
            comment,
            isVisible: true,
            isModerated: false,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Update business rating
        const businessRef = db.doc(`businesses/${businessId}`);
        const businessSnap = await tx.get(businessRef);
        const businessData = businessSnap.data() ?? {};
        const oldCount = Number(businessData.reviewCount ?? 0);
        const oldRating = Number(businessData.rating ?? 0);
        const newCount = oldCount + 1;
        const newRating = (oldRating * oldCount + rating) / newCount;
        tx.update(businessRef, {
            rating: Math.round(newRating * 100) / 100,
            reviewCount: newCount,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return { success: true, reviewId: reviewRef.id };
});
// ━━━ Phone Verification OTP ━━━
function normalizePhone(raw) {
    let phone = raw.replace(/\s+/g, "").replace(/[()-]/g, "");
    if (phone.startsWith("0"))
        phone = "+90" + phone.slice(1);
    if (!phone.startsWith("+"))
        phone = "+90" + phone;
    return phone;
}
exports.sendVerificationCode = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const data = request.data ?? {};
    const rawPhone = requireString(data.phone, "phone");
    const phone = normalizePhone(rawPhone);
    if (!/^\+90\d{10}$/.test(phone)) {
        throw new https_1.HttpsError("invalid-argument", "Geçerli bir Türkiye telefon numarası girin.");
    }
    const codeDocRef = db.doc(`verificationCodes/${phone}`);
    const existing = await codeDocRef.get();
    // Rate limit: 60 seconds between sends
    if (existing.exists) {
        const lastSent = existing.data()?.sentAt;
        if (lastSent) {
            const secondsAgo = (Date.now() - lastSent.toMillis()) / 1000;
            if (secondsAgo < 60) {
                throw new https_1.HttpsError("resource-exhausted", `Lütfen ${Math.ceil(60 - secondsAgo)} saniye bekleyin.`);
            }
        }
    }
    const code = String((0, crypto_1.randomInt)(100000, 999999));
    await codeDocRef.set({
        code,
        phone,
        attempts: 0,
        verified: false,
        sentAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    });
    // TODO: Integrate real SMS provider (Netgsm, Twilio, etc.)
    // For now, log the code for development/testing
    console.log(`[SMS] Verification code for ${phone}: ${code}`);
    return {
        success: true,
        message: "Doğrulama kodu gönderildi.",
        // Remove this in production — only for development
        _devCode: code,
    };
});
exports.verifyPhoneCode = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const data = request.data ?? {};
    const rawPhone = requireString(data.phone, "phone");
    const inputCode = requireString(data.code, "code");
    const phone = normalizePhone(rawPhone);
    const codeDocRef = db.doc(`verificationCodes/${phone}`);
    const codeSnap = await codeDocRef.get();
    if (!codeSnap.exists) {
        throw new https_1.HttpsError("not-found", "Doğrulama kodu bulunamadı. Lütfen tekrar kod gönderin.");
    }
    const codeData = codeSnap.data();
    // Check expiration
    const expiresAt = codeData.expiresAt;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
        await codeDocRef.delete();
        throw new https_1.HttpsError("deadline-exceeded", "Doğrulama kodunun süresi doldu. Lütfen yeni kod gönderin.");
    }
    // Check max attempts
    const attempts = Number(codeData.attempts ?? 0);
    if (attempts >= 3) {
        await codeDocRef.delete();
        throw new https_1.HttpsError("permission-denied", "Çok fazla hatalı deneme. Lütfen yeni kod gönderin.");
    }
    // Verify code
    if (codeData.code !== inputCode.trim()) {
        await codeDocRef.update({
            attempts: firestore_1.FieldValue.increment(1),
        });
        throw new https_1.HttpsError("invalid-argument", `Yanlış kod. ${2 - attempts} deneme hakkınız kaldı.`);
    }
    // Mark as verified
    await codeDocRef.update({
        verified: true,
        verifiedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true, verified: true };
});
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EMAIL VERIFICATION & PASSWORD RESET (6-digit code)
   Uses Firebase Trigger Email extension via "mail" collection
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function buildEmailTemplate(code, type) {
    const isVerify = type === "verify";
    const title = isVerify ? "E-posta Doğrulama" : "Şifre Sıfırlama";
    const heading = isVerify
        ? "E-posta adresinizi doğrulayın"
        : "Şifrenizi sıfırlayın";
    const description = isVerify
        ? "Hesabınızı aktif etmek için aşağıdaki 6 haneli kodu kullanın."
        : "Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu kullanın.";
    const digits = code.split("");
    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — SeninRandevun</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08);">

  <!-- Header gradient -->
  <tr><td style="background:linear-gradient(135deg,#0284c7,#06b6d4,#8b5cf6);padding:40px 40px 30px;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td style="background:rgba(255,255,255,0.2);border-radius:16px;padding:10px 20px;">
      <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Senin<span style="opacity:0.9;">Randevun</span></span>
    </td></tr></table>
    <p style="margin:20px 0 0;color:rgba(255,255,255,0.9);font-size:14px;font-weight:500;">${title}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px;">
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#0f172a;text-align:center;">${heading}</h1>
    <p style="margin:0 0 32px;font-size:15px;color:#64748b;text-align:center;line-height:1.6;">${description}</p>

    <!-- Code digits -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      ${digits.map((d) => `<td style="padding:0 4px;"><div style="width:48px;height:56px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:2px solid #0284c7;border-radius:14px;text-align:center;line-height:56px;font-size:28px;font-weight:800;color:#0284c7;letter-spacing:2px;">${d}</div></td>`).join("")}
    </tr>
    </table>

    <!-- Timer warning -->
    <div style="margin:28px auto 0;max-width:340px;background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:14px 18px;text-align:center;">
      <span style="font-size:13px;color:#92400e;">⏱️ Bu kod <strong>5 dakika</strong> içinde geçerliliğini yitirecektir.</span>
    </div>

    <!-- Security note -->
    <div style="margin:24px 0 0;padding:16px;background:#f8fafc;border-radius:12px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
        🔒 Bu kodu kimseyle paylaşmayın. SeninRandevun ekibi sizden asla doğrulama kodu istemez.
      </p>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">Bu e-postayı siz talep ettiyseniz herhangi bir işlem yapmanıza gerek yok.</p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} SeninRandevun — Zamanın değerli, randevun bizde.</p>
    <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">seninrandevun.com</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
// ── Send Email Verification Code ──
exports.sendEmailVerificationCode = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const data = request.data ?? {};
    const email = requireString(data.email, "email").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new https_1.HttpsError("invalid-argument", "Geçerli bir e-posta adresi girin.");
    }
    const codeDocRef = db.doc(`emailVerificationCodes/${email}`);
    const existing = await codeDocRef.get();
    // Rate limit: 60 seconds
    if (existing.exists) {
        const lastSent = existing.data()?.sentAt;
        if (lastSent) {
            const secondsAgo = (Date.now() - lastSent.toMillis()) / 1000;
            if (secondsAgo < 60) {
                throw new https_1.HttpsError("resource-exhausted", `Lütfen ${Math.ceil(60 - secondsAgo)} saniye bekleyin.`);
            }
        }
    }
    const code = String((0, crypto_1.randomInt)(100000, 999999));
    // Store the code
    await codeDocRef.set({
        code,
        email,
        type: "email_verification",
        attempts: 0,
        verified: false,
        sentAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    });
    // Write to "mail" collection — Trigger Email extension picks this up
    await db.collection("mail").add({
        to: email,
        message: {
            subject: "SeninRandevun — E-posta Doğrulama Kodu: " + code,
            html: buildEmailTemplate(code, "verify"),
        },
    });
    return { success: true, message: "Doğrulama kodu e-posta adresinize gönderildi." };
});
// ── Verify Email Code ──
exports.verifyEmailCode = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const data = request.data ?? {};
    const email = requireString(data.email, "email").toLowerCase();
    const inputCode = requireString(data.code, "code");
    const codeDocRef = db.doc(`emailVerificationCodes/${email}`);
    const codeSnap = await codeDocRef.get();
    if (!codeSnap.exists) {
        throw new https_1.HttpsError("not-found", "Doğrulama kodu bulunamadı. Lütfen tekrar kod gönderin.");
    }
    const codeData = codeSnap.data();
    const expiresAt = codeData.expiresAt;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
        await codeDocRef.delete();
        throw new https_1.HttpsError("deadline-exceeded", "Kodun süresi doldu. Lütfen yeni kod gönderin.");
    }
    const attempts = Number(codeData.attempts ?? 0);
    if (attempts >= 5) {
        await codeDocRef.delete();
        throw new https_1.HttpsError("permission-denied", "Çok fazla hatalı deneme. Yeni kod gönderin.");
    }
    if (codeData.code !== inputCode.trim()) {
        await codeDocRef.update({ attempts: firestore_1.FieldValue.increment(1) });
        throw new https_1.HttpsError("invalid-argument", `Yanlış kod. ${4 - attempts} deneme hakkınız kaldı.`);
    }
    await codeDocRef.update({
        verified: true,
        verifiedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true, verified: true };
});
// ── Send Password Reset Code ──
exports.sendPasswordResetCode = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const data = request.data ?? {};
    const email = requireString(data.email, "email").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new https_1.HttpsError("invalid-argument", "Geçerli bir e-posta adresi girin.");
    }
    const codeDocRef = db.doc(`passwordResetCodes/${email}`);
    const existing = await codeDocRef.get();
    if (existing.exists) {
        const lastSent = existing.data()?.sentAt;
        if (lastSent) {
            const secondsAgo = (Date.now() - lastSent.toMillis()) / 1000;
            if (secondsAgo < 60) {
                throw new https_1.HttpsError("resource-exhausted", `Lütfen ${Math.ceil(60 - secondsAgo)} saniye bekleyin.`);
            }
        }
    }
    const code = String((0, crypto_1.randomInt)(100000, 999999));
    await codeDocRef.set({
        code,
        email,
        type: "password_reset",
        attempts: 0,
        verified: false,
        sentAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    });
    await db.collection("mail").add({
        to: email,
        message: {
            subject: "SeninRandevun — Şifre Sıfırlama Kodu: " + code,
            html: buildEmailTemplate(code, "reset"),
        },
    });
    return { success: true, message: "Şifre sıfırlama kodu e-posta adresinize gönderildi." };
});
// ── Reset Password with Code ──
exports.resetPasswordWithCode = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const data = request.data ?? {};
    const email = requireString(data.email, "email").toLowerCase();
    const inputCode = requireString(data.code, "code");
    const newPassword = requireString(data.newPassword, "newPassword");
    if (newPassword.length < 8) {
        throw new https_1.HttpsError("invalid-argument", "Şifre en az 8 karakter olmalıdır.");
    }
    const codeDocRef = db.doc(`passwordResetCodes/${email}`);
    const codeSnap = await codeDocRef.get();
    if (!codeSnap.exists) {
        throw new https_1.HttpsError("not-found", "Sıfırlama kodu bulunamadı. Lütfen tekrar kod gönderin.");
    }
    const codeData = codeSnap.data();
    const expiresAt = codeData.expiresAt;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
        await codeDocRef.delete();
        throw new https_1.HttpsError("deadline-exceeded", "Kodun süresi doldu. Lütfen yeni kod gönderin.");
    }
    const attempts = Number(codeData.attempts ?? 0);
    if (attempts >= 5) {
        await codeDocRef.delete();
        throw new https_1.HttpsError("permission-denied", "Çok fazla hatalı deneme. Yeni kod gönderin.");
    }
    if (codeData.code !== inputCode.trim()) {
        await codeDocRef.update({ attempts: firestore_1.FieldValue.increment(1) });
        throw new https_1.HttpsError("invalid-argument", `Yanlış kod. ${4 - attempts} deneme hakkınız kaldı.`);
    }
    // Code is correct — update password via Admin SDK
    const { getAuth } = await import("firebase-admin/auth");
    const auth = getAuth();
    try {
        const userRecord = await auth.getUserByEmail(email);
        await auth.updateUser(userRecord.uid, { password: newPassword });
    }
    catch {
        throw new https_1.HttpsError("not-found", "Bu e-posta ile kayıtlı kullanıcı bulunamadı.");
    }
    // Clean up the code
    await codeDocRef.delete();
    return { success: true, message: "Şifreniz başarıyla güncellendi." };
});
//# sourceMappingURL=index.js.map