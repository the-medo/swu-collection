import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { tournamentGroupGetRoute } from './tournament-groups/get.ts';
import { tournamentGroupPostRoute } from './tournament-groups/post.ts';
import { tournamentGroupIdRoute } from './tournament-groups/_id';

// Create a new router for tournament groups
export const tournamentGroupsRoute = new Hono<AuthExtension>()
  .route('/', tournamentGroupGetRoute)
  .route('/', tournamentGroupPostRoute)
  .route('/:id', tournamentGroupIdRoute);
