import { format } from 'date-fns';
import type { Tournament } from '../../db/schema/tournament.ts';
import type {
  LiveMeleeMatch,
  LiveMeleePlayer,
  LiveMeleeStanding,
  LiveMeleeTournamentDetail,
  LiveMeleeTournamentProgress,
  LiveTournamentStatus,
} from './types.ts';

const todayDateString = () => format(new Date(), 'yyyy-MM-dd');

const tournamentDateString = (date: Tournament['date']) => format(date, 'yyyy-MM-dd');

const deriveMockStatus = (date: Tournament['date']): LiveTournamentStatus => {
  const tournamentDay = tournamentDateString(date);
  const today = todayDateString();

  if (tournamentDay > today) return 'upcoming';
  if (tournamentDay < today) return 'finished';

  return 'running';
};

const mockPlayerId = (meleeId: string, index: number) => {
  const source = `${meleeId}:${index}`;
  let hash = 0;

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 1_000_000_000;
  }

  return 1_000_000_000 + hash;
};

const mockPlayer = (meleeId: string, index: number): LiveMeleePlayer => ({
  id: mockPlayerId(meleeId, index),
  displayName: `Mock Player ${index}`,
});

export async function fetchLiveTournamentDetailFromMelee(params: {
  meleeId: string;
  tournament: Tournament;
}): Promise<LiveMeleeTournamentDetail> {
  // TODO: Replace this mock with Melee tournament detail scraping/API calls.
  const status = deriveMockStatus(params.tournament.date);
  const exactStart = `${tournamentDateString(params.tournament.date)}T10:00:00.000Z`;

  return {
    meleeId: params.meleeId,
    status,
    exactStart,
    playerCount: params.tournament.attendance,
    hasDecklists: false,
    additionalData: {
      source: 'mock',
      tournamentName: params.tournament.name,
    },
  };
}

export async function fetchLiveTournamentProgressFromMelee(params: {
  meleeId: string;
}): Promise<LiveMeleeTournamentProgress> {
  // TODO: Replace this mock with Melee round, standings, and match calls.
  const players = [1, 2, 3, 4].map(index => mockPlayer(params.meleeId, index));

  const standings: LiveMeleeStanding[] = [
    {
      ...players[0],
      rank: 1,
      points: 12,
      gameRecord: '8-1-0',
      matchRecord: '4-0-0',
    },
    {
      ...players[1],
      rank: 2,
      points: 9,
      gameRecord: '7-3-0',
      matchRecord: '3-1-0',
    },
    {
      ...players[2],
      rank: 3,
      points: 9,
      gameRecord: '6-3-0',
      matchRecord: '3-1-0',
    },
    {
      ...players[3],
      rank: 4,
      points: 6,
      gameRecord: '5-5-0',
      matchRecord: '2-2-0',
    },
  ];

  const matches: LiveMeleeMatch[] = [
    {
      matchKey: 'mock-table-1',
      roundNumber: 4,
      roundName: 'Round 4',
      player1: players[0],
      player2: players[1],
      leaderCardId1: null,
      baseCardKey1: null,
      leaderCardId2: null,
      baseCardKey2: null,
      player1GameWin: null,
      player2GameWin: null,
      updatedAt: null,
    },
    {
      matchKey: 'mock-table-2',
      roundNumber: 4,
      roundName: 'Round 4',
      player1: players[2],
      player2: players[3],
      leaderCardId1: null,
      baseCardKey1: null,
      leaderCardId2: null,
      baseCardKey2: null,
      player1GameWin: 2,
      player2GameWin: 1,
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    meleeId: params.meleeId,
    roundNumber: 4,
    roundName: 'Round 4',
    matchesTotal: matches.length,
    matchesRemaining: matches.filter(match => match.updatedAt === null).length,
    standings,
    matches,
    additionalData: {
      source: 'mock',
      roundId: null,
    },
  };
}
