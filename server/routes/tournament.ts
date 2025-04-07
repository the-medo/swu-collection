import { getTableColumns } from 'drizzle-orm';
import { tournament as tournamentTable } from '../db/schema/tournament.ts';
import { tournamentType as tournamentTypeTable } from '../db/schema/tournament_type.ts';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { tournamentGetRoute } from './tournaments/get.ts';
import { tournamentPostRoute } from './tournaments/post.ts';
import { tournamentIdGetRoute } from './tournaments/_id/get.ts';
import { tournamentIdPutRoute } from './tournaments/_id/put.ts';
import { tournamentIdDeleteRoute } from './tournaments/_id/delete.ts';
import { tournamentIdImportMeleePostRoute } from './tournaments/_id/import-melee/post.ts';
import { tournamentIdDecksGetRoute } from './tournaments/_id/decks/get.ts';
import { tournamentIdMatchesGetRoute } from './tournaments/_id/matches/get.ts';

export const selectTournament = getTableColumns(tournamentTable);
export const selectTournamentType = getTableColumns(tournamentTypeTable);

export const tournamentRoute = new Hono<AuthExtension>()
  .route('/', tournamentGetRoute)
  .route('/', tournamentPostRoute)
  .route('/:id', tournamentIdGetRoute)
  .route('/:id', tournamentIdPutRoute)
  .route('/:id', tournamentIdDeleteRoute)
  .route('/:id/import-melee', tournamentIdImportMeleePostRoute)
  .route('/:id/decks', tournamentIdDecksGetRoute)
  .route('/:id/matches', tournamentIdMatchesGetRoute);
