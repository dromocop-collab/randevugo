import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_AUTO_REPLY, conversationId, extractIncomingMessages, formatInboxPhone, inboxPreview, mediaExtension, renderAutoReply,
  sanitizeQuickReplies, shouldAutoReply, windowState,
} from "../lib/whatsapp-inbox-domain.js";

const NOW = Date.parse("2026-10-21T12:00:00+03:00");
const body = (messages, contacts = [{ wa_id: "905321234567", profile: { name: "Ayşe Kaya" } }]) => ({
  entry: [{ changes: [{ value: { contacts, messages } }] }],
});

test("all incoming message types are parsed", () => {
  const rows = extractIncomingMessages(body([
    { id: "m1", from: "905321234567", timestamp: "1792573200", type: "text", text: { body: " Merhaba " } },
    { id: "m2", from: "905321234567", type: "image", image: { id: "media1", mime_type: "image/jpeg", caption: "fiyat?" } },
    { id: "m3", from: "905321234567", type: "audio", audio: { id: "media2", mime_type: "audio/ogg; codecs=opus", voice: true } },
    { id: "m4", from: "905321234567", type: "document", document: { id: "media3", mime_type: "application/pdf", filename: "fatura.pdf" } },
    { id: "m5", from: "905321234567", type: "location", location: { latitude: 37.1, longitude: 28.3, name: "Dükkan" } },
    { id: "m6", from: "905321234567", type: "reaction", reaction: { message_id: "wamid.X", emoji: "👍" } },
    { id: "m7", from: "905321234567", type: "button", button: { text: "Harikaydı" }, context: { id: "wamid.F" } },
    { id: "m8", from: "905321234567", type: "interactive", interactive: { button_reply: { title: "Evet" } } },
    { id: "m9", from: "905321234567", type: "something_new" },
    { id: "bad", from: "abc", type: "text", text: { body: "x" } },
  ]), NOW);
  assert.equal(rows.length, 9);
  assert.equal(rows[0].text, "Merhaba");
  assert.equal(rows[0].profileName, "Ayşe Kaya");
  assert.equal(rows[0].timestamp, 1792573200000);
  assert.deepEqual(rows[1].media, { id: "media1", kind: "image", mimeType: "image/jpeg", fileName: null, voice: false });
  assert.equal(rows[1].text, "fiyat?");
  assert.equal(rows[1].timestamp, NOW);
  assert.equal(rows[2].media.voice, true);
  assert.equal(rows[3].media.fileName, "fatura.pdf");
  assert.deepEqual(rows[4].location, { latitude: 37.1, longitude: 28.3, name: "Dükkan", address: null });
  assert.deepEqual(rows[5].reaction, { emoji: "👍", messageId: "wamid.X" });
  assert.equal(rows[6].text, "Harikaydı");
  assert.equal(rows[6].contextId, "wamid.F");
  assert.equal(rows[7].text, "Evet");
  assert.equal(rows[8].type, "unsupported");
  assert.deepEqual(extractIncomingMessages({ entry: [{ changes: [{ value: { statuses: [] } }] }] }), []);
});

test("previews are short and descriptive", () => {
  assert.equal(inboxPreview({ type: "text", text: "Selam", media: null, reaction: null, location: null }), "Selam");
  assert.equal(inboxPreview({ type: "image", text: null, media: null, reaction: null, location: null }), "📷 Fotoğraf");
  assert.equal(inboxPreview({ type: "audio", text: null, media: { voice: true }, reaction: null, location: null }), "🎤 Sesli mesaj");
  assert.equal(inboxPreview({ type: "document", text: null, media: { fileName: "a.pdf" }, reaction: null, location: null }), "📄 a.pdf");
  assert.equal(inboxPreview({ type: "reaction", text: null, media: null, reaction: { emoji: "❤️" }, location: null }), "❤️ tepki verdi");
});

test("24 hour window and auto-reply rules", () => {
  assert.equal(windowState(NOW - 23 * 3_600_000, NOW).open, true);
  assert.equal(windowState(NOW - 25 * 3_600_000, NOW).open, false);
  assert.equal(windowState(null, NOW).open, false);
  const base = { enabled: true, type: "text", lastAutoReplyAt: null, lastManualReplyAt: null, now: NOW };
  assert.equal(shouldAutoReply(base), true);
  assert.equal(shouldAutoReply({ ...base, enabled: false }), false);
  assert.equal(shouldAutoReply({ ...base, type: "button" }), false);
  assert.equal(shouldAutoReply({ ...base, type: "reaction" }), false);
  assert.equal(shouldAutoReply({ ...base, lastAutoReplyAt: NOW - 3_600_000 }), false);
  assert.equal(shouldAutoReply({ ...base, lastAutoReplyAt: NOW - 25 * 3_600_000 }), true);
  assert.equal(shouldAutoReply({ ...base, lastManualReplyAt: NOW - 3_600_000 }), false);
});

test("auto-reply text, quick replies and helpers", () => {
  assert.match(renderAutoReply(null, "Ayşe Kaya"), /^Merhaba, Ayşe 👋/);
  assert.match(renderAutoReply("", null), /^Merhaba 👋/);
  assert.equal(renderAutoReply("Selam{{ ad }}!", "Ali-Rıza 😀 Kaya"), "Selam, Ali-Rıza!");
  assert.equal(renderAutoReply("Selam{{ad}}", "<script>"), "Selam, script");
  assert.ok(DEFAULT_AUTO_REPLY.includes("{{ad}}"));
  assert.deepEqual(sanitizeQuickReplies([{ title: " Fiyat ", text: " 299 ₺ " }, { title: "", text: "x" }, "x"]), [{ title: "Fiyat", text: "299 ₺" }]);
  assert.equal(mediaExtension("audio/ogg; codecs=opus"), "ogg");
  assert.equal(mediaExtension("application/x-foo", "rapor.XLSX"), "xlsx");
  assert.equal(mediaExtension("application/x-foo"), "bin");
  assert.equal(formatInboxPhone("905321234567"), "+90 532 123 45 67");
  assert.equal(formatInboxPhone("491701234567"), "+491701234567");
  assert.equal(conversationId("905321234567").length, 24);
  assert.notEqual(conversationId("905321234567"), conversationId("905321234568"));
});
