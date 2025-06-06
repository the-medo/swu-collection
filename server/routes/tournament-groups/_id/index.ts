import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { tournamentGroupIdGetRoute } from './get.ts';
import { tournamentGroupIdPutRoute } from './put.ts';
import { tournamentGroupIdDeleteRoute } from './delete.ts';
import { tournamentGroupIdTournamentsRoute } from './tournaments';

// Create a new router for tournament group ID-specific operations
export const tournamentGroupIdRoute = new Hono<AuthExtension>()
  .route('/', tournamentGroupIdGetRoute)
  .route('/', tournamentGroupIdPutRoute)
  .route('/', tournamentGroupIdDeleteRoute)
  .route('/tournaments', tournamentGroupIdTournamentsRoute);
