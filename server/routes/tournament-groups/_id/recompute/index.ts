import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { tournamentGroupIdRecomputePostRoute } from './post.ts';

// Create a new router for tournament group tournaments operations
export const tournamentGroupIdRecomputeRoute = new Hono<AuthExtension>().route(
  '/',
  tournamentGroupIdRecomputePostRoute,
);
