import { describe, expect, test } from 'bun:test';
import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { getTopLeaderDecks } from './topLeaderDecks.ts';

function entry(
  id: string,
  leader: string | null,
  placement: number | null,
  overrides: Partial<NonNullable<TournamentDeckResponse['deck']>> = {},
): TournamentDeckResponse {
  return {
    deck: {
      id,
      name: id,
      userId: 'swubase',
      format: 1,
      description: '',
      leaderCardId1: leader,
      leaderCardId2: null,
      baseCardId: 'command-base',
      public: 1,
      cardPoolId: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      ...overrides,
    },
    tournamentDeck: {
      tournamentId: 'tournament',
      deckId: id,
      placement,
      topRelativeToPlayerCount: false,
      recordWin: 0,
      recordLose: 0,
      recordDraw: 0,
      points: 0,
      meleeDecklistGuid: null,
      meleePlayerUsername: id,
    },
    deckInformation: null,
  };
}

describe('best tournament placements by leader', () => {
  test('selects one deck per leader across bases and orders by placement without mutating input', () => {
    const decks = [
      entry('wicket-second', 'wicket', 8),
      entry('hemlock-second', 'hemlock', 4),
      entry('krennic-first', 'krennic', 5),
      entry('talzin-first', 'talzin', 2),
      entry('wicket-first', 'wicket', 1, { baseCardId: 'vigilance-base' }),
      entry('han-first', 'han', 6),
      entry('hemlock-first', 'hemlock', 3),
      entry('krennic-second', 'krennic', 7),
    ];
    const original = [...decks];

    expect(getTopLeaderDecks(decks).map(d => [d.leaderCardId, d.placement, d.deckId])).toEqual([
      ['wicket', 1, 'wicket-first'],
      ['talzin', 2, 'talzin-first'],
      ['hemlock', 3, 'hemlock-first'],
      ['krennic', 5, 'krennic-first'],
      ['han', 6, 'han-first'],
    ]);
    expect(decks).toEqual(original);
  });

  test('ignores missing decks, missing leaders, and unknown or invalid placements', () => {
    const missing = { ...entry('missing', 'wicket', 1), deck: null };
    expect(
      getTopLeaderDecks([
        missing,
        entry('unknown', 'wicket', null),
        entry('zero', 'wicket', 0),
        entry('negative', 'wicket', -1),
        entry('leaderless', null, 2),
        entry('available', 'wicket', 3),
      ]).map(d => d.deckId),
    ).toEqual(['available']);
    expect(getTopLeaderDecks([])).toEqual([]);
  });

  test('uses a stable single representative when the same leader has tied placements', () => {
    const a = entry('a', 'wicket', 3);
    const b = entry('b', 'wicket', 3);
    expect(getTopLeaderDecks([b, a])).toEqual(getTopLeaderDecks([a, b]));
    expect(getTopLeaderDecks([b, a]).map(d => d.deckId)).toEqual(['a']);
  });

  test('keeps leader versions distinct and includes a second leader', () => {
    expect(
      getTopLeaderDecks([
        entry('han-jtl', 'han-solo--worth-the-risk', 1, { leaderCardId2: 'chewbacca' }),
        entry('han-sor', 'han-solo--audacious-smuggler', 2),
        entry('chewie', 'chewbacca', 3),
      ]).map(d => [d.leaderCardId, d.deckId]),
    ).toEqual([
      ['han-solo--worth-the-risk', 'han-jtl'],
      ['chewbacca', 'han-jtl'],
      ['han-solo--audacious-smuggler', 'han-sor'],
    ]);
  });
});
