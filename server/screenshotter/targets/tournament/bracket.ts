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

  const hasNoBracketMessage = await target
    .getByText('There is no TOP bracket for this tournament.')
    .count();

  if (hasNoBracketMessage > 0) {
    throw new Error('Tournament does not have bracket data to screenshot.');
  }

  const dimensions = await getLocatorDimensions(target);
  const body = await screenshotLocatorPng(target);

  return createCapturedTournamentScreenshot({
    target: tournamentScreenshotTargets.bracket,
    sourceUrl,
    r2Key: buildTournamentScreenshotR2Key(tournamentId, 'bracket.png'),
    body,
    contentType: 'image/png',
    ...dimensions,
  });
}
