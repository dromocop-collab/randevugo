#!/usr/bin/env node
// Fonksiyonları GRUP GRUP deploy eder (adlar değişmez; istemciler etkilenmez).
// 130 fonksiyonu tek seferde göndermek kota uyarılarına ve 10+ dakikaya yol açıyordu.
//
//   npm run deploy:grup -- odeme            → yalnız ödeme fonksiyonları
//   npm run deploy:grup -- odeme sms        → birden fazla grup
//   npm run deploy:grup -- --liste          → gruplar ve fonksiyonları
//   node scripts/deploy-functions.mjs --kontrol   → her fonksiyon tam bir grupta mı (npm test bunu çalıştırır)
//
// Yeni bir fonksiyon eklenince aşağıdaki gruplardan birine yazılmalı; yoksa --kontrol hata verir.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const GROUPS = {
  odeme: [
    "requestSubscriptionPurchase", "completeSubscriptionPurchase", "startSubscriptionCheckout", "startSmsPackCheckout",
    "saveBillingProfile", "listSubscriptionPayments", "markPaymentInvoice", "getSmsPacks", "paytrNotification", "adminApprovalPurchase",
  ],
  abonelik: [
    "ensureDefaultPlatformPlans", "applyRecommendedPlatformPlans", "assignBusinessPlan", "updateBusinessSubscription",
    "ensureAdminOwnedBusinessesLifetime", "backfillLegacyBusinessSubscriptions", "expireBusinessSubscriptions", "syncBusinessPlanFromSubscription",
  ],
  sms: [
    "whatsappWebhook", "whatsappInboxMessageCreated", "sendWhatsAppInboxReply", "updateWhatsAppConversation", "getWhatsAppInboxSettings", "updateWhatsAppInboxSettings", "getWhatsAppOperations", "updateWhatsAppChannel", "sendWhatsAppTest", "sendAppointmentSmsJobs", "checkSmsBalance", "checkMutlucellDeliveryReports", "getSmsOperations", "getSmsBusinessUsage",
    "adjustBusinessSmsCredits", "getMutlucellSettings", "updateMutlucellSettings", "testMutlucellSettings",
  ],
  dogrulama: ["sendVerificationCode", "verifyPhoneCode", "sendEmailVerificationCode", "verifyEmailCode", "sendPasswordResetCode", "resetPasswordWithCode"],
  randevu: [
    "cancelCustomerAppointment", "rescheduleAppointment", "rescheduleCustomerAppointment", "manageAppointmentByToken", "getAvailableSlots",
    "getAvailableDates", "joinWaitlist", "createAppointment", "createDashboardAppointment", "updateAppointmentServices", "updateDashboardAppointment",
    "claimGuestAppointments", "getAppointmentByPublicToken", "appointmentPass", "sendAppointmentPushReminders", "appointmentCreated",
    "appointmentAutomationUpdated", "waitlistAutomationCreated", "testBusinessAutomation", "getBookingFieldSettings", "submitBookingFieldRequest",
    "reviewBookingFieldRequest", "updateBookingFieldSettings",
  ],
  isletme: [
    "createBusiness", "reviewBusiness", "setBusinessDiscoveryVisibility", "setBusinessSuspension", "submitBusinessProfileChange",
    "reviewBusinessProfileChange", "deleteBusinessPermanently", "createStaffMember", "archiveStaff", "linkStaffAccount", "upsertCustomer",
    "renameCustomer", "getRewardProgramSettings", "updateRewardProgramSettings", "finalizeAppointmentCheckout", "sellServicePackage",
    "redeemServicePackage", "getMyCustomerBenefits", "updateLiveFeatureFlags", "submitReview", "moderateReview", "autoPublishPendingReviews",
    "businessGeocode", "backfillBusinessGeo", "setBusinessLocation",
  ],
  bildirim: [
    "registerPushToken", "unregisterPushToken", "deleteMyAccount", "sendPlatformPush", "getPlatformPushOperations", "sendBusinessPush",
    "createBusinessSupportTicket", "submitPublicSupportRequest", "adminSupportTicketCreated", "adminSupportMessageCreated", "adminBusinessCreated",
    "adminApprovalBusinessStore", "adminApprovalProfileChange", "adminApprovalCategory", "adminPlatformAlertCreated",
    "cleanupExpiredOperationalData", "assistantChat", "getAssistantHistory", "clearAssistantHistory", "issueWidgetToken", "revokeWidgetToken", "businessWidgetFeed", "serviceAutoTranslate", "serviceCategoryAutoTranslate", "backfillServiceTranslations",
  ],
  reklam: ["getMetaAdsOverview", "updateMetaAdsSettings", "updateMetaAdsEntity", "trackVisit", "getVisitorAnalytics"],
  canli: [
    "getLiveQueueWaitEstimate", "getLiveQueueWaitOptions", "getBusinessLiveWaitEstimates", "liveQueueWaitQueueChanged", "liveQueueNoticeQueueChanged",
    "liveQueueNoticeCreated", "retryLiveQueueNotices", "liveQueueWaitAppointmentChanged", "createAvailabilityAlert", "cancelAvailabilityAlert",
    "availabilityWorkingHoursChanged", "availabilitySpecialDayChanged", "availabilityStaffChanged", "availabilityServiceChanged",
    "availabilityBusinessScheduleChanged", "availabilityAppointmentChanged", "listLastMinuteOpenings", "availabilityNoticeCreated",
    "liveQueueDiscoveryBusinessUpdated", "liveQueueDiscoveryServicesUpdated", "liveQueueDiscoveryStaffUpdated", "liveQueueDiscoveryHoursUpdated",
    "liveQueueDiscoverySpecialDaysUpdated", "listLiveQueueDiscovery", "joinQueue", "getMyActiveQueueEntry", "getMyActiveQueueEntries",
    "leaveQueue", "markOnTheWay", "confirmQueuePresence", "transitionQueueEntry", "getLiveOperationsCapabilities", "callNextCustomer",
  ],
};

