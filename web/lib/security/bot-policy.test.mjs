import test from "node:test";
import assert from "node:assert/strict";
import { BLOCKED_CRAWLERS, isBlockedUserAgent } from "./bot-policy.ts";

test("veri çekme botları ve betik istemcileri engellenir", () => {
  for (const ua of ["Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)", "CCBot/2.0 (https://commoncrawl.org/faq/)",
    "python-requests/2.32.3", "curl/8.7.1", "Wget/1.21", "Scrapy/2.11 (+https://scrapy.org)", "Go-http-client/2.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/124.0 Safari/537.36",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)", "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)"]) {
    assert.equal(isBlockedUserAgent(ua), true, ua);
  }
});

test("gerçek tarayıcılar, arama motorları ve önizleyiciler açık", () => {
  for (const ua of ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1) HeadlessChrome/124.0 Safari/537.36",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", "Mozilla/5.0 (compatible; YandexBot/3.0)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", "WhatsApp/2.24.1 A", "TelegramBot (like TwitterBot)",
    "Twitterbot/1.0", "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0 Mobile Safari/537.36 Chrome-Lighthouse",
    "", null, undefined]) {
    assert.equal(isBlockedUserAgent(ua), false, String(ua));
  }
  assert.ok(BLOCKED_CRAWLERS.includes("GPTBot"));
});
