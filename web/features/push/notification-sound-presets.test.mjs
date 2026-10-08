import test from "node:test";
import assert from "node:assert/strict";
import {
  SOUND_PRESETS, DEFAULT_SOUND_ID, DEFAULT_SOUND_PREFERENCE, MAX_SOUND_SECONDS, getSoundPreset, presetDuration,
  validatePreset, parseSoundPreference, preferenceTimestamp,
} from "./notification-sound-presets.ts";

test("Varsayılan + 20 yeni ses, kimlikler ve adlar benzersiz", () => {
  assert.equal(SOUND_PRESETS.length, 21);
  assert.equal(SOUND_PRESETS[0].id, DEFAULT_SOUND_ID);
  assert.equal(SOUND_PRESETS[0].name, "Varsayılan");
  assert.equal(new Set(SOUND_PRESETS.map((preset) => preset.id)).size, 21);
  assert.equal(new Set(SOUND_PRESETS.map((preset) => preset.name)).size, 21);
  for (const name of ["Klasik Zil", "Kristal", "Marimba", "Çan", "Damla", "Tık Tık", "Kuş Cıvıltısı", "Yumuşak Gong", "Arp", "Piyano Akoru",
    "Ksilofon", "Retro Bip", "Kapı Zili", "Neşeli", "Sakin", "Parıltı", "Su Damlası", "Ding Dong", "Zen Kase", "Fanfar"]) {
    assert.ok(SOUND_PRESETS.some((preset) => preset.name === name), name);
  }
});

test("her ses geçerli parametrelerle ve ≤ 1.5 sn", () => {
  for (const preset of SOUND_PRESETS) {
    assert.deepEqual(validatePreset(preset), [], preset.id);
    assert.ok(presetDuration(preset) <= MAX_SOUND_SECONDS, `${preset.id} ${presetDuration(preset)}`);
  }
});

test("sesler birbirinden farklı (nota imzası)", () => {
  const signature = (preset) => JSON.stringify([preset.notes.map((note) => [note.freq, note.start, note.glide ?? 0]), preset.partials.map((p) => [p.wave, p.ratio])]);
  assert.equal(new Set(SOUND_PRESETS.map(signature)).size, SOUND_PRESETS.length);
});

test("Varsayılan, önceki zil ile aynı (E6 → G#6 → B6)", () => {
  const preset = getSoundPreset(DEFAULT_SOUND_ID);
  assert.deepEqual(preset.notes.map((note) => Math.round(note.freq)), [1319, 1661, 1976]);
  assert.deepEqual(preset.notes.map((note) => note.start), [0, 0.085, 0.17]);
  assert.equal(preset.lowpass, 5200);
  assert.equal(preset.gain, 1);
});

test("doğrulama hatalı ayarı yakalar", () => {
  const bad = { ...SOUND_PRESETS[1], id: "Bad Id", gain: 3, notes: [{ freq: 10, start: 0, decay: 2, peak: 1.5 }] };
  const errors = validatePreset(bad);
  for (const key of ["id", "gain", "freq", "peak", "duration"]) assert.ok(errors.includes(key), key);
});

test("bilinmeyen ses kimliği Varsayılan'a düşer", () => {
  assert.equal(getSoundPreset("yok").id, DEFAULT_SOUND_ID);
  assert.equal(getSoundPreset(null).id, DEFAULT_SOUND_ID);
  assert.equal(getSoundPreset("zen-kase").name, "Zen Kase");
});

test("tercih ayrıştırma ve güvenli varsayılanlar", () => {
  assert.deepEqual(parseSoundPreference(null), DEFAULT_SOUND_PREFERENCE);
  assert.deepEqual(parseSoundPreference("x"), DEFAULT_SOUND_PREFERENCE);
  assert.deepEqual(parseSoundPreference({ soundId: "marimba", volume: 0.4, muted: true }), { soundId: "marimba", volume: 0.4, muted: true });
  assert.deepEqual(parseSoundPreference({ soundId: "silindi", volume: 7, muted: "evet" }), { soundId: DEFAULT_SOUND_ID, volume: 1, muted: false });
  assert.equal(parseSoundPreference({ volume: -2 }).volume, 0);
  assert.equal(parseSoundPreference({ volume: "0.25" }).volume, 0.25);
  assert.equal(parseSoundPreference({ volume: Number.NaN }).volume, 1);
});

test("kayıt zamanı: Timestamp, sayı, ISO", () => {
  assert.equal(preferenceTimestamp({ updatedAt: { toMillis: () => 99 } }), 99);
  assert.equal(preferenceTimestamp({ updatedAtMs: 5 }), 5);
  assert.equal(preferenceTimestamp({ updatedAt: "2026-10-08T00:00:00.000Z" }), Date.UTC(2026, 9, 8));
  assert.equal(preferenceTimestamp({}), 0);
  assert.equal(preferenceTimestamp(null), 0);
});
