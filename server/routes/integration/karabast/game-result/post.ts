import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { validateCliendIdSecretCredentials, decrypt } from '../../../../lib/utils/tokenUtils.ts';
import { db } from '../../../../db';
import {
  integration,
  userIntegration,
  integrationGameData,
} from '../../../../db/schema/integration.ts';
import { eq, and } from 'drizzle-orm';
import { IntegrationType } from '../../../../../shared/types/integration.ts';

const playerDataSchema = z.object({
  name: z.string(),
  id: z.string(),
  accessToken: z.string().nullable().optional(),
  leader: z.string().optional().nullable(),
  base: z.string().optional().nullable(),
  deck: z.any().optional().nullable(),
  isWinner: z.boolean(),
});

const playerSchema = z.object({
  data: playerDataSchema,
  cardMetrics: z.any().optional().nullable(),
});

const gameResultDataSchema = z.object({
  gameId: z.string(),
  lobbyId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  winnerNames: z.array(z.string()),
  roundNumber: z.number(),
  sequenceNumber: z.number(),
  format: z.string(),
  players: z.array(playerSchema),
});

const schema = z.object({
  integration: z.literal('karabast'),
  client_id: z.string(),
  client_secret: z.string(),
  data: gameResultDataSchema,
});

export const karabastGameResultPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', schema),
  async c => {
    const { client_id: clientId, client_secret: clientSecret, data } = c.req.valid('json');

    if (!validateCliendIdSecretCredentials(IntegrationType.Karabast, clientId, clientSecret)) {
      return c.json({ error: 'Invalid client credentials' }, 400);
    }

    // Get integration ID
    const [integrationRecord] = await db
      .select()
      .from(integration)
      .where(eq(integration.name, 'karabast'));

    if (!integrationRecord) {
      return c.json({ error: 'Integration not found' }, 400);
    }

    // Identify users from access tokens
    const playerUserIds: (string | null)[] = [null, null];

    for (let i = 0; i < data.players.length && i < 2; i++) {
      const player = data.players[i].data;
      if (player.accessToken) {
        const [userRecord] = await db
          .select()
          .from(userIntegration)
          .where(
            and(
              eq(userIntegration.integrationId, integrationRecord.id),
              eq(userIntegration.externalUserId, player.id),
            ),
          );

        if (userRecord && userRecord.accessTokenEnc) {
          try {
            const decryptedToken = decrypt(userRecord.accessTokenEnc);
            if (decryptedToken === player.accessToken) {
              playerUserIds[i] = userRecord.userId;
            }
          } catch (e) {
            // Ignore decryption errors
          }
        }
      }
    }

    // Remove access tokens from the object - do not save them in the database!
    data.players.forEach(p => {
      if (p.data) {
        delete p.data.accessToken;
      }
    });

    // Save to integration_game_data
    await db.insert(integrationGameData).values({
      integrationId: integrationRecord.id,
      gameId: data.gameId,
      lobbyId: data.lobbyId,
      userId1: playerUserIds[0],
      userId2: playerUserIds[1],
      data: data,
    });

    return c.json({ success: true });
  },
);
