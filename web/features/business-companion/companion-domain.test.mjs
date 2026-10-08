import test from "node:test";
import assert from "node:assert/strict";
import {
  isCompanionRoute, storefrontSlugFromPath, isManagerRole, canConfirmAppointments, toMillis, toCompanionAppointment,
  pickNewArrivals, enqueueArrivals, summarizeDay, pendingUpcoming, formatCountdown, formatClock, formatWhen,
  statusLabel, launcherBadge, arrivalSentence, localDayKey, companionLinks,
} from "./companion-domain.ts";

const at = (h, m = 0, dayOffset = 0) => new Date(2026, 9, 8 + dayOffset, h, m, 0, 0).getTime();
const appt = (id, extra = {}) => ({ id, customerName: `Müşteri ${id}`, startAtMs: at(10), status: "confirmed", ...extra });

test("rota: yalnızca herkese açık sayfalarda görünür", () => {
  for (const path of ["/", "/kesfet", "/kategoriler", "/fiyatlar", "/anket", "/isletme/sik-kuafor", "/isletme/sik-kuafor/canli-sira", "/hesabim", "/sehir/mugla"]) {
    assert.equal(isCompanionRoute(path), true, path);
  }
  for (const path of ["/dashboard", "/dashboard/randevular", "/super-admin", "/onboarding", "/giris", "/musteri/giris", "/isletmeler/giris", "/isletmeler/kayit", "/randevu/abc", "/isletme/sik-kuafor/randevu", "/sifremi-unuttum", null, ""]) {
    assert.equal(isCompanionRoute(path), false, String(path));
  }
  // /isletmeler (pazarlama) açık; /isletmeler/giris kapalı
  assert.equal(isCompanionRoute("/isletmeler"), true);
  assert.equal(isCompanionRoute("/kayitlar-bilgi"), true, "önek benzerliği yanıltmamalı");
});

test("vitrin slug'ı yalnızca /isletme/<slug> için", () => {
  assert.equal(storefrontSlugFromPath("/isletme/sik-kuafor"), "sik-kuafor");
  assert.equal(storefrontSlugFromPath("/isletme/sik-kuafor/"), "sik-kuafor");
  assert.equal(storefrontSlugFromPath("/isletme/sik-kuafor/canli-sira"), null);
  assert.equal(storefrontSlugFromPath("/kesfet"), null);
  assert.equal(storefrontSlugFromPath("/isletme/%C3%A7ay"), "çay");
});

test("roller ve onay yetkisi kurallarla uyumlu", () => {
  assert.equal(isManagerRole("owner"), true);
  assert.equal(isManagerRole("manager"), true);
  assert.equal(isManagerRole("staff"), false);
  assert.equal(canConfirmAppointments("admin"), true);
  assert.equal(canConfirmAppointments("staff", { manageAppointments: false }), false);
  assert.equal(canConfirmAppointments("staff", { manageAppointments: true }), true);
  assert.equal(canConfirmAppointments(null), false);
});

test("toMillis: Timestamp, ISO, Date, sayı", () => {
  assert.equal(toMillis({ toMillis: () => 42 }), 42);
  assert.equal(toMillis("2026-10-08T10:00:00.000Z"), Date.UTC(2026, 9, 8, 10));
  assert.equal(toMillis(new Date(5)), 5);
  assert.equal(toMillis(7), 7);
  assert.equal(toMillis("bozuk"), undefined);
  assert.equal(toMillis(null), undefined);
});

test("belge dönüştürme: eksik alanlar güvenli varsayılan alır", () => {
  assert.equal(toCompanionAppointment("x", { customerName: "A" }), null);
  const row = toCompanionAppointment("x", { startAt: { toMillis: () => 1000 }, status: "weird", customerName: "  ", serviceName: "Saç" });
  assert.deepEqual({ id: row.id, name: row.customerName, status: row.status, service: row.serviceName }, { id: "x", name: "Müşteri", status: "confirmed", service: "Saç" });
});

