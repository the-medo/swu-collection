import { expect, type BattlefieldBrowserFixture } from './fixture';

export async function viewportScenario(fixture: BattlefieldBrowserFixture) {
  const { page, objects, canvas, editor, savedDraft, cursorZoom, openBattlefield } = fixture;
  await openBattlefield();
  // Reproduce the previously stretched thumbnails and ineffective wide-screen zoom.
  await page.setViewportSize({ width: 2200, height: 1100 });
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await objects.getByLabel('Search objects').fill('Planet');
  const sphere = await objects
    .getByRole('button', { name: 'Add Planet', exact: true })
    .locator('circle[r="50"][fill]')
    .boundingBox();
  await page.keyboard.press('Escape');
  const fitBox = await canvas.boundingBox();
  const editorBox = await page
    .getByRole('region', { name: 'Battlefield editor', exact: true })
    .boundingBox();
  expect(editorBox!.width).toBeGreaterThan(2000);
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  const zoomBox = await canvas.boundingBox();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  expect(sphere!.width / sphere!.height).toBeCloseTo(1, 2);
  expect(zoomBox!.width).toBeGreaterThan(fitBox!.width * 1.4);
  console.log('Checking pointer-anchored wheel zoom, rapid events, limits and native panning.');
  await cursorZoom(-2); // Tiny trackpad input must enlarge the artwork, even with scrollbars.
  await cursorZoom(-240);
  await cursorZoom(-120, 0.3, 0.6);
  const rapidAnchor = await cursorZoom(60, 0.45, 0.4);
  const beforeRapid = (await canvas.boundingBox())!.width;
  await canvas.evaluate((el, { cursor }) => {
    for (let i = 0; i < 4; i++)
      el.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: -50,
          clientX: cursor.x,
          clientY: cursor.y,
        }),
      );
  }, rapidAnchor);
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeGreaterThan(beforeRapid * 1.2);
  await expect
    .poll(() =>
      canvas.evaluate((el, { original, cursor }) => {
        const point = new DOMPoint(original.x, original.y).matrixTransform(
          (el as SVGSVGElement).getScreenCTM()!,
        );
        return Math.hypot(point.x - cursor.x, point.y - cursor.y);
      }, rapidAnchor),
    )
    .toBeLessThan(1.1);
  await cursorZoom(-10000, 0.5, 0.5);
  await expect(page.getByRole('button', { name: 'Fit', exact: true })).toContainText('400%');
  const maximumWidth = (await canvas.boundingBox())!.width;
  await page.mouse.wheel(0, -240);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(maximumWidth, 2);
  const wheelViewport = page.getByLabel('Battlefield viewport', { exact: true });
  const beforeWheelPan = await wheelViewport.evaluate(el => el.scrollLeft);
  await page.keyboard.down('Shift');
  await page.mouse.wheel(0, 120);
  await page.keyboard.up('Shift');
  await expect
    .poll(() => wheelViewport.evaluate(el => el.scrollLeft))
    .toBeGreaterThan(beforeWheelPan);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(maximumWidth, 2);
  console.log('Checking middle-button panning, capture outside the viewport and cancellation.');
  const panBounds = (await wheelViewport.boundingBox())!;
  const panStart = { x: panBounds.x + panBounds.width / 2, y: panBounds.y + panBounds.height / 2 };
  const panScroll = await wheelViewport.evaluate(el => ({
    left: el.scrollLeft,
    top: el.scrollTop,
    maxTop: el.scrollHeight - el.clientHeight,
  }));
  const selectedBeforePan = await canvas.getByRole('button', { pressed: true }).count();
  const sceneBeforePan = (await editor()).battlefields[0];
  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.down({ button: 'middle' });
  await expect
    .poll(() => wheelViewport.evaluate(el => getComputedStyle(el).cursor))
    .toBe('grabbing');
  await page.mouse.wheel(0, 120); // Zoom is suspended while the view is being dragged.
  await page.mouse.move(panStart.x + 80, panStart.y - 35, { steps: 5 });
  expect(await wheelViewport.evaluate(el => el.scrollLeft)).toBeCloseTo(panScroll.left - 80, 0);
  expect(await wheelViewport.evaluate(el => el.scrollTop)).toBeCloseTo(panScroll.top + 35, 0);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(maximumWidth, 2);
  const outsidePan = { x: panStart.x + 10, y: panBounds.y - 10 };
  await page.mouse.move(outsidePan.x, outsidePan.y, { steps: 5 });
  await page.mouse.up({ button: 'middle' });
  expect(await wheelViewport.evaluate(el => el.scrollLeft)).toBeCloseTo(panScroll.left - 10, 0);
  expect(await wheelViewport.evaluate(el => el.scrollTop)).toBeCloseTo(
    Math.min(panScroll.maxTop, panScroll.top + panStart.y - outsidePan.y),
    0,
  );
  await expect
    .poll(() => wheelViewport.evaluate(el => getComputedStyle(el).cursor))
    .not.toBe('grabbing');
  for (const end of ['pointercancel', 'lostpointercapture', 'blur']) {
    await wheelViewport.evaluate(el =>
      el.addEventListener(
        'pointerdown',
        event => {
          el.dataset.panPointerId = String((event as PointerEvent).pointerId);
        },
        { once: true, capture: true },
      ),
    );
    await page.mouse.move(panStart.x, panStart.y);
    await page.mouse.down({ button: 'middle' });
    await expect
      .poll(() => wheelViewport.evaluate(el => getComputedStyle(el).cursor))
      .toBe('grabbing');
    // Activate capture with a real move before simulating its loss.
    await page.mouse.move(panStart.x + 2, panStart.y - 2);
    const stoppedScroll = await wheelViewport.evaluate(el => [el.scrollLeft, el.scrollTop]);
    await wheelViewport.evaluate((el, end) => {
      const pointerId = Number(el.dataset.panPointerId);
      if (end === 'blur') window.dispatchEvent(new Event('blur'));
      else if (end === 'lostpointercapture') el.releasePointerCapture(pointerId);
      else el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId }));
      delete el.dataset.panPointerId;
    }, end);
    await page.mouse.move(panStart.x + 12, panStart.y - 12);
    await page.mouse.up({ button: 'middle' });
    await expect
      .poll(() => wheelViewport.evaluate(el => getComputedStyle(el).cursor))
      .not.toBe('grabbing');
    expect(
      await wheelViewport.evaluate(el => [el.scrollLeft, el.scrollTop]),
      'Panning should stop after ' + end,
    ).toEqual(stoppedScroll);
  }
  expect(await canvas.getByRole('button', { pressed: true }).count()).toBe(selectedBeforePan);
  expect((await editor()).battlefields[0]).toEqual(sceneBeforePan);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.mouse.wheel(0, 10000);
  await expect(page.getByRole('button', { name: 'Zoom', exact: true })).toContainText('100%');
  expect(await wheelViewport.evaluate(el => [el.scrollLeft, el.scrollTop])).toEqual([0, 0]);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(fitBox!.width, 2);
  await savedDraft(); // Camera changes do not create a layout edit or an Undo entry.
  await page.setViewportSize({ width: 1500, height: 1000 });
  expect((await editor()).limit).toBe(1);
  await expect(
    page.locator('[data-sidebar="sidebar"]').first().locator('xpath=../..'),
  ).toHaveAttribute('data-state', 'collapsed');
  await expect(page.getByRole('tab', { name: 'Shop', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New battlefield', exact: true })).toHaveCount(0);
}
