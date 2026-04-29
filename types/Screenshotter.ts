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
  bracket: 'tournament-bracket',
  topPlacementDeck: 'top-placement-deck',
  metaAnalysis: 'tournament-meta-analysis',
} as const;

export type TournamentScreenshotTarget =
  (typeof tournamentScreenshotTargets)[keyof typeof tournamentScreenshotTargets];

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
