import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { tournamentWeekendsLiveGetRoute } from './tournament-weekends/live/get.ts';
import { tournamentWeekendIdResourcesPostRoute } from './tournament-weekends/_id/resources/post.ts';
import { tournamentWeekendIdGetRoute } from './tournament-weekends/_id/get.ts';

export const tournamentWeekendsRoute = new Hono<AuthExtension>()
  .route('/live', tournamentWeekendsLiveGetRoute)
  .route('/:id/resources', tournamentWeekendIdResourcesPostRoute)
  .route('/:id', tournamentWeekendIdGetRoute);
