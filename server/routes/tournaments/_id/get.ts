import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { tournament as tournamentTable } from '../../../db/schema/tournament.ts';
import { tournamentType as tournamentTypeTable } from '../../../db/schema/tournament_type.ts';
import { meta as metaTable } from '../../../db/schema/meta.ts';
import { db } from '../../../db';
import { user as userTable } from '../../../db/schema/auth-schema.ts';
import { selectTournament, selectTournamentType, selectMeta } from '../../tournament.ts';
import { selectUser } from '../../user.ts';
import { tournamentDeck as tournamentDeckTable } from '../../../db/schema/tournament_deck.ts';
import { deck as deckTable } from '../../../db/schema/deck.ts';

export const tournamentIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramTournamentId = z.guid().parse(c.req.param('id'));

  const tournamentData = (
    await db
      .select({
        tournament: selectTournament,
        tournamentType: selectTournamentType,
        user: selectUser,
        meta: selectMeta,
        decks: sql`
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'tournamentDeck', jsonb_snake_to_camel(to_jsonb(td.*)),
                  'deck', jsonb_snake_to_camel(to_jsonb(d.*))
                )
              )
              FROM ${tournamentDeckTable} td
              LEFT JOIN ${deckTable} d ON td.deck_id = d.id
              WHERE td.tournament_id = ${paramTournamentId}
              AND td.placement <= 1
            ),
            '[]'::jsonb
          )
        `,
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
