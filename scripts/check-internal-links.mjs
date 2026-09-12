import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const appRoot = join(projectRoot, "web", "app");
const sourceRoots = [appRoot, join(projectRoot, "web", "components")];

async function filesUnder(directory) {
  const output = [];
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const info = await stat(path);
    if (info.isDirectory()) output.push(...await filesUnder(path));
    else if (/\.(tsx|ts)$/.test(name)) output.push(path);
  }
  return output;
}

function routePattern(pagePath) {
  const value = relative(appRoot, pagePath).replace(/\/page\.(tsx|ts)$/, "");
  const route = `/${value}`.replace(/\/\([^/]+\)/g, "").replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+");
  return new RegExp(`^${route === "/" ? "/" : route}/?$`);
}

const pageFiles = (await filesUnder(appRoot)).filter((path) => /\/page\.(tsx|ts)$/.test(path));
const routes = pageFiles.map(routePattern);
const sourceFiles = (await Promise.all(sourceRoots.map(filesUnder))).flat();
const failures = [];

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/(?:href|canonical)\s*=\s*["'](\/[A-Za-z0-9_?=&%#./{}\-]+)["']/g)) {
    const href = match[1].split(/[?#]/)[0];
    if (!href || href.includes("{") || href.startsWith("/api/")) continue;
    if (!routes.some((pattern) => pattern.test(href))) failures.push(`${relative(projectRoot, file)} -> ${href}`);
  }
}

if (failures.length) {
  console.error(`Kırık dahili bağlantılar:\n${[...new Set(failures)].join("\n")}`);
  process.exit(1);
}
console.log(`Dahili bağlantı kontrolü başarılı (${routes.length} rota).`);
