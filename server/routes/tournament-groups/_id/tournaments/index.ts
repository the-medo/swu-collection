import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { tournamentGroupIdTournamentsGetRoute } from './get.ts';
import { tournamentGroupIdTournamentsPostRoute } from './post.ts';
import { tournamentGroupIdTournamentsDeleteRoute } from './delete.ts';
import { tournamentGroupIdTournamentsPutRoute } from './put.ts';

// Create a new router for tournament group tournaments operations
export const tournamentGroupIdTournamentsRoute = new Hono<AuthExtension>()
  .route('/', tournamentGroupIdTournamentsGetRoute)
  .route('/', tournamentGroupIdTournamentsPostRoute)
  .route('/', tournamentGroupIdTournamentsDeleteRoute)
  .route('/', tournamentGroupIdTournamentsPutRoute);