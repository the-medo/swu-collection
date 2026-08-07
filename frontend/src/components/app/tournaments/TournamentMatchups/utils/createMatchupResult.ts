import type { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import type { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import type { TournamentInfoMap } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { getBaseKey } from './getBaseKey.ts';
import type { MatchupMatch } from './getMatchesForMatchup.ts';

type MatchupResultDeckCards = Pick<MatchResult, 'leaderCardId' | 'baseCardKey'>;

const isMatchResultMetaInfo = (metaInfo: MetaInfo) =>
  metaInfo === 'leaders' || metaInfo === 'leadersAndBase' || metaInfo === 'bases';

const getMatchResultDeckCards = (
  matchupMatch: MatchupMatch | undefined,
  player: 'rowPlayer' | 'colPlayer',
  metaInfo: MetaInfo,
): MatchupResultDeckCards => {
  const deck = matchupMatch?.[player].deck.deck;
  if (!deck) return {};

  if (metaInfo === 'leaders') {
    return { leaderCardId: deck.leaderCardId1 ?? undefined };
  }

  if (metaInfo === 'leadersAndBase') {
    return {
      leaderCardId: deck.leaderCardId1 ?? undefined,
      baseCardKey: getBaseKey(deck.baseCardId),
    };
  }

  if (metaInfo === 'bases') {
    return { baseCardKey: getBaseKey(deck.baseCardId) };
  }

  return {};
};

const getFirstGameCreatedAt = (date: string | undefined) => {
  const parsedDate = date ? new Date(date) : new Date(0);
  return Number.isNaN(parsedDate.getTime()) ? new Date(0).toISOString() : parsedDate.toISOString();
};

type CreateMatchupResultParams = {
  matches: MatchupMatch[];
  tournaments: TournamentInfoMap;
  rowKey: string;
  colKey: string;
  metaInfo: MetaInfo;
  rowLabel: string;
  colLabel: string;
};

export const createMatchupResult = ({
  matches,
  tournaments,
  rowKey,
  colKey,
  metaInfo,
  rowLabel,
  colLabel,
}: CreateMatchupResultParams): MatchResult | null => {
  if (!isMatchResultMetaInfo(metaInfo)) return null;

  const firstMatch = matches[0];
  const rowDeckCards = getMatchResultDeckCards(firstMatch, 'rowPlayer', metaInfo);
  const colDeckCards = getMatchResultDeckCards(firstMatch, 'colPlayer', metaInfo);
  if (
    (!rowDeckCards.leaderCardId && !rowDeckCards.baseCardKey) ||
    (!colDeckCards.leaderCardId && !colDeckCards.baseCardKey)
  ) {
    return null;
  }

  const { wins, losses } = matches.reduce(
    (totals, match) => {
      if (match.rowResult === 3) totals.wins += 1;
      else if (match.rowResult === 0) totals.losses += 1;
      return totals;
    },
    { wins: 0, losses: 0 },
  );

  if (wins + losses === 0) return null;

  const firstTournamentDate = matches
    .map(match => tournaments[match.match.tournamentId]?.tournament.date)
    .find(Boolean);

  return {
    id: `tournament-matchup:${metaInfo}:${rowKey}:${colKey}`,
    type: 'other',
    games: [],
    gameSource: 'tournament-matchup',
    format: '',
    exclude: false,
    manuallyEdited: false,
    leaderCardId: rowDeckCards.leaderCardId,
    baseCardKey: rowDeckCards.baseCardKey,
    opponentLeaderCardId: colDeckCards.leaderCardId,
    opponentBaseCardKey: colDeckCards.baseCardKey,
    result: wins === losses ? 1 : wins > losses ? 3 : 0,
    finalWins: wins,
    finalLosses: losses,
    inTeam: false,
    userName: rowLabel,
    inTeamOppUserName: colLabel,
    firstGameCreatedAt: getFirstGameCreatedAt(firstTournamentDate),
  };
};
