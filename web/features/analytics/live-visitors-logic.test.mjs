import test from "node:test";
import assert from "node:assert/strict";
import { currentAction, matchesFilter, orderTrail, signupProgress, sortLive, summarizeLive } from "./live-visitors-logic.ts";

const NOW = 1_800_000_000_000;
const visitor = (extra = {}) => ({
  lastSeenAt: NOW - 10_000, sessionStartAt: NOW - 60_000, lastPageType: "business_signup", lastAction: null, lastActionAt: null,
  sourceKind: "ads", device: "mobile", trail: [], ...extra,
});

test("an action logged just before its own page view is shown after it", () => {
  const trail = [
    { t: "page", p: "/isletmeler/basla", pt: "business_landing", at: NOW - 30_000 },
    { t: "action", a: "signup:0", at: NOW - 20_000 },
    { t: "page", p: "/isletmeler/kayit", pt: "business_signup", at: NOW - 19_400 },
  ];
  assert.deepEqual(orderTrail(trail).map((item) => item.t === "page" ? item.pt : item.a), ["business_landing", "business_signup", "signup:0"]);
  // Farklı sayfa ya da uzun ara: sıra korunur.
  const other = [{ t: "action", a: "signup:3", at: NOW - 60_000 }, { t: "page", p: "/", pt: "home", at: NOW - 59_000 }];
  assert.deepEqual(orderTrail(other), other);
});

test("current step disappears once the visitor moves to another page", () => {
  const onSignup = visitor({ trail: [{ t: "page", p: "/isletmeler/kayit", pt: "business_signup", at: NOW - 20_000 }, { t: "action", a: "signup:1", at: NOW - 10_000 }] });
  assert.equal(currentAction(onSignup), "signup:1");
  const leftToHome = visitor({ lastPageType: "home", trail: [...onSignup.trail, { t: "page", p: "/", pt: "home", at: NOW - 5_000 }] });
  assert.equal(currentAction(leftToHome), null);
  // İzi olmayan eski kayıt: sayfa türü eşleşirse son adım.
  assert.equal(currentAction(visitor({ lastAction: "signup:2", lastActionAt: NOW - 5_000 })), "signup:2");
  assert.equal(currentAction(visitor({ lastPageType: "home", lastAction: "signup:2", lastActionAt: NOW - 5_000 })), null);
  assert.equal(currentAction(visitor({ lastAction: "signup:2", lastActionAt: NOW - 120_000 })), null);
});

test("signup progress uses the furthest step reached in the session", () => {
  assert.equal(signupProgress([]), null);
  const trail = [{ t: "action", a: "signup:0", at: 1 }, { t: "action", a: "signup:3", at: 2 }, { t: "action", a: "signup:1", at: 3 }];
  assert.deepEqual(signupProgress(trail), { index: 3, total: 8, action: "signup:3" });
  assert.equal(signupProgress([{ t: "action", a: "onboarding:0", at: 1 }]).action, "signup:account");
  assert.equal(signupProgress([{ t: "action", a: "booking:info", at: 1 }]), null);
});

test("summary counts live, active, ads, signup, booking and goals", () => {
  const rows = [
    visitor(),
    visitor({ lastSeenAt: NOW - 200_000, sourceKind: "direct", device: "desktop", lastPageType: "home" }),
    visitor({ lastPageType: "booking", trail: [{ t: "action", a: "booking:success", at: NOW - 1_000 }] }),
    visitor({ lastSeenAt: NOW - 400_000 }),
    visitor({ lastPageType: "business_onboarding", trail: [{ t: "action", a: "signup:account", at: NOW - 1_000 }] }),
  ];
  assert.deepEqual(summarizeLive(rows, NOW), { total: 4, active: 3, idle: 1, ads: 3, mobile: 3, signingUp: 2, booking: 1, goals: 2 });
});

test("filters and ordering", () => {
  const idleHome = visitor({ lastSeenAt: NOW - 200_000, lastPageType: "home", sourceKind: "direct" });
  const activeSignup = visitor({ lastSeenAt: NOW - 30_000 });
  const activeHome = visitor({ lastSeenAt: NOW - 5_000, lastPageType: "home" });
  assert.equal(matchesFilter(activeSignup, "signup", NOW), true);
  assert.equal(matchesFilter(activeHome, "signup", NOW), false);
  assert.equal(matchesFilter(idleHome, "ads", NOW), false);
  assert.equal(matchesFilter(idleHome, "active", NOW), false);
  assert.deepEqual(sortLive([idleHome, activeHome, activeSignup], NOW), [activeSignup, activeHome, idleHome]);
});
