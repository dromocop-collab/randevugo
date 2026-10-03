import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/isletmeler", "/fiyatlar", "/isletmeler/giris"];

for (const route of publicRoutes) {
  test(`${route} loads without viewport overflow`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.ok(), `${route} should return a successful response`).toBeTruthy();
    await page.waitForTimeout(300);

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      title: document.title,
    }));

    expect(viewport.title).not.toBe("");
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
  });
}
