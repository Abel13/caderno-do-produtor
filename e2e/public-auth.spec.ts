import { expect, test } from "@playwright/test";

test("shows the Google-only authentication entry point", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /sua lavoura/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /entrar com google/i })).toBeVisible();
  await expect(page.getByText(/acesso seguro e exclusivo/i)).toBeVisible();
});

test("redirects an unauthenticated user away from protected pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings/access");
  await expect(page).toHaveURL(/\/$/);
});
