import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { tournament as tournamentTable } from '../../../db/schema/tournament.ts';
import { tournamentType as tournamentTypeTable } from '../../../db/schema/tournament_type.ts';
import { meta as metaTable } from '../../../db/schema/meta.ts';
import { db } from '../../../db';
import { user as userTable } from '../../../db/schema/auth-schema.ts';
import { selectTournament, selectTournamentType, selectMeta } from '../../tournament.ts';
import { selectUser } from '../../user.ts';

export const tournamentIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramTournamentId = z.string().uuid().parse(c.req.param('id'));

  const tournamentData = (
    await db
      .select({
        tournament: selectTournament,
        tournamentType: selectTournamentType,
        user: selectUser,
        meta: selectMeta,
      })
      .from(tournamentTable)
      .innerJoin(tournamentTypeTable, eq(tournamentTable.type, tournamentTypeTable.id))
      .innerJoin(userTable, eq(tournamentTable.userId, userTable.id))
      .leftJoin(metaTable, eq(tournamentTable.meta, metaTable.id))
      .where(eq(tournamentTable.id, paramTournamentId))
  )[0];

  if (!tournamentData) {
    return c.json({ message: "Tournament doesn't exist" }, 404);
  }

  return c.json(tournamentData);
});
