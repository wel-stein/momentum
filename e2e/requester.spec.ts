import { expect, test } from "@playwright/test";

/**
 * Requester column smoke tests. Like smoke.spec.ts these run signed-out
 * (read-only board), so they cover rendering/wiring of the new column
 * against the local sample board rather than the interactive picker —
 * the picker and the completion-notification dialog require an authed
 * session the e2e suite deliberately avoids.
 */

test.describe("Requester column", () => {
  test("table view renders the Requester column with sample data", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Your boards")).toBeVisible();
    await page.getByText("Product launch").first().click();

    // Signed-out visitors can still switch the local view.
    await page.getByRole("button", { name: "Table" }).click();

    // Column header present in every group's table.
    await expect(
      page.getByRole("columnheader", { name: "Requester" }).first(),
    ).toBeVisible();

    // The seeded requester renders in a requester cell. (Task titles are
    // <input> values, invisible to text matchers, so match the name only —
    // "Jordan Lee" is a contact, not a member, so it can't come from the
    // Owners column.)
    await expect(page.getByText("Jordan Lee")).toBeVisible();
  });

  test("read-only board offers no requester editing affordance", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByText("Product launch").first().click();
    await page.getByRole("button", { name: "Table" }).click();
    await expect(
      page.getByRole("columnheader", { name: "Requester" }).first(),
    ).toBeVisible();
    // The dashed "+ Requester" chip only exists for editable boards.
    // (Its accessible name is "Requester"; the header is a columnheader,
    // not a button, so this can't collide.)
    await expect(
      page.getByRole("button", { name: "Requester", exact: true }),
    ).toHaveCount(0);
  });
});
