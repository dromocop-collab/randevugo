#!/usr/bin/env node
// Çeviri denetimi:  node i18n/check.mjs [dosya veya klasör ...]   (varsayılan: tüm kapsam)
//
//  1) Kodda t("…") ile çağrılan her Türkçe anahtarın her dil sözlüğünde karşılığı var mı?
//  2) Çevrilmemiş görünen Türkçe metin kaldı mı? (t() dışında, Türkçe harf içeren JSX metni / dize)
//
// Çıkış kodu: eksik anahtar varsa 1. "--strict" ile çevrilmemiş metin de hata sayılır.
// Kapsam dışı: süper admin (iç kullanım, Türkçe kalır), testler, yorum satırları.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../..");
const messagesDir = join(root, "i18n/messages");
const DEFAULT_SCOPE = ["app", "components", "features", "hooks", "lib"];
const EXCLUDE = [/\/super-admin\//, /\/admin\//, /\.test\./, /\/i18n\//, /\/api\//, /sitemap\.ts$/, /robots\.ts$/, /manifest\.ts$/, /opengraph-image/, /og-routes|og-card/];

function walk(path, out = []) {
  const stat = statSync(path);
  if (stat.isDirectory()) { for (const name of readdirSync(path)) walk(join(path, name), out); return out; }
  if (/\.(tsx|ts)$/.test(path) && !EXCLUDE.some((re) => re.test(path))) out.push(path);
  return out;
}

function loadDictionaries() {
  const out = {};
  for (const locale of readdirSync(messagesDir)) {
    const dir = join(messagesDir, locale);
    if (!statSync(dir).isDirectory()) continue;
    out[locale] = {};
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
      const data = JSON.parse(readFileSync(join(dir, file), "utf8"));
      for (const [key, value] of Object.entries(data)) out[locale][key] = { value, file };
    }
  }
  return out;
}

const T_CALL = /\bt\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1\s*[,)]/g;
const TURKISH = /[çğıöşüÇĞİÖŞÜ]/;

function unescape(text, quote) {
  return text.replace(/\\(["'`\\])/g, "$1").replace(/\\n/g, "\n");
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`])\/\/.*$/gm, (m, p) => p + " ".repeat(m.length - p.length));
}

const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const strict = process.argv.includes("--strict");
const files = (args.length ? args : DEFAULT_SCOPE).flatMap((path) => walk(join(root, path)));
const dictionaries = loadDictionaries();
const missing = new Map();
const untranslated = [];
let keyCount = 0;

for (const file of files) {
  const source = stripComments(readFileSync(file, "utf8"));
  for (const match of source.matchAll(T_CALL)) {
    if (match[1] === "`" && match[2].includes("${")) continue; // dinamik anahtar (ör. t(errorMessage)) denetlenemez
    const key = unescape(match[2], match[1]);
    keyCount += 1;
    for (const [locale, dict] of Object.entries(dictionaries)) {
      if (!dict[key]) {
        const list = missing.get(locale) ?? new Map();
        list.set(key, relative(root, file));
        missing.set(locale, list);
      }
    }
  }
  // Çevrilmemiş metin sezgisi: t( içermeyen, Türkçe harfli JSX metni ya da dize
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    if (!TURKISH.test(line)) return;
    const withoutT = line.replace(T_CALL, "");
    if (!TURKISH.test(withoutT)) return;
    if (/^\s*(import|export \* from)/.test(line)) return;
    if (/i18n-ignore/.test(line)) return;
    untranslated.push(`${relative(root, file)}:${index + 1}: ${line.trim().slice(0, 140)}`);
  });
}

let failed = false;
for (const [locale, list] of missing) {
  if (!list.size) continue;
  failed = true;
  console.log(`\n✗ ${locale}: ${list.size} anahtarın çevirisi yok`);
  for (const [key, file] of [...list].slice(0, 200)) console.log(`  ${file}  ${JSON.stringify(key)}`);
}
console.log(`\n${files.length} dosya, ${keyCount} çeviri çağrısı, ${Object.keys(dictionaries).length} dil sözlüğü.`);
if (untranslated.length) {
  console.log(`${untranslated.length} satırda t() dışında Türkçe metin var${strict ? "" : " (bilgi)"}:`);
  for (const line of untranslated.slice(0, strict ? 400 : 40)) console.log("  " + line);
  if (strict) failed = true;
}
process.exit(failed ? 1 : 0);
