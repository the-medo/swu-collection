import type { Deck } from '../server/db/schema/deck.ts';
import type { Meta } from '../server/db/schema/meta.ts';
import type { TournamentDeck } from '../server/db/schema/tournament_deck.ts';
import type { TournamentGroup } from '../server/db/schema/tournament_group.ts';
import type { TournamentGroupLeaderBase } from '../server/db/schema/tournament_group_leader_base.ts';
import type {
  Player,
  PlayerWatch,
  TournamentStanding,
  TournamentWeekend,
  TournamentWeekendMatch,
  TournamentWeekendPlayer,
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

export type TournamentWeekendResourceType = 'stream' | 'video' | 'vod' | 'melee';

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

export type TournamentWeekendTournamentUpdateRequest = Partial<{
  isLiveCheckEnabled: boolean;
}>;

export type PlayerWatchMutationRequest = {
  displayName: string;
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

export type TournamentWeekendTournamentMutationResponse = {
  data: TournamentWeekendTournament;
};

export type TournamentWeekendResourceListStatus = 'all' | 'pending' | 'approved';

export type TournamentWeekendResourceTournamentSummary = Pick<
  TournamentStringDate,
  'id' | 'name' | 'location' | 'meleeId'
>;

export type TournamentWeekendResourceListItem = {
  resource: TournamentWeekendResource;
  tournament: TournamentWeekendResourceTournamentSummary;
  submitterName: string | null;
};

export type TournamentWeekendResourceListResponse = {
  data: TournamentWeekendResourceListItem[];
};

export type PlayerWatchEntry = {
  watch: PlayerWatch;
  player: Player;
};

export type PlayerSearchResult = Pick<Player, 'displayName'>;

export type PlayerSearchResponse = {
  data: PlayerSearchResult[];
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

export type LiveTournamentPlayerEntry = {
  tournamentPlayer: TournamentWeekendPlayer;
  player: Player;
};

export type LiveTournamentMatchEntry = {
  match: TournamentWeekendMatch;
  player1: Player | null;
  player2: Player | null;
  tournamentPlayer1: TournamentWeekendPlayer | null;
  tournamentPlayer2: TournamentWeekendPlayer | null;
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
  leaderBase: TournamentGroupLeaderBase[];
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
  players: LiveTournamentPlayerEntry[];
};

export type LiveTournamentWatchedPlayer = PlayerWatchEntry & {
  standings: LiveTournamentStandingEntry[];
  matches: LiveTournamentMatchEntry[];
  tournamentPlayers: LiveTournamentPlayerEntry[];
};

export type LiveTournamentWeekendDetail = {
  weekend: TournamentWeekend;
  tournamentGroups: LiveTournamentWeekendGroupEntry[];
  tournaments: LiveTournamentWeekendTournamentEntry[];
  resources: TournamentWeekendResource[];
  watchlist: PlayerWatchEntry[];
  watchedPlayerDisplayNames: string[];
  watchedPlayers: LiveTournamentWatchedPlayer[];
};

export type LiveTournamentWeekendResponse = {
  data: LiveTournamentWeekendDetail | null;
};

export type LiveTournamentHomeWeekendTournament = Pick<
  TournamentWeekendTournament,
  | 'tournamentWeekendId'
  | 'tournamentId'
  | 'status'
  | 'hasDecklists'
  | 'additionalData'
  | 'roundNumber'
  | 'roundName'
  | 'matchesTotal'
  | 'matchesRemaining'
  | 'exactStart'
  | 'lastUpdatedAt'
  | 'isLiveCheckEnabled'
>;

export type LiveTournamentHomeTournament = Pick<
  TournamentStringDate,
  | 'id'
  | 'type'
  | 'location'
  | 'continent'
  | 'name'
  | 'attendance'
  | 'meleeId'
  | 'format'
  | 'days'
  | 'dayTwoPlayerCount'
  | 'date'
  | 'imported'
> & {
  meta: number | null;
  bracketInfo: string | null;
};

export type LiveTournamentHomeStandingSummary = Pick<
  TournamentStanding,
  | 'tournamentId'
  | 'playerDisplayName'
  | 'roundNumber'
  | 'rank'
  | 'points'
  | 'gameRecord'
  | 'matchRecord'
  | 'updatedAt'
>;

export type LiveTournamentHomeWatchEntry = {
  watch: PlayerWatch;
  displayName: string;
};

export type LiveTournamentHomeWatchedStanding = LiveTournamentHomeStandingSummary;

export type LiveTournamentHomeWatchedMatch = {
  tournamentId: string;
  roundNumber: number;
  matchKey: string;
  playerDisplayName: string;
  opponentDisplayName: string | null;
  playerGameWins: number | null;
  opponentGameWins: number | null;
  outcome: 'win' | 'loss' | null;
  updatedAt: string | null;
  createdAt: string;
};

export type LiveTournamentHomeWatchedTournament = {
  tournamentId: string;
  standing: LiveTournamentHomeWatchedStanding | null;
  latestMatch: LiveTournamentHomeWatchedMatch | null;
};

export type LiveTournamentHomeWatchedPlayer = {
  displayName: string;
  watch: PlayerWatch;
  tournaments: LiveTournamentHomeWatchedTournament[];
};

export type LiveTournamentHomeTournamentEntry = {
  weekendTournament: LiveTournamentHomeWeekendTournament;
  tournament: LiveTournamentHomeTournament;
  tournamentType: TournamentType;
  winningDeck: LiveTournamentWinningDeck | null;
  championStanding: LiveTournamentHomeStandingSummary | null;
  undefeatedPlayers: LiveTournamentHomeStandingSummary[];
  hasBracketMatches: boolean;
};

export type LiveTournamentBracketPlayer = Pick<Player, 'displayName'>;

export type LiveTournamentBracketTournamentPlayer = Pick<
  TournamentWeekendPlayer,
  'tournamentId' | 'playerDisplayName' | 'leaderCardId' | 'baseCardKey'
>;

export type LiveTournamentBracketMatch = {
  match: Pick<
    TournamentWeekendMatch,
    | 'id'
    | 'tournamentId'
    | 'roundNumber'
    | 'matchKey'
    | 'playerDisplayName1'
    | 'playerDisplayName2'
    | 'player1GameWin'
    | 'player2GameWin'
    | 'createdAt'
    | 'updatedAt'
  >;
  player1: LiveTournamentBracketPlayer;
  player2: LiveTournamentBracketPlayer | null;
  tournamentPlayer1: LiveTournamentBracketTournamentPlayer | null;
  tournamentPlayer2: LiveTournamentBracketTournamentPlayer | null;
};

export type LiveTournamentBracketRound = {
  roundName: string;
  matches: LiveTournamentBracketMatch[];
};

export type LiveTournamentBracketDetail = {
  weekendId: string;
  tournamentId: string;
  rounds: LiveTournamentBracketRound[];
};

export type LiveTournamentBracketResponse = {
  data: LiveTournamentBracketDetail;
};

export type LiveTournamentHomeDetail = {
  weekend: TournamentWeekend;
  tournamentGroups: LiveTournamentWeekendGroupEntry[];
  tournaments: LiveTournamentHomeTournamentEntry[];
  resources: TournamentWeekendResource[];
  watchlist: LiveTournamentHomeWatchEntry[];
  watchedPlayerDisplayNames: string[];
  watchedPlayers: LiveTournamentHomeWatchedPlayer[];
};

export type LiveTournamentHomeMeta = {
  generatedAt: string;
  version: number;
};

export type LiveTournamentHomeResponse = {
  data: LiveTournamentHomeDetail | null;
  meta: LiveTournamentHomeMeta;
};

export type LiveTournamentHomePatch =
  | {
      kind: 'weekend_replace';
      detail: LiveTournamentHomeDetail | null;
    }
  | {
      kind: 'weekend_summary';
      weekend: TournamentWeekend;
    }
  | {
      kind: 'tournament_summary';
      tournament: LiveTournamentHomeTournamentEntry;
    }
  | {
      kind: 'resources';
      resources: TournamentWeekendResource[];
      deletedResourceIds?: string[];
    }
  | {
      kind: 'watched_players';
      watchlist: LiveTournamentHomeWatchEntry[];
      watchedPlayers: LiveTournamentHomeWatchedPlayer[];
      watchedPlayerDisplayNames: string[];
    }
  | {
      kind: 'meta_groups';
      tournamentGroups: LiveTournamentWeekendGroupEntry[];
    };

export type LiveTournamentHomePatchEvent = {
  type:
    | 'live_weekend.replaced'
    | 'live_weekend.summary_updated'
    | 'live_tournament.updated'
    | 'live_tournament.progress_updated'
    | 'live_resource.upserted'
    | 'live_resource.deleted'
    | 'player_watch.updated'
    | 'tournament_import.finished';
  data: {
    weekendId: string;
    version: number;
    patch: LiveTournamentHomePatch;
  };
  at: string;
};

export type LiveTournamentHomeConnectedEvent = {
  type: 'live_weekend.connected';
  data: {
    weekendId: string;
    userId: string;
    version: number;
    at: string;
  };
};

export type LiveTournamentHomeSocketEvent =
  | LiveTournamentHomeConnectedEvent
  | LiveTournamentHomePatchEvent;

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
