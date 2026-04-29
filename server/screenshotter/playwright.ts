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
    const images = Array.from(element.querySelectorAll('img'));
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
