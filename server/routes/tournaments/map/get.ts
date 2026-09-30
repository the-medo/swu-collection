import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zTournamentMapQuery } from '../../../../types/TournamentMap.ts';
import { getTournamentMap } from '../../../lib/tournaments/map.ts';

export function createTournamentMapRoute(getMap = getTournamentMap) {
  return new Hono<AuthExtension>().get('/', zValidator('query', zTournamentMapQuery), async c => {
    const { set, updatedSince } = c.req.valid('query');
    c.header('Cache-Control', 'no-store');
    return c.json({ data: await getMap(set, updatedSince) });
  });
}

export const tournamentMapGetRoute = createTournamentMapRoute();
