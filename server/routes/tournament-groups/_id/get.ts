import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { tournamentGroup as tournamentGroupTable } from '../../../db/schema/tournament_group.ts';
import { tournamentGroupTournament as tournamentGroupTournamentTable } from '../../../db/schema/tournament_group_tournament.ts';
import { tournament as tournamentTable } from '../../../db/schema/tournament.ts';
import { tournamentType as tournamentTypeTable } from '../../../db/schema/tournament_type.ts';
import { meta as metaTable } from '../../../db/schema/meta.ts';
import { tournamentDeck } from '../../../db/schema/tournament_deck.ts';
import { deck } from '../../../db/schema/deck.ts';

export const tournamentGroupIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const id = c.req.param('id');

  // Get the tournament group with its tournaments
  const result = await db
    .select({
      group: tournamentGroupTable,
      meta: metaTable,
      // Use a subquery with json_agg to aggregate tournaments into an array
      tournaments: sql`
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'tournament', jsonb_snake_to_camel(to_jsonb(t.*)),
                'tournamentType', jsonb_snake_to_camel(to_jsonb(tt.*)),
                'tournamentDeck', jsonb_snake_to_camel(to_jsonb(td.*)),
                'deck', jsonb_snake_to_camel(to_jsonb(d.*)),
                'position', tgt.position
              ) ORDER BY tgt.position ASC
            )
            FROM ${tournamentGroupTournamentTable} tgt
            LEFT JOIN ${tournamentTable} t ON tgt.tournament_id = t.id
            LEFT JOIN ${tournamentTypeTable} tt ON t.type = tt.id
            LEFT JOIN ${tournamentDeck} td ON td.tournament_id = t.id AND td.placement = 1
            LEFT JOIN ${deck} d ON td.deck_id = d.id
            WHERE tgt.group_id = ${tournamentGroupTable.id}
          ),
          '[]'::jsonb
        )
      `,
    })
    .from(tournamentGroupTable)
    .leftJoin(metaTable, eq(tournamentGroupTable.metaId, metaTable.id))
    .where(eq(tournamentGroupTable.id, id));

  if (result.length === 0) {
    return c.json({ message: 'Tournament group not found' }, 404);
  }

  return c.json({ data: result[0] });
});
