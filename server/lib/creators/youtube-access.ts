import { and, eq } from 'drizzle-orm';
import { creatorProfile, creatorYoutube } from '../../db/schema/creator_hub.ts';
import type { Database } from './types.ts';
import { disconnectYoutube } from './metadata-lifecycle.ts';
import { exchangeYoutubeToken, seal, unseal, YoutubeAccessRevoked } from './youtube-credentials.ts';

export async function refreshYoutubeAccess(
  database: Database,
  connection: typeof creatorYoutube.$inferSelect,
  at = new Date().toISOString(),
  exchange = exchangeYoutubeToken,
) {
  try {
    if (!connection.refreshToken) throw new YoutubeAccessRevoked();
    const token = await exchange({
      grant_type: 'refresh_token',
      refresh_token: unseal(connection.refreshToken),
    });
    return await database.transaction(async tx => {
      await tx
        .select()
        .from(creatorProfile)
        .where(eq(creatorProfile.id, connection.creatorId))
        .for('update');
      const [current] = await tx
        .update(creatorYoutube)
        .set({
          accessToken: seal(token.access_token),
          refreshToken: token.refresh_token ? seal(token.refresh_token) : connection.refreshToken,
          expiresAt: new Date(Date.parse(at) + token.expires_in * 1000).toISOString(),
          checkedAt: at,
          lastCheckAttemptAt: at,
        })
        .where(
          and(
            eq(creatorYoutube.channelId, connection.channelId),
            eq(creatorYoutube.creatorId, connection.creatorId),
            eq(creatorYoutube.accessToken, connection.accessToken),
          ),
        )
        .returning();
      return current ?? null;
    });
  } catch (error) {
    if (error instanceof YoutubeAccessRevoked)
      await disconnectYoutube(database, connection, 'revoked', at);
    else
      await database
        .update(creatorYoutube)
        .set({ lastCheckAttemptAt: at })
        .where(
          and(
            eq(creatorYoutube.channelId, connection.channelId),
            eq(creatorYoutube.creatorId, connection.creatorId),
            eq(creatorYoutube.accessToken, connection.accessToken),
          ),
        );
    throw error;
  }
}
