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
  tournamentScreenshotActions,
  tournamentScreenshotDomTargets,
} from './shared.ts';
import type { TournamentScreenshotCaptureInput } from './types.ts';

type DeckImageBytes = {
  body: Buffer;
  contentType: string;
  width?: number;
  height?: number;
};

async function clickWinningDeck(input: TournamentScreenshotCaptureInput) {
  const placementSelector = screenshotTargetSelector(
    tournamentScreenshotDomTargets.topPlacementDeck,
  );
  const firstPlaceDeck = input.page.locator(`${placementSelector}[data-placement="1"]`).first();
  const fallbackDeck = input.page.locator(placementSelector).first();
  const deckTrigger = (await firstPlaceDeck.count()) > 0 ? firstPlaceDeck : fallbackDeck;

  await deckTrigger.waitFor({ state: 'visible', timeout: input.config.timeoutMs });

  const deckId = await deckTrigger.getAttribute('data-deck-id');
  if (!deckId) {
    throw new Error('Winning deck row did not expose a deck id.');
  }

  await deckTrigger.click({ position: { x: 12, y: 12 } });

  return deckId;
}

async function readDeckImageOutput(locator: Awaited<ReturnType<typeof waitForScreenshotTarget>>) {
  try {
    const payload = await locator.evaluate(async element => {
      if (!(element instanceof HTMLImageElement)) {
        throw new Error('Deck image output target is not an image.');
      }

      if (!element.src) {
        throw new Error('Deck image output has no source.');
      }

      if (!element.complete || element.naturalWidth <= 0) {
        await new Promise<void>(resolve => {
          const cleanup = () => {
            element.removeEventListener('load', cleanup);
            element.removeEventListener('error', cleanup);
            resolve();
          };

          element.addEventListener('load', cleanup, { once: true });
          element.addEventListener('error', cleanup, { once: true });
        });
      }

      const response = await fetch(element.currentSrc || element.src);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000;
      let binary = '';

      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }

      return {
        base64: btoa(binary),
        contentType: blob.type || response.headers.get('content-type') || 'image/png',
        width: element.naturalWidth || undefined,
        height: element.naturalHeight || undefined,
      };
    });

    return {
      body: Buffer.from(payload.base64, 'base64'),
      contentType: payload.contentType,
      width: payload.width,
      height: payload.height,
    } satisfies DeckImageBytes;
  } catch {
    const dimensions = await getLocatorDimensions(locator);
    const body = await screenshotLocatorPng(locator);

    return {
      body,
      contentType: 'image/png',
      ...dimensions,
    } satisfies DeckImageBytes;
  }
}

export async function captureTournamentWinningDeckScreenshot({
  tournamentId,
  page,
  config,
}: TournamentScreenshotCaptureInput): Promise<ScreenshotterCapturedImage> {
  const sourceUrl = buildTournamentDetailsUrl(config, tournamentId);

  await gotoScreenshotterUrl(page, sourceUrl, config);

  const bracket = await waitForScreenshotTarget(
    page,
    screenshotTargetSelector(tournamentScreenshotDomTargets.bracket),
    config,
  );

  await waitForNoSkeletonsInLocator(bracket, config.timeoutMs);
  await clickWinningDeck({ tournamentId, page, config });

  const imageButton = page
    .locator(`[data-screenshot-action="${tournamentScreenshotActions.openDeckImage}"]`)
    .first();

  await imageButton.waitFor({ state: 'visible', timeout: config.timeoutMs });
  await imageButton.click();

  const imageOutput = await waitForScreenshotTarget(
    page,
    screenshotTargetSelector(tournamentScreenshotDomTargets.deckImageOutput),
    config,
  );
  const image = await readDeckImageOutput(imageOutput);

  return createCapturedTournamentScreenshot({
    target: tournamentScreenshotTargets.winningDeck,
    sourceUrl,
    r2Key: buildTournamentScreenshotR2Key(tournamentId, 'winning-deck.png'),
    body: image.body,
    contentType: image.contentType,
    width: image.width,
    height: image.height,
  });
}
