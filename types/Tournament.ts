import type { User } from './User.ts';
import type { Meta } from '../server/db/schema/meta.ts';
import type { TournamentDeck } from '../server/db/schema/tournament_deck.ts';
import type { Deck } from '../server/db/schema/deck.ts';

export interface TournamentStringDate {
  id: string;
  userId: string;
  type: string;
  location: string;
  continent: string;
  name: string;
  meta: number;
  attendance: number;
  meleeId: string | null;
  format: number;
  days: number;
  dayTwoPlayerCount: number | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  imported: boolean;
  bracketInfo?: string;
}

export interface TournamentType {
  id: string;
  name: string;
  sortValue: number;
  major: number;
}

export interface TournamentDataDeckInfo {
  tournamentDeck: TournamentDeck;
  deck: Deck;
}

export interface TournamentData {
  tournament: TournamentStringDate;
  tournamentType: TournamentType;
  user?: User;
  meta: Meta;
  decks?: TournamentDataDeckInfo[];
}

export const tournamentTypes: [string, ...string[]] = [
  'local',
  'showdown',
  'ma1',
  'pq',
  'ma2',
  'sq',
  'rq',
  'gc',
] as const;

export const tournamentTypesInfo = {
  local: { name: 'LGS tournament', sortValue: 10, major: 0 },
  showdown: { name: 'Store Showdown', sortValue: 100, major: 0 },
  ma1: { name: '1-day Major Tournament', sortValue: 150, major: 1 },
  pq: { name: 'Planetary Qualifier', sortValue: 200, major: 1 },
  ma2: { name: '2-day Major Tournament', sortValue: 250, major: 1 },
  sq: { name: 'Sector Qualifier', sortValue: 300, major: 1 },
  rq: { name: 'Regional Qualifier', sortValue: 400, major: 1 },
  gc: { name: 'Galactic Championship', sortValue: 500, major: 1 },
};

export type TournamentTypeKey = keyof typeof tournamentTypesInfo;
