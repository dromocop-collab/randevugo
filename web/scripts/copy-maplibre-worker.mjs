// maplibre-gl 6.x haritayı ayrı bir worker dosyasıyla çalıştırır; Turbopack bu dosyaları paketlemez.
// Worker ve ortak modül public/vendor/maplibre/<sürüm>/ altına kopyalanır, harita setWorkerUrl ile oradan yükler
// (features/businesses/business-location-picker.tsx). predev/prebuild çalıştırır; çıktı git'e girmez.
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules/maplibre-gl/dist");
const { version } = JSON.parse(readFileSync(join(root, "node_modules/maplibre-gl/package.json"), "utf8"));
const base = join(root, "public/vendor/maplibre");
rmSync(base, { recursive: true, force: true });
const target = join(base, version);
mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(join(source, file), join(target, file));
console.log(`maplibre worker → public/vendor/maplibre/${version}/`);
