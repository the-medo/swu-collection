// BATTLEFIELD_LIGHTING_BROWSER_TEST=1 bun frontend/tests/battlefield-lighting-motion.browser.ts
// Exercise production Canvas + motion hook in Chromium without app/database fixtures.
import { chromium, expect } from 'playwright/test';

if (process.env.BATTLEFIELD_LIGHTING_BROWSER_TEST !== '1')
  throw new Error('Explicitly enable the lighting check.');
const bundle = await Bun.build({
  entrypoints: [new URL('./fixtures/battlefield-lighting.tsx', import.meta.url).pathname],
  target: 'browser',
  format: 'iife',
  define: { 'process.env.NODE_ENV': JSON.stringify('development') },
});
if (!bundle.success) throw new Error(bundle.logs.join('\n'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 900, height: 1000 },
    reducedMotion: 'reduce',
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(
    '<style>body{margin:0}svg{display:block;width:800px;height:200px}output{display:block}</style><div id="root"></div>',
  );
  // Count pending animation requests to catch leaked loops after cleanup, including StrictMode.
  await page.evaluate(() => {
    const pending = new Set<number>();
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      const id = request(time => {
        pending.delete(id);
        callback(time);
      });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = id => {
      pending.delete(id);
      cancel(id);
    };
    Object.defineProperty(window, '__pendingLightFrames', { get: () => pending.size });
  });
  await page.addScriptTag({ content: await bundle.outputs[0].text() });
  const top = page.getByTestId('top').locator('radialGradient[id$="-shade"]');
  const bottom = page.getByTestId('bottom').locator('radialGradient[id$="-shade"]');
  await expect(top).toHaveAttribute('cy', '78%');
  await expect(bottom).toHaveAttribute('cy', '22%');
  const savedScene = await page.getByLabel('Saved scene', { exact: true }).textContent();
  await page.getByRole('button', { name: 'Move shared light', exact: true }).click();
  await expect(top).not.toHaveAttribute('cy', '78%');
  await expect(bottom).not.toHaveAttribute('cy', '22%');
  expect(await page.getByLabel('Saved scene', { exact: true }).textContent()).toBe(savedScene);
  await page.getByRole('button', { name: 'Clear board layout', exact: true }).click();
  const savedPose = page.getByTestId('saved-pose').locator('radialGradient[id$="-shade"]');
  await expect(bottom).toHaveAttribute('cx', (await savedPose.getAttribute('cx'))!);
  await expect(bottom).toHaveAttribute('cy', (await savedPose.getAttribute('cy'))!);

  const runtime = page.getByLabel('Runtime light', { exact: true });
  const pending = () =>
    page.evaluate(
      () => (window as unknown as { __pendingLightFrames: number }).__pendingLightFrames,
    );
  await expect(runtime).toHaveText('200 60');
  await page.waitForTimeout(250);
  expect(await runtime.textContent()).toBe('200 60');
  expect(await pending()).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => runtime.textContent()).not.toBe('200 60');
  await expect.poll(pending).toBe(1);
  const moving = await runtime.textContent();
  await expect.poll(() => runtime.textContent()).not.toBe(moving);
  await expect(page.getByLabel('Saved light', { exact: true })).toHaveText('200 60');
  await expect(page.locator('[data-battlefield-light]')).toHaveCount(0);
  const movingShade = await page
    .getByTestId('profile')
    .locator('radialGradient[id$="-shade"]')
    .getAttribute('cx');
  await expect
    .poll(() =>
      page.getByTestId('profile').locator('radialGradient[id$="-shade"]').getAttribute('cx'),
    )
    .not.toBe(movingShade);

  await page.evaluate(() => window.scrollTo(0, 2000));
  await expect.poll(pending).toBe(0);
  const offscreen = await runtime.textContent();
  await page.waitForTimeout(250);
  expect(await runtime.textContent()).toBe(offscreen);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => runtime.textContent()).not.toBe(offscreen);

  // Drive the standard visibility event; no long wall-clock waits are necessary.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(pending).toBe(0);
  const hidden = await runtime.textContent();
  await page.waitForTimeout(250);
  expect(await runtime.textContent()).toBe(hidden);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => runtime.textContent()).not.toBe(hidden);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(runtime).toHaveText('200 60');
  await expect.poll(pending).toBe(0);
  await page.getByRole('button', { name: 'Change anchor', exact: true }).click();
  await expect(runtime).toHaveText('1400 350');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => runtime.textContent()).not.toBe('1400 350');
  await expect(page.getByLabel('Saved light', { exact: true })).toHaveText('1400 350');
  await page.getByRole('button', { name: 'Toggle profile', exact: true }).click();
  await expect(runtime).toHaveCount(0);
  await expect.poll(pending).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Toggle profile', exact: true }).click();
  await expect(runtime).toHaveText('200 60');
  expect(await pending()).toBe(0);
  expect(errors).toEqual([]);
  console.log(
    'PASS: runtime overrides shade both boards from one shared source without mutating scenes; profile light moves, pauses offscreen/hidden, honors reduced motion, follows anchor changes, and cleans up on unmount/StrictMode.',
  );
} finally {
  await browser.close();
}
