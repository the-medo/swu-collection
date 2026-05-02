import type { Page } from 'playwright';
import type { TournamentScreenshotTarget } from '../../../../types/Screenshotter.ts';
import type { ScreenshotterConfig } from '../../types.ts';

export type TournamentScreenshotCaptureInput = {
  tournamentId: string;
  page: Page;
  config: ScreenshotterConfig;
};

export type TournamentMetaScreenshotVariant = {
  target: TournamentScreenshotTarget;
  metaPart?: 'all' | 'top8';
  fileName: string;
};
