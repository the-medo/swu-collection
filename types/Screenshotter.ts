export const screenshotterScopeTypes = {
  tournament: 'tournament',
} as const;

export type ScreenshotterScopeType =
  | (typeof screenshotterScopeTypes)[keyof typeof screenshotterScopeTypes]
  | (string & {});

export type ScreenshotterScope = {
  type: ScreenshotterScopeType;
  id?: string | null;
  key: string;
};

export const tournamentScreenshotTargets = {
  bracket: 'bracket',
  metaLeadersAndBaseAll: 'meta-leaders-and-base-all',
  metaLeadersAndBaseTop8: 'meta-leaders-and-base-top8',
  winningDeck: 'winning-deck',
} as const;

export type TournamentScreenshotTarget =
  (typeof tournamentScreenshotTargets)[keyof typeof tournamentScreenshotTargets];

export const defaultTournamentScreenshotTargets: TournamentScreenshotTarget[] = [
  tournamentScreenshotTargets.bracket,
  tournamentScreenshotTargets.metaLeadersAndBaseAll,
  tournamentScreenshotTargets.metaLeadersAndBaseTop8,
  tournamentScreenshotTargets.winningDeck,
];

export type ScreenshotterTarget = TournamentScreenshotTarget | (string & {});

export type ScreenshotterViewport = {
  width: number;
  height: number;
  deviceScaleFactor: number;
};

export type ScreenshotterResult = {
  target: ScreenshotterTarget;
  sourceUrl: string;
  ok: boolean;
  r2Key?: string;
  url?: string;
  contentType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  error?: string;
};

export type ScreenshotterManifest = {
  scope: ScreenshotterScope;
  generatedAt: string;
  appBaseUrl: string;
  viewport: ScreenshotterViewport;
  results: ScreenshotterResult[];
};

export function createTournamentScreenshotterScope(tournamentId: string): ScreenshotterScope {
  return {
    type: screenshotterScopeTypes.tournament,
    id: tournamentId,
    key: `tournament:${tournamentId}`,
  };
}
