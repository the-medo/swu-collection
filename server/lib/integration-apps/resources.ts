import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { gameResult, type GameResult } from '../../db/schema/game_result.ts';
import { deck } from '../../db/schema/deck.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import { baseSpecialNames, baseSpecialNameValues } from '../../../shared/lib/basicBases.ts';
import { hasActiveGameResultSockets, publishGameResultUpserts } from '../ws/gameResultsRealtime.ts';
import type { IntegrationGameResultInput } from '../../../shared/types/integrationApp.ts';
import { authorizeToken, type AuthenticatedRequestLimit } from './access.ts';
import { IntegrationAppError } from './errors.ts';
import { integrationResultId } from './crypto.ts';

const hasOwn = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const baseKey = (id?: string | null) =>
  id && hasOwn(baseSpecialNames, id) ? baseSpecialNames[id]! : (id ?? null);

export const appResourceService = {
  async profile(accessToken: string, onAuthenticated?: AuthenticatedRequestLimit) {
    const { connection } = await authorizeToken(
      db,
      accessToken,
      'profile:read',
      false,
      onAuthenticated,
    );
    const [profile] = await db
      .select({ id: user.id, displayName: user.displayName })
      .from(user)
      .where(eq(user.id, connection.userId));
    return profile!;
  },

  async submitGame(
    accessToken: string,
    input: IntegrationGameResultInput,
    onAuthenticated?: AuthenticatedRequestLimit,
  ) {
    const row = await db.transaction(async tx => {
      const { app, connection } = await authorizeToken(
        tx,
        accessToken,
        'game-results:write',
        true,
        onAuthenticated,
      );
      let deckInfo = {};
      if (input.deckId) {
        const [ownedDeck] = await tx
          .select({ name: deck.name, cardPoolId: deck.cardPoolId, formatId: deck.format })
          .from(deck)
          .where(and(eq(deck.id, input.deckId), eq(deck.userId, connection.userId)));
        if (!ownedDeck) throw new IntegrationAppError('Deck not found in your account.', 404);
        deckInfo = ownedDeck;
      }
      if (new Date(input.playedAt).getTime() > Date.now() + 5 * 60_000)
        throw new IntegrationAppError('Game time must not be in the future.');
      const gameId = integrationResultId(app.clientId, 'game', input.gameId);
      const playedAt = new Date(input.playedAt).toISOString();
      const cards = await getMergedCardList();
      for (const [id, expectedType] of [
        [input.leaderCardId, 'Leader'],
        [input.opponentLeaderCardId, 'Leader'],
        [input.baseCardKey, 'Base'],
        [input.opponentBaseCardKey, 'Base'],
      ] as const) {
        if (id && hasOwn(cards, id) && cards[id]?.type !== expectedType)
          throw new IntegrationAppError(`Card must be a ${expectedType.toLowerCase()}.`);
      }
      const containsUnknownCards =
        [input.leaderCardId, input.opponentLeaderCardId].some(id => !!id && !hasOwn(cards, id)) ||
        [input.baseCardKey, input.opponentBaseCardKey].some(
          id => !!id && !hasOwn(cards, id) && !baseSpecialNameValues.has(id),
        );
      const values = {
        userId: connection.userId,
        gameId,
        matchId: input.matchId ? integrationResultId(app.clientId, 'match', input.matchId) : null,
        gameNumber: input.gameNumber ?? null,
        format: input.format ?? null,
        deckId: input.deckId ?? null,
        leaderCardId: input.leaderCardId ?? null,
        baseCardKey: baseKey(input.baseCardKey),
        opponentLeaderCardId: input.opponentLeaderCardId ?? null,
        opponentBaseCardKey: baseKey(input.opponentBaseCardKey),
        containsUnknownCards,
        isWinner: input.isWinner,
        hasInitiative: input.hasInitiative ?? null,
        hasMulligan: input.hasMulligan ?? null,
        gameSource: 'integration',
        otherData: {
          integrationApp: { clientId: app.clientId, name: app.name },
          finishedAt: playedAt,
          deckInfo,
        },
        createdAt: playedAt,
        updatedAt: new Date().toISOString(),
      };
      // Retrying a submission cannot overwrite manual edits or user-owned notes,
      // exclusions and event grouping. No caller-supplied SWUBASE IDs are trusted.
      const [saved] = await tx
        .insert(gameResult)
        .values(values)
        .onConflictDoUpdate({
          target: [gameResult.userId, gameResult.gameId],
          set: values,
          setWhere: eq(gameResult.manuallyEdited, false),
        })
        .returning();
      if (saved) return saved;
      const [existing] = await tx
        .select()
        .from(gameResult)
        .where(and(eq(gameResult.userId, connection.userId), eq(gameResult.gameId, gameId)));
      return existing!;
    });
    if (hasActiveGameResultSockets()) {
      try {
        await publishGameResultUpserts([row as GameResult]);
      } catch {
        console.warn('Could not publish integration game result update.');
      }
    }
    return { id: row.id, gameId: row.gameId };
  },
};
