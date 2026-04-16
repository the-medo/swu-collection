import type { Deck } from '../server/db/schema/deck.ts';
import type { Meta } from '../server/db/schema/meta.ts';
import type { TournamentDeck } from '../server/db/schema/tournament_deck.ts';
import type { TournamentGroup } from '../server/db/schema/tournament_group.ts';
import type {
  Player,
  PlayerWatch,
  TournamentStanding,
  TournamentWeekend,
  TournamentWeekendMatch,
  TournamentWeekendResource,
  TournamentWeekendTournament,
  TournamentWeekendTournamentGroup,
} from '../server/db/schema/tournament_weekend.ts';
import type {
  LiveTournamentCheckResult,
  LiveTournamentStatus,
} from '../server/lib/live-tournaments/types.ts';
import type { TournamentStringDate, TournamentType } from './Tournament.ts';

export type LiveTournamentFormat = {
  id: number;
  name: string | null;
  description: string | null;
};

export type TournamentWeekendCreateRequest = {
  name: string;
  date: string;
};

export type TournamentWeekendUpdateRequest = Partial<{
  name: string;
  date: string;
  isLive: boolean;
}>;

export type TournamentWeekendGroupCreateRequest = {
  tournamentGroupId: string;
  formatId?: number | null;
  metaId?: number | null;
};

export type TournamentWeekendResourceType = 'stream' | 'video' | 'vod';

export type TournamentWeekendResourceCreateRequest = {
  tournamentId: string;
  resourceType?: TournamentWeekendResourceType;
  resourceUrl: string;
  title?: string;
  description?: string;
};

export type TournamentWeekendResourceUpdateRequest = {
  approved: boolean;
};

export type PlayerWatchMutationRequest = {
  playerId?: number;
  displayName?: string;
};

export type TournamentWeekendSyncResult = {
  tournamentIds: string[];
  inserted: number;
  deleted: number;
  total: number;
};

export type TournamentWeekendListResponse = {
  data: TournamentWeekend[];
};

export type TournamentWeekendMutationResponse = {
  data: {
    weekend: TournamentWeekend;
    sync?: TournamentWeekendSyncResult;
  };
};

export type TournamentWeekendGroupMutationResponse = {
  data: TournamentWeekendTournamentGroup;
};

export type TournamentWeekendResourceMutationResponse = {
  data: TournamentWeekendResource;
};

export type PlayerWatchEntry = {
  watch: PlayerWatch;
  player: Player;
};

export type PlayerWatchListResponse = {
  data: PlayerWatchEntry[];
};

export type PlayerWatchMutationResponse = {
  data: PlayerWatchEntry;
};

export type LiveTournamentStandingEntry = {
  standing: TournamentStanding;
  player: Player;
};

export type LiveTournamentMatchEntry = {
  match: TournamentWeekendMatch;
  player1: Player | null;
  player2: Player | null;
};

export type LiveTournamentWinningDeck = {
  tournamentDeck: TournamentDeck;
  deck: Deck | null;
};

export type LiveTournamentWeekendGroupEntry = {
  weekendTournamentGroup: TournamentWeekendTournamentGroup;
  tournamentGroup: TournamentGroup;
  format: LiveTournamentFormat | null;
  meta: Meta | null;
};

export type LiveTournamentWeekendTournamentEntry = {
  weekendTournament: TournamentWeekendTournament;
  tournament: TournamentStringDate;
  tournamentType: TournamentType;
  meta: Meta | null;
  winningDeck: LiveTournamentWinningDeck | null;
  resources: TournamentWeekendResource[];
  standings: LiveTournamentStandingEntry[];
  matches: LiveTournamentMatchEntry[];
};

export type LiveTournamentWatchedPlayer = PlayerWatchEntry & {
  standings: LiveTournamentStandingEntry[];
  matches: LiveTournamentMatchEntry[];
};

export type LiveTournamentWeekendDetail = {
  weekend: TournamentWeekend;
  tournamentGroups: LiveTournamentWeekendGroupEntry[];
  tournaments: LiveTournamentWeekendTournamentEntry[];
  resources: TournamentWeekendResource[];
  watchlist: PlayerWatchEntry[];
  watchedPlayerIds: number[];
  watchedPlayers: LiveTournamentWatchedPlayer[];
};

export type LiveTournamentWeekendResponse = {
  data: LiveTournamentWeekendDetail | null;
};

export type TournamentWeekendDetailResponse = {
  data: LiveTournamentWeekendDetail;
};

export type TournamentWeekendCheckResult = {
  eligibleTournamentCount: number;
  eligibleTournaments: {
    tournamentId: string;
    meleeId: string | null;
    status: LiveTournamentStatus;
  }[];
  results: LiveTournamentCheckResult[];
  errors: {
    tournamentId: string;
    meleeId: string | null;
    status: string;
    error: {
      message: string;
      stack?: string;
    };
  }[];
};

export type TournamentWeekendCheckResponse = {
  message: string;
  data: TournamentWeekendCheckResult;
};
