import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { cardStatsGetRoute } from './card-stats/get.ts';
import { cardStatsComputeRoute } from './card-stats/compute.ts';
import { cardStatsTopPlayedRoute } from './card-stats/top-played.ts';

export const cardStatsRoute = new Hono<AuthExtension>()
  .route('/', cardStatsGetRoute)
  .route('/compute', cardStatsComputeRoute)
  .route('/top-played', cardStatsTopPlayedRoute);
