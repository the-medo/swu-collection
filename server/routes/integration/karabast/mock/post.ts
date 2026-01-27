import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { deck } from '../../../../db/schema/deck.ts';
import { deckCard } from '../../../../db/schema/deck_card.ts';
import { eq, sql } from 'drizzle-orm';
import { upsertGameResults } from '../../../../lib/game-results/upsertGameResults.ts';
import { baseSpecialNames } from '../../../../../shared/lib/basicBases.ts';

const schema = z.object({
  deckId: z.string().uuid(),
});

const mockCardMetrics = (cards: { cardId: string }[]) => {
  const metrics: Record<string, any> = {};
  cards.forEach(card => {
    // Randomly decide to include metrics for this card
    if (Math.random() > 0.3) {
      metrics[card.cardId] = {
        drawn: Math.random() > 0.5 ? Math.floor(Math.random() * 4) : 0,
        played: Math.random() > 0.5 ? Math.floor(Math.random() * 4) : 0,
        activated: Math.random() > 0.5 ? Math.floor(Math.random() * 4) : 0,
        discarded: Math.random() > 0.5 ? Math.floor(Math.random() * 4) : 0,
        resourced: Math.random() > 0.5 ? Math.floor(Math.random() * 4) : 0,
      };
    } else {
      metrics[card.cardId] = {
        drawn: 0,
        played: 0,
        activated: 0,
        discarded: 0,
        resourced: 0,
      };
    }
  });
  return metrics;
};

const mockSingleGame = ({
  userId,
  deckId,
  matchId,
  gameNumber,
  leaderCardId,
  baseCardKey,
  opponentLeaderCardId,
  opponentBaseCardKey,
  cards,
}: {
  userId: string;
  deckId: string;
  matchId: string;
  gameNumber: number;
  leaderCardId: string | null;
  baseCardKey: string | null;
  opponentLeaderCardId: string | null;
  opponentBaseCardKey: string | null;
  cards: { cardId: string }[];
}) => {
  const isWinner = Math.random() > 0.5;
  const hasInitiative = Math.random() > 0.5;
  const hasMulligan = Math.random() > 0.5;
  const roundNumber = Math.floor(Math.random() * 8) + 3; // 3-10

  return {
    userId,
    deckId,
    matchId,
    gameId: crypto.randomUUID(),
    gameNumber,
    format: 'premier',
    leaderCardId,
    baseCardKey,
    opponentLeaderCardId,
    opponentBaseCardKey,
    isWinner,
    hasInitiative,
    hasMulligan,
    gameSource: 'karabast',
    cardMetrics: mockCardMetrics(cards),
    roundMetrics: {},
    otherData: {
      roundNumber,
      opponentName: 'Unknown',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const karabastMockGameResultPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', schema),
  async c => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const { deckId } = c.req.valid('json');

    // 1. Fetch deck info
    const [deckRecord] = await db.select().from(deck).where(eq(deck.id, deckId));

    if (!deckRecord) {
      return c.json({ error: 'Deck not found' }, 404);
    }

    // Fetch deck cards
    const cards = await db
      .select({ cardId: deckCard.cardId })
      .from(deckCard)
      .where(eq(deckCard.deckId, deckId));

    // 2. Get random meta opponent
    const opponentResult = await db.execute(sql`
        WITH newest_meta AS (
            SELECT id
            FROM meta
            WHERE format = 1
            ORDER BY id DESC
            LIMIT 1
        )
        SELECT
            d.leader_card_id_1 as leader_card_id,
            d.base_card_id as base_card_id
        FROM
            tournament t
            JOIN tournament_deck td ON t.id = td.tournament_id
            JOIN deck d ON d.id = td.deck_id
            JOIN newest_meta nm ON t.meta = nm.id
        WHERE
            td.placement <= 8
            AND leader_card_id_1 IS NOT NULL
            AND base_card_id IS NOT NULL
        ORDER BY random()
        LIMIT 1;
    `);

    const opponent = opponentResult[0] as
      | { leader_card_id: string; base_card_id: string }
      | undefined;

    if (!opponent) {
      return c.json({ error: 'Could not find a suitable opponent in meta' }, 400);
    }

    // 3. Randomly decide Bo1 or Bo3
    const isBo3 = Math.random() > 0.3;
    const matchId = crypto.randomUUID();

    const gamesToUpsert = [];

    let playerWins = 0;
    let opponentWins = 0;
    let gameNumber = 1;

    while (playerWins < 2 && opponentWins < 2 && gameNumber <= (isBo3 ? 3 : 1)) {
      const game = mockSingleGame({
        userId: user.id,
        deckId,
        matchId,
        gameNumber,
        leaderCardId: deckRecord.leaderCardId1,
        baseCardKey:
          deckRecord.baseCardId! in baseSpecialNames
            ? baseSpecialNames[deckRecord.baseCardId!]
            : deckRecord.baseCardId,
        opponentLeaderCardId: opponent.leader_card_id,
        opponentBaseCardKey:
          opponent.base_card_id in baseSpecialNames
            ? baseSpecialNames[opponent.base_card_id]
            : opponent.base_card_id,
        cards,
      });

      if (game.isWinner) playerWins++;
      else opponentWins++;

      gamesToUpsert.push(game);
      gameNumber++;
    }

    // 5. Upsert results
    await upsertGameResults(gamesToUpsert);

    return c.json({ success: true, matchId, gamesCount: gamesToUpsert.length });
  },
);
