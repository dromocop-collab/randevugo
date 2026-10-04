import test from "node:test";
import assert from "node:assert/strict";
import { buildCodeEmail, buildStaffInviteEmail, escapeHtml } from "../lib/email-templates.js";

test("kod e-postası kodu konu, önizleme, kutular ve düz metinde taşır", () => {
  const mail = buildCodeEmail("487240", "verify", new Date("2026-10-04T18:54:00Z"));
  assert.match(mail.subject, /^487240 · SeninRandevun doğrulama/);
  assert.match(mail.html, /Doğrulama kodun: 487240/);
  for (const digit of "487240") assert.ok(mail.html.includes(`>${digit}</td>`));
  assert.match(mail.html, /seninrandevun\.com\/apple-icon\.png/);
  assert.match(mail.text, /Kodun: 487240/);
  assert.match(mail.text, /21:54/); // Europe/Istanbul (UTC+3)
});

test("şifre sıfırlama metni ayrı ve doğru", () => {
  const mail = buildCodeEmail("123456", "reset");
  assert.match(mail.subject, /şifre sıfırlama kodun/);
  assert.match(mail.html, /Yeni şifreni belirle/);
});

test("davet e-postası kullanıcı verisini kaçışlar", () => {
  const mail = buildStaffInviteEmail("<b>Ali</b>", "Kuaför & <script>", "https://seninrandevun.com/x?a=1&b=2");
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("Kuaför &amp; &lt;script&gt;"));
  assert.ok(mail.html.includes("&lt;b&gt;Ali&lt;/b&gt;"));
  assert.equal(escapeHtml(`"'`), "&quot;&#39;");
});
