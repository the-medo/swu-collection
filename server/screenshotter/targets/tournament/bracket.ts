import { tournamentScreenshotTargets } from '../../../../types/Screenshotter.ts';
import {
  getLocatorDimensions,
  gotoScreenshotterUrl,
  screenshotLocatorPng,
  screenshotTargetSelector,
  waitForNoSkeletonsInLocator,
  waitForScreenshotTarget,
} from '../../playwright.ts';
import type { ScreenshotterCapturedImage } from '../../types.ts';
import {
  buildTournamentDetailsUrl,
  buildTournamentScreenshotR2Key,
  createCapturedTournamentScreenshot,
  tournamentScreenshotDomTargets,
} from './shared.ts';
import type { TournamentScreenshotCaptureInput } from './types.ts';

export async function captureTournamentBracketScreenshot({
  tournamentId,
  page,
  config,
}: TournamentScreenshotCaptureInput): Promise<ScreenshotterCapturedImage> {
  const sourceUrl = buildTournamentDetailsUrl(config, tournamentId);

  await gotoScreenshotterUrl(page, sourceUrl, config);

  const target = await waitForScreenshotTarget(
    page,
    screenshotTargetSelector(tournamentScreenshotDomTargets.bracket),
    config,
  );

  await waitForNoSkeletonsInLocator(target, config.timeoutMs);

  const cookieNotice = page.getByRole('region', { name: 'Cookie notice', exact: true });
  if (await cookieNotice.isVisible()) {
    await cookieNotice.getByRole('button', { name: 'Dismiss', exact: true }).click();
  }

  if (await target.getByRole('region', { name: 'Explore this tournament', exact: true }).count()) {
    throw new Error('Tournament does not have bracket data to screenshot.');
  }

  const rounds = target.getByRole('region', {
    name: 'Elimination bracket, scroll horizontally for later rounds',
    exact: true,
  });
  const hasRounds = (await rounds.count()) > 0;
  const standings = target.getByRole('region', { name: 'Final standings', exact: true });
  // Preserve standings-only captures when the event has no imported matches,
  // but never publish a screenshot of a failed match-results request.
  if (!hasRounds && (!(await standings.count()) || (await target.getByRole('alert').count()))) {
    throw new Error('Tournament match results are unavailable; bracket screenshot skipped.');
  }

  const standingsToggle = target
    .getByRole('region', { name: 'Final standings', exact: true })
    .getByRole('button', { name: 'Final standings', exact: true });
  if (
    (await standingsToggle.isVisible()) &&
    (await standingsToggle.getAttribute('aria-expanded')) === 'false'
  ) {
    await standingsToggle.click();
  }

  const originalViewport = page.viewportSize();
  let body: Buffer;
  let dimensions: Awaited<ReturnType<typeof getLocatorDimensions>>;
  try {
    const initialDimensions = await getLocatorDimensions(target);
    if (originalViewport && initialDimensions.height) {
      // Include the full tree alongside the standings. Locator screenshots do
      // not expand either the horizontal scroller or the fixed-height app shell.
      // A wider viewport can reveal the app or standings sidebar, so measure
      // again after each responsive breakpoint before considering the tree fit.
      for (let attempt = 0; attempt < 3; attempt++) {
        const viewport = page.viewportSize()!;
        const overflow = hasRounds
          ? await rounds.evaluate(element => element.scrollWidth - element.clientWidth)
          : 0;
        await page.setViewportSize({
          width: viewport.width + Math.ceil(overflow),
          height: Math.max(originalViewport.height, initialDimensions.height + 240),
        });
        if (overflow <= 0) break;
      }
    }
    if (hasRounds && (await rounds.evaluate(element => element.scrollWidth > element.clientWidth))) {
      throw new Error('Elimination bracket does not fit the screenshot viewport.');
    }
    await target.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    // LeaderBaseArtwork lazily loads SVG images, which are not covered by the
    // shared HTML <img> readiness check. Wait for visible crops to start loading.
    await page.waitForFunction(
      selector => {
        const artwork = Array.from(
          document.querySelectorAll<HTMLElement>(`${selector} .leader-base-artwork`),
        );
        return (
          artwork.every(element => element.dataset.artworkReady === 'true') &&
          Array.from(document.querySelectorAll<SVGImageElement>(`${selector} svg image`))
            .filter(image => image.getBoundingClientRect().width > 0)
            .every(image => !!image.getAttribute('href'))
        );
      },
      screenshotTargetSelector(tournamentScreenshotDomTargets.bracket),
      { timeout: config.timeoutMs },
    );
    await target.evaluate(async (element, timeoutMs) => {
      const sources = new Set(
        Array.from(element.querySelectorAll('svg image'))
          .map(image => image.getAttribute('href'))
          .filter((src): src is string => !!src),
      );
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.all(
            Array.from(sources, async src => {
              const image = new Image();
              image.src = src;
              await image.decode().catch(() => undefined);
            }),
          ),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error('Timed out waiting for bracket artwork.')),
              timeoutMs,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    }, config.timeoutMs);
    dimensions = await getLocatorDimensions(target);
    body = await screenshotLocatorPng(target);
  } finally {
    if (originalViewport) await page.setViewportSize(originalViewport);
  }

  return createCapturedTournamentScreenshot({
    target: tournamentScreenshotTargets.bracket,
    sourceUrl,
    r2Key: buildTournamentScreenshotR2Key(tournamentId, 'bracket.png'),
    body,
    contentType: 'image/png',
    ...dimensions,
  });
}
