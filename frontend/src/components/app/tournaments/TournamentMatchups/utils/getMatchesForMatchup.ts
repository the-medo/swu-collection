import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import type { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import {
  getDeckKeys,
  type TournamentInfoMap,
} from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import type { CardListResponse } from '@/api/lists/useCardList.ts';
import type { TournamentMatch } from '../../../../../../../server/db/schema/tournament_match.ts';
import { getTournamentDeckMapKey } from './getTournamentDeckMapKey.ts';

export type MatchupPlayer = {
  username: string | null;
  deck: TournamentDeckResponse;
  points: number | null;
};

export type MatchupMatch = {
  match: TournamentMatch;
  rowPlayer: MatchupPlayer;
  colPlayer: MatchupPlayer;
  rowGameWins: number;
  colGameWins: number;
  gameDraws: number;
  rowResult: TournamentMatch['result'];
};

type GetMatchesForMatchupParams = {
  matches: TournamentMatch[];
  decks: TournamentDeckResponse[];
  tournaments: TournamentInfoMap;
  rowKey: string;
  colKey: string;
  metaInfo: MetaInfo;
  cardListData: CardListResponse | undefined;
};

export const getMatchesForMatchup = ({
  matches,
  decks,
  tournaments,
  rowKey,
  colKey,
  metaInfo,
  cardListData,
}: GetMatchesForMatchupParams): MatchupMatch[] => {
  if (!cardListData) return [];

  const deckByTournamentAndId = new Map<string, TournamentDeckResponse>();
  decks.forEach(deck => {
    deckByTournamentAndId.set(
      getTournamentDeckMapKey(deck.tournamentDeck.tournamentId, deck.tournamentDeck.deckId),
      deck,
    );
  });

  const seenMatchIds = new Set<string>();

  const invertResult = (result: TournamentMatch['result']) => {
    if (result === 3) return 0;
    if (result === 0) return 3;
    return result;
  };

  return matches
    .map((match, index) => ({ match, index }))
    .filter(({ match }) => !match.isBye && Boolean(match.p2DeckId))
    .flatMap(({ match, index }) => {
      if (!match.p2DeckId || seenMatchIds.has(match.id)) return [];

      const player1Deck = deckByTournamentAndId.get(
        getTournamentDeckMapKey(match.tournamentId, match.p1DeckId),
      );
      const player2Deck = deckByTournamentAndId.get(
        getTournamentDeckMapKey(match.tournamentId, match.p2DeckId),
      );
      if (!player1Deck || !player2Deck) return [];

      const player1Keys = getDeckKeys(player1Deck, metaInfo, cardListData);
      const player2Keys = getDeckKeys(player2Deck, metaInfo, cardListData);
      const player1IsRow = player1Keys.includes(rowKey);
      const player1IsCol = player1Keys.includes(colKey);
      const player2IsRow = player2Keys.includes(rowKey);
      const player2IsCol = player2Keys.includes(colKey);
      const hasNativeOrientation = player1IsRow && player2IsCol;
      const hasReversedOrientation = player2IsRow && player1IsCol;

      if (!hasNativeOrientation && !hasReversedOrientation) return [];

      seenMatchIds.add(match.id);

      if (hasNativeOrientation) {
        return [
          {
            match,
            rowPlayer: {
              username: match.p1Username,
              deck: player1Deck,
              points: match.p1Points,
            },
            colPlayer: {
              username: match.p2Username,
              deck: player2Deck,
              points: match.p2Points,
            },
            rowGameWins: match.gameWin,
            colGameWins: match.gameLose,
            gameDraws: match.gameDraw,
            rowResult: match.result,
            index,
          },
        ];
      }

      return [
        {
          match,
          rowPlayer: {
            username: match.p2Username,
            deck: player2Deck,
            points: match.p2Points,
          },
          colPlayer: {
            username: match.p1Username,
            deck: player1Deck,
            points: match.p1Points,
          },
          rowGameWins: match.gameLose,
          colGameWins: match.gameWin,
          gameDraws: match.gameDraw,
          rowResult: invertResult(match.result),
          index,
        },
      ];
    })
    .sort((a, b) => {
      const dateComparison = (tournaments[b.match.tournamentId]?.tournament.date ?? '').localeCompare(
        tournaments[a.match.tournamentId]?.tournament.date ?? '',
      );
      if (dateComparison !== 0) return dateComparison;

      const roundComparison = a.match.round - b.match.round;
      if (roundComparison !== 0) return roundComparison;

      return a.index - b.index;
    })
    .map(({ match, rowPlayer, colPlayer, rowGameWins, colGameWins, gameDraws, rowResult }) => ({
      match,
      rowPlayer,
      colPlayer,
      rowGameWins,
      colGameWins,
      gameDraws,
      rowResult,
    }));
};
