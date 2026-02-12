import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { userSettings } from '../../db/schema/user_settings.ts';
import { userIntegration, integration } from '../../db/schema/integration.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { team as teamTable } from '../../db/schema/team.ts';
import { eq } from 'drizzle-orm';
import { userSettingsSchema } from '../../../shared/lib/userSettings.ts';

export const userSetupGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Get user settings (merged with defaults)
  const userSettingsFromDb = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  const mergedSettings: Record<string, any> = {};
  for (const setting of userSettingsFromDb) {
    mergedSettings[setting.key] = setting.value;
  }
  const settings = userSettingsSchema.parse(mergedSettings);

  // Get user teams
  const teams = await db
    .select({
      id: teamTable.id,
      name: teamTable.name,
      shortcut: teamTable.shortcut,
      description: teamTable.description,
      logoUrl: teamTable.logoUrl,
      privacy: teamTable.privacy,
      createdAt: teamTable.createdAt,
      role: teamMember.role,
    })
    .from(teamMember)
    .innerJoin(teamTable, eq(teamMember.teamId, teamTable.id))
    .where(eq(teamMember.userId, user.id));

  // Get user integrations
  const integrations = await db
    .select({
      id: userIntegration.id,
      integrationId: userIntegration.integrationId,
      integrationName: integration.name,
      externalUserId: userIntegration.externalUserId,
      linkedAt: userIntegration.linkedAt,
      lastUsedAt: userIntegration.lastUsedAt,
      revokedAt: userIntegration.revokedAt,
      scopes: userIntegration.scopes,
      metadata: userIntegration.metadata,
    })
    .from(userIntegration)
    .innerJoin(integration, eq(userIntegration.integrationId, integration.id))
    .where(eq(userIntegration.userId, user.id));

  return c.json({
    data: {
      settings,
      teams,
      integrations,
    },
  });
});
