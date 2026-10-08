import { expect, type BattlefieldBrowserFixture } from './fixture';
import { fleetScene } from './scenes';
import { battlefieldCost } from '../../../shared/battlefield/cost.ts';
import {
  battlefieldDrawOrder,
  publicBattlefieldScene,
} from '../../../shared/battlefield/layers.ts';

export async function layersScenario(fixture: BattlefieldBrowserFixture) {
  const {
    origin,
    userId,
    context,
    anonymous,
    anonPage,
    page,
    canvas,
    saveButton,
    headers,
    screenshots,
    editor,
    select,
    reorder,
    savedDraft,
    save,
    openBattlefield,
  } = fixture;
  const saved = await openBattlefield(fleetScene());
  let layerScene = saved.scene;
  const ocean = saved.scene.placements.find(p => p.itemId === 'planet')!;
  const totalCost = page.getByRole('status', { name: 'Battlefield cost', exact: true });
  const sidebarBox = await page
    .getByRole('complementary', { name: 'Object controls' })
    .boundingBox();
  const layersPanel = page.getByRole('complementary', { name: 'Battlefield layers' });
  const layersBox = await layersPanel.boundingBox();
  expect(layersBox!.x + layersBox!.width).toBeLessThanOrEqual(sidebarBox!.x + 1);
  const row = (id: string) => layersPanel.locator('[data-row-id="' + id + '"]');
  layerScene = (await editor()).battlefields[0].scene;
  const firstTie = layerScene.placements.find(p => p.itemId === 'ship-tie')!;
  const xWing = layerScene.placements.find(p => p.itemId === 'ship-x-wing')!;
  const originalStack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  await reorder(
    row(firstTie.id).getByRole('button', { name: 'Drag TIE fighter', exact: true }),
    row(xWing.id),
  );
  let stack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  expect(stack.indexOf(firstTie.id)).toBeGreaterThan(stack.indexOf(xWing.id));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id'))),
  ).toEqual(originalStack);
  await expect(saveButton).toBeDisabled();
  // Drag handles offer the same ordering with the keyboard.
  await row(firstTie.id)
    .getByRole('button', { name: 'Drag TIE fighter', exact: true })
    .press('ArrowUp');
  stack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  expect(stack.indexOf(firstTie.id)).toBe(originalStack.indexOf(firstTie.id) + 1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  // Long stacks scroll while a drag is held near an edge.
  await page.setViewportSize({ width: 1500, height: 650 });
  const stackList = layersPanel.getByLabel('Layers stack', { exact: true });
  const tieHandle = row(firstTie.id).getByRole('button', { name: 'Drag TIE fighter', exact: true });
  await tieHandle.scrollIntoViewIfNeeded();
  expect(await stackList.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const handleBox = await tieHandle.boundingBox(),
    scrollBounds = await stackList.boundingBox();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(scrollBounds!.x + 20, scrollBounds!.y + 5, { steps: 8 });
  await expect.poll(() => stackList.evaluate(el => el.scrollTop)).toBe(0);
  const fleetHeader = await row(firstTie.layerId).boundingBox();
  await page.mouse.move(
    fleetHeader!.x + fleetHeader!.width / 2,
    fleetHeader!.y + fleetHeader!.height / 2,
  );
  await page.mouse.up();
  stack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  expect(stack.at(-1)).toBe(firstTie.id);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(saveButton).toBeDisabled();
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.getByRole('button', { name: 'Create layer', exact: true }).click();
  await page.getByRole('button', { name: 'Rename layer Layer 3', exact: true }).click();
  await layersPanel.getByLabel('Layer name', { exact: true }).fill('Rebel fleet');
  await layersPanel.getByLabel('Layer name', { exact: true }).press('Enter');
  const rebelRow = layersPanel
    .locator('[data-row-kind="layer"]')
    .filter({ has: page.getByRole('button', { name: 'Select layer Rebel fleet', exact: true }) });
  await reorder(
    row(firstTie.id).getByRole('button', { name: 'Drag TIE fighter', exact: true }),
    rebelRow,
    0.5,
  );
  await save();
  layerScene = (await editor()).battlefields[0].scene;
  const rebelLayer = layerScene.layers.find(layer => layer.name === 'Rebel fleet')!;
  expect(layerScene.placements.find(p => p.id === firstTie.id)!.layerId).toBe(rebelLayer.id);
  expect(battlefieldDrawOrder(layerScene).at(-1)!.id).toBe(firstTie.id);
  // Layer ordering is itself draggable and changes the canvas stack.
  const fleetRow = row(firstTie.layerId);
  await reorder(
    page.getByRole('button', { name: 'Drag layer Rebel fleet', exact: true }),
    fleetRow,
    0.8,
  );
  stack = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  expect(stack[0]).toBe(firstTie.id);
  await save();
  // Create a deep tree, nest by dragging, and move it back out without changing geometry.
  console.log('Checking nested layers, ancestor visibility, save/reload and cycle rejection.');
  const baselineTree = (await editor()).battlefields[0];
  const baselineGeometry = new Map(
    baselineTree.scene.placements.map(p => [p.id, [p.x, p.y, p.rotation]]),
  );
  const tieTransform = await canvas
    .locator('[data-placement-id="' + firstTie.id + '"]')
    .getAttribute('transform');
  await page.getByRole('button', { name: 'Create sublayer in Rebel fleet', exact: true }).click();
  await page.getByRole('button', { name: 'Rename layer Layer 4', exact: true }).click();
  await layersPanel.getByLabel('Layer name', { exact: true }).fill('Strike wing');
  await layersPanel.getByLabel('Layer name', { exact: true }).press('Enter');
  await row(firstTie.id)
    .getByRole('button', { name: 'Select object TIE fighter', exact: true })
    .click();
  await layersPanel
    .getByLabel('Selection layer', { exact: true })
    .selectOption({ label: '› › Strike wing' });
  await page.getByRole('button', { name: 'Create sublayer in Strike wing', exact: true }).click();
  await page.getByRole('button', { name: 'Rename layer Layer 5', exact: true }).click();
  await layersPanel.getByLabel('Layer name', { exact: true }).fill('Scout squadron');
  await layersPanel.getByLabel('Layer name', { exact: true }).press('Enter');
  await select('X-wing');
  await layersPanel
    .getByLabel('Selection layer', { exact: true })
    .selectOption({ label: '› › › Scout squadron' });
  await save();
  let nestedSaved = (await editor()).battlefields[0];
  let strike = nestedSaved.scene.layers.find(layer => layer.name === 'Strike wing')!;
  const scout = nestedSaved.scene.layers.find(layer => layer.name === 'Scout squadron')!;
  expect(strike.parentId).toBe(rebelLayer.id);
  expect(scout.parentId).toBe(strike.id);
  for (const p of nestedSaved.scene.placements)
    expect([p.x, p.y, p.rotation]).toEqual(baselineGeometry.get(p.id)!);
  await page.getByRole('button', { name: 'Select layer Rebel fleet', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + firstTie.id + '"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(canvas.locator('[data-placement-id="' + xWing.id + '"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Rotate selection clockwise', exact: true }).click();
  expect(
    await canvas.locator('[data-placement-id="' + firstTie.id + '"]').getAttribute('transform'),
  ).not.toBe(tieTransform);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await page.getByRole('button', { name: 'Collapse Rebel fleet', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Select layer Scout squadron', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand Rebel fleet', exact: true }).click();
  await row(xWing.id).getByRole('button', { name: 'Hide X-wing', exact: true }).click();
  await page.getByRole('button', { name: 'Hide layer Rebel fleet', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + firstTie.id + '"]')).toHaveCount(0);
  await expect(totalCost).toContainText('Cost 100,150');
  await save();
  const nestedPublic = (
    await (await anonymous.request.get(origin + '/api/user/' + userId + '/battlefield')).json()
  ).data.scene;
  expect(
    nestedPublic.placements.some((p: { id: string }) => p.id === firstTie.id || p.id === xWing.id),
  ).toBe(false);
  expect(JSON.stringify(nestedPublic)).not.toContain('Scout squadron');
  await page.reload();
  await expect(canvas.locator('[data-placement-id="' + firstTie.id + '"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show layer Rebel fleet', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + firstTie.id + '"]')).toHaveCount(1);
  await expect(canvas.locator('[data-placement-id="' + xWing.id + '"]')).toHaveCount(0);
  await row(xWing.id).getByRole('button', { name: 'Show X-wing', exact: true }).click();
  await save();
  // Parent selectors exclude the whole descendant tree; impossible pointer drops are no-ops.
  await page.getByRole('button', { name: 'Select layer Rebel fleet', exact: true }).click();
  const parentChoices = await layersPanel
    .getByLabel('Layer parent', { exact: true })
    .locator('option')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('value')));
  expect(parentChoices).not.toContain(strike.id);
  expect(parentChoices).not.toContain(scout.id);
  await reorder(
    page.getByRole('button', { name: 'Drag layer Rebel fleet', exact: true }),
    row(scout.id),
    0.5,
  );
  await savedDraft();
  nestedSaved = (await editor()).battlefields[0];
  const cyclic = {
    ...nestedSaved.scene,
    layers: nestedSaved.scene.layers.map(layer =>
      layer.id === rebelLayer.id ? { ...layer, parentId: scout.id } : layer,
    ),
  };
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + nestedSaved.id, {
        headers,
        data: { name: nestedSaved.name, revision: nestedSaved.revision, scene: cyclic },
      })
    ).status(),
  ).toBe(400);
  // A middle-row drop reparents a folder and all descendants, with one Undo step.
  await reorder(
    page.getByRole('button', { name: 'Drag layer Strike wing', exact: true }),
    fleetRow,
    0.5,
  );
  await save();
  nestedSaved = (await editor()).battlefields[0];
  strike = nestedSaved.scene.layers.find(layer => layer.id === strike.id)!;
  expect(strike.parentId).toBe(firstTie.layerId);
  expect(nestedSaved.scene.layers.find(layer => layer.id === scout.id)!.parentId).toBe(strike.id);
  await page.getByRole('button', { name: 'Select layer Strike wing', exact: true }).click();
  await layersPanel.getByLabel('Layer parent', { exact: true }).selectOption('');
  await save();
  expect(
    (await editor()).battlefields[0].scene.layers.find(layer => layer.id === strike.id)!.parentId,
  ).toBeNull();
  await layersPanel.getByLabel('Layer parent', { exact: true }).selectOption(rebelLayer.id);
  await save();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Select layer Scout squadron', exact: true }),
  ).toBeVisible();
  // Folder selection has a parent control; object relocation is separate so it cannot flatten the subtree.
  await page.getByRole('button', { name: 'Select layer Strike wing', exact: true }).click();
  await expect(layersPanel.getByLabel('Selection layer', { exact: true })).toHaveCount(0);
  const beforeWrap = (await editor()).battlefields[0].scene;
  const beforeWrapOrder = battlefieldDrawOrder(beforeWrap).map(p => p.id);
  await page.getByRole('button', { name: 'Layer from selection', exact: true }).click();
  await save();
  const wrapped = (await editor()).battlefields[0].scene;
  const wrapper = wrapped.layers.find(layer => layer.name === 'Layer 6')!;
  expect(wrapper.parentId).toBe(rebelLayer.id);
  expect(wrapped.layers.find(layer => layer.id === strike.id)!.parentId).toBe(wrapper.id);
  expect(wrapped.layers.find(layer => layer.id === scout.id)!.parentId).toBe(strike.id);
  expect(wrapped.placements).toEqual(beforeWrap.placements);
  expect(battlefieldDrawOrder(wrapped).map(p => p.id)).toEqual(beforeWrapOrder);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await save();
  // Front/back moves the selected folder as one node, even beside direct objects.
  await page.getByRole('button', { name: 'Select layer Layer 2', exact: true }).click();
  const beforeFolderOrder = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  await page.getByRole('button', { name: 'To back', exact: true }).click();
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id'))),
  ).not.toEqual(beforeFolderOrder);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await page.getByRole('button', { name: 'Select layer Rebel fleet', exact: true }).click();
  await page.getByRole('button', { name: 'To front', exact: true }).click();
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id'))),
  ).not.toEqual(beforeFolderOrder);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  // Empty-folder hierarchy changes must still mark the layout dirty, even with identical artwork.
  await page
    .getByRole('button', { name: 'Create sublayer in Scout squadron', exact: true })
    .click();
  await save();
  await expect(page.getByRole('button', { name: 'To front', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'To back', exact: true })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Layer from selection', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Layer from selection', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Select layer Layer 7', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await page.getByRole('button', { name: 'Select layer Layer 6', exact: true }).click();
  await layersPanel.getByLabel('Layer parent', { exact: true }).selectOption(firstTie.layerId);
  await expect(saveButton).toBeEnabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await page.screenshot({ path: screenshots + 'nested-layers-wide.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1500, height: 1000 });
  await row(firstTie.id)
    .getByRole('button', { name: 'Select object TIE fighter', exact: true })
    .click();
  await row(ocean.id)
    .getByRole('button', { name: 'Select object Planet', exact: true })
    .click({ modifiers: ['Shift'] });
  await row(ocean.id)
    .getByRole('button', { name: 'Select object Planet', exact: true })
    .click({ modifiers: ['Shift'] });
  const beforeObjectGroup = await canvas
    .locator('[data-placement-id]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id')));
  await page.getByRole('button', { name: 'Layer from selection', exact: true }).click();
  expect(
    await canvas
      .locator('[data-placement-id]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id'))),
  ).toEqual(beforeObjectGroup);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  // Restore the saved fixture so the existing visibility and full-budget checks remain independent.
  const beforeRestore = (await editor()).battlefields[0];
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + baselineTree.id, {
        headers,
        data: {
          name: baselineTree.name,
          revision: beforeRestore.revision,
          scene: baselineTree.scene,
        },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  // Object/layer eyes persist, and revealing a folder preserves hidden children.
  await row(ocean.id).getByRole('button', { name: 'Hide Planet', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + ocean.id + '"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hide layer Layer 2', exact: true }).click();
  await expect(canvas.locator('[data-placement-id]')).toHaveCount(1);
  for (const shortcut of [false, true]) {
    if (shortcut) {
      await page.getByLabel('Battlefield editing area').focus();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
    } else {
      await page.getByRole('button', { name: 'Select all', exact: true }).click();
      await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
    }
    await expect(canvas.locator('[data-placement-id]')).toHaveCount(0);
    await expect(layersPanel.locator('[data-row-kind="object"]')).toHaveCount(11);
    await expect(totalCost).toContainText('Cost 99,900');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(canvas.locator('[data-placement-id]')).toHaveCount(1);
  }
  await save();
  layerScene = (await editor()).battlefields[0].scene;
  expect(battlefieldCost(layerScene)).toBe(100150);
  await page.reload();
  await expect(canvas.locator('[data-placement-id]')).toHaveCount(1);
  const visibleProfile = await anonymous.request.get(
    origin + '/api/user/' + userId + '/battlefield',
  );
  const publicScene = (await visibleProfile.json()).data.scene;
  expect(publicScene).toEqual(publicBattlefieldScene(layerScene));
  expect(publicScene.placements).toHaveLength(1);
  expect(JSON.stringify(publicScene)).not.toContain('Rebel fleet');
  expect(JSON.stringify(publicScene)).not.toContain('planet');
  await anonPage.goto(origin + '/users/' + userId);
  await expect(anonPage.locator('svg[aria-hidden="true"] circle[r="50"][fill]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show layer Layer 2', exact: true }).click();
  await expect(canvas.locator('[data-placement-id="' + ocean.id + '"]')).toHaveCount(0);
  await row(ocean.id).getByRole('button', { name: 'Show Planet', exact: true }).click();
  await save();
  await select('Planet');
  await page.screenshot({ path: screenshots + 'editor-sidebar-wide.png', fullPage: true });
}
