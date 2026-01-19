import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import crypto from 'node:crypto';
import type { AuthExtension } from '../../../auth/auth.ts';
import { validateCliendIdSecretCredentials, encrypt } from '../../../lib/utils/tokenUtils.ts';
import { db } from '../../../db';
import { userIntegration, integration } from '../../../db/schema/integration.ts';
import { eq, and } from 'drizzle-orm';
import { IntegrationType } from '../../../../shared/types/integration.ts';

const schema = z.object({
  refreshToken: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  externalUserId: z.string(),
});

export const refreshTokenPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', schema),
  async c => {
    const { refreshToken, clientId, clientSecret, externalUserId } = c.req.valid('json');

    if (!validateCliendIdSecretCredentials(IntegrationType.Karabast, clientId, clientSecret)) {
      return c.json({ error: 'Invalid client credentials' }, 400);
    }

    // Get integration ID for Karabast
    const [integrationRecord] = await db
      .select()
      .from(integration)
      .where(eq(integration.name, 'karabast'));

    if (!integrationRecord) {
      return c.json({ error: 'Integration not found' }, 400);
    }

    // Find the link record by refresh token and external user ID
    const [link] = await db
      .select()
      .from(userIntegration)
      .where(
        and(
          eq(userIntegration.integrationId, integrationRecord.id),
          eq(userIntegration.externalUserId, externalUserId),
          eq(userIntegration.refreshTokenEnc, refreshToken),
        ),
      );

    if (!link) {
      return c.json({ error: 'Invalid refresh token or user ID' }, 400);
    }

    // Check if refresh token is expired
    if (link.refreshTokenExpiresAt && link.refreshTokenExpiresAt < new Date()) {
      return c.json({ error: 'Refresh token expired' }, 400);
    }

    // Generate new tokens
    const newAccessToken = encrypt(`access-${crypto.randomUUID()}`);
    const newRefreshToken = encrypt(`refresh-${crypto.randomUUID()}`);
    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + 3600 * 1000); // 1 hour
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 3600 * 1000); // 30 days

    await db
      .update(userIntegration)
      .set({
        accessTokenEnc: newAccessToken,
        refreshTokenEnc: newRefreshToken,
        accessTokenExpiresAt: accessExpiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
        updatedAt: now,
      })
      .where(eq(userIntegration.id, link.id));

    return c.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: accessExpiresAt.toISOString(),
    });
  },
);
