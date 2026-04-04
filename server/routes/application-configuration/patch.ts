import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { applicationConfiguration as applicationConfigurationTable } from '../../db/schema/application_configuration.ts';
import { applicationConfigurationPatchSchema } from '../../../shared/lib/application-configuration/applicationConfiguration.ts';

import { userHasAdminAccess } from '../../lib/utils/userHasAdminAccess.ts';
import { getApplicationConfiguration } from './get.ts';

export function serializeApplicationConfigurationValue(value: unknown) {
  return String(value);
}

export const applicationConfigurationPatchRoute = new Hono<AuthExtension>().patch('/', async c => {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const hasAdminAccess = await userHasAdminAccess(user.id);

  if (!hasAdminAccess) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const result = applicationConfigurationPatchSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid request body', details: result.error.format() }, 400);
  }

  const [key, value] = Object.entries(result.data)[0]!;

  await db
    .insert(applicationConfigurationTable)
    .values({
      key,
      value: serializeApplicationConfigurationValue(value),
    })
    .onConflictDoUpdate({
      target: applicationConfigurationTable.key,
      set: {
        value: serializeApplicationConfigurationValue(value),
      },
    });

  return c.json(await getApplicationConfiguration());
});
