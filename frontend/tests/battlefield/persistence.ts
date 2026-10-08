import { expect, type BattlefieldBrowserFixture } from './fixture';
import { fleetScene } from './scenes';
import { battlefieldCost } from '../../../shared/battlefield/cost.ts';

export async function persistenceScenario(fixture: BattlefieldBrowserFixture) {
  const {
    sql,
    origin,
    userId,
    context,
    page,
    objects,
    canvas,
    saveButton,
    headers,
    screenshots,
    editor,
    choose,
    select,
    savedDraft,
    save,
    dialogs,
    openBattlefield,
  } = fixture;
  await openBattlefield(fleetScene());
  let saved = (await editor()).battlefields[0];
  // A catalog item retired since a previous save must leave an editable,
  // repairable draft instead of throwing from the cost counter.
  await page.route('**/api/battlefields', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    const legacy = body.data.battlefields[0].scene;
    legacy.backgroundId = 'retired-background';
    legacy.placements.push({
      ...legacy.placements[0],
      id: crypto.randomUUID(),
      itemId: 'retired-ship',
    });
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('saved layout needs repair');
  await expect(saveButton).toBeDisabled();
  await page.getByRole('button', { name: 'Repair layout', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.unroute('**/api/battlefields');
  await save();
  // A duplicate legacy layer can have identical rendered artwork. Its repair
  // must still become a dirty, saveable draft rather than being ignored as a no-op.
  await page.route('**/api/battlefields', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    body.data.battlefields[0].scene.layers.push({ ...body.data.battlefields[0].scene.layers[0] });
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('unique ID');
  await page.getByRole('button', { name: 'Repair layout', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(saveButton).toBeEnabled();
  await page.unroute('**/api/battlefields');
  await save();
  await choose('Violet nebula', 'Apply');
  await save();
  saved = (await editor()).battlefields[0];
  expect(battlefieldCost(saved.scene)).toBe(100150);
  // The picker sits over the canvas and keeps the page in place. It scrolls
  // internally, supports search, keyboard dismissal and independent add-ons.
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const pickerBox = await objects.boundingBox(),
    canvasBox = await canvas.boundingBox();
  expect(pickerBox!.y).toBeLessThan(canvasBox!.y + canvasBox!.height);
  expect(pickerBox!.y + pickerBox!.height).toBeGreaterThan(canvasBox!.y);
  const beforeScroll = await page.evaluate(() => window.scrollY);
  await objects.getByLabel('Search objects').fill('not-in-the-galaxy');
  await expect(objects.getByText('No objects match your search.')).toBeVisible();
  await objects.getByLabel('Search objects').fill('');
  await objects.evaluate(async el => {
    await Promise.all(el.getAnimations().map(animation => animation.finished));
  });
  await page.screenshot({ path: screenshots + 'objects-wide.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(objects).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll);
  // A rejected network save keeps the draft and can be retried.
  await page.getByLabel('Battlefield name').fill('Imperial sector');
  await page.route('**/api/battlefields/' + saved.id, route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Temporary save failure' }),
    }),
  );
  await saveButton.click();
  await expect(page.getByRole('alert')).toHaveText('Temporary save failure');
  await expect(page.getByLabel('Battlefield name')).toHaveValue('Imperial sector');
  await page.unroute('**/api/battlefields/' + saved.id);
  await save();
  // Preserve existing multi-tab conflict recovery.
  saved = (await editor()).battlefields[0];
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + saved.id, {
        headers,
        data: { name: 'Other tab', scene: saved.scene, revision: saved.revision },
      })
    ).status(),
  ).toBe(200);
  await page.getByLabel('Battlefield name').fill('My draft');
  await saveButton.click();
  await expect(page.getByRole('button', { name: 'Save my draft instead' })).toBeVisible();
  dialogs.accept = true;
  await page.getByRole('button', { name: 'Save my draft instead' }).click();
  await savedDraft();
  dialogs.accept = false;
  expect((await editor()).battlefields[0].name).toBe('My draft');
  // Remove, undo and redo release/reapply cost immediately.
  await select('Rocky asteroid');
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText('Cost 99,850');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    'Cost 100,150',
  );
  // Each future additional slot gets the same full budget.
  await sql`UPDATE user_profile SET battlefield_limit=2 WHERE user_id=${userId}`;
  await page.reload();
  await page.getByRole('button', { name: 'New battlefield', exact: true }).click();
  await expect(page.getByLabel('Choose Battlefield')).toBeVisible();
  await choose('Home One');
  await save();
  const two = await editor();
  expect(two.battlefields).toHaveLength(2);
  expect(two.balance).toBe(200000);
  await page.getByRole('button', { name: 'Use on profile', exact: true }).click();
  await expect(page.getByText('On your profile', { exact: true })).toBeVisible();
  console.log('Checking credit limits and over-budget saves.');
  // All items stay available even when adding one would exceed the budget.
  // Over-budget drafts cannot save, and undo immediately enables saving again.
  await sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES(${userId},${100150 - 200000},'battlefield-browser-adjustment',${crypto.randomUUID()})`;
  await page.reload();
  // Reload defaults to the active alternate, so explicitly choose our fleet.
  await page.getByLabel('Choose Battlefield').selectOption(saved.id);
  await expect(canvas.getByRole('button', { name: 'Select Executor', exact: true })).toBeVisible();
  await page.screenshot({ path: screenshots + 'editor-wide.png', fullPage: true });
  await select('Planet');
  await page.getByRole('slider', { name: 'Object size', exact: true }).fill('2');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    '1,750 over budget',
  );
  await expect(saveButton).toBeDisabled();
  saved = (await editor()).battlefields.find(b => b.id === saved.id)!;
  const enlarged = {
    ...saved.scene,
    placements: saved.scene.placements.map(p => (p.itemId === 'planet' ? { ...p, scale: 2 } : p)),
  };
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + saved.id, {
        headers,
        data: { name: saved.name, revision: saved.revision, scene: enlarged },
      })
    ).status(),
  ).toBe(400);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await choose('TIE fighter');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    '250 over budget',
  );
  await expect(saveButton).toBeDisabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByLabel('Battlefield name').fill('Full budget fleet');
  await expect(saveButton).toBeEnabled();
  await save();
  saved = (await editor()).battlefields.find(b => b.id === saved.id)!;
  const over = {
    ...saved.scene,
    placements: [
      ...saved.scene.placements,
      { ...saved.scene.placements[0], id: crypto.randomUUID() },
    ],
  };
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + saved.id, {
        headers,
        data: { name: 'Tampered budget', revision: saved.revision, scene: over },
      })
    ).status(),
  ).toBe(400);
  expect((await editor()).balance).toBe(100150);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toBeVisible();
  const ledger = await sql`SELECT source FROM user_credits WHERE user_id=${userId}`;
  expect(ledger).toHaveLength(2); // Test award and deliberate test adjustment only.
}
