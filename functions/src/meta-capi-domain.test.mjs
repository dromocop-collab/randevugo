import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildCapiEvent, buildFbc, hashEmail, hashPhone, normalizePixelId, sanitizeFbCookie, sanitizeFbclid } from "../lib/meta-capi-domain.js";

const sha = (value) => createHash("sha256").update(value).digest("hex");

test("click id and cookies are validated", () => {
  assert.equal(sanitizeFbclid("IwAR3abcDEF_123-xyz"), "IwAR3abcDEF_123-xyz");
  assert.equal(sanitizeFbclid("<script>"), null);
  assert.equal(sanitizeFbclid("short"), null);
  assert.equal(buildFbc("IwAR3abcDEF", 1792000000000), "fb.1.1792000000000.IwAR3abcDEF");
  assert.equal(buildFbc(null, 1), null);
  assert.equal(sanitizeFbCookie("fb.1.1792000000000.1234567890"), "fb.1.1792000000000.1234567890");
  assert.equal(sanitizeFbCookie("fb.1.x.y"), null);
});

test("email and phone are normalized then hashed", () => {
  assert.equal(hashEmail(" Ayse@Example.com "), sha("ayse@example.com"));
  assert.equal(hashEmail("not-an-email"), null);
  assert.equal(hashPhone("0532 123 45 67"), sha("905321234567"));
  assert.equal(hashPhone("+90 532 123 45 67"), sha("905321234567"));
  assert.equal(hashPhone("532-123-4567"), sha("905321234567"));
  assert.equal(hashPhone("12"), null);
});

test("events carry hashed user data and skip when nothing can match", () => {
  const event = buildCapiEvent({
    eventName: "CompleteRegistration", eventId: "biz123", eventTimeMs: 1792000000999, sourceUrl: "https://seninrandevun.com/onboarding",
    user: { email: "a@b.co", phone: "05321234567", externalId: "uid1", ip: "1.2.3.4", userAgent: "UA", fbc: "fb.1.1792000000000.IwAR3abcDEF", fbp: "bad" },
  });
  assert.equal(event.event_time, 1792000000);
  assert.deepEqual(event.user_data.em, [sha("a@b.co")]);
  assert.deepEqual(event.user_data.ph, [sha("905321234567")]);
  assert.deepEqual(event.user_data.external_id, [sha("uid1")]);
  assert.equal(event.user_data.fbc, "fb.1.1792000000000.IwAR3abcDEF");
  assert.equal(event.user_data.fbp, undefined);
  assert.equal(event.action_source, "website");
  assert.equal(JSON.stringify(event).includes("a@b.co"), false);
  assert.equal(buildCapiEvent({ eventName: "Lead", eventId: "x", eventTimeMs: 1, sourceUrl: "u", user: { externalId: "only" } }), null);
  assert.equal(normalizePixelId(" 1234567890123456 "), "1234567890123456");
  assert.equal(normalizePixelId("abc"), null);
});
