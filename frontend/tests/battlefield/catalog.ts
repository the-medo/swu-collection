import { expect, type BattlefieldBrowserFixture } from './fixture';
import { publicBattlefieldScene } from '../../../shared/battlefield/layers.ts';

export async function catalogScenario(fixture: BattlefieldBrowserFixture) {
  const {
    origin,
    userId,
    anonymous,
    page,
    objects,
    canvas,
    saveButton,
    screenshots,
    editor,
    choose,
    select,
    save,
    openBattlefield,
  } = fixture;
  await openBattlefield();
  console.log('Checking named capital ships, per-scene budget, shrink controls and persistence.');
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  const capitalShips = [
    'Tantive IV',
    'Lightmaker',
    'Liberty',
    'Redemption',
    'Profundity',
    'Resolute',
    'Tranquility',
    'Raddus',
    'Avenger',
    'Devastator',
    'Relentless',
    'Corvus',
    'Gideon’s Light Cruiser',
    'Finalizer',
    'The Invisible Hand',
    'Malevolence',
  ];
  for (const name of capitalShips) {
    await choose(name);
    await expect(page.getByRole('slider', { name: 'Object size', exact: true })).toHaveAttribute(
      'max',
      '1',
    );
    await expect(canvas.getByRole('button', { name: 'Select ' + name, exact: true })).toBeVisible();
  }
  await select('Liberty');
  await page.getByRole('slider', { name: 'Object size', exact: true }).fill('0.5');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    'Cost 189,300',
  );
  await choose('Starlight gold', 'Apply');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
    'Cost 189,700',
  );
  await save();
  const fleet = (await editor()).battlefields[0];
  expect(fleet.scene.placements).toHaveLength(capitalShips.length);
  expect(fleet.scene.placements.find(p => p.itemId === 'ship-liberty')!.scale).toBe(0.5);
  expect(fleet.scene.placements.find(p => p.itemId === 'ship-liberty')!.colorId).toBe('color-gold');
  expect((await editor()).balance).toBe(200000);
  await page.reload();
  await expect(canvas).toBeVisible();
  expect((await editor()).battlefields[0].scene).toEqual(fleet.scene);
  const publicFleet = await anonymous.request.get(origin + '/api/user/' + userId + '/battlefield');
  expect(publicFleet.status()).toBe(200);
  expect((await publicFleet.json()).data.scene).toEqual(publicBattlefieldScene(fleet.scene));
  const wheelViewport = page.getByLabel('Battlefield viewport', { exact: true });
  console.log('Checking Separatist ships, shrinking ships, colors, cost and persistence.');
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await objects.getByLabel('Search objects').fill('Separatist');
  for (const ship of ['Vulture droid', 'Invincible', 'Vuutun Palaa'])
    await expect(objects.getByRole('button', { name: 'Add ' + ship, exact: true })).toBeVisible();
  await page.screenshot({ path: screenshots + 'separatist-previews.png', fullPage: true });
  await page.keyboard.press('Escape');
  await choose('Vulture droid');
  await page.getByRole('slider', { name: 'Object size', exact: true }).fill('0.2');
  const smallShip = page.getByRole('button', { name: 'Select Vulture droid', exact: true });
  const hitTarget = smallShip.locator('[data-object-hit-target]');
  for (const enlarged of [false, true]) {
    if (enlarged) await page.getByRole('button', { name: 'Zoom', exact: true }).click();
    await smallShip.scrollIntoViewIfNeeded();
    const bounds = (await hitTarget.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(23.9);
    expect(bounds.height).toBeGreaterThanOrEqual(23.9);
    const editingArea = page.getByLabel('Battlefield editing area', { exact: true });
    await editingArea.focus();
    await page.keyboard.press('Escape');
    await page.mouse.click(bounds.x + bounds.width / 2 + 9, bounds.y + bounds.height / 2);
    await expect(smallShip).toHaveAttribute('aria-pressed', 'true');
    const outline = (await smallShip.locator('[data-selection-outline]').boundingBox())!;
    expect(outline.width).toBeGreaterThanOrEqual(11.9);
    expect(outline.height).toBeGreaterThanOrEqual(11.9);
  }
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  for (const ship of ['Vulture droid', 'Vulture droid', 'Invincible', 'Vuutun Palaa']) {
    await choose(ship);
    await expect(page.getByRole('slider', { name: 'Object size', exact: true })).toHaveAttribute(
      'max',
      '1',
    );
  }
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText('Cost 40,400');
  await choose('Ion blue', 'Apply');
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText('Cost 40,800');
  await save();
  const separatistScene = (await editor()).battlefields[0].scene;
  expect(separatistScene.placements.map(p => p.itemId)).toEqual([
    'ship-vulture',
    'ship-vulture',
    'ship-invincible',
    'ship-vuutun-palaa',
  ]);
  expect(separatistScene.placements.every(p => p.scale === 1)).toBe(true);
  await page.reload();
  await expect(canvas).toBeVisible();
  expect((await editor()).battlefields[0].scene).toEqual(separatistScene);
  await select('Invincible');
  const invincible = page.getByRole('button', { name: 'Select Invincible', exact: true });
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  await invincible.scrollIntoViewIfNeeded();
  const shipPanBox = (await invincible.boundingBox())!;
  const objectPanScroll = await wheelViewport.evaluate(el => [el.scrollLeft, el.scrollTop]);
  const objectPanTransform = await invincible.getAttribute('transform');
  const shipPanStart = {
    x: shipPanBox.x + shipPanBox.width / 2,
    y: shipPanBox.y + shipPanBox.height / 2,
  };
  await page.mouse.move(shipPanStart.x, shipPanStart.y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(shipPanStart.x - 30, shipPanStart.y - 20, { steps: 5 });
  await page.mouse.up({ button: 'middle' });
  expect(await wheelViewport.evaluate(el => el.scrollLeft)).toBeCloseTo(objectPanScroll[0] + 30, 0);
  expect(await wheelViewport.evaluate(el => el.scrollTop)).toBeCloseTo(objectPanScroll[1] + 20, 0);
  await expect(invincible).toHaveAttribute('aria-pressed', 'true');
  await expect(invincible).toHaveCSS('cursor', 'move');
  expect(await invincible.getAttribute('transform')).toBe(objectPanTransform);
  await expect(saveButton).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.screenshot({ path: screenshots + 'separatist-fleet.png', fullPage: true });
}
