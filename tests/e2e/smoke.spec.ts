import { expect, test } from '@playwright/test';

test('loads the game shell and mounts the Pixi stage', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.locator('.game')).toBeVisible();
  await expect(page.locator('[data-testid="pixi-stage"]')).toBeVisible();
  await expect(page.locator('canvas[data-testid="pixi-stage-canvas"]')).toHaveCount(1);

  const pixiBox = await page.locator('[data-testid="pixi-stage"]').boundingBox();
  expect(pixiBox?.width).toBeGreaterThan(200);
  expect(pixiBox?.height).toBeGreaterThan(200);

  await expect(page.locator('[data-testid="p1-campaign"]')).toBeVisible();
  await expect(page.locator('.p1StatusStrip')).toBeVisible();
  await expect(page.getByText('普通快递').first()).toBeVisible();
  await expect(page.locator('.p1Hotspot').first()).toBeVisible();

  const hotspotBox = await page.locator('.p1Hotspot').first().boundingBox();
  expect(hotspotBox?.width).toBeGreaterThan(20);
  expect(hotspotBox?.height).toBeGreaterThan(20);
  await page.screenshot({
    path: testInfo.outputPath(`p1-playable-${testInfo.project.name}.png`),
    fullPage: false,
  });

  if (hotspotBox) {
    await page.mouse.move(hotspotBox.x + hotspotBox.width / 2, hotspotBox.y + hotspotBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1700);
    await page.mouse.up();
  }
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('砸开了')).toBeVisible();
});
