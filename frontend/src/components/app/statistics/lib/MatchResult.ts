import { GameResult } from '../../../../../../server/db/schema/game_result.ts';
import type { PublicProfileSummary } from '@/components/app/users/UserProfilePopover.tsx';

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
  status?: 'in-progress' | 'complete' | 'abandoned';
  completionReason?: 'score' | 'forfeit' | 'abandoned';
  finalWins?: number;
  finalLosses?: number;

  inTeam?: boolean;
  inTeamOppUserName?: string;
  userName?: string;
  user?: PublicProfileSummary;
  inTeamOpponent?: PublicProfileSummary;
  deckId?: string;
  userEventId?: string;
  firstGameCreatedAt: string;
};
