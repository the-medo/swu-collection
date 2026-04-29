import {
  getLocatorDimensions,
  gotoScreenshotterUrl,
  screenshotLocatorPng,
  screenshotTargetSelector,
  waitForNoSkeletonsInLocator,
  waitForRenderedVisualInLocator,
  waitForScreenshotTarget,
} from '../../playwright.ts';
import type { ScreenshotterCapturedImage } from '../../types.ts';
import {
  buildTournamentMetaUrl,
  buildTournamentScreenshotR2Key,
  createCapturedTournamentScreenshot,
  tournamentMetaScreenshotVariants,
  tournamentScreenshotDomTargets,
} from './shared.ts';
import type { TournamentMetaScreenshotVariant, TournamentScreenshotCaptureInput } from './types.ts';

async function waitForExpectedMetaState(
  input: TournamentScreenshotCaptureInput,
  variant: TournamentMetaScreenshotVariant,
) {
  const selector = screenshotTargetSelector(tournamentScreenshotDomTargets.metaAnalysis);
  const expectedMetaPart = variant.metaPart ?? 'all';

  await input.page.waitForFunction(
    ({ selector: targetSelector, expectedMetaPart: expectedPart }) => {
      const element = document.querySelector(targetSelector);

      return (
        element?.getAttribute('data-meta-info') === 'leadersAndBase' &&
        element.getAttribute('data-view-mode') === 'chart' &&
        element.getAttribute('data-meta-part') === expectedPart
      );
    },
    { selector, expectedMetaPart },
    { timeout: input.config.timeoutMs },
  );
}

export async function captureTournamentMetaScreenshot(
  input: TournamentScreenshotCaptureInput,
  variant: TournamentMetaScreenshotVariant,
): Promise<ScreenshotterCapturedImage> {
  const sourceUrl = buildTournamentMetaUrl(input.config, input.tournamentId, variant);

  await gotoScreenshotterUrl(input.page, sourceUrl, input.config);
  await waitForExpectedMetaState(input, variant);

  const target = await waitForScreenshotTarget(
    input.page,
    screenshotTargetSelector(tournamentScreenshotDomTargets.metaAnalysis),
    input.config,
  );

  await waitForNoSkeletonsInLocator(target, input.config.timeoutMs);
  await waitForRenderedVisualInLocator(target, input.config.timeoutMs);

  const dimensions = await getLocatorDimensions(target);
  const body = await screenshotLocatorPng(target);

  return createCapturedTournamentScreenshot({
    target: variant.target,
    sourceUrl,
    r2Key: buildTournamentScreenshotR2Key(input.tournamentId, variant.fileName),
    body,
    contentType: 'image/png',
    ...dimensions,
  });
}

export async function captureTournamentMetaLeadersAndBaseAllScreenshot(
  input: TournamentScreenshotCaptureInput,
) {
  return captureTournamentMetaScreenshot(input, tournamentMetaScreenshotVariants.leadersAndBaseAll);
}

export async function captureTournamentMetaLeadersAndBaseTop8Screenshot(
  input: TournamentScreenshotCaptureInput,
) {
  return captureTournamentMetaScreenshot(
    input,
    tournamentMetaScreenshotVariants.leadersAndBaseTop8,
  );
}
