import { expect, test } from "@playwright/test";

test("redirects unauthenticated users away from identity settings", async ({ page }) => {
  await page.goto("/settings/profile");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: /entrar com google/i })).toBeVisible();

  await page.goto("/settings/access");
  await expect(page).toHaveURL("/");
});
