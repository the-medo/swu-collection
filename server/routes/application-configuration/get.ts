import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { applicationConfiguration as applicationConfigurationTable } from '../../db/schema/application_configuration.ts';
import {
  type ApplicationConfiguration,
  getDefaultApplicationConfiguration,
} from '../../../shared/lib/application-configuration/applicationConfiguration.ts';

export async function getApplicationConfiguration(): Promise<ApplicationConfiguration> {
  const defaultConfiguration = getDefaultApplicationConfiguration();
  const storedConfiguration = await db.select().from(applicationConfigurationTable);
  const mergedConfiguration = { ...defaultConfiguration } as Record<string, unknown>;
  let legacyLiveTournamentMode: boolean | null = null;

  for (const entry of storedConfiguration) {
    const key = entry.key as keyof ApplicationConfiguration;

    if (entry.key === 'liveTournamentMode' || entry.key === 'live_tournament_mode') {
      legacyLiveTournamentMode = entry.value === 'true';
      continue;
    }

    if (!(key in defaultConfiguration)) {
      continue;
    }

    const defaultValue = defaultConfiguration[key];

    if (typeof defaultValue === 'boolean') {
      mergedConfiguration[key] = entry.value === 'true';
      continue;
    }

    if (typeof defaultValue === 'number') {
      mergedConfiguration[key] = Number(entry.value);
      continue;
    }

    mergedConfiguration[key] = entry.value;
  }

  if (
    legacyLiveTournamentMode !== null &&
    !storedConfiguration.some(entry => entry.key === 'homepageMode')
  ) {
    mergedConfiguration.homepageMode = legacyLiveTournamentMode ? 'live' : 'snapshot';
  }

  return mergedConfiguration as ApplicationConfiguration;
}

export const applicationConfigurationGetRoute = new Hono<AuthExtension>().get('/', async c => {
  return c.json(await getApplicationConfiguration());
});
