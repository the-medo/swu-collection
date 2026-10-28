import type { Tournament } from '../../db/schema/tournament.ts';
import { isLimitedFormat } from '../../../types/Format.ts';

export const meleeDecklistFormatIds = [1, 6] as const;

const meleeDecklistFormatIdSet = new Set<number>(meleeDecklistFormatIds);

export const tournamentExpectsMeleeDecklists = (tournament: Pick<Tournament, 'format'>) =>
  meleeDecklistFormatIdSet.has(tournament.format);

export const tournamentCanImportResults = (
  tournament: Pick<Tournament, 'format'>,
  hasDecklists: boolean,
) =>
  isLimitedFormat(tournament.format) ||
  (tournamentExpectsMeleeDecklists(tournament) && hasDecklists);
