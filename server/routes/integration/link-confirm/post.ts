import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import {
  validateCliendIdSecretCredentials,
  generateIntegrationTokens,
  decrypt,
} from '../../../lib/utils/tokenUtils.ts';
import { db } from '../../../db';
import { userIntegration, integration } from '../../../db/schema/integration.ts';
import { eq, and } from 'drizzle-orm';
import { isIntegrationType } from '../../../../shared/types/integration.ts';

const schema = z.object({
  integration: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
  external_user_id: z.string(),
  link_token: z.string(),
});

export const linkConfirmPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', schema),
  async c => {
    const {
      integration: integrationName,
      client_id: clientId,
      client_secret: clientSecret,
      external_user_id: externalUserId,
      link_token: linkToken,
    } = c.req.valid('json');

    if (!isIntegrationType(integrationName)) {
      return c.json({ error: 'Invalid integration type' }, 400);
    }

    if (!validateCliendIdSecretCredentials(integrationName, clientId, clientSecret)) {
      return c.json({ error: 'Invalid client credentials' }, 400);
    }

    // Get integration ID
    const [integrationRecord] = await db
      .select()
      .from(integration)
      .where(eq(integration.name, integrationName));

    if (!integrationRecord) {
      return c.json({ error: 'Integration not found' }, 400);
    }

    // Find the link record
    const userIntegrations = await db
      .select()
      .from(userIntegration)
      .where(
        and(
          eq(userIntegration.integrationId, integrationRecord.id),
          eq(userIntegration.externalUserId, externalUserId),
        ),
      );

    const link = userIntegrations.find(
      li => li.linkTokenEnc && decrypt(li.linkTokenEnc) === linkToken,
    );

    if (!link) {
      return c.json({ error: 'Invalid link token or user ID' }, 400);
    }

    if (link.linkedAt) {
      return c.json({ error: 'Account already linked' }, 400);
    }

    const {
      accessToken,
      accessTokenEnc,
      refreshToken,
      refreshTokenEnc,
      expiresIn,
      accessExpiresAt,
      refreshExpiresAt,
      now,
    } = generateIntegrationTokens();

    await db
      .update(userIntegration)
      .set({
        accessTokenEnc,
        refreshTokenEnc,
        accessTokenExpiresAt: accessExpiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
        linkedAt: now,
        linkTokenEnc: null, // Clear link token after use
        updatedAt: now,
      })
      .where(eq(userIntegration.id, link.id));

    return c.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    });
  },
);
