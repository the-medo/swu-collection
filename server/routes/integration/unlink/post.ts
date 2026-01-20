import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { validateCliendIdSecretCredentials } from '../../../lib/utils/tokenUtils.ts';
import { db } from '../../../db';
import { userIntegration, integration } from '../../../db/schema/integration.ts';
import { eq, and } from 'drizzle-orm';
import { IntegrationType } from '../../../../shared/types/integration.ts';

const schema = z.object({
  integration: z.literal('karabast'),
  client_id: z.string(),
  client_secret: z.string(),
  external_user_id: z.string(),
});

export const unlinkPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', schema),
  async c => {
    const {
      integration: integrationName,
      client_id: clientId,
      client_secret: clientSecret,
      external_user_id: externalUserId,
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

    // Find and delete the link record
    const result = await db
      .delete(userIntegration)
      .where(
        and(
          eq(userIntegration.integrationId, integrationRecord.id),
          eq(userIntegration.externalUserId, externalUserId),
        ),
      );

    return c.json({ success: true });
  },
);
