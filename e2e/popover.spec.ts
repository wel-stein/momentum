import { expect, test } from "@playwright/test";

/**
 * Regression cover for the anchored-dropdown clipping bug: a menu opened on
 * the *last* row of a table used to render inside the table's scroll
 * container, so it was clipped away and could not be clicked.
 *
 * Like the rest of the suite these run signed-out. The board's row pickers
 * are read-only without a session, so the KPI table — which stays editable
 * against the local store — is the surface that exercises the shared
 * `Popover` primitive end to end.
 */

const YEAR = "2031";

test.describe("Row dropdowns escape the table's scroll container", () => {
  test("the last KPI row's action menu is fully on screen and clickable", async ({
    page,
  }) => {
    // A short viewport puts the row near the bottom edge — the failing case.
    await page.setViewportSize({ width: 1280, height: 560 });
    await page.goto("/kpi");

    await page
      .getByRole("banner")
      .getByRole("button", { name: /New KPI set/i })
      .click();
    const setDialog = page.getByRole("dialog");
    await setDialog.getByRole("spinbutton").fill(YEAR);
    await setDialog.getByRole("button", { name: "Create", exact: true }).click();
    await page.waitForURL(`**/kpi/${YEAR}`);

    // Anonymous writes are rejected when the suite runs against a configured
    // Supabase project; there is nothing to assert then.
    const addObjective = page.getByRole("button", { name: "Add objective" });
    if ((await addObjective.count()) === 0) {
      test.skip(true, "KPI set could not be created in this environment");
    }

    await addObjective.first().click();
    const itemDialog = page.getByRole("dialog");
    await itemDialog
      .getByPlaceholder("e.g. Optimize infrastructure costs")
      .fill("Popover regression row");
    await itemDialog
      .getByRole("button", { name: "Add objective", exact: true })
      .click();

    const rowMenu = page.getByRole("button", { name: "Row actions" }).last();
    await expect(rowMenu).toBeVisible();
    await rowMenu.click();

    // The panel is portalled to <body>, not nested in the clipping table.
    const panel = page.locator("body > div.fixed").last();
    await expect(panel).toBeVisible();
    await expect(
      panel.locator("xpath=ancestor::table"),
    ).toHaveCount(0);

    // Nothing spills outside the viewport…
    const box = (await panel.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

    // …and every entry actually receives the click. "Add notes" is the
    // non-destructive one.
    await panel.getByRole("button", { name: "Add notes" }).click();
    await expect(page.getByPlaceholder(/note/i).first()).toBeVisible();
  });

  test("Escape closes the menu without closing the page behind it", async ({
    page,
  }) => {
    await page.goto("/kpi");
    await page
      .getByRole("banner")
      .getByRole("button", { name: /New KPI set/i })
      .click();
    const setDialog = page.getByRole("dialog");
    await setDialog.getByRole("spinbutton").fill(YEAR);
    await setDialog.getByRole("button", { name: "Create", exact: true }).click();
    await page.waitForURL(`**/kpi/${YEAR}`);

    const addObjective = page.getByRole("button", { name: "Add objective" });
    if ((await addObjective.count()) === 0) {
      test.skip(true, "KPI set could not be created in this environment");
    }
    await addObjective.first().click();
    const itemDialog = page.getByRole("dialog");
    await itemDialog
      .getByPlaceholder("e.g. Optimize infrastructure costs")
      .fill("Popover escape row");
    await itemDialog
      .getByRole("button", { name: "Add objective", exact: true })
      .click();

    await page.getByRole("button", { name: "Row actions" }).last().click();
    const panel = page.locator("body > div.fixed").last();
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/kpi/${YEAR}$`));
  });
});
