import { expect, test } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test("has title", async ({ page }) => {
  await page.goto(BASE_URL);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/เกนชินไม่ใช่เกมมือถือ/);
});

test("artifact link", async ({ page }) => {
  await page.goto(BASE_URL);

  const viewportSize = page.viewportSize();
  const isMobile = viewportSize && viewportSize.width < 768;

  await page
    .getByText(isMobile ? "ตรวจแฟลกเกนชินรายแพทช์" : "เสือกไอดีชาวบ้าน")
    .click();

  await expect(page.getByAltText("เสือกไอดีชาวบ้าน")).toBeVisible();
});

test("tierlist public", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.getByText("จัดเทียร์ลิสต์").click();
  await page.getByText("5.7b").click();

  const viewportSize = page.viewportSize();
  const isMobile = viewportSize && viewportSize.width < 768;

  if (isMobile) {
    await expect(page.getByText("โปรดปรับจอเป็นแนวนอน")).toBeVisible({
      timeout: 15000,
    });
    // rotate phone
    await page.setViewportSize({
      height: viewportSize.width,
      width: viewportSize.height,
    });
  }
  await expect(page.getByAltText("Disclaimer")).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Close Disclaimer" }).click();
  await expect(page.getByAltText("Disclaimer")).toBeHidden();
});
