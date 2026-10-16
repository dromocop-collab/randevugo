import test from "node:test";
import assert from "node:assert/strict";
import { addressFingerprint, distanceKm, geocodeQueries, parseNominatim } from "../lib/geo-domain.js";

test("queries go from address to district to city", () => {
  assert.deepEqual(geocodeQueries({ address: " Akarca Mah. Yunus Nadi Cad. No 8 ", district: "Fethiye", city: "Muğla" }), [
    { q: "Akarca Mah. Yunus Nadi Cad. No 8, Fethiye, Muğla, Türkiye", precision: "address" },
    { q: "Akarca Mah. Yunus Nadi Cad., Fethiye, Muğla, Türkiye", precision: "address" },
    { q: "Fethiye, Muğla, Türkiye", precision: "district" },
    { q: "Muğla, Türkiye", precision: "city" },
  ]);
  assert.deepEqual(geocodeQueries({ address: "x" }), []);
  assert.equal(geocodeQueries({ address: "Dere Sok. No:12 D:3", district: "Fethiye", city: "Muğla" })[1].q, "Dere Sok., Fethiye, Muğla, Türkiye");
});

test("fingerprint ignores spacing/case, changes with address", () => {
  assert.equal(addressFingerprint({ address: "A  Cad", district: "Fethiye", city: "Muğla" }), addressFingerprint({ address: "a cad", district: "FETHİYE", city: "muğla" }));
  assert.notEqual(addressFingerprint({ address: "A", city: "Muğla" }), addressFingerprint({ address: "B", city: "Muğla" }));
});

test("nominatim parsing rejects empty and out-of-Turkey results", () => {
  assert.deepEqual(parseNominatim([{ lat: "36.6214", lon: "29.1164" }]), { lat: 36.6214, lng: 29.1164 });
  assert.equal(parseNominatim([]), null);
  assert.equal(parseNominatim([{ lat: "48.85", lon: "2.35" }]), null);
  assert.equal(parseNominatim({}), null);
});

test("distance", () => {
  const fethiye = { lat: 36.6214, lng: 29.1164 };
  const mugla = { lat: 37.2153, lng: 28.3636 };
  assert.ok(Math.abs(distanceKm(fethiye, mugla) - 94) < 5);
  assert.equal(distanceKm(fethiye, fethiye), 0);
});
