import { expect, test } from "@playwright/test";

const { BASE_URL = "http://localhost:3000" } = process.env;

test("has title", async ({ page }) => {
  await page.goto(BASE_URL);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/เกนชินไม่ใช่เกมมือถือ/);
});

test("artifact link", async ({ page }) => {
  await page.goto(BASE_URL);

  await page.getByText("เสือกไอดีชาวบ้าน").click();

  await expect(page.getByAltText("เสือกไอดีชาวบ้าน")).toBeVisible();
});

test("tierlist link", async ({ page }) => {
  await page.goto(BASE_URL);

  await page.getByText("จัดเทียร์ลิสต์").click();

  await page.getByText("5.7b").click();

  await expect(page.getByAltText("Disclaimer")).toBeVisible();
});
