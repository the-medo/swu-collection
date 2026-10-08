import { expect, type BattlefieldBrowserFixture } from './fixture';

export async function transformsScenario(fixture: BattlefieldBrowserFixture) {
  const { page, canvas, saveButton, editor, choose, dragSlider, save, openBattlefield } = fixture;
  await openBattlefield();
  console.log('Checking transforms, sliders and zoom.');
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Remove selection from battlefield' }).click();
  for (const ship of ['TIE fighter', 'TIE fighter', 'X-wing']) await choose(ship);
  await expect(page.getByRole('status', { name: 'Battlefield cost' })).toContainText('Cost 900');
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Layer from selection', exact: true }).click();
  await page.getByRole('slider', { name: 'Object rotation', exact: true }).fill('30');
  await page.getByRole('button', { name: 'Rotate selection clockwise' }).click();
  await page.getByLabel('Battlefield editing area').focus();
  for (let step = 0; step < 12; step++) await page.keyboard.press('Shift+ArrowUp');
  await save();
  const groupButtons = page.getByRole('button', { name: /^Select (TIE fighter|X-wing)$/ });
  const beforeSliderTransforms = await groupButtons.evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('transform')),
  );
  await dragSlider('Object rotation', 45, 180, 45);
  expect(
    await groupButtons.evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
  ).toEqual(beforeSliderTransforms);
  await expect(saveButton).toBeDisabled();
  await dragSlider('Object rotation', 45, 180);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(
    await groupButtons.evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
  ).toEqual(beforeSliderTransforms);
  await expect(saveButton).toBeDisabled();
  // Holding an arrow key and leaving a slider each commit one gesture.
  const rotationSlider = page.getByRole('slider', { name: 'Object rotation', exact: true });
  for (const endByBlur of [false, true]) {
    await page.getByRole('button', { name: 'Select layer Layer 2', exact: true }).click();
    await rotationSlider.focus();
    for (let repeat = 0; repeat < 4; repeat++) await page.keyboard.down('ArrowRight');
    await expect(rotationSlider).toHaveValue('49');
    if (endByBlur) await page.keyboard.press('Tab');
    await page.keyboard.up('ArrowRight');
    await expect(saveButton).toBeEnabled();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(
      await groupButtons.evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
    ).toEqual(beforeSliderTransforms);
    await expect(saveButton).toBeDisabled();
  }
  const savedFormation = (await editor()).battlefields[0].scene.placements;
  expect(savedFormation).toHaveLength(3);
  expect(new Set(savedFormation.map(p => p.id)).size).toBe(3);
  expect(new Set(savedFormation.map(p => p.layerId)).size).toBe(1);
  expect(savedFormation.every(p => p.rotation === 45)).toBe(true);
  await page.getByLabel('Battlefield editing area').focus();
  await page.keyboard.press('Escape');
  const fitDragCanvas = await canvas.boundingBox();
  const box = await page
    .getByRole('button', { name: 'Select TIE fighter', exact: true })
    .nth(0)
    .boundingBox();
  // Selection taps must tolerate normal pointer wobble at every canvas scale.
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 1, box!.y + box!.height / 2 + 1);
  await page.mouse.up();
  expect(
    await groupButtons.evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))),
  ).toEqual(beforeSliderTransforms);
  await expect(saveButton).toBeDisabled();
  await page.getByRole('button', { name: 'Select layer Layer 2', exact: true }).click();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 45, box!.y + box!.height / 2 + 15, { steps: 8 });
  await page.mouse.up();
  await save();
  const moved = (await editor()).battlefields[0].scene.placements;
  expect(moved[0].x - savedFormation[0].x).toBeCloseTo((45 / fitDragCanvas!.width) * 1600, 4);
  expect(moved[0].y - savedFormation[0].y).toBeCloseTo((15 / fitDragCanvas!.width) * 1600, 4);
  for (let i = 1; i < moved.length; i++)
    expect(moved[i].x - savedFormation[i].x).toBeCloseTo(moved[0].x - savedFormation[0].x, 5);
  // Dragging at 200% uses the enlarged canvas's coordinate scale.
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  const zoomViewport = page.getByLabel('Battlefield viewport', { exact: true });
  await zoomViewport.evaluate(el => {
    el.scrollLeft = 80;
  });
  const zoomedCanvas = await canvas.boundingBox();
  const zoomedTie = page.getByRole('button', { name: 'Select TIE fighter', exact: true }).nth(0);
  await zoomedTie.scrollIntoViewIfNeeded();
  const zoomedShipBox = await zoomedTie.boundingBox();
  const beforeZoomDrag = (await editor()).battlefields[0].scene.placements[0];
  await page.mouse.move(
    zoomedShipBox!.x + zoomedShipBox!.width / 2,
    zoomedShipBox!.y + zoomedShipBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.wheel(0, -120);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(zoomedCanvas!.width, 2);
  await page.mouse.move(
    zoomedShipBox!.x + zoomedShipBox!.width / 2 + 30,
    zoomedShipBox!.y + zoomedShipBox!.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();
  await save();
  const afterZoomDrag = (await editor()).battlefields[0].scene.placements[0];
  expect(afterZoomDrag.x - beforeZoomDrag.x).toBeCloseTo((30 / zoomedCanvas!.width) * 1600, 4);
  expect(afterZoomDrag.y).toBeCloseTo(beforeZoomDrag.y, 4);
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
}
