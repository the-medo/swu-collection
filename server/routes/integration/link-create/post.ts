import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import {
  encrypt,
  generateLinkToken,
  validateClientIdCredentials,
} from '../../../lib/utils/tokenUtils.ts';
import { db } from '../../../db';
import { integration, userIntegration } from '../../../db/schema/integration.ts';
import { and, eq } from 'drizzle-orm';
import { IntegrationType } from '../../../../shared/types/integration.ts';

const schema = z.object({
  clientId: z.string(),
  externalUserId: z.string(),
  scopes: z.array(z.string()),
  integration: z.literal('karabast'),
  metadata: z.json().optional(),
});

export const linkCreatePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', schema),
  async c => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const {
      clientId,
      externalUserId,
      scopes,
      integration: integrationName,
      metadata,
    } = c.req.valid('json');

    if (!validateClientIdCredentials(IntegrationType.Karabast, clientId)) {
      return c.json({ error: 'Invalid client ID' }, 400);
    }

    // Get integration ID
    const [integrationRecord] = await db
      .select()
      .from(integration)
      .where(eq(integration.name, integrationName));

    if (!integrationRecord) {
      return c.json({ error: 'Integration not found' }, 400);
    }

    const linkToken = generateLinkToken();
    const linkTokenEnc = encrypt(linkToken);

    // Check if link already exists for this user and integration
    const [existingLink] = await db
      .select()
      .from(userIntegration)
      .where(
        and(
          eq(userIntegration.userId, user.id),
          eq(userIntegration.integrationId, integrationRecord.id),
        ),
      );

    if (existingLink) {
      // Update existing link with new token and external user ID
      await db
        .update(userIntegration)
        .set({
          externalUserId,
          linkTokenEnc,
          scopes,
          metadata: metadata || {},
          updatedAt: new Date(),
        })
        .where(eq(userIntegration.id, existingLink.id));

      return c.json({ linkToken });
    }

    // Create new link
    await db.insert(userIntegration).values({
      userId: user.id,
      integrationId: integrationRecord.id,
      externalUserId,
      linkTokenEnc,
      scopes,
      metadata: metadata || {},
    });

    return c.json({ linkToken });
  },
);
