import { expect, type BattlefieldBrowserFixture } from './fixture';
import { homeOneScene } from './scenes';
import { battlefieldCost } from '../../../shared/battlefield/cost.ts';

export async function lightingScenario(fixture: BattlefieldBrowserFixture) {
  const {
    origin,
    userId,
    context,
    anonPage,
    page,
    canvas,
    saveButton,
    lightHandle,
    lightingButton,
    headers,
    screenshots,
    editor,
    editLighting,
    draftLight,
    dragLight,
    select,
    dragSlider,
    savedDraft,
    save,
    fullProfileFrame,
    openBattlefield,
  } = fixture;
  const alternate = await openBattlefield(homeOneScene());
  const alternateId = alternate.id;
  console.log('Checking the main light, gestures, history, zoom and profile shading.');
  // Reproduce an object directly under the default light handle.
  expect(
    (
      await context.request.patch(origin + '/api/battlefields/' + alternate.id, {
        headers,
        data: {
          name: alternate.name,
          revision: alternate.revision,
          scene: {
            ...alternate.scene,
            placements: alternate.scene.placements.map(p => ({ ...p, ...alternate.scene.light })),
          },
        },
      })
    ).status(),
  ).toBe(200);
  await page.reload(); // Fresh history in the active alternate Battlefield.
  await expect(lightHandle).toBeVisible();
  await savedDraft();
  const lightingBase = (await editor()).battlefields.find(b => b.id === alternateId)!;
  const lightingBudget = await page.getByRole('status', { name: 'Battlefield cost' }).textContent();
  const beforeLighting = await canvas
    .locator('linearGradient[id$="-lighting"]')
    .evaluateAll(nodes => nodes.map(node => [node.getAttribute('x1'), node.getAttribute('y1')]));
  await expect(lightHandle).toHaveCSS('pointer-events', 'none');
  const overlapHandle = await lightHandle.boundingBox();
  await page.mouse.click(overlapHandle!.x + 18, overlapHandle!.y + 18);
  await expect(page.getByRole('button', { name: 'Select Home One', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(lightingButton).toHaveAttribute('aria-pressed', 'false');
  await lightingButton.click();
  await expect(lightHandle).toHaveCSS('pointer-events', 'auto');
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Light X', exact: true })).toHaveValue('200');
  await expect(page.getByRole('slider', { name: 'Light Y', exact: true })).toHaveValue('60');
  await dragLight(1, 1); // Clicking with normal pointer wobble leaves the draft untouched.
  await savedDraft();
  await dragLight(55, 20, true);
  expect(await draftLight()).toEqual(lightingBase.scene.light);
  await savedDraft();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  const lightFitWidth = await dragLight(55, 20, false, true);
  const fitLight = await draftLight();
  expect(fitLight.x - lightingBase.scene.light.x).toBeCloseTo((55 / lightFitWidth) * 1600, 4);
  expect(fitLight.y - lightingBase.scene.light.y).toBeCloseTo((20 / lightFitWidth) * 1600, 4);
  expect(
    await canvas
      .locator('linearGradient[id$="-lighting"]')
      .evaluateAll(nodes => nodes.map(node => [node.getAttribute('x1'), node.getAttribute('y1')])),
  ).not.toEqual(beforeLighting);
  await expect(saveButton).toBeEnabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await draftLight()).toEqual(lightingBase.scene.light);
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toBeVisible();
  await savedDraft();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await draftLight()).toEqual(fitLight);
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'true');
  await save();
  let litScene = (await editor()).battlefields.find(b => b.id === alternateId)!.scene;
  expect(litScene.light).toEqual(fitLight);
  expect(litScene.placements).toEqual(lightingBase.scene.placements);
  expect(litScene.layers).toEqual(lightingBase.scene.layers);
  expect((await editor()).balance).toBe(200000);
  expect(await page.getByRole('status', { name: 'Battlefield cost' }).textContent()).toBe(
    lightingBudget,
  );
  await page.reload();
  await savedDraft();
  expect(await draftLight()).toEqual(fitLight);
  await editLighting();
  await dragSlider('Light X', fitLight.x, 1350);
  await expect(saveButton).toBeEnabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await draftLight()).toEqual(fitLight);
  await savedDraft();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await lightingButton.click();
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'false');
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toHaveCount(0);
  // The handle also remains keyboard accessible when pointer clicks pass through it.
  await lightHandle.focus();
  await page.keyboard.press('Enter');
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'true');
  const lightX = page.getByRole('slider', { name: 'Light X', exact: true });
  await lightX.fill('350');
  await page.getByRole('slider', { name: 'Light Y', exact: true }).fill('150');
  await save();
  const sliderLight = await draftLight();
  await lightHandle.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('ArrowUp');
  expect(await draftLight()).toEqual({ x: sliderLight.x + 10, y: sliderLight.y - 1 });
  await page.keyboard.press('Control+z');
  expect(await draftLight()).toEqual({ x: sliderLight.x + 10, y: sliderLight.y });
  await expect(lightHandle).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('ArrowUp');
  expect(await draftLight()).toEqual({ x: sliderLight.x + 10, y: sliderLight.y - 1 });
  await page.keyboard.press('Delete');
  await expect(canvas.locator('[data-placement-id]')).toHaveCount(1);
  await save();
  await page.reload();
  const lightBeforeZoom = await draftLight();
  await editLighting();
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  expect((await lightHandle.boundingBox())!.width).toBe(36);
  const lightZoomWidth = await dragLight(30, 5, false, true);
  const zoomedLight = await draftLight();
  expect(zoomedLight.x - lightBeforeZoom.x).toBeCloseTo((30 / lightZoomWidth) * 1600, 4);
  expect(zoomedLight.y - lightBeforeZoom.y).toBeCloseTo((5 / lightZoomWidth) * 1600, 4);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await savedDraft();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  // Middle-button dragging the handle pans the camera without selecting or moving the source.
  await lightHandle.scrollIntoViewIfNeeded();
  const lightPanBox = await lightHandle.boundingBox();
  const lightPanView = page.getByLabel('Battlefield viewport', { exact: true });
  const scrollLightBefore = await lightPanView.evaluate(el => el.scrollLeft);
  await page.mouse.move(lightPanBox!.x + 18, lightPanBox!.y + 18);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(lightPanBox!.x - 22, lightPanBox!.y + 18, { steps: 8 });
  await page.mouse.up({ button: 'middle' });
  expect(await lightPanView.evaluate(el => el.scrollLeft)).toBeCloseTo(scrollLightBefore + 40, 0);
  expect(await draftLight()).toEqual(lightBeforeZoom);
  await savedDraft();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await editLighting();
  await lightX.fill('1600');
  await page.getByRole('slider', { name: 'Light Y', exact: true }).fill('400');
  await page.getByLabel('Battlefield editing area').focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  expect(await draftLight()).toEqual({ x: 1600, y: 400 });
  expect(await lightPanView.evaluate(el => el.scrollWidth - el.clientWidth)).toBe(0);
  expect(await lightPanView.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(
    1,
  );
  await lightX.fill('1100');
  await page.getByRole('slider', { name: 'Light Y', exact: true }).fill('50');
  await save();
  await page.reload();
  litScene = (await editor()).battlefields.find(b => b.id === alternateId)!.scene;
  expect(litScene.light).toEqual({ x: 1100, y: 50 });
  expect(litScene.placements).toEqual(lightingBase.scene.placements);
  expect(battlefieldCost(litScene)).toBe(battlefieldCost(lightingBase.scene));
  await editLighting();
  await page.screenshot({ path: screenshots + 'lighting-editor.png', fullPage: true });
  await select('Home One');
  await expect(
    page.getByRole('complementary', { name: 'Object controls', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Light controls', exact: true }),
  ).toHaveCount(0);
  const editorLightGradient = await canvas
    .locator('linearGradient[id$="-metal"]')
    .evaluateAll(nodes =>
      nodes.map(node => ['x1', 'x2', 'y1', 'y2'].map(key => node.getAttribute(key))),
    );
  // Reduced motion keeps the saved pose identical to the static editor.
  await anonPage.emulateMedia({ reducedMotion: 'reduce' });
  await anonPage.goto(origin + '/users/' + userId);
  await fullProfileFrame(anonPage);
  await expect(anonPage.getByRole('button', { name: 'Move main light', exact: true })).toHaveCount(
    0,
  );
  await expect(anonPage.locator('[data-battlefield-light]')).toHaveCount(0);
  const profileGradient = () =>
    anonPage
      .locator('svg[viewBox="0 0 1600 400"]')
      .first()
      .locator('linearGradient[id$="-metal"]')
      .evaluateAll(nodes =>
        nodes.map(node => ['x1', 'x2', 'y1', 'y2'].map(key => node.getAttribute(key))),
      );
  expect(await profileGradient()).toEqual(editorLightGradient);
  const storedBeforeMotion = await editor();
  const animationWrites: string[] = [];
  anonPage.on('request', request => {
    if (
      new URL(request.url()).pathname.startsWith('/api/battlefields') &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())
    )
      animationWrites.push(request.method());
  });
  await anonPage.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(profileGradient).not.toEqual(editorLightGradient);
  const movingProfileGradient = await profileGradient();
  await expect.poll(profileGradient).not.toEqual(movingProfileGradient);
  expect(await editor()).toEqual(storedBeforeMotion);
  expect(animationWrites).toEqual([]);
  await anonPage.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(profileGradient).toEqual(editorLightGradient);
  await anonPage.waitForTimeout(250);
  expect(await profileGradient()).toEqual(editorLightGradient);
}
