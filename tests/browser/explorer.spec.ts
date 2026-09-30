import { test, expect } from '@playwright/test';

test('real city loads, typed navigation enters a room, and deep links work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /WebGLProgram|shader/i.test(message.text())) errors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await expect(page.locator('#world')).toHaveAttribute('data-sky-ready', 'true');
  await expect(page.getByRole('heading', { name: 'A little city. A big universe.' })).toBeVisible();
  await page.getByLabel('Reduce animation').click();
  await page.getByRole('searchbox').fill('take me to studio nine');
  await page.getByRole('searchbox').press('Enter');
  await expect(page.locator('#destination-title')).toHaveText('Studio IX');
  await page.getByRole('button', { name: 'Enter the community room' }).click();
  await expect(page.locator('#room-dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI Design Bake-Off' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to the city' }).click();
  await expect(page.locator('#room-dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Return to city overview' }).click();
  await page.getByRole('button', { name: 'Start first-person flight' }).click();
  await expect(page.locator('#flight-hud')).toBeVisible();
  const beforeFlight = await page.locator('#world canvas').screenshot();
  await page.keyboard.down('w');
  await page.waitForTimeout(600);
  await page.keyboard.up('w');
  const afterFlight = await page.locator('#world canvas').screenshot();
  expect(beforeFlight.equals(afterFlight)).toBe(false);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Return to overview', exact: true }).click();
  await expect(page.locator('#flight-hud')).toBeHidden();
  await page.getByRole('searchbox').fill('Monticello');
  await expect(page.locator('.search-empty')).toBeVisible();
  await page.goto('/?place=uva-data-science');
  await expect(page.locator('#destination-title')).toHaveText('UVA School of Data Science', { timeout: 90000 });
  await page.getByRole('button', { name: 'Enter the community room' }).click();
  await expect(page.getByRole('heading', { name: 'beCamp 2026', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register at be.camp' })).toHaveAttribute('href', 'https://be.camp/register/');
  await expect(page.locator('[data-room-place="studio-ix"]')).toBeHidden();
  await page.getByRole('button', { name: 'Back to the city' }).click();
  await page.getByRole('searchbox').fill('studio icks');
  await page.getByRole('searchbox').press('Enter');
  await page.getByRole('button', { name: 'Enter the community room' }).click();
  await expect(page.getByRole('heading', { name: 'AI Design Bake-Off' })).toBeVisible();
  await expect(page.locator('[data-room-place="uva-data-science"]')).toBeHidden();
  expect(errors).toEqual([]);
});

test('WebGL failure provides working content and destination navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return getContext.apply(this, [type, ...args] as Parameters<typeof getContext>);
    } as typeof getContext;
  });
  await page.goto('/');
  await expect(page.locator('#scene-status')).toContainText('3D is unavailable');
  await page.locator('[data-destination="studio-ix"]').click();
  await expect(page).toHaveURL(/\/places\/studio-ix\//);
  await expect(page.getByRole('heading', { name: 'Studio IX.' })).toBeVisible();
});

test('content is crawlable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: 'Our mission' })).toBeVisible();
  await page.goto('/events/ai-explorers-17/');
  await expect(page.getByRole('heading', { name: 'AI Design Bake-Off.' })).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  await page.goto('/events/becamp-2026/');
  await expect(page.getByRole('heading', { name: 'beCamp 2026.' })).toBeVisible();
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}');
  expect(schema.location.address.streetAddress).toBe('1919 Ivy Road');
  expect(schema.organizer.name).toBe('beCamp');
  await context.close();
});

test('mobile controls, voice fallback, and page layout remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  await page.getByRole('button', { name: 'Speak a destination' }).click();
  await expect(page.locator('#scene-status')).toContainText(/Voice|Listening|Microphone|Couldn’t/);
  await page.locator('[data-destination="studio-ix"]').click();
  await expect(page.locator('#destination-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Enter the community room' }).click();
  await expect(page.locator('#room-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the city' }).click();
});

test('the original map-first layout fits the viewport without document scrolling', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 90000 });
  await expect(page.getByRole('heading', { name: 'A little city. A big universe.' })).toBeVisible();
  await expect(page.getByText('Charlottesville, reimagined among the stars.')).toHaveCount(1);
  await expect(page.locator('#sky-button, #sky-readout')).toHaveCount(0);
  await expect(page.locator('.brand small')).toHaveText('EXPLORERS');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const bounds = await page.evaluate(() => {
      const selectors = ['.intro h1', '#explore-button', '#search-form', '.explorer-footer', '.site-header'];
      return {
        width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
        rectangles: selectors.map(selector => { const r = document.querySelector(selector)!.getBoundingClientRect(); return { selector, left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }),
        buttonBottom: document.querySelector('#explore-button')!.getBoundingClientRect().bottom,
        dockTop: document.querySelector('.discovery-dock')!.getBoundingClientRect().top,
      };
    });
    expect(bounds.width, `scroll width at ${JSON.stringify(viewport)}`).toBeLessThanOrEqual(viewport.width);
    expect(bounds.height, `scroll height at ${JSON.stringify(viewport)}`).toBeLessThanOrEqual(viewport.height);
    expect(bounds.buttonBottom, `hero overlaps dock at ${JSON.stringify(viewport)}`).toBeLessThan(bounds.dockTop);
    for (const rect of bounds.rectangles) {
      expect(rect.left, `${rect.selector} left at ${JSON.stringify(viewport)}`).toBeGreaterThanOrEqual(0);
      expect(rect.right, `${rect.selector} right at ${JSON.stringify(viewport)}`).toBeLessThanOrEqual(viewport.width);
      expect(rect.bottom, `${rect.selector} bottom at ${JSON.stringify(viewport)}`).toBeLessThanOrEqual(viewport.height);
    }
    await page.mouse.move(viewport.width * .65, viewport.height * .45);
    await page.mouse.wheel(0, 400);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  }
});
