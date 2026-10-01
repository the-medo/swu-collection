import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zTournamentMapQuery } from '../../../../types/TournamentMap.ts';
import { getTournamentMap } from '../../../lib/tournaments/map.ts';

export function createTournamentMapRoute(getMap = getTournamentMap) {
  return new Hono<AuthExtension>().get('/', zValidator('query', zTournamentMapQuery), async c => {
    c.header('Cache-Control', 'no-store');
    return c.json({ data: await getMap(c.req.valid('query')) });
  });
}

export const tournamentMapGetRoute = createTournamentMapRoute();
