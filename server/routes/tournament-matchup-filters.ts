import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { tournamentMatchupFiltersGetRoute } from './tournament-matchup-filters/get.ts';
import { tournamentMatchupFiltersPostRoute } from './tournament-matchup-filters/post.ts';

export const tournamentMatchupFiltersRoute = new Hono<AuthExtension>()
  .route('/', tournamentMatchupFiltersGetRoute)
  .route('/', tournamentMatchupFiltersPostRoute);
