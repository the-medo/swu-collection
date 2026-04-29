import { chromium } from 'playwright';
import type { Browser, Locator, Page } from 'playwright';
import { getScreenshotterConfig } from './config.ts';
import type { ScreenshotterConfig, ScreenshotterPageSession } from './types.ts';

export function screenshotTargetSelector(target: string) {
  return `[data-screenshot-target="${target}"]`;
}

export async function launchScreenshotterBrowser(config = getScreenshotterConfig()) {
  return chromium.launch({
    headless: true,
    timeout: config.timeoutMs,
  });
}

export async function createScreenshotterPageSession(
  config: ScreenshotterConfig = getScreenshotterConfig(),
  browser?: Browser,
): Promise<ScreenshotterPageSession> {
  const ownsBrowser = !browser;
  const activeBrowser = browser ?? (await launchScreenshotterBrowser(config));
  const context = await activeBrowser.newContext({
    viewport: {
      width: config.viewport.width,
      height: config.viewport.height,
    },
    deviceScaleFactor: config.viewport.deviceScaleFactor,
  });
  const page = await context.newPage();

  page.setDefaultTimeout(config.timeoutMs);
  page.setDefaultNavigationTimeout(config.timeoutMs);

  return { browser: activeBrowser, context, page, ownsBrowser };
}

export async function closeScreenshotterPageSession(session: ScreenshotterPageSession) {
  await session.context.close().catch(() => undefined);
  if (session.ownsBrowser) {
    await session.browser.close().catch(() => undefined);
  }
}

export async function gotoScreenshotterUrl(
  page: Page,
  url: string,
  config: ScreenshotterConfig = getScreenshotterConfig(),
) {
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: config.timeoutMs,
  });

  await page
    .waitForLoadState('networkidle', {
      timeout: Math.min(config.timeoutMs, 15_000),
    })
    .catch(() => undefined);
}

export async function waitForFonts(page: Page) {
  await page
    .evaluate(async () => {
      await document.fonts?.ready;
    })
    .catch(() => undefined);
}

export async function waitForImagesInLocator(locator: Locator, timeoutMs: number) {
  await locator.evaluate(async (element, timeout) => {
    const images =
      element instanceof HTMLImageElement ? [element] : Array.from(element.querySelectorAll('img'));
    if (images.length === 0) return;

    await Promise.race([
      Promise.all(
        images.map(image => {
          if (image.complete && image.naturalWidth > 0) return undefined;

          return new Promise<void>(resolve => {
            const cleanup = () => {
              image.removeEventListener('load', cleanup);
              image.removeEventListener('error', cleanup);
              resolve();
            };

            image.addEventListener('load', cleanup, { once: true });
            image.addEventListener('error', cleanup, { once: true });
          });
        }),
      ),
      new Promise((_, reject) =>
        window.setTimeout(() => reject(new Error('Timed out waiting for images.')), timeout),
      ),
    ]);
  }, timeoutMs);
}

export async function waitForNoSkeletonsInLocator(locator: Locator, timeoutMs: number) {
  await locator.evaluate(async (element, timeout) => {
    const skeletonSelector = '.animate-pulse';

    if (!element.querySelector(skeletonSelector)) return;

    await new Promise<void>((resolve, reject) => {
      let observer: MutationObserver;
      const timeoutId = window.setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timed out waiting for skeletons to disappear.'));
      }, timeout);

      observer = new MutationObserver(() => {
        if (element.querySelector(skeletonSelector)) return;

        window.clearTimeout(timeoutId);
        observer.disconnect();
        resolve();
      });

      observer.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    });
  }, timeoutMs);
}

export async function waitForRenderedVisualInLocator(
  locator: Locator,
  timeoutMs: number,
  minimumSize = 80,
) {
  await locator.evaluate(
    async (element, { timeout, minimumSize }) => {
      const hasRenderedVisual = () =>
        Array.from(element.querySelectorAll('svg, canvas')).some(visual => {
          const box = visual.getBoundingClientRect();
          if (box.width < minimumSize || box.height < minimumSize) return false;

          if (visual instanceof HTMLCanvasElement) {
            return visual.width > 0 && visual.height > 0;
          }

          return visual.querySelectorAll('*').length > 3;
        });

      if (hasRenderedVisual()) return;

      await new Promise<void>((resolve, reject) => {
        let observer: MutationObserver;
        const timeoutId = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error('Timed out waiting for chart output.'));
        }, timeout);

        observer = new MutationObserver(() => {
          if (!hasRenderedVisual()) return;

          window.clearTimeout(timeoutId);
          observer.disconnect();
          resolve();
        });

        observer.observe(element, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      });
    },
    { timeout: timeoutMs, minimumSize },
  );
}

export async function waitForScreenshotTarget(
  page: Page,
  selector: string,
  config: ScreenshotterConfig = getScreenshotterConfig(),
) {
  const locator = page.locator(selector).first();

  await locator.waitFor({ state: 'visible', timeout: config.timeoutMs });
  await waitForFonts(page);
  await waitForImagesInLocator(locator, config.timeoutMs);

  return locator;
}

export async function screenshotLocatorPng(locator: Locator) {
  return locator.screenshot({
    type: 'png',
    animations: 'disabled',
  });
}

export async function getLocatorDimensions(locator: Locator) {
  const box = await locator.boundingBox();

  if (!box) {
    return {};
  }

  return {
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
}
