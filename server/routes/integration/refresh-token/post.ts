import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import {
  validateCliendIdSecretCredentials,
  generateIntegrationTokens,
} from '../../../lib/utils/tokenUtils.ts';
import { db } from '../../../db';
import {
  userIntegration,
  integration as integrationTable,
} from '../../../db/schema/integration.ts';
import { eq, and } from 'drizzle-orm';
import { isIntegrationType } from '../../../../shared/types/integration.ts';

const schema = z.object({
  integration: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
  external_user_id: z.string(),
  refresh_token: z.string(),
});

export const refreshTokenPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', schema),
  async c => {
    const {
      integration,
      client_id: clientId,
      client_secret: clientSecret,
      external_user_id: externalUserId,
      refresh_token: refreshToken,
    } = c.req.valid('json');

    if (!isIntegrationType(integration)) {
      return c.json({ error: 'Invalid integration type' }, 400);
    }

    if (!validateCliendIdSecretCredentials(integration, clientId, clientSecret)) {
      return c.json({ error: 'Invalid client credentials' }, 400);
    }

    // Get integration ID
    const [integrationRecord] = await db
      .select()
      .from(integrationTable)
      .where(eq(integrationTable.name, integration));

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
    const {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      accessExpiresAt,
      refreshExpiresAt,
      now,
    } = generateIntegrationTokens();

    await db
      .update(userIntegration)
      .set({
        accessTokenEnc: accessToken,
        refreshTokenEnc: newRefreshToken,
        accessTokenExpiresAt: accessExpiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
        updatedAt: now,
      })
      .where(eq(userIntegration.id, link.id));

    return c.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: expiresIn,
    });
  },
);
