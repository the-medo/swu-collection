import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { getLiveTournamentBracket } from '../../../../../../lib/live-tournaments/tournamentWeekendLiveHome.ts';

export const tournamentWeekendIdTournamentTournamentIdBracketGetRoute =
  new Hono<AuthExtension>().get('/', async c => {
    const weekendId = z.guid().parse(c.req.param('id'));
    const tournamentId = z.guid().parse(c.req.param('tournamentId'));

    const data = await getLiveTournamentBracket(weekendId, tournamentId);

    if (!data) {
      return c.json({ message: 'Tournament not found in this weekend' }, 404);
    }

    return c.json({ data });
  });
