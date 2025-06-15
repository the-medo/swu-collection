import type { Tournament } from '../server/db/schema/tournament.ts';
import type { Meta } from '../server/db/schema/meta.ts';
import type { TournamentDeck } from '../server/db/schema/tournament_deck.ts';
import type { Deck } from '../server/db/schema/deck.ts';
import type { TournamentType } from './Tournament.ts';
import type { TournamentGroupStats } from '../server/db/schema/tournament_group_stats.ts';
import type { TournamentGroupLeaderBase } from '../server/db/schema/tournament_group_leader_base.ts';

export interface TournamentGroup {
  id: string;
  name: string;
  metaId: number | null;
  position: number;
  description: string | null;
  visible: boolean;
}

export interface TournamentGroupWithMeta {
  group: TournamentGroup;
  meta: Meta | null;
  tournaments: TournamentGroupTournament[];
  stats: TournamentGroupStats | null;
  leaderBase: TournamentGroupLeaderBase[] | null;
}

export interface TournamentGroupTournament {
  tournament: Tournament;
  tournamentDeck: TournamentDeck;
  tournamentType: TournamentType;
  deck: Deck;
  position: number;
}

export interface TournamentGroupsResponse {
  data: TournamentGroupWithMeta[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface TournamentGroupResponse {
  data: TournamentGroupWithMeta;
}

export interface TournamentGroupTournamentsResponse {
  data: {
    tournament: Tournament;
    position: number;
  }[];
}
