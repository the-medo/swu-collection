import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { wsGameResultsRoute } from './ws/game-results.ts';
import { wsLiveTournamentsRoute } from './ws/live-tournaments.ts';

export const wsRoute = new Hono<AuthExtension>()
  .route('/game-results', wsGameResultsRoute)
  .route('/live-tournaments', wsLiveTournamentsRoute);
