import { expect, type BattlefieldBrowserFixture } from './fixture';
import { formationScene } from './scenes';
import { battlefieldCost } from '../../../shared/battlefield/cost.ts';

export async function objectsScenario(fixture: BattlefieldBrowserFixture) {
  const {
    origin,
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
    dragSlider,
    save,
    openBattlefield,
  } = fixture;
  await openBattlefield(formationScene());
  await choose('Rocky asteroid');
  await choose('Mining facility');
  await choose('Starlight gold', 'Apply');
  await choose('Violet nebula', 'Apply');
  await choose('Planet');
  await page.getByLabel('Planet surface', { exact: true }).selectOption('ocean');
  await choose('Planetary city');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await objects.getByLabel('Search objects').fill('Ion cannon');
  const turretPreview = await objects
    .getByRole('button', { name: 'Add Ion cannon', exact: true })
    .locator('circle[r="9"]')
    .boundingBox();
  expect(turretPreview!.width).toBeGreaterThan(12);
  await objects.getByLabel('Search objects').fill('');
  await objects.getByRole('button', { name: 'Add-ons', exact: true }).click();
  await objects.evaluate(async el => {
    await Promise.all(el.getAnimations().map(animation => animation.finished));
  });
  await page.screenshot({ path: screenshots + 'addons-details.png', fullPage: true });
  await objects.getByRole('button', { name: 'All', exact: true }).click();
  await page.keyboard.press('Escape');
  await choose('Ion cannon');
  await choose('Starlight gold', 'Apply');
  const controls = page.getByRole('complementary', { name: 'Object controls' });
  const textureUrls = await canvas
    .locator('image')
    .evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('href')!))]);
  expect(textureUrls.length).toBeGreaterThan(0);
  for (const url of textureUrls) {
    const response = await context.request.get(new URL(url, origin).toString());
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\/png\b/);
    expect(
      (await response.body()).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    ).toBe(true);
  }
  await expect(controls.getByRole('checkbox')).toHaveCount(0);
  await select('Planet');
  await expect(controls.getByText('Planet', { exact: true })).toBeVisible();
  await controls.getByRole('slider', { name: 'Object size', exact: true }).fill('1.5');
  await controls.getByRole('slider', { name: 'Object rotation', exact: true }).fill('90');
  await controls.getByRole('slider', { name: 'Object rotation', exact: true }).press('ArrowRight');
  for (const item of ['Executor', 'Home One', 'Chimaera', 'Orbital station']) await choose(item);
  await save();
  let saved = (await editor()).battlefields[0];
  expect(battlefieldCost(saved.scene)).toBe(100150);
  expect((await editor()).balance).toBe(200000);
  const ocean = saved.scene.placements.find(p => p.itemId === 'planet')!;
  expect(ocean.scale).toBe(1.5);
  expect(ocean.rotation).toBe(91);
  expect(ocean.textureId).toBe('ocean');
  // A surface-only change is a dirty draft and survives saving/reloading.
  await select('Planet');
  await page.getByLabel('Planet surface', { exact: true }).selectOption('desert');
  await expect(saveButton).toBeEnabled();
  expect(
    (await editor()).battlefields[0].scene.placements.find(p => p.id === ocean.id)!.textureId,
  ).toBe('ocean');
  await save();
  await page.reload();
  expect(
    (await editor()).battlefields[0].scene.placements.find(p => p.id === ocean.id)!.textureId,
  ).toBe('desert');
  await select('Planet');
  await expect(page.getByLabel('Planet surface', { exact: true })).toHaveValue('desert');
  await page.getByLabel('Planet surface', { exact: true }).selectOption('ocean');
  await save();
  saved = (await editor()).battlefields[0];
  for (const name of ['Executor', 'Home One', 'Chimaera']) {
    const shipButton = page.getByRole('button', { name: 'Select ' + name, exact: true }).first();
    await shipButton.focus();
    await page.keyboard.press('Enter');
    const shipSize = page.getByRole('slider', { name: 'Object size', exact: true });
    await expect(shipSize).toHaveAttribute('min', '0.2');
    await expect(shipSize).toHaveAttribute('max', '1');
    await shipSize.fill('0.5');
    await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText(
      'Cost 100,150',
    );
    await expect(shipButton).toHaveAttribute('transform', /scale\(0\.5\)/);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(shipButton).toHaveAttribute('transform', /scale\(1\)/);
  }
  for (const scale of [1.05, 2]) {
    const response = await context.request.patch(origin + '/api/battlefields/' + saved.id, {
      headers,
      data: {
        name: saved.name,
        revision: saved.revision,
        scene: {
          ...saved.scene,
          placements: saved.scene.placements.map((p, i) => (i === 0 ? { ...p, scale } : p)),
        },
      },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).message).toContain('20–100%');
  }
  const reduced = await context.request.patch(origin + '/api/battlefields/' + saved.id, {
    headers,
    data: {
      name: saved.name,
      revision: saved.revision,
      scene: {
        ...saved.scene,
        placements: saved.scene.placements.map((p, i) => (i === 0 ? { ...p, scale: 0.5 } : p)),
      },
    },
  });
  expect(reduced.status()).toBe(200);
  const reducedSaved = (await reduced.json()).data;
  expect(reducedSaved.scene.placements[0].scale).toBe(0.5);
  expect(battlefieldCost(reducedSaved.scene)).toBe(battlefieldCost(saved.scene));
  const restored = await context.request.patch(origin + '/api/battlefields/' + saved.id, {
    headers,
    data: { name: saved.name, revision: reducedSaved.revision, scene: saved.scene },
  });
  expect(restored.status()).toBe(200);
  saved = (await restored.json()).data;
  await page.reload();
  await select('Chimaera');
  // The main row contains name, cost, background and save; selection controls
  // stay in the left column without an extra Customize button.
  const sidebarBox = await controls.boundingBox(),
    fieldBox = await canvas.boundingBox();
  expect(sidebarBox!.x + sidebarBox!.width).toBeLessThanOrEqual(fieldBox!.x + 1);
  const objectsButton = page.getByRole('button', { name: 'Objects', exact: true });
  const objectsButtonBox = await objectsButton.boundingBox();
  expect(objectsButtonBox!.x).toBeGreaterThanOrEqual(sidebarBox!.x);
  expect(objectsButtonBox!.x + objectsButtonBox!.width).toBeLessThanOrEqual(
    sidebarBox!.x + sidebarBox!.width,
  );
  expect(objectsButtonBox!.y).toBeLessThan(sidebarBox!.y);
  await expect(controls.getByLabel('Background', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Customize', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to profile' })).toHaveCount(0);
  const nameBox = await page.getByLabel('Battlefield name').boundingBox();
  const costBox = await page
    .getByRole('status', { name: 'Battlefield cost', exact: true })
    .boundingBox();
  const backgroundBox = await page.getByLabel('Background', { exact: true }).boundingBox();
  expect(Math.abs(costBox!.y - nameBox!.y)).toBeLessThan(20);
  expect(backgroundBox!.y).toBeLessThan(fieldBox!.y);
  const titleBox = await page
    .getByRole('heading', { name: 'Battlefield', exact: true })
    .boundingBox();
  const subtitleBox = await page
    .getByText('Build your galaxy. Each Battlefield can use your full credit budget.', {
      exact: true,
    })
    .boundingBox();
  expect(Math.abs(titleBox!.y - subtitleBox!.y)).toBeLessThan(12);
  // Shift-deselecting an object must never drag the remaining selection.
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  const beforeDeselect = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('transform')));
  const oceanButton = page.getByRole('button', { name: 'Select Planet', exact: true });
  // Overlapping ships can cover the planet's center; use a visible part of it.
  const deselectPoint = await oceanButton.evaluate(el => {
    const bounds = el.getBoundingClientRect();
    for (let row = 1; row < 10; row++)
      for (let column = 1; column < 10; column++) {
        const x = bounds.x + (bounds.width * column) / 10,
          y = bounds.y + (bounds.height * row) / 10;
        if (document.elementFromPoint(x, y)?.closest('[data-placement-id]') === el) return { x, y };
      }
    return null;
  });
  expect(deselectPoint).not.toBeNull();
  await page.keyboard.down('Shift');
  await page.mouse.move(deselectPoint!.x, deselectPoint!.y);
  await page.mouse.down();
  await page.mouse.move(deselectPoint!.x + 10, deselectPoint!.y);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(oceanButton).toHaveAttribute('aria-pressed', 'false');
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
  ).toEqual(beforeDeselect);
  await expect(saveButton).toBeDisabled();
  await select('Planet');
  const oceanTransform = await oceanButton.getAttribute('transform');
  const sizeSlider = page.getByRole('slider', { name: 'Object size', exact: true });
  const totalCost = page.getByRole('status', { name: 'Battlefield cost', exact: true });
  await sizeSlider.fill('2');
  await expect(totalCost).toContainText('Cost 101,900');
  await sizeSlider.fill('0.5');
  await expect(totalCost).toContainText('Cost 98,900');
  await sizeSlider.fill('1.5');
  await expect(totalCost).toContainText('Cost 100,150');
  await expect(saveButton).toBeDisabled();
  await dragSlider('Object size', 1.5, 3, undefined, async () => {
    await expect(totalCost).toContainText('Cost 106,900');
    await expect(controls.getByText(/Object cost: 9,000 credits/)).toBeVisible();
  });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(oceanButton).toHaveAttribute('transform', oceanTransform!);
  await expect(saveButton).toBeDisabled();
  await select('Planet');
  // Add-ons are independent objects: multiple copies, free movement and per-copy cost.
  console.log('Checking independent add-ons and layers.');
  await choose('Planetary city');
  await expect(totalCost).toContainText('Cost 101,350');
  const addedCity = canvas
    .getByRole('button', { name: 'Select Planetary city', exact: true })
    .last();
  const cityBefore = await addedCity.getAttribute('transform');
  const cityBox = await addedCity.boundingBox();
  await page.mouse.move(cityBox!.x + cityBox!.width / 2, cityBox!.y + cityBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    cityBox!.x + cityBox!.width / 2 + 15,
    cityBox!.y + cityBox!.height / 2 + 10,
    { steps: 6 },
  );
  await page.mouse.up();
  expect(await addedCity.getAttribute('transform')).not.toBe(cityBefore);
  await save();
  const layerScene = (await editor()).battlefields[0].scene;
  expect(layerScene.placements.filter(p => p.itemId === 'addon-city')).toHaveLength(2);
  expect(layerScene.placements.every(p => !('addonIds' in p) && !('groupId' in p))).toBe(true);
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  await expect(
    canvas.getByRole('button', { name: 'Select Planetary city', exact: true }),
  ).toHaveCount(1);
  await save();
}
