import { getTableColumns } from 'drizzle-orm';
import { tournament as tournamentTable } from '../db/schema/tournament.ts';
import { tournamentType as tournamentTypeTable } from '../db/schema/tournament_type.ts';
import { meta as metaTable } from '../db/schema/meta.ts';
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
import { tournamentIdImportMeleePatchRoute } from './tournaments/_id/import-melee/patch.ts';
import { tournamentsThumbnailsPostRoute } from './tournaments/thumbnails/post.ts';
import { tournamentsBulkPostRoute } from './tournaments/bulk/data/post.ts';
import { tournamentBulkPqParsePostRoute } from './tournaments/bulk/pq-parse/post.ts';

export const selectTournament = getTableColumns(tournamentTable);
export const selectTournamentType = getTableColumns(tournamentTypeTable);
export const selectMeta = getTableColumns(metaTable);

export const tournamentRoute = new Hono<AuthExtension>()
  .route('/', tournamentGetRoute)
  .route('/', tournamentPostRoute)
  .route('/:id', tournamentIdGetRoute)
  .route('/:id', tournamentIdPutRoute)
  .route('/:id', tournamentIdDeleteRoute)
  .route('/:id/import-melee', tournamentIdImportMeleePostRoute)
  .route('/:id/import-melee', tournamentIdImportMeleePatchRoute)
  .route('/:id/decks', tournamentIdDecksGetRoute)
  .route('/:id/matches', tournamentIdMatchesGetRoute)
  .route('/thumbnails', tournamentsThumbnailsPostRoute)
  .route('/bulk/data', tournamentsBulkPostRoute)
  .route('/bulk/pq-parse', tournamentBulkPqParsePostRoute);
