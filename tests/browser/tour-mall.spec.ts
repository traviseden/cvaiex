import { test, expect } from '@playwright/test';

test('arrow keys look without translating, and the mall landmarks expose verified history', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?place=downtown-mall&walk=1');
  await expect(page.locator('#room-world')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  const canvas = page.locator('#room-world canvas');
  const position = await canvas.getAttribute('data-position');
  const heading = await canvas.getAttribute('data-heading');
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(500); await page.keyboard.up('ArrowLeft');
  await expect(canvas).toHaveAttribute('data-position', position!);
  await expect(canvas).not.toHaveAttribute('data-heading', heading!);
  const pitch = await canvas.getAttribute('data-pitch');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(400); await page.keyboard.up('ArrowUp');
  await expect(canvas).not.toHaveAttribute('data-pitch', pitch!);
  await expect(canvas).toHaveAttribute('data-position', position!);
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator('[data-landmark="ting-pavilion"]').click();
  await page.keyboard.press('e');
  await expect(page.locator('[data-music-venue="ting-pavilion"]')).toContainText('Goose');
  await expect(page.locator('[data-music-venue="ting-pavilion"]')).toContainText('The String Cheese Incident');
  await expect(page.locator('[data-music-venue="ting-pavilion"]')).toContainText('Andy Frasco');
  await page.getByRole('button', { name: 'Close discovery' }).click();
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator('[data-landmark="chalk-wall"]').click(); await page.keyboard.press('e');
  await expect(page.locator('#surface-details-body')).toContainText('AI Explorers');
  await expect(page.locator('#surface-details-body')).toContainText('Go Hoos!');
  await page.getByRole('button', { name: 'Close discovery' }).click();
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator('[data-business="jefferson-theater"]').click(); await page.keyboard.press('e');
  await expect(page.locator('[data-music-venue="jefferson-theater"]')).toContainText('Billy Strings');
  expect(errors).toEqual([]);
});

test('the guided circuit holds a flight, pauses at stops, and retains the stop after venue entry', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await page.getByRole('button', { name: 'Take the tour', exact: true }).click();
  await expect(page.locator('#tour-panel')).toHaveAttribute('data-phase', 'flying');
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await expect(page.locator('#tour-panel')).toHaveAttribute('data-phase', 'held');
  const progress = await page.locator('#tour-progress').getAttribute('value');
  await page.waitForTimeout(500);
  await expect(page.locator('#tour-progress')).toHaveAttribute('value', progress!);
  await expect(page.locator('#tour-enter')).toBeDisabled();
  await page.getByRole('button', { name: 'Resume flight', exact: true }).click();
  await expect(page.locator('#tour-panel')).toHaveAttribute('data-phase', 'stop', { timeout: 20000 });
  await expect(page.locator('#tour-title')).toHaveText('Studio IX');
  await page.locator('#tour-enter').click();
  await expect(page.locator('#room-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the city' }).click();
  await expect(page.locator('#tour-panel')).toHaveAttribute('data-stop', 'studio-ix');
  await expect(page.locator('#tour-panel')).toHaveAttribute('data-phase', 'stop');
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(page.locator('#tour-panel')).toHaveAttribute('data-stop', 'downtown-mall');
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(page.locator('#tour-panel')).toHaveAttribute('data-stop', 'ting-pavilion');
  await page.getByRole('button', { name: 'End guided tour' }).click();
  await expect(page.locator('#tour-panel')).toBeHidden();
  expect(errors).toEqual([]);
});

test('reduced-motion tour visits all five stops without cinematic camera travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?tour=community');
  await expect(page.locator('#tour-panel')).toHaveAttribute('data-phase', 'stop', { timeout: 90000 });
  for (const id of ['studio-ix', 'downtown-mall', 'ting-pavilion', 'kardinal-hall', 'uva-data-science']) {
    await expect(page.locator('#tour-panel')).toHaveAttribute('data-stop', id);
    await expect(page.locator('#tour-panel')).toHaveAttribute('data-phase', 'stop');
    await page.locator('#tour-next').click();
  }
  await expect(page.locator('#tour-panel')).toBeHidden();
});
