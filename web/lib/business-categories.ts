const CATEGORY_ALIASES: Record<string, readonly string[]> = {
  yazilim: ["yazilim", "yazilim-web", "yazilim-web-video", "web", "webtasarim"],
};

export function canonicalBusinessCategory(value: string): string {
  const normalized = value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(normalized)) return canonical;
  }
  return normalized;
}

export function businessCategoryQueryValues(value: string): string[] {
  const canonical = canonicalBusinessCategory(value);
  return [...(CATEGORY_ALIASES[canonical] ?? [canonical])];
}
