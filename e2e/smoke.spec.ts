import { expect, test } from "@playwright/test";

/**
 * Happy-path smoke tests. They exercise the public surface area without
 * needing a real auth session — so they can run against any environment
 * with the dev server up. They catch regressions in routing, shell
 * rendering, and the share / not-found states.
 */

test.describe("Momentum smoke", () => {
  test("home page renders the brand + sign-in pill when signed out", async ({
    page,
  }) => {
    await page.goto("/");
    // Shell rendered (i.e. AuthProvider settled, store hydrated).
    await expect(page.getByText("Your boards")).toBeVisible();
    await expect(page.getByText("Momentum").first()).toBeVisible();
    // Signed-out visitors see the Sign in pill in the header.
    await expect(
      page.getByRole("button", { name: /sign in/i }).first(),
    ).toBeVisible();
  });

  test("board page shows not-found for an unknown id", async ({ page }) => {
    await page.goto("/board/this-id-does-not-exist");
    await expect(page.getByText(/Board not found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /back home/i })).toBeVisible();
  });

  test("share page shows invalid-link for an unknown token", async ({
    page,
  }) => {
    await page.goto("/share/not-a-real-token");
    await expect(
      page.getByText(/Shared link is invalid or revoked/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Go to Momentum/i }),
    ).toBeVisible();
  });

  test("theme toggle is reachable from the header", async ({ page }) => {
    await page.goto("/");
    // The compact theme toggle next to the Sign-in pill is the smallest
    // a11y-named control on the page.
    await expect(
      page.getByLabel(/Switch to (light|dark) mode/i),
    ).toBeVisible();
  });

  test("api invitations route rejects unauthenticated callers", async ({
    request,
  }) => {
    const res = await request.post("/api/invitations", {
      data: { to: "a@b.com", boardId: "x", boardName: "B" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/sign in/i);
  });
});
