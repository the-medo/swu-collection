import { expect, type BattlefieldBrowserFixture } from './fixture';
import { fleetScene, homeOneScene } from './scenes';
import { publicBattlefieldScene } from '../../../shared/battlefield/layers.ts';

export async function responsiveScenario(fixture: BattlefieldBrowserFixture) {
  const {
    sql,
    origin,
    userId,
    context,
    anonymous,
    anonPage,
    page,
    objects,
    canvas,
    headers,
    screenshots,
    editor,
    select,
    fullProfileFrame,
    openBattlefield,
    createBattlefield,
  } = fixture;
  const saved = await openBattlefield(fleetScene());
  await sql`UPDATE user_profile SET battlefield_limit=2 WHERE user_id=${userId}`;
  const alternate = await createBattlefield(homeOneScene());
  const alternateId = alternate.id;
  expect(
    (
      await context.request.post(origin + '/api/battlefields/' + alternateId + '/activate', {
        headers,
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByLabel('Choose Battlefield').selectOption(saved.id);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toBeVisible();
  const beforeSelectionBox = await canvas.boundingBox();
  await page.getByRole('button', { name: 'Select TIE fighter', exact: true }).nth(0).click();
  const afterSelectionBox = await canvas.boundingBox();
  expect(afterSelectionBox!.y).toBeCloseTo(beforeSelectionBox!.y, 2);
  await expect(page.getByRole('slider', { name: 'Object rotation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Objects', exact: true }).focus();
  let reachedCanvas = false,
    reachedControls = false;
  for (let step = 0; step < 40; step++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    if (focused === 'Battlefield editing area') reachedCanvas = true;
    if (focused === 'Object color') {
      reachedControls = true;
      break;
    }
  }
  expect(reachedCanvas && reachedControls).toBe(true);
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await expect(objects).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const mobilePicker = await objects.boundingBox(),
    mobileCanvas = await canvas.boundingBox();
  expect(mobilePicker!.y).toBeLessThan(mobileCanvas!.y + mobileCanvas!.height);
  expect(mobilePicker!.y + mobilePicker!.height).toBeGreaterThan(mobileCanvas!.y);
  await objects.evaluate(async el => {
    await Promise.all(el.getAnimations().map(animation => animation.finished));
  });
  await page.screenshot({ path: screenshots + 'objects-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  // Swipe empty space to pan a zoomed canvas on touch devices.
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  await select('Planet');
  await canvas.scrollIntoViewIfNeeded();
  const viewport = page.getByLabel('Battlefield viewport', { exact: true });
  await viewport.evaluate(el => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
  const beforePan = await viewport.evaluate(el => el.scrollLeft);
  const touchBox = await viewport.boundingBox();
  const touch = await context.newCDPSession(page);
  const swipeY = Math.max(2, touchBox!.y + 8);
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 320, y: swipeY }],
  });
  for (const x of [280, 220, 160, 100, 60])
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: swipeY }],
    });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(beforePan);
  await expect(page.getByRole('button', { name: 'Select Planet', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await touch.detach();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'light'));
  await page.reload();
  await page.getByLabel('Choose Battlefield').selectOption(saved.id);
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(canvas).toBeVisible();
  await page.screenshot({ path: screenshots + 'editor-mobile-light.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto(origin + '/users/' + userId);
  await expect(page.getByRole('button', { name: 'Battlefield', exact: true })).toBeVisible();
  const publicProfile = await anonymous.request.get(
    origin + '/api/user/' + userId + '/battlefield',
  );
  expect(publicProfile.status()).toBe(200);
  expect((await publicProfile.json()).data.scene).toEqual(
    publicBattlefieldScene((await editor()).battlefields.find(b => b.id === alternateId)!.scene),
  );
  await anonPage.goto(origin + '/users/' + userId);
  await expect(anonPage.getByRole('button', { name: 'Battlefield', exact: true })).toHaveCount(0);
  for (const width of [1500, 1024, 390]) {
    await anonPage.setViewportSize({ width, height: 1000 });
    await fullProfileFrame(anonPage);
    await anonPage.screenshot({
      path: screenshots + 'profile-full-' + width + '.png',
      fullPage: true,
    });
  }
}
