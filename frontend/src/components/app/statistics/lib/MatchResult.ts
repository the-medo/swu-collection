import { GameResult } from '../../../../../../server/db/schema/game_result.ts';

export type MatchResult = {
  id: string;
  type: 'Bo1' | 'Bo3' | 'other';
  games: GameResult[];

  gameSource: string;
  format: string;

  exclude: boolean;
  manuallyEdited: boolean;

  leaderCardId?: string;
  baseCardKey?: string;
  opponentLeaderCardId?: string;
  opponentBaseCardKey?: string;

  result?: 0 | 1 | 3;
  finalWins?: number;
  finalLosses?: number;

  deckId?: string;
  userEventId?: string;
  firstGameCreatedAt: string;
};