export function exportedFunctions(source = readFileSync(join(here, "../src/index.ts"), "utf8")) {
  return [...source.matchAll(/^export const ([A-Za-z0-9_]+) = on[A-Za-z]+/gm)].map((match) => match[1]);
}

export function checkGroups(names = exportedFunctions()) {
  const seen = new Map();
  for (const [group, list] of Object.entries(GROUPS)) for (const name of list) seen.set(name, [...(seen.get(name) ?? []), group]);
  return {
    missing: names.filter((name) => !seen.has(name)),
    duplicated: [...seen].filter(([, groups]) => groups.length > 1).map(([name, groups]) => `${name} (${groups.join(", ")})`),
    stale: [...seen.keys()].filter((name) => !names.includes(name)),
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const problems = checkGroups();
  const broken = problems.missing.length || problems.duplicated.length || problems.stale.length;
  if (args.includes("--kontrol") || broken) {
    if (problems.missing.length) console.error(`Gruba atanmamış fonksiyon: ${problems.missing.join(", ")}`);
    if (problems.duplicated.length) console.error(`Birden fazla grupta: ${problems.duplicated.join(", ")}`);
    if (problems.stale.length) console.error(`Artık var olmayan fonksiyon: ${problems.stale.join(", ")}`);
    if (broken) process.exit(1);
    console.log(`Tamam: ${exportedFunctions().length} fonksiyon, ${Object.keys(GROUPS).length} grup.`);
    process.exit(0);
  }
  if (!args.length || args.includes("--liste")) {
    for (const [group, list] of Object.entries(GROUPS)) console.log(`${group} (${list.length}): ${list.join(", ")}`);
    console.log("\nKullanım: npm run deploy:grup -- <grup> [<grup> …]   (tümü: npm run deploy)");
    process.exit(0);
  }
  const unknown = args.filter((group) => !GROUPS[group]);
  if (unknown.length) { console.error(`Bilinmeyen grup: ${unknown.join(", ")}. Gruplar: ${Object.keys(GROUPS).join(", ")}`); process.exit(1); }
  const names = args.flatMap((group) => GROUPS[group]);
  console.log(`${names.length} fonksiyon gönderiliyor (${args.join(", ")})…`);
  const result = spawnSync("firebase", ["deploy", "--only", names.map((name) => `functions:${name}`).join(",")], { cwd: join(here, "../.."), stdio: "inherit" });
  process.exit(result.status ?? 1);
}
