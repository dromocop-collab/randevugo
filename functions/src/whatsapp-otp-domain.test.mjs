import test from "node:test";
import assert from "node:assert/strict";
import { otpTemplateCreatePayload, otpTemplateMessage, otpSendPlan, OTP_TEMPLATE_NAME } from "../lib/whatsapp-otp-domain.js";

test("authentication şablonu kopyala düğmeli", () => {
  const payload = otpTemplateCreatePayload("tr");
  assert.equal(payload.name, OTP_TEMPLATE_NAME);
  assert.equal(payload.category, "AUTHENTICATION");
  assert.equal(payload.components[2].buttons[0].otp_type, "COPY_CODE");
});

test("gönderim yükünde kod gövde ve düğmede", () => {
  const message = otpTemplateMessage("905551112233", "123456", "tr");
  assert.equal(message.to, "905551112233");
  assert.equal(message.template.components[0].parameters[0].text, "123456");
  assert.equal(message.template.components[1].sub_type, "url");
  assert.equal(message.template.components[1].parameters[0].text, "123456");
});

test("kanal ve bekleme", () => {
  assert.deepEqual(otpSendPlan({ requested: undefined, whatsappReady: true, previousProvider: null, secondsSinceLast: null }), { channel: "whatsapp", waitSeconds: 0 });
  assert.deepEqual(otpSendPlan({ requested: undefined, whatsappReady: false, previousProvider: null, secondsSinceLast: null }), { channel: "sms", waitSeconds: 0 });
  // WhatsApp gelmedi → 20 sn sonra SMS serbest
  assert.deepEqual(otpSendPlan({ requested: "sms", whatsappReady: true, previousProvider: "whatsapp", secondsSinceLast: 25 }), { channel: "sms", waitSeconds: 0 });
  assert.deepEqual(otpSendPlan({ requested: "sms", whatsappReady: true, previousProvider: "whatsapp", secondsSinceLast: 5 }), { channel: "sms", waitSeconds: 15 });
  // aynı kanaldan tekrar 60 sn
  assert.deepEqual(otpSendPlan({ requested: undefined, whatsappReady: true, previousProvider: "whatsapp", secondsSinceLast: 30 }), { channel: "whatsapp", waitSeconds: 30 });
  assert.deepEqual(otpSendPlan({ requested: "sms", whatsappReady: true, previousProvider: "mutlucell", secondsSinceLast: 30 }), { channel: "sms", waitSeconds: 30 });
});