test("yeni randevu farkı: görülen, eski, kendi oluşturduğu ve iptal duyurulmaz", () => {
  const since = at(9);
  const seen = new Set(["a"]);
  const { fresh, seen: nextSeen } = pickNewArrivals({
    added: [
      appt("a", { createdAtMs: at(9, 30) }),
      appt("b", { createdAtMs: at(8) }),
      appt("c", { createdAtMs: at(9, 5), createdByUid: "me" }),
      appt("d", { createdAtMs: at(9, 6), status: "cancelled" }),
      appt("e", { createdAtMs: at(9, 7), status: "pending" }),
      appt("f"),
      appt("e", { createdAtMs: at(9, 7), status: "pending" }),
    ],
    seen,
    sinceMs: since,
    selfUid: "me",
  });
  assert.deepEqual(fresh.map((item) => item.id), ["e", "f"]);
  assert.equal(seen.size, 1, "girdi Set'i değişmez");
  for (const id of ["a", "b", "c", "d", "e", "f"]) assert.ok(nextSeen.has(id));
  // aynı belge tekrar gelirse duyurulmaz
  assert.equal(pickNewArrivals({ added: [appt("e")], seen: nextSeen, sinceMs: since }).fresh.length, 0);
});

test("kuyruk: tekrarsız, en fazla N kart", () => {
  let queue = enqueueArrivals([], [appt("1"), appt("2")], 3);
  queue = enqueueArrivals(queue, [appt("2"), appt("3"), appt("4")], 3);
  assert.deepEqual(queue.map((item) => item.id), ["2", "3", "4"]);
});

test("gün özeti: sıradaki, devam eden, kalan", () => {
  const now = at(11, 10);
  const list = [
    appt("done", { startAtMs: at(9), endAtMs: at(9, 30), status: "completed" }),
    appt("past", { startAtMs: at(10), endAtMs: at(10, 30) }),
    appt("now", { startAtMs: at(11), endAtMs: at(11, 45) }),
    appt("x", { startAtMs: at(12), status: "cancelled" }),
    appt("n3", { startAtMs: at(16) }),
    appt("n1", { startAtMs: at(13), status: "pending" }),
    appt("n2", { startAtMs: at(14) }),
    appt("n4", { startAtMs: at(17) }),
  ];
  const summary = summarizeDay(list, now);
  assert.equal(summary.total, 7);
  assert.equal(summary.completed, 1);
  assert.equal(summary.current?.id, "now");
  assert.equal(summary.next?.id, "n1");
  assert.deepEqual(summary.upcoming.map((item) => item.id), ["n1", "n2", "n3"]);
  assert.equal(summary.remaining, 5);
  const empty = summarizeDay([], now);
  assert.equal(empty.next, null);
  assert.equal(empty.total, 0);
});

test("onay bekleyenler: geçmiş günler hariç, saate göre", () => {
  const now = at(15);
  const list = [
    appt("y", { status: "pending", startAtMs: at(10, 0, -1) }),
    appt("b", { status: "pending", startAtMs: at(9, 0, 2) }),
    appt("a", { status: "pending", startAtMs: at(8) }),
    appt("c", { status: "confirmed", startAtMs: at(16) }),
  ];
  assert.deepEqual(pendingUpcoming(list, now).map((item) => item.id), ["a", "b"]);
});

test("geri sayım ve saat biçimleri", () => {
  assert.equal(formatCountdown(20_000), "şimdi");
  assert.equal(formatCountdown(12 * 60_000), "12 dk");
  assert.equal(formatCountdown(65 * 60_000), "1 sa 5 dk");
  assert.equal(formatCountdown(120 * 60_000), "2 sa");
  assert.equal(formatCountdown(50 * 3_600_000), "2 gün");
  assert.equal(formatClock(at(9, 5)), "09:05");
  assert.equal(formatWhen(at(14, 30), at(9)), "Bugün 14:30");
  assert.equal(formatWhen(at(9, 0, 1), at(23)), "Yarın 09:00");
  assert.equal(formatWhen(at(10, 15, 4), at(9)), "12 Eki Pzt 10:15");
  assert.equal(localDayKey(at(1)), "2026-10-08");
});

test("metinler ve rozet", () => {
  assert.equal(statusLabel("pending"), "Onay bekliyor");
  assert.equal(statusLabel("confirmed"), "Onaylandı");
  assert.deepEqual(launcherBadge(2, 5), { value: 2, tone: "alert" });
  assert.deepEqual(launcherBadge(0, 5), { value: 5, tone: "info" });
  assert.equal(launcherBadge(0, 0), null);
  const sentence = arrivalSentence(appt("z", { customerName: "Ayşe", serviceName: "Saç kesimi", staffName: "Mert", startAtMs: at(14), status: "pending" }), at(9));
  assert.equal(sentence, "Yeni randevu: Ayşe, Saç kesimi, Bugün 14:00, Mert. Onay bekliyor.");
  assert.equal(companionLinks.appointment("a b"), "/dashboard/randevular?appointment=a%20b");
});
