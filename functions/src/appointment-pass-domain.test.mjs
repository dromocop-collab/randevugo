import test from "node:test";
import assert from "node:assert/strict";
import { buildAppointmentIcs, buildWalletPassJson, shortAppointmentCode } from "../lib/appointment-pass-domain.js";

const item = {
  token: "1b4e28ba-2fa1-41d2-883f-0016d3cca427",
  appointmentId: "apt1",
  status: "confirmed",
  businessName: "Erdem Kuaför",
  serviceName: "Saç kesimi, sakal",
  staffName: "Cihat",
  address: "Menteşe, Muğla",
  phone: "05550000000",
  start: new Date("2026-10-06T11:00:00Z"),
  end: new Date("2026-10-06T12:00:00Z"),
  totalPrice: 10000,
  timeZone: "Europe/Istanbul",
  manageUrl: "https://seninrandevun.com/randevu/1b4e28ba-2fa1-41d2-883f-0016d3cca427",
};

test("ics has escaped fields, two alarms and folded lines", () => {
  const ics = buildAppointmentIcs(item, new Date("2026-10-01T00:00:00Z"));
  assert.match(ics, /DTSTART:20261006T110000Z/);
  assert.match(ics, /SUMMARY:Saç kesimi\\, sakal · Erdem Kuaför/);
  assert.equal(ics.match(/BEGIN:VALARM/g).length, 2);
  assert.match(ics, /STATUS:CONFIRMED/);
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, line);
  assert.match(buildAppointmentIcs({ ...item, status: "cancelled" }), /STATUS:CANCELLED/);
});

test("wallet pass shows local time, code and voids cancelled appointments", () => {
  const pass = buildWalletPassJson(item, { passTypeIdentifier: "pass.com.cihat.seninrandevun", teamIdentifier: "G4KKMJ85R7" });
  assert.equal(pass.eventTicket.headerFields[0].value, "14:00");
  assert.equal(pass.barcodes[0].altText, shortAppointmentCode(item.token));
  assert.equal(pass.voided, false);
  assert.equal(pass.serialNumber, "apt1");
  assert.equal(buildWalletPassJson({ ...item, status: "cancelled" }, { passTypeIdentifier: "p", teamIdentifier: "t" }).voided, true);
});
