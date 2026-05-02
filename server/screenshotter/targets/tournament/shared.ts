import { tournamentScreenshotTargets } from '../../../../types/Screenshotter.ts';
import { joinScreenshotterUrl } from '../../config.ts';
import type { ScreenshotterCapturedImage, ScreenshotterConfig } from '../../types.ts';
import type { TournamentMetaScreenshotVariant } from './types.ts';

export const tournamentScreenshotDomTargets = {
  bracket: 'tournament-bracket',
  metaAnalysis: 'tournament-meta-analysis',
  topPlacementDeck: 'top-placement-deck',
  deckImageOutput: 'deck-image-output',
} as const;

export const tournamentScreenshotActions = {
  openDeckImage: 'open-deck-image',
} as const;

export const tournamentMetaScreenshotVariants = {
  leadersAndBaseAll: {
    target: tournamentScreenshotTargets.metaLeadersAndBaseAll,
    fileName: 'meta-leaders-and-base-all.png',
  },
  leadersAndBaseTop8: {
    target: tournamentScreenshotTargets.metaLeadersAndBaseTop8,
    metaPart: 'top8',
    fileName: 'meta-leaders-and-base-top8.png',
  },
} as const satisfies Record<string, TournamentMetaScreenshotVariant>;

export function buildTournamentDetailsUrl(config: ScreenshotterConfig, tournamentId: string) {
  return joinScreenshotterUrl(
    config.appBaseUrl,
    `/tournaments/${encodeURIComponent(tournamentId)}/details`,
  );
}

export function buildTournamentMetaUrl(
  config: ScreenshotterConfig,
  tournamentId: string,
  variant: TournamentMetaScreenshotVariant,
) {
  const url = new URL(
    joinScreenshotterUrl(
      config.appBaseUrl,
      `/tournaments/${encodeURIComponent(tournamentId)}/meta`,
    ),
  );

  if (variant.metaPart && variant.metaPart !== 'all') {
    url.searchParams.set('maMetaPart', variant.metaPart);
  }

  url.searchParams.set('maMetaInfo', 'leadersAndBase');
  url.searchParams.set('maViewMode', 'chart');

  return url.toString();
}

export function buildTournamentScreenshotR2Key(tournamentId: string, fileName: string) {
  return `screenshots/tournaments/${tournamentId}/${fileName}`;
}

export function createCapturedTournamentScreenshot(
  input: Omit<ScreenshotterCapturedImage, 'byteSize'>,
): ScreenshotterCapturedImage {
  return {
    ...input,
    byteSize: input.body.byteLength,
  };
}
