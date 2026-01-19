import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import crypto from 'node:crypto';
import type { AuthExtension } from '../../../auth/auth.ts';
import {
  validateCliendIdSecretCredentials,
  encrypt,
  decrypt,
} from '../../../lib/utils/tokenUtils.ts';
import { db } from '../../../db';
import { userIntegration, integration } from '../../../db/schema/integration.ts';
import { eq, and } from 'drizzle-orm';
import { IntegrationType } from '../../../../shared/types/integration.ts';

const schema = z.object({
  integration: z.literal('karabast'),
  client_id: z.string(),
  client_secret: z.string(),
  link_token: z.string(),
  external_user_id: z.string(),
});

export const linkConfirmPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', schema),
  async c => {
    const {
      integration: integrationName,
      client_id: clientId,
      client_secret: clientSecret,
      link_token: linkToken,
      external_user_id: karabastUserId,
    } = c.req.valid('json');

    if (!validateCliendIdSecretCredentials(IntegrationType.Karabast, clientId, clientSecret)) {
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
          eq(userIntegration.externalUserId, karabastUserId),
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

    // In a real scenario, we might want to generate real tokens here.
    // The issue says "create user's first access and refresh tokens".
    // I'll generate some mock tokens for now as I don't have a real token provider.
    const accessToken = encrypt(`access-${crypto.randomUUID()}`);
    const refreshToken = encrypt(`refresh-${crypto.randomUUID()}`);
    const now = new Date();
    const expiresIn = 3600; // 1 hour in seconds
    const accessExpiresAt = new Date(now.getTime() + expiresIn * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 3600 * 1000); // 30 days

    await db
      .update(userIntegration)
      .set({
        accessTokenEnc: accessToken,
        refreshTokenEnc: refreshToken,
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
