import { expect, type BattlefieldBrowserFixture } from './fixture';

export async function entryScenario(fixture: BattlefieldBrowserFixture) {
  const {
    sql,
    origin,
    userId,
    context,
    anonymous,
    anonPage,
    page,
    canvas,
    headers,
    fullProfileFrame,
  } = fixture;
  expect((await anonymous.request.get(origin + '/api/battlefields')).status()).toBe(401);
  expect(
    (
      await context.request.post(origin + '/api/battlefields/purchase', {
        headers,
        data: { itemId: 'ship-tie', requestId: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(404);
  await anonPage.goto(origin + '/battlefield');
  await expect(anonPage.getByText('You must be logged in to view this page.')).toBeVisible();
  await page.addInitScript(() =>
    sessionStorage.setItem('swubase:battlefield:purchase:obsolete:ship-tie', 'obsolete'),
  );
  await page.goto(origin + '/users/' + userId);
  await fullProfileFrame(page); // The starter header also fits its complete 4:1 scene.
  await page.getByRole('button', { name: 'Battlefield', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Battlefield editor', exact: true }).click();
  // The empty-state preview reflects whether the starter's area cost fits.
  await sql`UPDATE user_credits SET amount=3609 WHERE user_id=${userId}`;
  await page.reload();
  const initialPreview = page.getByRole('img', { name: 'Battlefield preview', exact: true });
  await expect(initialPreview).toBeVisible();
  await expect(initialPreview.locator('circle[r="50"][fill]')).toHaveCount(0);
  await sql`UPDATE user_credits SET amount=200000 WHERE user_id=${userId}`;
  await page.reload();
  await expect(initialPreview.locator('circle[r="50"][fill]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Create battlefield', exact: true }).click();
  await expect(canvas).toBeVisible();
  // The site sidebar closes on entry and restores its previous state on exit.
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Battlefield', exact: true })).toBeVisible();
  await expect(
    page.locator('[data-sidebar="sidebar"]').first().locator('xpath=../..'),
  ).toHaveAttribute('data-state', 'expanded');
  await page.goForward();
  await expect(canvas).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some(key => key.startsWith('swubase:battlefield:purchase:')),
    ),
  ).toBe(false);
}
